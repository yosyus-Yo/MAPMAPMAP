#!/usr/bin/env node
/**
 * naver_places.csv → restaurants 테이블 적재 (2026-07-20)
 *
 * 넣는 것:   name, address, lat, lng, category
 * 버리는 것: thumbnail, place_url, place_id, bookmark_id, share_id, folder_name, memo
 *            (외부 이미지 직링크 + 외부 서비스 내부 식별자는 저장하지 않는다)
 *
 * review_count=0, avg_level=0 으로 넣어 지도에서 흑백 마커(.fm-empty)로 표시된다.
 *
 * 사용:
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-places.mjs --dry-run
 *   SUPABASE_SERVICE_KEY=xxx node scripts/import-places.mjs
 */
// supabase-js는 실제 삽입 시에만 동적 import한다.
// 본 프로젝트는 정적 사이트라 의존성이 설치돼 있지 않을 수 있고,
// --dry-run(정제 결과 확인)은 의존성 없이 돌아가야 하기 때문.
import { readFileSync, existsSync } from 'fs';

const CSV_PATH = new URL('../public/naver_places.csv', import.meta.url);
const ENV_PATH = new URL('../.env', import.meta.url);
const SUPABASE_URL = 'https://xwnqpsnagdcleseqifqv.supabase.co';
const DRY_RUN = process.argv.includes('--dry-run');

// .env에서 키를 읽는다 (.env는 .gitignore 대상 — 커밋되지 않음).
// 환경변수가 이미 있으면 그걸 우선한다.
function loadServiceKey() {
  if (process.env.SUPABASE_SERVICE_KEY) return process.env.SUPABASE_SERVICE_KEY;
  if (!existsSync(ENV_PATH)) return null;
  for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const m = line.match(/^\s*SUPABASE_SERVICE_KEY\s*=\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, '');   // 따옴표 제거
  }
  return null;
}
const SERVICE_KEY = loadServiceKey();

// ── CSV 파서 (따옴표 안의 쉼표·줄바꿈 처리) ────────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }  // 이스케이프된 따옴표
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ── 정제 ──────────────────────────────────────────────────────────────
// 주소 정규화: 중복 판정용. 공백/특수문자 제거 후 비교한다.
const normalize = s => (s || '').replace(/\s+/g, '').replace(/[()·,]/g, '').toLowerCase();

function main() {
  const raw = readFileSync(CSV_PATH, 'utf8').replace(/^﻿/, '');  // BOM 제거
  const rows = parseCsv(raw);
  const header = rows[0];
  const col = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

  const required = ['name', 'address', 'lat', 'lng', 'category'];
  const missing = required.filter(f => col[f] === undefined);
  if (missing.length) {
    console.error(`❌ CSV에 필수 컬럼 없음: ${missing.join(', ')}`);
    process.exit(1);
  }

  const stats = { total: 0, noName: 0, badCoord: 0, dup: 0, ok: 0 };
  const seen = new Set();
  const places = [];

  for (const r of rows.slice(1)) {
    if (!r || r.length < header.length) continue;
    stats.total++;

    const name = (r[col.name] || '').trim();
    const address = (r[col.address] || '').trim();
    const lat = parseFloat(r[col.lat]);
    const lng = parseFloat(r[col.lng]);
    const category = (r[col.category] || '').trim() || null;

    if (!name) { stats.noName++; continue; }
    // 대한민국 대략 범위 밖이면 버림 (좌표 오류 방지)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < 33 || lat > 39 || lng < 124 || lng > 132) { stats.badCoord++; continue; }

    const key = `${normalize(name)}|${normalize(address)}`;
    if (seen.has(key)) { stats.dup++; continue; }
    seen.add(key);

    places.push({ name, address, lat, lng, category, avg_level: 0, review_count: 0 });
    stats.ok++;
  }

  console.log('=== 정제 결과 ===');
  console.log(`  전체        ${stats.total}`);
  console.log(`  상호 없음   ${stats.noName}`);
  console.log(`  좌표 이상   ${stats.badCoord}`);
  console.log(`  중복 제거   ${stats.dup}`);
  console.log(`  적재 대상   ${stats.ok}`);
  console.log();
  console.log('=== 샘플 3건 (실제 삽입 형태) ===');
  console.log(JSON.stringify(places.slice(0, 3), null, 2));

  if (DRY_RUN) { console.log('\n[dry-run] 삽입하지 않고 종료합니다.'); return; }
  if (!SERVICE_KEY) {
    console.error('\n❌ service_role 키를 찾을 수 없습니다.');
    console.error('   프로젝트 루트에 .env 파일을 만들고 아래 한 줄을 넣으세요:');
    console.error('     SUPABASE_SERVICE_KEY=여기에_키');
    console.error('   (.env는 .gitignore 대상이라 커밋되지 않습니다)');
    console.error('   키 위치: Supabase 대시보드 → Project Settings → API → service_role');
    process.exit(1);
  }
  return insert(places);
}

async function insert(places) {
  let createClient;
  try {
    ({ createClient } = await import('@supabase/supabase-js'));
  } catch {
    console.error('\n❌ @supabase/supabase-js 가 없습니다. 먼저 설치하세요:');
    console.error('   npm i @supabase/supabase-js');
    process.exit(1);
  }
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // 기존 매장과 중복 방지 — 상호+주소 정규화 키로 비교
  const { data: existing, error: exErr } = await sb
    .from('restaurants').select('name, address');
  if (exErr) { console.error('❌ 기존 매장 조회 실패:', exErr.message); process.exit(1); }

  const existingKeys = new Set(
    (existing || []).map(r => `${normalize(r.name)}|${normalize(r.address)}`)
  );
  const fresh = places.filter(p => !existingKeys.has(`${normalize(p.name)}|${normalize(p.address)}`));

  console.log(`\n기존 매장 ${existing.length}건과 대조 → 신규 ${fresh.length}건 (중복 ${places.length - fresh.length}건 제외)`);
  if (!fresh.length) { console.log('삽입할 신규 매장이 없습니다.'); return; }

  // 100건씩 나눠 삽입 (한 번에 실패해도 앞부분은 남도록)
  let inserted = 0;
  for (let i = 0; i < fresh.length; i += 100) {
    const chunk = fresh.slice(i, i + 100);
    const { error } = await sb.from('restaurants').insert(chunk);
    if (error) {
      console.error(`❌ ${i}~${i + chunk.length} 삽입 실패:`, error.message);
      console.error(`   (앞선 ${inserted}건은 삽입 완료된 상태입니다)`);
      process.exit(1);
    }
    inserted += chunk.length;
    console.log(`  ${inserted}/${fresh.length} 삽입`);
  }
  console.log(`\n✅ ${inserted}건 삽입 완료`);
}

main();
