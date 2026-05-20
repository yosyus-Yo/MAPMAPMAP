/**
 * 환영/공지 팝업 (Phase 6, 2026-05-18 / Phase B 확장 2026-05-19)
 *
 * 동작:
 *   - 페이지 로드 시 Supabase에서 announcements (id=1) 페치
 *   - is_active=true면 표시, version 기반 hide_until 키 관리
 *   - "1일간 보지 않기" 체크 + 확인 클릭 시 localStorage에 hide_until 저장
 *   - 다음 진입 시 hide_until > now 면 자동 스킵
 *   - 관리자가 admin view에서 저장 시 version +1 → 모든 사용자 재표시
 *
 * Fallback:
 *   - Supabase 페치 실패 시 HTML에 하드코딩된 본문 + ANNOUNCE_VERSION_FALLBACK 사용
 *
 * 사용 시점: <script src="js/announce.js" defer> — Supabase SDK 로드 후 실행
 */

(function () {
  'use strict';

  const ANNOUNCE_VERSION_FALLBACK = 'v1';  // Supabase 미연결 시 사용 (HTML 하드코딩과 매칭)
  const HIDE_DURATION_MS = 24 * 60 * 60 * 1000;  // 24시간

  // 현재 적용 중인 버전 키 (페치 후 결정)
  let _currentVersionKey = `mmm_announce_hide_${ANNOUNCE_VERSION_FALLBACK}`;

  // ============== 표시/숨김 결정 ==============
  function shouldShow(versionKey) {
    try {
      const hideUntil = parseInt(localStorage.getItem(versionKey) || '0', 10);
      if (Number.isFinite(hideUntil) && hideUntil > Date.now()) {
        return false;
      }
    } catch (e) {
      // localStorage 접근 실패 → 보수적으로 표시
    }
    return true;
  }

  // ============== Supabase에서 공지 페치 + Markdown 렌더 ==============
  // 2026-05-19 markdown 지원으로 전환: marked.js + DOMPurify sanitize
  // CDN은 index.html head에서 로드. 미로드 시 plain text fallback.
  function renderMarkdown(text) {
    if (!text || !text.trim()) return '';
    // marked / DOMPurify 미로드 시 fallback (escape만)
    if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
      const escaped = String(text)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      return `<p>${escaped.replace(/\n/g, '<br>')}</p>`;
    }
    // marked로 markdown → HTML 변환
    const rawHtml = marked.parse(text, {
      breaks: true,    // 줄바꿈을 <br>로 (GFM 스타일)
      gfm: true,       // GitHub-Flavored Markdown
    });
    // DOMPurify로 XSS 차단 (script/iframe/onclick 등 제거)
    return DOMPurify.sanitize(rawHtml);
  }

  // overlay 본문을 페치 결과로 치환
  // 2026-05-19 fix: 미리보기(previewAnnouncement)와 동일 로직으로 통일
  //   - 빈 텍스트도 무조건 sections 교체 (이전 fallback HTML 잔존 방지)
  //   - title도 fallback 적용
  function renderFromSupabase(announcement) {
    const titleEl = document.getElementById('announceTitle');
    const overlay = document.getElementById('announceOverlay');
    if (!titleEl || !overlay) return;

    titleEl.textContent = announcement.title || '🌶 맵맵맵';

    // 본문 섹션 2개 무조건 교체 (빈 markdown이면 빈 div — fallback HTML 잔존 차단)
    const sections = overlay.querySelectorAll('.announce-section');
    if (sections.length >= 2) {
      const noticeHtml = renderMarkdown(announcement.notice_text);
      const howtoHtml = renderMarkdown(announcement.howto_text);
      sections[0].innerHTML = `<h3>📌 공지사항</h3><div class="md-body">${noticeHtml}</div>`;
      sections[1].innerHTML = `<h3>📖 사용방법</h3><div class="md-body">${howtoHtml}</div>`;
    }
  }

  async function fetchAnnouncement() {
    if (!window.API?.announcements?.get) return null;
    try {
      const res = await window.API.announcements.get();
      return res?.announcement || null;
    } catch (e) {
      console.warn('[announce] Supabase 페치 실패 (테이블 미존재 가능 — fallback 사용):', e?.message || e);
      return null;
    }
  }

  function open() {
    const overlay = document.getElementById('announceOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    const cb = document.getElementById('announceHideToday');
    if (cb) cb.checked = false;
  }

  function close() {
    const overlay = document.getElementById('announceOverlay');
    if (!overlay) return;

    const cb = document.getElementById('announceHideToday');
    const hideToday = !!(cb && cb.checked);

    if (hideToday) {
      try {
        const until = Date.now() + HIDE_DURATION_MS;
        localStorage.setItem(_currentVersionKey, String(until));
        console.log(`[announce] 1일간 hide 설정 (${_currentVersionKey}, until: ${new Date(until).toISOString()})`);
      } catch (e) {
        console.warn('[announce] localStorage 저장 실패:', e);
      }
    }

    overlay.style.display = 'none';
  }

  // ============== 이벤트 바인딩 ==============
  function bind() {
    const overlay = document.getElementById('announceOverlay');
    const btnClose = document.getElementById('announceClose');
    const btnConfirm = document.getElementById('announceConfirm');

    if (btnClose) btnClose.addEventListener('click', close);
    if (btnConfirm) btnConfirm.addEventListener('click', close);

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay && overlay.style.display !== 'none') {
        close();
      }
    });
  }

  // ============== 부트스트랩 ==============
  async function init() {
    bind();

    // Supabase 페치 (실패하면 하드코딩 fallback)
    // Supabase SDK 로드를 잠시 기다림 (announce.js가 deps 로드보다 먼저일 수 있음)
    let retries = 0;
    while (!window.API && retries < 20) {
      await new Promise(r => setTimeout(r, 100));
      retries++;
    }

    const ann = await fetchAnnouncement();
    if (ann) {
      // Supabase 페치 성공
      _currentVersionKey = `mmm_announce_hide_v${ann.version}`;
      if (ann.is_active) {
        renderFromSupabase(ann);
        if (shouldShow(_currentVersionKey)) open();
      }
      // is_active=false면 표시 안 함
    } else {
      // 2026-05-20: fetch 실패 시 모달 표시 안 함 (옛 하드코딩 본문 fallback 폐기).
      // 이유: admin이 저장한 내용이 적용 안 된 채 초기 본문이 노출되는 문제 해결.
      // 사용자가 admin에서 announcements 테이블 확인 → is_active=true로 설정 시 다시 표시.
      console.warn('[announce] Supabase 페치 실패 또는 데이터 없음 — 모달 표시 안 함. admin에서 공지 확인 필요.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 디버깅용
  window.__announce = { open, close, fetchAnnouncement };
})();
