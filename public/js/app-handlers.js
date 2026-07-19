/**
 * App Handlers (Phase 7, 2026-05-18)
 *
 * 신버전 인증/레벨/마이페이지/로그아웃 핸들러.
 *
 * 의존성:
 *   - window.API (api.js — IIFE로 wrap됨)
 *   - 시안 inline script의 showView() 전역 함수
 *   - DOM: form-login, form-signup, btn-level-submit, userChip 등
 *
 * 로드 순서:
 *   js/api.js (defer)   → window.API 노출
 *   js/app-handlers.js  → 본 파일 (api.js 이후)
 *
 * 미구현 (다음 turn):
 *   - 리뷰 작성 폼 (review view)
 *   - 관리자 view (admin)
 */

(function () {
  'use strict';

  // ============== 전역 상태 ==============
  let CURRENT_USER = null; // { id, email, nickname, spicy_level, points, is_admin, is_beta_tester }

  // ============== 유틸 ==============
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function showToast(msg, kind = 'info') {
    // 간단한 toast (별도 CSS 없이 alert로 대체 — 추후 toast UI 도입 가능)
    if (kind === 'error') console.error('[toast]', msg);
    alert(msg);
  }

  function showErrorInForm(msg) {
    // 로그인/회원가입 form 에러 표시
    let errEl = document.getElementById('ob-error');
    if (!errEl) {
      // 동적 생성
      const card = document.querySelector('.ob-card');
      if (!card) return;
      errEl = document.createElement('div');
      errEl.id = 'ob-error';
      errEl.style.cssText = 'color: #c5171e; font-size: 12px; margin-top: 12px; padding: 10px 12px; background: rgba(197,23,30,0.08); border-radius: 8px; text-align: center;';
      card.appendChild(errEl);
    }
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }

  function clearFormError() {
    const errEl = document.getElementById('ob-error');
    if (errEl) errEl.style.display = 'none';
  }

  function showLoading(btn, loadingText = '처리 중...') {
    if (!btn) return;
    btn.dataset.originalText = btn.textContent;
    btn.textContent = loadingText;
    btn.disabled = true;
  }

  function hideLoading(btn) {
    if (!btn) return;
    if (btn.dataset.originalText) {
      btn.textContent = btn.dataset.originalText;
      delete btn.dataset.originalText;
    }
    btn.disabled = false;
  }

  // ============== 인증 상태 ==============
  async function initAuth() {
    if (!window.API) {
      console.warn('[app-handlers] window.API 없음 — 인증 초기화 스킵');
      return;
    }
    try {
      const me = await window.API.auth.me();
      if (me && me.success && me.user) {
        CURRENT_USER = me.user;
        onAuthSuccess(CURRENT_USER);
      } else {
        onAuthFail();
      }
    } catch (e) {
      console.log('[app-handlers] 로그인 안 됨 (정상):', e.message);
      onAuthFail();
    }
  }

  function onAuthSuccess(user) {
    CURRENT_USER = user;
    console.log('[app-handlers] ✅ 로그인 사용자:', user.nickname, 'Lv.' + user.spicy_level);
    renderUserChip(user);
    document.body.classList.add('logged-in');  // 2026-06-09: 문의 버튼 offset(chip 왼쪽) 조정용
    // 2026-06-02: 로그인 후 최신 리뷰 색 배지 반영
    if (typeof window.refreshRecentReviews === 'function') window.refreshRecentReviews();

    // 매운맛 레벨 미설정 시 level-setup view로 강제 이동
    if (user.spicy_level === null || user.spicy_level === undefined) {
      if (typeof window.showView === 'function') window.showView('level-setup');
    } else {
      // 정상 → 현재 path가 onboarding 또는 root면 map으로 (2026-05-20: hash → pathname)
      const current = (typeof window.pathToView === 'function'
        ? window.pathToView()
        : (location.pathname.replace(/^\//, '').replace(/\/$/, '') || 'map'));
      if (current === 'onboarding' || current === 'map' || !current) {
        if (typeof window.showView === 'function') window.showView('map');
      }
    }

    // P1-7 (2026-05-18): 페이지 새로고침 race condition fix
    // 사용자가 #mypage 또는 #admin에서 새로고침하면 initAuth가 끝나기 전 view가 먼저
    // active되어 CURRENT_USER=null 상태로 한 번 렌더됨 ("로그인이 필요합니다").
    // 인증 성공 후 active view를 다시 렌더하여 정상 표시.
    if (document.querySelector('[data-view="mypage"].view.active')) {
      renderMyPage();
    }
    if (document.querySelector('[data-view="admin"].view.active')) {
      renderAdminView();
    }
  }

  function onAuthFail() {
    CURRENT_USER = null;
    hideUserChip();
    document.body.classList.remove('logged-in');  // 2026-06-09: 문의 버튼 offset(guest 옆) 복귀
    // 미로그인 시 onboarding view로 (단, map view 보기는 허용 — 비로그인 read-only)
    // 강제 onboarding redirect 안 함 — 사용자가 지도 둘러보기 가능
  }

  function renderUserChip(user) {
    const chip = document.getElementById('userChip');
    const avatar = document.getElementById('userChipAvatar');
    const lvl = document.getElementById('userChipLevel');
    if (!chip) return;
    chip.style.display = '';
    if (avatar) avatar.textContent = (user.nickname || '?').charAt(0);
    if (lvl) {
      const emoji = ['🐥', '👼', '🌶', '🔥', '💣', '💀'][user.spicy_level ?? 0] || '🌶';
      lvl.textContent = `Lv.${user.spicy_level ?? '?'} ${emoji}`;
    }
    // 2026-05-20: 로그인 후 guest-login-btn hide
    const guestBtn = document.getElementById('guestLoginBtn');
    if (guestBtn) guestBtn.style.display = 'none';
  }

  function hideUserChip() {
    const chip = document.getElementById('userChip');
    if (chip) chip.style.display = 'none';
    // 2026-05-20: 비회원 시 guest-login-btn show
    const guestBtn = document.getElementById('guestLoginBtn');
    if (guestBtn) guestBtn.style.display = '';
  }

  // ============== 로그인 ==============
  async function handleLogin() {
    clearFormError();
    const email = $('#login-email')?.value.trim();
    const password = $('#login-password')?.value;

    if (!email || !password) {
      showErrorInForm('이메일과 비밀번호를 입력해주세요');
      return;
    }

    const btn = $('#btn-login-submit');
    showLoading(btn, '🌶 로그인 중...');

    try {
      const res = await window.API.auth.login(email, password);
      if (res && res.success) {
        onAuthSuccess(res.user);
      } else {
        showErrorInForm('로그인 실패');
      }
    } catch (e) {
      showErrorInForm(e.message || '로그인 중 오류가 발생했습니다');
    } finally {
      hideLoading(btn);
    }
  }

  // ============== 회원가입 ==============
  async function handleSignup() {
    clearFormError();
    const email = $('#signup-email')?.value.trim();
    const password = $('#signup-password')?.value;
    const nickname = $('#signup-nickname')?.value.trim();
    // P2-1 (2026-05-18): 매운맛 레벨 회원가입 통합
    const spicyLvlRaw = $('#signup-spicy-level')?.value;
    const spicyLevel = spicyLvlRaw === '' || spicyLvlRaw == null ? null : parseInt(spicyLvlRaw, 10);

    if (!email || !password || !nickname) {
      showErrorInForm('모든 항목을 입력해주세요');
      return;
    }
    if (password.length < 8) {
      showErrorInForm('비밀번호는 8자 이상이어야 합니다');
      return;
    }
    if (nickname.length < 2 || nickname.length > 10) {
      showErrorInForm('닉네임은 2~10자 이내로 입력해주세요');
      return;
    }
    if (spicyLevel === null || isNaN(spicyLevel)) {
      showErrorInForm('매운맛 레벨을 선택해주세요');
      return;
    }

    const btn = $('#btn-signup-submit');
    showLoading(btn, '🌶 가입 중...');

    try {
      const res = await window.API.auth.signup(email, password, nickname, spicyLevel);
      if (res && res.success) {
        CURRENT_USER = res.user;
        renderUserChip(res.user);
        // P2-1: 가입 시 레벨 이미 설정됨 → level-setup 스킵, 바로 map view
        if (typeof window.showView === 'function') window.showView('map');
      } else {
        showErrorInForm('회원가입 실패');
      }
    } catch (e) {
      showErrorInForm(e.message || '회원가입 중 오류가 발생했습니다');
    } finally {
      hideLoading(btn);
    }
  }

  // ============== 매운맛 레벨 설정 ==============
  let _selectedLevel = null;

  function bindLevelGrid() {
    const grid = $('#level-grid');
    if (!grid) return;
    grid.addEventListener('click', (e) => {
      const opt = e.target.closest('.level-option');
      if (!opt) return;
      // active 토글
      $$('#level-grid .level-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      _selectedLevel = parseInt(opt.dataset.level, 10);
      console.log('[level-setup] 선택:', _selectedLevel);
    });
  }

  // P2-3 (2026-05-18): level-setup 완료 후 돌아갈 view (설정 탭 진입 시 'mypage')
  let _levelSetupReturnView = 'map';

  async function handleSetLevel() {
    if (_selectedLevel === null) {
      showToast('레벨을 선택해주세요');
      return;
    }
    if (!CURRENT_USER) {
      showToast('로그인 후 사용 가능합니다');
      if (typeof window.showView === 'function') window.showView('onboarding');
      return;
    }

    const btn = $('#btn-level-submit');
    showLoading(btn, '저장 중...');

    try {
      const res = await window.API.auth.setSpicyLevel(_selectedLevel);
      if (res && res.success) {
        CURRENT_USER.spicy_level = _selectedLevel;
        renderUserChip(CURRENT_USER);
        // 2026-06-02: 레벨 변경 후 최신 리뷰 색 배지 재계산
        if (typeof window.refreshRecentReviews === 'function') window.refreshRecentReviews();
        showToast('매운맛 레벨이 변경되었습니다');
        // P2-3: 설정 탭에서 진입한 경우 mypage로 복귀, 그 외 map으로
        const returnView = _levelSetupReturnView || 'map';
        _levelSetupReturnView = 'map';  // 리셋
        if (typeof window.showView === 'function') window.showView(returnView);
      } else {
        showToast('레벨 설정 실패');
      }
    } catch (e) {
      showToast(e.message || '레벨 설정 중 오류');
    } finally {
      hideLoading(btn);
    }
  }

  // ============== 마이페이지 ==============
  async function renderMyPage() {
    const content = $('#mp-content');
    if (!content) return;

    // 로그아웃 버튼 토글 (CURRENT_USER 존재 여부 기준)
    const logoutWrap = $('#mp-logout-wrap');
    if (logoutWrap) logoutWrap.style.display = CURRENT_USER ? 'block' : 'none';

    if (!CURRENT_USER) {
      content.innerHTML = `
        <div style="padding: 24px 18px; text-align:center; color:var(--text-3); font-size:13px; line-height:1.7">
          <div style="font-size:36px; margin-bottom:8px">🌶</div>
          <div>로그인 후 내 리뷰와 포인트 내역을 확인할 수 있어요</div>
          <button class="btn btn-primary" style="margin-top:14px; padding:8px 16px; font-size:13px"
            onclick="(function(){if(typeof window.showView==='function')window.showView('onboarding');})()">
            로그인하기 →
          </button>
        </div>`;
      return;
    }

    // Hero 갱신
    const nick = $('#mp-nickname');
    const meta = $('#mp-meta');
    const avatar = $('#mp-avatar');
    const badges = $('#mp-badges');
    const u = CURRENT_USER;
    if (nick) nick.textContent = u.nickname + (u.spicy_level !== null ? ` Lv.${u.spicy_level}` : '');
    if (meta) {
      const createdDate = u.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : '—';
      meta.textContent = `가입 ${createdDate} · ${u.email}`;
    }
    if (avatar) avatar.textContent = (u.nickname || '?').charAt(0);
    if (badges) {
      const arr = [];
      if (u.spicy_level !== null && u.spicy_level !== undefined) {
        const emoji = ['🐥', '👼', '🌶', '🔥', '💣', '💀'][u.spicy_level] || '🌶';
        const name = ['맵찔이', '맵초보', '맵보통', '맵니아', '맵고수', '맵친자'][u.spicy_level] || '?';
        arr.push(`<span class="b">Lv.${u.spicy_level} ${name} ${emoji}</span>`);
      }
      if (u.is_beta_tester) arr.push('<span class="b">❤ 베타테스터</span>');
      if (u.is_admin) arr.push('<span class="b">⚙️ 관리자</span>');
      badges.innerHTML = arr.join('');
    }

    // Stats 갱신 (myList + favorites count)
    try {
      const [myReviewsRes, favRes] = await Promise.all([
        window.API.reviews.myList(),
        window.API.favorites && window.API.favorites.list ? window.API.favorites.list().catch(() => null) : Promise.resolve(null)
      ]);
      const reviews = myReviewsRes?.reviews || [];
      const favoritesCount = favRes?.favorites?.length || 0;

      $('#mp-stat-reviews') && ($('#mp-stat-reviews').textContent = reviews.length);
      $('#mp-stat-points') && ($('#mp-stat-points').textContent = (u.points || 0).toLocaleString());
      const approvedCount = reviews.filter(r => r.status === 'approved').length;
      const totalCount = reviews.length;
      $('#mp-stat-rate') && ($('#mp-stat-rate').textContent = totalCount ? Math.round((approvedCount / totalCount) * 100) + '%' : '—');
      $('#mp-stat-favorites') && ($('#mp-stat-favorites').textContent = favoritesCount);

      // P2-2 (2026-05-18): 탭 dispatcher — 현재 탭(_currentMpTab)에 맞는 렌더 호출
      await _renderMypageTab(_currentMpTab || 'reviews', { reviews, favoritesCount });
    } catch (e) {
      console.error('[mypage] 데이터 로드 실패:', e);
      content.innerHTML = `<div style="padding:24px; text-align:center; color:#c5171e">데이터 로드 실패: ${escapeHtml(e.message)}</div>`;
    }
  }

  // ============== Mypage 탭 시스템 (P2-2, 2026-05-18) ==============
  let _currentMpTab = 'reviews';  // 'reviews' | 'favorites' | 'points' | 'settings'

  async function _renderMypageTab(tab, cached) {
    _currentMpTab = tab;
    const content = $('#mp-content');
    if (!content) return;

    // 탭 버튼 active 표시
    document.querySelectorAll('.mp-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.mpTab === tab);
    });

    if (tab === 'reviews') {
      _renderMypageReviewsTab(cached?.reviews || []);
    } else if (tab === 'favorites') {
      await _renderMypageFavoritesTab();
    } else if (tab === 'points') {
      _renderMypagePointsTab();
    } else if (tab === 'settings') {
      _renderMypageSettingsTab();
    }
  }

  function _renderMypageReviewsTab(reviews) {
    const content = $('#mp-content');
    if (!content) return;
    if (reviews.length === 0) {
      content.innerHTML = `
        <div style="padding: 24px 18px; text-align:center; color:var(--text-3); font-size:13px; line-height:1.7">
          <div style="font-size:36px; margin-bottom:8px">📝</div>
          <div>아직 작성한 리뷰가 없어요</div>
          <div style="font-size:11px; color:var(--text-4); margin-top:4px">하단 ✍ 제보 탭에서 첫 리뷰를 남겨보세요</div>
        </div>`;
      return;
    }
    content.innerHTML = reviews.map(r => {
      const date = r.created_at ? new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '';
      const statusLabel = r.status === 'approved' ? '✅ 승인' : r.status === 'pending' ? '⏳ 승인 대기' : '❌ 반려';
      const statusClass = r.status === 'approved' ? 'status-approved' : r.status === 'pending' ? 'status-pending' : '';
      const restaurantName = r.restaurant_name || r.restaurants?.name || '알 수 없음';
      const lvl = r.spicy_level ?? '?';
      const reasonHtml = r.status === 'rejected' && r.reject_reason
        ? `<div style="font-size:11px; color:#c5171e; margin-top:4px;">반려 사유: ${escapeHtml(r.reject_reason)}</div>`
        : '';
      return `
        <div class="mp-review-card" data-review-id="${escapeHtml(r.id)}">
          <div class="head">
            <div><h4>${escapeHtml(restaurantName)}</h4><span class="tag tag-s${lvl}" style="margin-top:4px;">Lv.${lvl}</span></div>
            <span class="date">${escapeHtml(date)}</span>
          </div>
          <div class="body">${escapeHtml(r.comment || '(코멘트 없음)')}</div>
          <div class="meta">
            <span>🍜 ${escapeHtml(r.menu_name || '')}</span>
            <span class="status ${statusClass}">${statusLabel}</span>
          </div>
          ${reasonHtml}
          <div style="margin-top:10px; text-align:right;">
            <button class="mp-review-delete-btn" data-action="delete-review" data-review-id="${escapeHtml(r.id)}"
              style="font-size:11px; padding:5px 11px; border:1px solid var(--border); background:transparent; color:var(--text-3); border-radius:6px; cursor:pointer; transition:all .15s;"
              onmouseover="this.style.background='#fff5f5'; this.style.color='#c5171e'; this.style.borderColor='#c5171e';"
              onmouseout="this.style.background='transparent'; this.style.color='var(--text-3)'; this.style.borderColor='var(--border)';">
              🗑 삭제
            </button>
          </div>
        </div>`;
    }).join('');
    content.querySelectorAll('[data-action="delete-review"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-review-id');
        if (id) deleteMyReview(id);
      });
    });
  }

  async function _renderMypageFavoritesTab() {
    const content = $('#mp-content');
    if (!content) return;
    content.innerHTML = `<div style="padding:24px; text-align:center; color:var(--text-3); font-size:12px;">⏳ 찜한 곳 로딩...</div>`;
    try {
      const res = await window.API.favorites.list();
      const favs = res?.favorites || [];
      if (favs.length === 0) {
        content.innerHTML = `
          <div style="padding:24px 18px; text-align:center; color:var(--text-3); font-size:13px; line-height:1.7">
            <div style="font-size:36px; margin-bottom:8px">🤍</div>
            <div>아직 찜한 가게가 없어요</div>
            <div style="font-size:11px; color:var(--text-4); margin-top:4px">지도에서 가게 카드의 ❤ 아이콘으로 추가하세요</div>
          </div>`;
        return;
      }
      content.innerHTML = favs.map(f => {
        const name = f.restaurant_name || f.restaurants?.name || '알 수 없음';
        const addr = f.restaurant_address || f.restaurants?.address || '';
        const avgLvl = f.avg_level ?? f.restaurants?.avg_level;
        const lvlText = avgLvl != null ? `Lv.${avgLvl.toFixed ? avgLvl.toFixed(1) : avgLvl}` : '평가 없음';
        return `
          <div class="mp-fav-card" data-restaurant-id="${escapeHtml(f.restaurant_id || f.id || '')}"
            style="padding:12px 14px; border-bottom:1px solid var(--border); cursor:pointer; transition:background .12s;"
            onmouseover="this.style.background='var(--surface)'"
            onmouseout="this.style.background='transparent'">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
              <div style="flex:1; min-width:0;">
                <div style="font-size:14px; font-weight:700; color:var(--text); margin-bottom:3px;">${escapeHtml(name)}</div>
                <div style="font-size:11px; color:var(--text-3); margin-bottom:4px;">${escapeHtml(addr)}</div>
                <div style="font-size:11px; color:var(--spice); font-weight:600;">🌶 ${escapeHtml(lvlText)}</div>
              </div>
              <button class="fav-remove-btn" data-restaurant-id="${escapeHtml(f.restaurant_id || f.id || '')}"
                style="font-size:11px; padding:5px 10px; border:1px solid var(--border); background:transparent; color:var(--text-3); border-radius:6px; cursor:pointer; flex-shrink:0;"
                onmouseover="this.style.background='#fff5f5'; this.style.color='#c5171e'; this.style.borderColor='#c5171e';"
                onmouseout="this.style.background='transparent'; this.style.color='var(--text-3)'; this.style.borderColor='var(--border)';"
                title="찜 해제">💔</button>
            </div>
          </div>`;
      }).join('');
      // 찜 해제 클릭 위임
      content.querySelectorAll('.fav-remove-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const rid = btn.dataset.restaurantId;
          if (!rid) return;
          if (!confirm('이 가게를 찜 목록에서 제거하시겠습니까?')) return;
          try {
            await window.API.favorites.remove(rid);
            showToast('찜이 해제되었습니다');
            await renderMyPage();
          } catch (err) {
            showToast('해제 실패: ' + (err.message || err), 'error');
          }
        });
      });
    } catch (e) {
      console.error('[favorites] 로드 실패:', e);
      content.innerHTML = `<div style="padding:24px; text-align:center; color:#c5171e">로드 실패: ${escapeHtml(e.message || e)}</div>`;
    }
  }

  function _renderMypagePointsTab() {
    const content = $('#mp-content');
    if (!content) return;
    const u = CURRENT_USER;
    const points = u?.points || 0;
    content.innerHTML = `
      <div style="padding:24px 18px;">
        <div style="background:var(--gradient); color:white; border-radius:var(--r-md); padding:24px; text-align:center; margin-bottom:18px; box-shadow:0 4px 12px rgba(197,23,30,0.2);">
          <div style="font-size:11px; opacity:0.9; margin-bottom:6px;">현재 누적 포인트</div>
          <div style="font-size:36px; font-weight:700; letter-spacing:-0.5px; font-family:'Berkeley Mono', ui-monospace, monospace;">
            ${points.toLocaleString()} P
          </div>
        </div>
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--r-sm); padding:14px; font-size:12px; line-height:1.7; color:var(--text-2);">
          <div style="font-weight:700; color:var(--text); margin-bottom:8px;">💎 포인트 적립 안내</div>
          <div>• 리뷰 1건 승인 시 <strong>+50P</strong></div>
          <div>• 영수증 인증 시 추가 보너스</div>
          <div>• 베타테스터 활동 시 특별 보너스</div>
          <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border); font-size:11px; color:var(--text-4);">
            ℹ 포인트 사용 내역은 추후 업데이트 예정입니다
          </div>
        </div>
      </div>`;
  }

  function _renderMypageSettingsTab() {
    const content = $('#mp-content');
    if (!content) return;
    const u = CURRENT_USER;
    content.innerHTML = `
      <div style="padding:18px;">
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--r-sm); padding:14px; margin-bottom:12px;">
          <div style="font-size:11px; font-weight:600; color:var(--text-3); margin-bottom:8px;">계정</div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
            <div>
              <div style="font-size:12px; color:var(--text-2);">닉네임</div>
              <div style="font-size:14px; font-weight:600; margin-top:2px;">${escapeHtml(u?.nickname || '—')}</div>
            </div>
            <button id="mp-edit-nickname" style="font-size:11px; padding:6px 12px; border:1px solid var(--border); background:var(--bg); border-radius:6px; cursor:pointer;">변경</button>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0;">
            <div>
              <div style="font-size:12px; color:var(--text-2);">매운맛 레벨</div>
              <div style="font-size:14px; font-weight:600; margin-top:2px;">
                ${u?.spicy_level != null ? `Lv.${u.spicy_level} ${['🐥','👼','🌶','🔥','💣','💀'][u.spicy_level] || ''}` : '—'}
              </div>
            </div>
            <button id="mp-edit-level" style="font-size:11px; padding:6px 12px; border:1px solid var(--border); background:var(--bg); border-radius:6px; cursor:pointer;">변경</button>
          </div>
        </div>

        <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--r-sm); padding:14px; margin-bottom:12px;">
          <div style="font-size:11px; font-weight:600; color:var(--text-3); margin-bottom:8px;">정보</div>
          <div style="font-size:12px; color:var(--text-2); padding:4px 0;">
            <span style="color:var(--text-3);">이메일: </span>${escapeHtml(u?.email || '—')}
          </div>
          <div style="font-size:12px; color:var(--text-2); padding:4px 0;">
            <span style="color:var(--text-3);">가입일: </span>${u?.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : '—'}
          </div>
          ${u?.is_admin ? `<div style="margin-top:8px; padding:6px 10px; background:#fff5f5; border:1px solid #fcc; border-radius:6px; font-size:11px; color:#c5171e;">⚙️ 관리자 권한 (#godmap 접근 가능)</div>` : ''}
        </div>

        <button id="mp-logout-btn" style="width:100%; padding:11px; font-size:13px; font-weight:600; background:transparent; color:#c5171e; border:1px solid #c5171e; border-radius:var(--r-sm); cursor:pointer;">로그아웃</button>
      </div>`;

    // Bind 핸들러
    $('#mp-edit-nickname')?.addEventListener('click', async () => {
      const newNick = prompt('새 닉네임 (2-10자)', u.nickname);
      if (!newNick || newNick.length < 2 || newNick.length > 10) {
        if (newNick !== null) showToast('닉네임은 2-10자 사이여야 합니다', 'error');
        return;
      }
      try {
        // API 부재 → Supabase 직접 호출
        const sb = window.API._sbClient ? window.API._sbClient() : null;
        if (sb && sb.from) {
          const { error } = await sb.from('users').update({ nickname: newNick }).eq('id', u.id);
          if (error) throw error;
        } else {
          // fallback: api.js initSupabase 사용 — window.supabase 직접
          const supa = window.supabase?.createClient ? window.supabase.createClient(
            'https://xwnqpsnagdcleseqifqv.supabase.co',
            'sb_publishable_plHB6vw9K1bbWpr6xtkFXA_heBnWR4U'
          ) : null;
          if (!supa) throw new Error('Supabase client 미초기화');
          const { error } = await supa.from('users').update({ nickname: newNick }).eq('id', u.id);
          if (error) throw error;
        }
        CURRENT_USER.nickname = newNick;
        renderUserChip(CURRENT_USER);
        showToast('닉네임이 변경되었습니다');
        renderMyPage();
      } catch (e) {
        console.error('[nickname-update] 실패:', e);
        showToast('닉네임 변경 실패: ' + (e.message || e), 'error');
      }
    });

    $('#mp-edit-level')?.addEventListener('click', () => {
      // P2-3 (2026-05-18): 설정 탭에서 진입했음을 기록 → 완료 후 mypage 복귀
      _levelSetupReturnView = 'mypage';
      // 현재 레벨을 picker에 미리 선택 표시
      if (CURRENT_USER && CURRENT_USER.spicy_level != null) {
        setTimeout(() => {
          document.querySelectorAll('#level-grid .level-option').forEach(o => {
            o.classList.toggle('selected', parseInt(o.dataset.level, 10) === CURRENT_USER.spicy_level);
          });
          _selectedLevel = CURRENT_USER.spicy_level;
        }, 100);
      }
      if (typeof window.showView === 'function') window.showView('level-setup');
    });

    $('#mp-logout-btn')?.addEventListener('click', handleLogout);
  }

  // P2-2 (2026-05-18): 탭 클릭 시 index.html에서 호출. _currentMpTab 변경 + renderMyPage 재호출.
  async function switchMypageTab(tabName) {
    _currentMpTab = tabName;
    await renderMyPage();
  }

  // ============== 내 리뷰 삭제 (P1-1, 2026-05-18) ==============
  // 구버전 deleteMyReview() 포팅. API.reviews.delete()는 신버전 api.js:495에 이미 존재 (RLS-safe + 통계 재계산 포함).
  // 본인 리뷰만 삭제 가능 (서버측 검증). approved 리뷰 삭제 시 restaurants.avg_level/review_count 자동 재계산.
  async function deleteMyReview(reviewId) {
    if (!reviewId) return;
    if (!confirm('정말 이 리뷰를 삭제하시겠습니까?\n승인된 리뷰는 삭제 시 가게 통계도 함께 재계산됩니다.')) return;

    // 삭제 버튼들 잠시 비활성화 (중복 클릭 방지)
    const allBtns = document.querySelectorAll('[data-action="delete-review"]');
    allBtns.forEach(b => { b.disabled = true; b.style.opacity = '0.5'; });

    try {
      await window.API.reviews.delete(reviewId);
      showToast('리뷰가 삭제되었습니다', 'success');
      // 마이페이지 리렌더 — 카운트/통계도 갱신
      await renderMyPage();
    } catch (e) {
      console.error('[deleteMyReview] 실패:', e);
      showToast(e?.message || '리뷰 삭제에 실패했습니다', 'error');
      // 실패 시 버튼 복구
      allBtns.forEach(b => { b.disabled = false; b.style.opacity = '1'; });
    }
  }

  // ============== 로그아웃 ==============
  async function handleLogout() {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    try {
      await window.API.auth.logout();
      CURRENT_USER = null;
      hideUserChip();
      // Admin auth flag 클리어 (P1-4) — 다음 admin 진입 시 재인증 강제
      try { sessionStorage.removeItem('admin_auth_passed'); } catch (e) {}
      if (typeof window.showView === 'function') window.showView('onboarding');
    } catch (e) {
      console.error('[logout] 실패:', e);
      showToast('로그아웃 중 오류');
    }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ============== Phase 9: 리뷰 작성 ==============
  let _selectedSpicy = null;
  let _selectedRating = null;  // 2026-05-20: 자체 별점 시스템 (Option B)
  let _foodImages = []; // File[]
  let _receiptImage = null; // File

  function bindReviewLevelSelector() {
    const sel = $('#rv-level-selector');
    if (!sel) return;
    sel.addEventListener('click', (e) => {
      const pick = e.target.closest('.level-pick');
      if (!pick) return;
      $$('#rv-level-selector .level-pick').forEach(p => p.classList.remove('selected'));
      pick.classList.add('selected');
      _selectedSpicy = parseInt(pick.dataset.spicy, 10);
    });
  }

  // 별점 입력 핸들러 (2026-05-20, 자체 별점 시스템 Option B)
  function bindReviewRatingSelector() {
    const sel = $('#rv-rating-selector');
    if (!sel) return;
    const labels = { 1: '별로예요', 2: '아쉬워요', 3: '괜찮아요', 4: '맛있어요', 5: '최고예요' };
    sel.addEventListener('click', (e) => {
      const btn = e.target.closest('.star-btn');
      if (!btn) return;
      const rating = parseInt(btn.dataset.rating, 10);
      _selectedRating = rating;
      // 별 채우기 (1~rating까지 ★, 나머지 ☆)
      $$('#rv-rating-selector .star-btn').forEach(b => {
        const r = parseInt(b.dataset.rating, 10);
        const filled = r <= rating;
        b.textContent = filled ? '★' : '☆';
        b.classList.toggle('active', filled);
      });
      const labelEl = $('#rv-rating-label');
      if (labelEl) labelEl.textContent = `${rating}점 — ${labels[rating]}`;
      const hidden = $('#rv-rating');
      if (hidden) hidden.value = String(rating);
    });
  }

  function renderFoodPhotoUploader() {
    const wrap = $('#rv-photo-uploader');
    if (!wrap) return;
    const slots = _foodImages.map((file, idx) => {
      const url = URL.createObjectURL(file);
      return `<div class="photo-slot filled" style="background-image:url('${url}'); background-size:cover; background-position:center; position:relative">
        <button type="button" data-remove-food="${idx}" style="position:absolute; top:-6px; right:-6px; width:22px; height:22px; border-radius:999px; border:none; background:#c5171e; color:white; font-size:12px; cursor:pointer; line-height:1; display:flex; align-items:center; justify-content:center">×</button>
      </div>`;
    }).join('');
    const addBtn = _foodImages.length < 5
      ? `<div class="photo-slot" data-action="add-food"><div class="pic">📷</div><div class="lbl">사진 추가</div></div>`
      : '';
    wrap.innerHTML = slots + addBtn;
  }

  // HEIC → JPEG 변환 (iPhone 사진 호환, v1 이식 2026-05-19)
  // heic2any CDN이 index.html head에서 로드됨. typeof 체크로 안전 호출.
  async function convertHeicIfNeeded(file) {
    const isHeic = file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif');
    if (!isHeic) return file;
    if (typeof heic2any === 'undefined') {
      showToast('HEIC 변환 라이브러리 미로드 — 새로고침 후 다시 시도', 'error');
      return null;
    }
    try {
      showToast('아이폰 사진 변환 중...', 'info');
      const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
      const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
      return new File([blob], newFileName, { type: 'image/jpeg' });
    } catch (error) {
      console.error('HEIC 변환 오류:', error);
      showToast('이미지 변환 실패', 'error');
      return null;
    }
  }

  function bindReviewPhotoUploader() {
    const wrap = $('#rv-photo-uploader');
    const input = $('#rv-food-images');
    if (!wrap || !input) return;
    wrap.addEventListener('click', (e) => {
      const addBtn = e.target.closest('[data-action="add-food"]');
      const removeBtn = e.target.closest('[data-remove-food]');
      if (addBtn) {
        input.click();
      } else if (removeBtn) {
        const idx = parseInt(removeBtn.dataset.removeFood, 10);
        _foodImages.splice(idx, 1);
        renderFoodPhotoUploader();
      }
    });
    input.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      for (const original of files) {
        if (_foodImages.length >= 5) break;
        // HEIC → JPEG 자동 변환 (iPhone 호환)
        const f = await convertHeicIfNeeded(original);
        if (!f) continue; // 변환 실패
        if (f.size > 5 * 1024 * 1024) {
          showErrorInReview(`${f.name}: 5MB 초과`);
          continue;
        }
        _foodImages.push(f);
      }
      renderFoodPhotoUploader();
      input.value = ''; // 같은 파일 다시 선택 가능
    });
  }

  function bindReviewReceipt() {
    const zone = $('#rv-receipt-zone');
    const input = $('#rv-receipt-image');
    if (!zone || !input) return;
    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', async (e) => {
      const original = e.target.files?.[0];
      if (!original) return;
      // HEIC → JPEG 자동 변환 (iPhone 호환)
      const f = await convertHeicIfNeeded(original);
      if (!f) { input.value = ''; return; }
      if (f.size > 5 * 1024 * 1024) {
        showErrorInReview('영수증: 5MB 초과');
        input.value = '';
        return;
      }
      _receiptImage = f;
      const url = URL.createObjectURL(f);
      zone.innerHTML = `
        <div style="position:relative">
          <img src="${url}" alt="영수증" style="max-height:160px; max-width:100%; border-radius:8px; object-fit:contain">
          <button type="button" id="btn-receipt-remove" style="position:absolute; top:-6px; right:-6px; width:24px; height:24px; border-radius:999px; border:none; background:#c5171e; color:white; cursor:pointer">×</button>
        </div>
        <div style="font-size:11px; color:var(--success); margin-top:6px">✅ 영수증 등록됨 (+50P)</div>`;
      const removeBtn = $('#btn-receipt-remove');
      if (removeBtn) {
        removeBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          _receiptImage = null;
          input.value = '';
          resetReceiptZone();
        });
      }
    });
  }

  function resetReceiptZone() {
    const zone = $('#rv-receipt-zone');
    if (!zone) return;
    zone.innerHTML = `
      <div class="icon">🧾</div>
      <div class="label">영수증 사진 업로드 (필수)</div>
      <div class="hint">JPG/PNG/WebP, 최대 5MB</div>`;
  }

  function bindReviewCommentCounter() {
    const ta = $('#rv-comment');
    const cnt = $('#rv-comment-count');
    if (!ta || !cnt) return;
    ta.addEventListener('input', () => {
      cnt.textContent = ta.value.length;
      cnt.style.color = ta.value.length >= 30 ? 'var(--success)' : 'var(--text-3)';
    });
  }

  function showErrorInReview(msg) {
    const err = $('#rv-error');
    if (!err) {
      alert(msg);
      return;
    }
    err.textContent = msg;
    err.style.display = 'block';
    err.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearReviewError() {
    const err = $('#rv-error');
    if (err) err.style.display = 'none';
  }

  function resetReviewForm() {
    $('#rv-restaurant-name') && ($('#rv-restaurant-name').value = '');
    $('#rv-restaurant-address') && ($('#rv-restaurant-address').value = '');
    $('#rv-menu-name') && ($('#rv-menu-name').value = '');
    $('#rv-comment') && ($('#rv-comment').value = '');
    $('#rv-comment-count') && ($('#rv-comment-count').textContent = '0');
    $$('#rv-level-selector .level-pick').forEach(p => p.classList.remove('selected'));
    _selectedSpicy = null;
    // 2026-05-20: 별점 리셋
    _selectedRating = null;
    $$('#rv-rating-selector .star-btn').forEach(b => { b.textContent = '☆'; b.classList.remove('active'); });
    const ratingLabel = $('#rv-rating-label');
    if (ratingLabel) ratingLabel.textContent = '선택해주세요';
    const ratingHidden = $('#rv-rating');
    if (ratingHidden) ratingHidden.value = '';
    _foodImages = [];
    _receiptImage = null;
    renderFoodPhotoUploader();
    resetReceiptZone();
    clearReviewError();
    // 가게 검색 상태도 초기화
    clearSelectedPlace();
  }

  // ============== 카카오 장소 검색 (2026-05-18 통합) ==============
  const KAKAO_MAP_KEY = '80397851cbdcec5a798a9cd405203780';
  let placesService = null;
  let kakaoSdkLoading = null;

  function loadKakaoSdk() {
    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      console.log('[kakao-sdk] 이미 로드됨, 재사용');
      // 다른 코드(initMainMap 등)가 SDK를 먼저 load했더라도 placesService는 본 모듈 scope 변수.
      // null이면 늦은 init으로 보강 — 이게 없으면 "이미 로드됨" + "SDK 로드 실패" 동시 발생 (2026-05-19 fix)
      if (!placesService) {
        try {
          placesService = new window.kakao.maps.services.Places();
          console.log('[kakao-sdk] Places service 늦은 생성 성공');
        } catch (e) {
          console.error('[kakao-sdk] Places service 늦은 생성 실패:', e);
          return Promise.resolve(false);
        }
      }
      return Promise.resolve(true);
    }
    if (kakaoSdkLoading) {
      console.log('[kakao-sdk] 로드 진행 중, 기존 Promise 반환');
      return kakaoSdkLoading;
    }
    console.log('[kakao-sdk] SDK 로드 시작:', KAKAO_MAP_KEY);
    kakaoSdkLoading = new Promise((resolve) => {
      const script = document.createElement('script');
      // P2-4 (2026-05-18) 최종: 명시 https.
      // 콘솔 로그로 확인 — 페이지가 http://localhost로 로드 중 → protocol-relative `//` 가 `http://`로 해석됨
      // 카카오 SDK는 http 거부 → onerror. https 명시로 해결.
      // (Mixed Content는 https 페이지 → http 리소스 케이스만 차단. http 페이지 → https는 허용.)
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&libraries=services&autoload=false`;
      console.log('[kakao-sdk] script src:', script.src);
      script.onload = () => {
        console.log('[kakao-sdk] script onload 발동, window.kakao:', !!window.kakao);
        if (!window.kakao || !window.kakao.maps) {
          console.error('[kakao-sdk] window.kakao.maps 미생성 — 도메인 미등록 또는 JS key 비활성 가능');
          resolve(false);
          return;
        }
        window.kakao.maps.load(() => {
          console.log('[kakao-sdk] kakao.maps.load 완료, services:', !!window.kakao.maps.services);
          try {
            placesService = new window.kakao.maps.services.Places();
            console.log('[kakao-sdk] Places service 생성 성공');
            resolve(true);
          } catch (e) {
            console.error('[kakao-sdk] Places service 생성 실패:', e);
            resolve(false);
          }
        });
      };
      script.onerror = (e) => {
        console.error('[kakao-sdk] script onerror 발동 — 네트워크/CORS/광고차단 가능:', e);
        resolve(false);
      };
      document.head.appendChild(script);
    });
    return kakaoSdkLoading;
  }

  // 네이버 지도 링크 감지 (v1 이식 Phase B, 2026-05-19)
  // 사용자가 네이버 지도 URL을 검색창에 붙여넣으면 안내 토스트 표시
  // (실제 좌표 파싱은 복잡하므로 가게명 직접 입력 유도)
  function parseNaverMapLink(text) {
    if (!text || !text.trim()) return false;
    const t = text.trim();
    const isNaverMap = t.includes('naver.me') || t.includes('map.naver.com') || t.includes('naver.com/place');
    if (!isNaverMap) return false;
    showToast('네이버 지도 링크 감지 — 가게 이름으로 검색해주세요', 'info');
    return true;
  }

  async function searchPlace() {
    const input = $('#rv-place-search');
    const resultsDiv = $('#rv-place-results');
    if (!input || !resultsDiv) return;
    const keyword = input.value.trim();
    // 네이버 지도 링크면 안내만 (검색 진행 안 함 — 링크는 가게명 아님)
    if (parseNaverMapLink(keyword)) {
      input.value = '';
      return;
    }
    if (!keyword) {
      showToast('검색어를 입력해주세요');
      return;
    }

    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<div style="padding:14px; text-align:center; color:var(--text-3); font-size:12px">🔍 검색 중...</div>';

    const ok = await loadKakaoSdk();
    if (!ok || !placesService) {
      resultsDiv.innerHTML = '<div style="padding:14px; text-align:center; color:#c5171e; font-size:12px">카카오맵 SDK 로드 실패</div>';
      return;
    }

    // 사용자 위치 받아서 거리순 정렬 (2026-05-19)
    // window.getUserPosition은 index.html에서 노출. 위치 거부/실패 시 null → 정렬 생략
    const userPos = typeof window.getUserPosition === 'function'
      ? await window.getUserPosition()
      : null;

    // ⚠️ 검색 자체에는 location/radius를 넘기지 않는다.
    // Kakao Local API의 radius는 랭킹 힌트가 아니라 하드 필터라, 반경 밖 가게는
    // 이름이 정확히 일치해도 결과에서 제외된다. 1회차(위치 미획득)와 2회차(캐시됨)의
    // 결과가 달라지던 버그의 원인. 거리 정렬은 받은 결과에 대해 클라이언트에서 수행.
    placesService.keywordSearch(keyword, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        displaySearchResults(sortByDistance(result, userPos));
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        // 카카오 0건 → 네이버 지역검색으로 보완 (카카오가 못 찾는 가게 fallback)
        searchNaverFallback(keyword, resultsDiv);
      } else {
        resultsDiv.innerHTML = '<div style="padding:14px; text-align:center; color:#c5171e; font-size:12px">검색 중 오류가 발생했습니다</div>';
      }
    });
  }

  // 검색 결과를 사용자 위치 기준 거리순으로 재정렬. userPos 없으면 원본(정확도순) 유지.
  // 좌표 없는 항목(네이버 fallback 등)은 뒤로 밀되 상대 순서는 보존.
  function sortByDistance(places, userPos) {
    if (!userPos || !Array.isArray(places)) return places;
    return places
      .map((p, i) => ({ p, i, d: distanceKm(userPos.lat, userPos.lng, toNum(p.y), toNum(p.x)) }))
      .sort((a, b) => {
        if (a.d === null && b.d === null) return a.i - b.i;
        if (a.d === null) return 1;
        if (b.d === null) return -1;
        return a.d - b.d;
      })
      .map(e => e.p);
  }

  // '' / null / undefined → NaN (Number()는 이 셋을 0으로 바꿔 좌표 없는 항목을 (0,0)으로 오인)
  function toNum(v) {
    if (v === null || v === undefined || v === '') return NaN;
    return Number(v);
  }

  function distanceKm(lat1, lng1, lat2, lng2) {
    if (!Number.isFinite(lat2) || !Number.isFinite(lng2)) return null;
    const R = 6371;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  // 카카오 0건 시 네이버 지역검색으로 보완. naver-place Edge Function(CORS 프록시) 호출.
  // 네이버 결과를 카카오 place 구조({place_name, road_address_name, _source})로 정규화해
  // displaySearchResults/selectPlace를 그대로 재사용한다. 좌표는 선택 시 지오코딩으로 확보.
  async function searchNaverFallback(keyword, resultsDiv) {
    resultsDiv.innerHTML = '<div style="padding:14px; text-align:center; color:var(--text-3); font-size:12px">🔍 네이버에서 검색 중...</div>';
    try {
      const sb = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
      if (!sb || !sb.functions) throw new Error('supabase client 미준비');
      const { data, error } = await sb.functions.invoke('naver-place', { body: { name: keyword } });
      if (error) throw error;
      const items = (data && Array.isArray(data.items)) ? data.items : [];
      if (items.length === 0) {
        resultsDiv.innerHTML = '<div style="padding:14px; text-align:center; color:var(--text-3); font-size:12px">검색 결과가 없습니다</div>';
        return;
      }
      // 네이버 결과 → 카카오 place 구조 정규화 (좌표 x/y는 선택 시 지오코딩으로 채움)
      const places = items.map((it) => ({
        place_name: it.title,
        road_address_name: it.address,
        address_name: it.address,
        category_name: it.category || '',
        _source: 'naver',
        x: null,
        y: null,
      }));
      displaySearchResults(places);
    } catch (e) {
      console.error('[naver fallback] 실패:', e);
      resultsDiv.innerHTML = '<div style="padding:14px; text-align:center; color:var(--text-3); font-size:12px">검색 결과가 없습니다</div>';
    }
  }

  // 주소 → WGS84 좌표 (카카오 Geocoder). 네이버 결과엔 호환 좌표(KATECH)뿐이라 변환 필요.
  function geocodeAddress(address) {
    return new Promise((resolve) => {
      if (!address || !window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
        resolve(null);
        return;
      }
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(address, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK && result && result[0]) {
          resolve({ x: result[0].x, y: result[0].y });  // x=lng, y=lat (WGS84)
        } else {
          resolve(null);
        }
      });
    });
  }

  function displaySearchResults(places) {
    const resultsDiv = $('#rv-place-results');
    if (!resultsDiv) return;
    resultsDiv.innerHTML = '';
    places.slice(0, 10).forEach((place) => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:10px 14px; border-bottom:1px solid var(--border); cursor:pointer; transition:background 0.15s';
      item.onmouseenter = () => { item.style.background = 'rgba(197,23,30,0.06)'; };
      item.onmouseleave = () => { item.style.background = ''; };
      item.innerHTML = `
        <div style="font-weight:600; font-size:13px; color:var(--text)">${escapeHtmlHelper(place.place_name)}${place._source === 'naver' ? ' <span style="font-size:9px; color:#03c75a; border:1px solid #03c75a; border-radius:3px; padding:0 3px; vertical-align:middle">N</span>' : ''}</div>
        <div style="font-size:11px; color:var(--text-3); margin-top:2px">${escapeHtmlHelper(place.road_address_name || place.address_name || '')}</div>
        ${place.category_name ? `<div style="font-size:10px; color:var(--text-4); margin-top:2px">${escapeHtmlHelper(place.category_name)}</div>` : ''}
      `;
      item.onclick = () => selectPlace(place);
      resultsDiv.appendChild(item);
    });
  }

  function escapeHtmlHelper(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function selectPlace(place) {
    let lat = place.y, lng = place.x;
    // 네이버 결과는 호환 좌표가 없음 → 주소를 카카오 지오코딩해 WGS84 좌표 확보 (선택한 1건만)
    if (place._source === 'naver' && (!lat || !lng)) {
      const coords = await geocodeAddress(place.road_address_name || place.address_name || '');
      if (coords) { lat = coords.y; lng = coords.x; }
    }
    $('#rv-restaurant-name').value = place.place_name;
    $('#rv-restaurant-address').value = place.road_address_name || place.address_name || '';
    $('#rv-restaurant-lat').value = lat || '';
    $('#rv-restaurant-lng').value = lng || '';

    $('#rv-selected-name').textContent = place.place_name;
    $('#rv-selected-address').textContent = place.road_address_name || place.address_name || '';

    // UI 전환: 검색 input 숨김 + 선택 카드 표시
    const searchGroup = $('#rv-search-group');
    if (searchGroup) searchGroup.style.display = 'none';
    const selected = $('#rv-selected-place');
    if (selected) selected.style.display = 'block';
    const results = $('#rv-place-results');
    if (results) results.style.display = 'none';
  }

  function clearSelectedPlace() {
    if ($('#rv-restaurant-name')) $('#rv-restaurant-name').value = '';
    if ($('#rv-restaurant-address')) $('#rv-restaurant-address').value = '';
    if ($('#rv-restaurant-lat')) $('#rv-restaurant-lat').value = '';
    if ($('#rv-restaurant-lng')) $('#rv-restaurant-lng').value = '';
    if ($('#rv-place-search')) $('#rv-place-search').value = '';

    const searchGroup = $('#rv-search-group');
    if (searchGroup) searchGroup.style.display = 'block';
    const selected = $('#rv-selected-place');
    if (selected) selected.style.display = 'none';
    const results = $('#rv-place-results');
    if (results) {
      results.style.display = 'none';
      results.innerHTML = '';
    }
  }

  async function handleReviewSubmit() {
    clearReviewError();
    if (!CURRENT_USER) {
      showErrorInReview('로그인 후 사용 가능합니다');
      return;
    }
    const name = $('#rv-restaurant-name')?.value.trim();
    const address = $('#rv-restaurant-address')?.value.trim();
    const menuName = $('#rv-menu-name')?.value.trim();
    const comment = $('#rv-comment')?.value.trim();
    const latStr = $('#rv-restaurant-lat')?.value;
    const lngStr = $('#rv-restaurant-lng')?.value;
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (!name) return showErrorInReview('가게 이름을 검색해서 선택해주세요');
    if (!latStr || !lngStr || isNaN(lat) || isNaN(lng)) return showErrorInReview('가게 검색 결과에서 선택해주세요 (좌표 누락)');
    if (!menuName) return showErrorInReview('메뉴를 입력해주세요');
    if (_selectedSpicy === null) return showErrorInReview('매운맛 레벨을 선택해주세요');
    if (_selectedRating === null) return showErrorInReview('별점을 선택해주세요');  // 2026-05-20
    if (!comment || comment.length < 30) return showErrorInReview('리뷰는 30자 이상 작성해주세요');
    if (_foodImages.length === 0) return showErrorInReview('음식 사진을 1장 이상 첨부해주세요');
    if (!_receiptImage) return showErrorInReview('영수증 사진은 필수입니다');

    const fd = new FormData();
    fd.append('restaurant_name', name);
    fd.append('restaurant_address', address || '');
    fd.append('restaurant_lat', String(lat));
    fd.append('restaurant_lng', String(lng));
    fd.append('menu_name', menuName);
    fd.append('spicy_level', String(_selectedSpicy));
    fd.append('rating', String(_selectedRating));  // 2026-05-20: 별점 1-5
    fd.append('comment', comment);
    for (const f of _foodImages) fd.append('food_images', f);
    fd.append('receipt_image', _receiptImage);

    const btn = $('#btn-review-submit');
    showLoading(btn, '🌶 제보 중...');

    try {
      const res = await window.API.reviews.create(fd);
      if (res && res.success) {
        alert(res.message || '제보가 접수되었습니다. 검수 후 포인트가 적립됩니다.');
        resetReviewForm();
        if (typeof window.showView === 'function') window.showView('map');
      } else {
        showErrorInReview('제보 실패');
      }
    } catch (e) {
      console.error('[review] 제출 실패:', e);
      showErrorInReview(e.message || '제보 중 오류가 발생했습니다');
    } finally {
      hideLoading(btn);
    }
  }

  // ============== Phase 11: 관리자 ==============
  let _adminFilter = 'pending';
  let _adminPendingReviews = [];  // P1-5 (2026-05-18) — detail modal lookup용 캐시

  function bindAdminView() {
    const refreshBtn = $('#btn-admin-refresh');
    if (refreshBtn) refreshBtn.addEventListener('click', () => renderAdminView());

    // 공지사항 편집 버튼 wire (Phase B, 2026-05-19)
    const saveBtn = $('#adm-ann-save');
    if (saveBtn) saveBtn.addEventListener('click', saveAnnouncement);
    const previewBtn = $('#adm-ann-preview');
    if (previewBtn) previewBtn.addEventListener('click', previewAnnouncement);
    // pending list 클릭 위임 — P1-5 (2026-05-18) detail modal로 통합
    // 기존: data-approve/data-reject 버튼 직접 → 이제 row 클릭 시 detail modal 열기
    const list = $('#admin-pending-list');
    if (list) {
      list.addEventListener('click', (e) => {
        // 기존 inline 버튼 호환성 유지 (혹시 다른 코드가 직접 트리거할 경우)
        const approveBtn = e.target.closest('[data-approve]');
        const rejectBtn = e.target.closest('[data-reject]');
        if (approveBtn || rejectBtn) {
          // pending-row 내부에 있는 inline 버튼은 detail modal로 라우팅
          // (UX 일관성 — 모든 승인/반려는 detail 확인 후)
          const id = approveBtn ? approveBtn.dataset.approve : rejectBtn.dataset.reject;
          if (id) showReviewDetail(id);
          e.stopPropagation();
          return;
        }
        // row 자체 클릭 → detail modal
        const row = e.target.closest('.pending-row');
        if (row) {
          const id = row.dataset.reviewId;
          if (id) showReviewDetail(id);
        }
      });
    }
  }

  async function approveReview(id) {
    try {
      await window.API.admin.approve(id);
      showToast('✅ 승인 완료');
      renderAdminView();
    } catch (e) {
      showToast('승인 실패: ' + (e.message || e), 'error');
    }
  }

  async function rejectReview(id, reason) {
    try {
      await window.API.admin.reject(id, reason);
      showToast('❌ 반려 완료');
      renderAdminView();
    } catch (e) {
      showToast('반려 실패: ' + (e.message || e), 'error');
    }
  }

  // ============================================
  // 공지사항 편집 (Phase B, 2026-05-19)
  // admin view 진입 시 로드, 저장 시 version +1
  // ============================================
  async function loadAnnouncementForm() {
    const titleEl = $('#adm-ann-title');
    const noticeEl = $('#adm-ann-notice');
    const howtoEl = $('#adm-ann-howto');
    const activeEl = $('#adm-ann-active');
    const versionEl = $('#adm-ann-version');
    const updatedEl = $('#adm-ann-updated');
    const statusEl = $('#adm-ann-status');
    if (!titleEl || !window.API?.announcements?.get) return;

    if (statusEl) statusEl.textContent = '⏳ 로딩 중...';

    try {
      const res = await window.API.announcements.get();
      const ann = res?.announcement;
      if (!ann) {
        if (statusEl) statusEl.textContent = '⚠️ 공지 row 부재 (SQL seed 미실행?)';
        return;
      }
      titleEl.value = ann.title || '';
      noticeEl.value = ann.notice_text || '';
      howtoEl.value = ann.howto_text || '';
      activeEl.checked = !!ann.is_active;
      if (versionEl) versionEl.textContent = `v${ann.version || 0}`;
      if (updatedEl) {
        const d = ann.updated_at ? new Date(ann.updated_at).toLocaleString('ko-KR') : '—';
        updatedEl.textContent = d;
      }
      if (statusEl) statusEl.textContent = '';
    } catch (e) {
      const msg = (e?.message || '').includes('announcements')
        ? '⚠️ announcements 테이블 미준비 (Supabase SQL 실행 필요)'
        : '⚠️ 로드 실패: ' + (e?.message || e);
      if (statusEl) statusEl.textContent = msg;
    }
  }

  async function saveAnnouncement() {
    const titleEl = $('#adm-ann-title');
    const noticeEl = $('#adm-ann-notice');
    const howtoEl = $('#adm-ann-howto');
    const activeEl = $('#adm-ann-active');
    const statusEl = $('#adm-ann-status');
    const saveBtn = $('#adm-ann-save');
    if (!titleEl || !window.API?.announcements?.update) return;

    if (saveBtn) saveBtn.disabled = true;
    if (statusEl) statusEl.textContent = '⏳ 저장 중...';

    try {
      const res = await window.API.announcements.update({
        title: titleEl.value.trim(),
        notice_text: noticeEl.value.trim(),
        howto_text: howtoEl.value.trim(),
        is_active: !!activeEl.checked,
      });
      const ann = res?.announcement;
      if (ann) {
        $('#adm-ann-version') && ($('#adm-ann-version').textContent = `v${ann.version}`);
        $('#adm-ann-updated') && ($('#adm-ann-updated').textContent = new Date(ann.updated_at).toLocaleString('ko-KR'));
      }
      if (statusEl) statusEl.textContent = `✅ 저장 완료 — 모든 사용자에게 다시 표시됨 (v${ann?.version})`;
      showToast(`✅ 공지 저장됨 (v${ann?.version})`);
    } catch (e) {
      const msg = (e?.message || '').includes('announcements')
        ? '❌ 저장 실패 — 테이블 미준비 또는 RLS 차단'
        : '❌ 저장 실패: ' + (e?.message || e);
      if (statusEl) statusEl.textContent = msg;
      showToast(msg);
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  function previewAnnouncement() {
    // 현재 폼 값으로 announce overlay 미리 표시 (실제 저장 안 함)
    // 2026-05-19: markdown 렌더링으로 전환 — marked + DOMPurify 사용
    const overlay = document.getElementById('announceOverlay');
    if (!overlay) return;
    const titleEl = document.getElementById('announceTitle');
    if (titleEl) titleEl.textContent = $('#adm-ann-title').value || '🌶 맵맵맵';

    const renderMd = (text) => {
      if (!text || !text.trim()) return '';
      if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
        // CDN 미로드 fallback — escape + <br>만
        const escaped = String(text)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        return `<p>${escaped.replace(/\n/g, '<br>')}</p>`;
      }
      return DOMPurify.sanitize(marked.parse(text, { breaks: true, gfm: true }));
    };

    const sections = overlay.querySelectorAll('.announce-section');
    if (sections.length >= 2) {
      const noticeHtml = renderMd($('#adm-ann-notice').value);
      const howtoHtml = renderMd($('#adm-ann-howto').value);
      sections[0].innerHTML = `<h3>📌 공지사항</h3><div class="md-body">${noticeHtml}</div>`;
      sections[1].innerHTML = `<h3>📖 사용방법</h3><div class="md-body">${howtoHtml}</div>`;
    }
    overlay.style.display = 'flex';
  }

  // 사용자 문의 목록 렌더 (2026-06-09) — admin 대시보드
  // ============== 전체 리뷰 (2026-06-09) — 승인/반려/대기 모두 + 페이지네이션 + 재수정 ==============
  let _adminAllReviews = [];
  let _adminAllPage = 0;
  const ADMIN_ALL_PAGE_SIZE = 10;

  async function renderAllReviews() {
    const list = $('#admin-allreviews-list');
    if (!list) return;
    if (!CURRENT_USER || !CURRENT_USER.is_admin) return;
    try {
      const res = await window.API.admin.getReviews('');  // status='' → 전체
      _adminAllReviews = res?.reviews || [];
      _adminAllPage = 0;
      renderAllReviewsPage();
    } catch (e) {
      console.error('[admin] 전체 리뷰 로드 실패:', e);
      list.innerHTML = `<div style="padding:18px; color:#c5171e; font-size:12px">❌ 전체 리뷰 로드 실패: ${escapeHtml(e.message || String(e))}</div>`;
    }
  }

  function renderAllReviewsPage() {
    const list = $('#admin-allreviews-list');
    const pag = $('#admin-allreviews-pagination');
    if (!list) return;
    const all = _adminAllReviews;
    $('#admin-allreviews-count') && ($('#admin-allreviews-count').textContent = `${all.length} 건`);
    if (all.length === 0) {
      list.innerHTML = `<div style="padding:24px 18px; text-align:center; color:var(--text-3); font-size:13px">리뷰가 없어요</div>`;
      if (pag) pag.innerHTML = '';
      return;
    }
    const totalPages = Math.ceil(all.length / ADMIN_ALL_PAGE_SIZE);
    if (_adminAllPage >= totalPages) _adminAllPage = totalPages - 1;
    if (_adminAllPage < 0) _adminAllPage = 0;
    const start = _adminAllPage * ADMIN_ALL_PAGE_SIZE;
    const pageItems = all.slice(start, start + ADMIN_ALL_PAGE_SIZE);

    const statusLabel = {
      pending: '<span style="color:#e8590c">⏳ 대기</span>',
      approved: '<span style="color:#1e7e34">✅ 승인</span>',
      rejected: '<span style="color:#c5171e">❌ 반려</span>',
    };
    const stBtn = (curr, target, label, color, id) => curr === target ? '' :
      `<button type="button" class="ar-status-btn" data-ar-id="${escapeHtml(String(id))}" data-ar-status="${target}"
        style="font-size:11px; padding:3px 9px; border:1px solid var(--border); border-radius:6px; cursor:pointer; background:var(--panel); color:${color}">${label}</button>`;

    list.innerHTML = pageItems.map((r, i) => {
      const globalIdx = start + i;
      const nick = r.user_nickname || '익명';
      const rest = r.restaurant_name || '알 수 없음';
      const lvl = r.spicy_level ?? '?';
      const content = r.content || r.review_text || r.comment || '';
      const date = r.created_at ? new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '';
      const st = r.status || 'pending';
      return `
        <div class="ar-detail-row" data-ar-detail-idx="${globalIdx}" style="padding:12px 14px; border-bottom:1px solid var(--border); cursor:pointer">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:4px">
            <span style="font-size:13px; font-weight:700">${escapeHtml(rest)} <span style="font-size:11px; color:var(--text-3); font-weight:500">· ${escapeHtml(nick)} · Lv.${lvl}</span></span>
            <span style="font-size:11px; white-space:nowrap">${statusLabel[st] || escapeHtml(st)} <span style="color:var(--text-4)">${escapeHtml(date)}</span></span>
          </div>
          <div style="font-size:12px; color:var(--text-2); line-height:1.4; margin-bottom:6px; white-space:pre-wrap; word-break:break-word">${escapeHtml(content.length > 100 ? content.slice(0, 100) + '…' : content)}</div>
          <div style="display:flex; gap:6px">
            ${stBtn(st, 'approved', '✅ 승인', '#1e7e34', r.id)}
            ${stBtn(st, 'rejected', '❌ 반려', '#c5171e', r.id)}
            ${stBtn(st, 'pending', '⏳ 대기로', '#e8590c', r.id)}
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.ar-status-btn').forEach(b => {
      b.addEventListener('click', async (ev) => {
        ev.stopPropagation();  // 카드 클릭(상세 열기)과 분리
        const id = b.dataset.arId, target = b.dataset.arStatus;
        b.disabled = true;
        try {
          await window.API.admin.setReviewStatus(id, target);
          const item = _adminAllReviews.find(x => String(x.id) === String(id));
          if (item) item.status = target;
          renderAllReviewsPage();
          showToast('상태 변경 완료');
        } catch (e) { showToast('변경 실패: ' + (e.message || e)); b.disabled = false; }
      });
    });

    // 카드 클릭 → 리뷰 상세 모달 (2026-06-09)
    list.querySelectorAll('.ar-detail-row').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.arDetailIdx, 10);
        const rv = _adminAllReviews[idx];
        if (rv && typeof window.openReviewModalData === 'function') {
          window.openReviewModalData(rv);
        }
      });
    });

    if (pag) {
      if (totalPages <= 1) { pag.innerHTML = ''; }
      else {
        pag.innerHTML = `
          <button type="button" class="ar-page" data-ar-page="prev" ${_adminAllPage === 0 ? 'disabled' : ''} style="padding:5px 10px; border:1px solid var(--border); border-radius:6px; cursor:pointer; background:var(--panel)">‹ 이전</button>
          <span style="color:var(--text-3)">${_adminAllPage + 1} / ${totalPages}</span>
          <button type="button" class="ar-page" data-ar-page="next" ${_adminAllPage >= totalPages - 1 ? 'disabled' : ''} style="padding:5px 10px; border:1px solid var(--border); border-radius:6px; cursor:pointer; background:var(--panel)">다음 ›</button>`;
        pag.querySelectorAll('.ar-page').forEach(pb => {
          pb.addEventListener('click', () => {
            if (pb.dataset.arPage === 'prev' && _adminAllPage > 0) _adminAllPage--;
            else if (pb.dataset.arPage === 'next' && _adminAllPage < totalPages - 1) _adminAllPage++;
            renderAllReviewsPage();
          });
        });
      }
    }
  }

  async function renderFeedbackList() {
    const list = $('#admin-feedback-list');
    if (!list) return;
    if (!CURRENT_USER || !CURRENT_USER.is_admin) return;
    try {
      const res = await window.API.feedback.list();
      const items = res?.items || [];
      $('#admin-feedback-count') && ($('#admin-feedback-count').textContent = `${items.length} 건`);
      $('#admin-feedback-tab-count') && ($('#admin-feedback-tab-count').textContent = items.length ? `(${items.length})` : '');
      if (items.length === 0) {
        list.innerHTML = `<div style="padding:24px 18px; text-align:center; color:var(--text-3); font-size:13px">아직 문의가 없어요</div>`;
        return;
      }
      const catLabel = { suggestion: '💡 제안', bug: '🐞 버그', etc: '💬 기타' };
      list.innerHTML = items.map(f => {
        const cat = catLabel[f.category] || '💬 기타';
        const who = f.users?.nickname || (f.email ? f.email : '비회원');
        const date = f.created_at ? new Date(f.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        const resolved = f.status === 'resolved';
        return `
          <div style="padding:12px 14px; border-bottom:1px solid var(--border); ${resolved ? 'opacity:0.55' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px">
              <span style="font-size:12px; font-weight:700">${cat} <span style="color:var(--text-3); font-weight:500">· ${escapeHtml(who)}</span></span>
              <span style="font-size:10px; color:var(--text-4); white-space:nowrap">${escapeHtml(date)}</span>
            </div>
            <div style="font-size:13px; color:var(--text); line-height:1.5; white-space:pre-wrap; word-break:break-word">${escapeHtml(f.content || '')}</div>
            ${f.email ? `<div style="font-size:11px; color:var(--text-3); margin-top:4px">📧 ${escapeHtml(f.email)}</div>` : ''}
            <div style="margin-top:8px">
              <button type="button" class="fb-status-btn" data-fb-id="${escapeHtml(String(f.id))}" data-fb-status="${resolved ? 'new' : 'resolved'}"
                style="font-size:11px; padding:3px 10px; border:1px solid var(--border); border-radius:6px; cursor:pointer; background:${resolved ? 'var(--surface)' : 'var(--panel)'}; color:var(--text)">
                ${resolved ? '↩ 미처리로' : '✓ 처리완료'}
              </button>
            </div>
          </div>`;
      }).join('');
      list.querySelectorAll('.fb-status-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await window.API.feedback.setStatus(btn.dataset.fbId, btn.dataset.fbStatus);
            renderFeedbackList();
          } catch (e) { showToast('상태 변경 실패: ' + (e.message || e)); }
        });
      });
    } catch (e) {
      console.error('[admin] 피드백 로드 실패:', e);
      list.innerHTML = `<div style="padding:18px; color:#c5171e; font-size:12px; line-height:1.6">❌ 피드백 로드 실패: ${escapeHtml(e.message || String(e))}<br><span style="font-size:10px; color:var(--text-4)">feedback 테이블이 없을 수 있습니다 — SQL 실행 필요</span></div>`;
    }
  }

  async function renderAdminView() {
    const list = $('#admin-pending-list');
    if (!list) return;

    // 권한 체크
    if (!CURRENT_USER || !CURRENT_USER.is_admin) {
      list.innerHTML = `
        <div style="padding: 32px 18px; text-align:center; color:#c5171e; font-size:13px; line-height:1.7">
          <div style="font-size:36px; margin-bottom:8px">🚫</div>
          <div>관리자 권한이 필요합니다</div>
        </div>`;
      $('#admin-updated') && ($('#admin-updated').textContent = '권한 없음');
      return;
    }

    list.innerHTML = `<div style="padding: 24px 18px; text-align:center; color:var(--text-3); font-size:13px">⏳ 로딩 중...</div>`;
    $('#admin-updated') && ($('#admin-updated').textContent = '로딩 중...');

    // 공지사항 폼 로드 (Phase B, 2026-05-19) — pending list와 병렬
    loadAnnouncementForm();
    renderFeedbackList();  // 2026-06-09: 사용자 문의 목록
    renderAllReviews();    // 2026-06-09: 전체 리뷰(승인/반려/대기) + 재수정

    try {
      const [pendingRes, statsRes] = await Promise.all([
        window.API.admin.getReviews(_adminFilter),
        window.API.admin.getStats ? window.API.admin.getStats() : Promise.resolve(null)
      ]);
      const reviews = pendingRes?.reviews || [];
      _adminPendingReviews = reviews;  // P1-5: detail modal lookup용 캐시

      // Stats 갱신
      if (statsRes && statsRes.stats) {
        const s = statsRes.stats;
        $('#ad-stat-pending') && ($('#ad-stat-pending').textContent = s.reviews?.pending ?? '—');
        $('#ad-stat-approved') && ($('#ad-stat-approved').textContent = s.reviews?.approved ?? '—');
        $('#ad-stat-rejected') && ($('#ad-stat-rejected').textContent = s.reviews?.rejected ?? '—');
        $('#ad-stat-users') && ($('#ad-stat-users').textContent = s.users ?? '—');
      }
      $('#admin-pending-count') && ($('#admin-pending-count').textContent = `${reviews.length} 건`);
      $('#admin-updated') && ($('#admin-updated').textContent = `마지막 업데이트: ${new Date().toLocaleTimeString('ko-KR')}`);

      if (reviews.length === 0) {
        list.innerHTML = `
          <div style="padding: 32px 18px; text-align:center; color:var(--text-3); font-size:13px">
            <div style="font-size:36px; margin-bottom:8px">✨</div>
            <div>승인 대기 리뷰가 없어요</div>
          </div>`;
        return;
      }

      list.innerHTML = reviews.map(r => {
        const userNick = r.user_nickname || r.users?.nickname || '익명';
        const userLvl = r.user_level ?? r.users?.spicy_level ?? '?';
        const restName = r.restaurant_name || r.restaurants?.name || '알 수 없음';
        const lvl = r.spicy_level ?? '?';
        const hasReceipt = !!r.receipt_image_url;
        const date = r.created_at ? new Date(r.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        const firstImg = (() => {
          if (!r.food_image_url) return null;
          try {
            const parsed = JSON.parse(r.food_image_url);
            return Array.isArray(parsed) ? parsed[0] : r.food_image_url;
          } catch { return r.food_image_url; }
        })();
        const thumb = firstImg
          ? `<img src="${escapeHtml(firstImg)}" alt="" style="width:100%; height:100%; object-fit:cover; border-radius:8px" onerror="this.style.display='none'">`
          : '🍜';
        return `
          <div class="pending-row" data-review-id="${escapeHtml(r.id)}" style="cursor:pointer;" title="클릭하여 상세 검토">
            <div class="pending-thumb">${thumb}</div>
            <div class="pending-info">
              <div class="name">${escapeHtml(restName)} — ${escapeHtml(userNick)} (Lv.${userLvl})</div>
              <div class="meta">평가 Lv.${lvl} · 영수증 ${hasReceipt ? '✅' : '✗'} · ${escapeHtml(date)}</div>
              ${r.comment ? `<div style="font-size:11px; color:var(--text-3); margin-top:4px; line-height:1.5">${escapeHtml(r.comment.length > 80 ? r.comment.slice(0, 80) + '…' : r.comment)}</div>` : ''}
            </div>
            <div class="stat"><span class="tag tag-s${lvl}">Lv.${lvl}</span></div>
            <div class="pending-actions">
              <button class="btn-tiny btn-approve" data-review-id="${escapeHtml(r.id)}" title="클릭 → 상세 검토">🔍 검토</button>
            </div>
          </div>`;
      }).join('');
    } catch (e) {
      console.error('[admin] 로드 실패:', e);
      list.innerHTML = `<div style="padding: 24px; text-align:center; color:#c5171e">로드 실패: ${escapeHtml(e.message || e)}</div>`;
    }
  }

  // ============== Review Detail Modal (P1-5, 2026-05-18) ==============
  // admin pending-row 클릭 시 detail modal 열기. 영수증/음식사진/코멘트 전체 확인 + 승인/반려.
  // 반려 사유는 modal 내 textarea로 입력 (이전 prompt() 대체).
  let _rdCurrentReviewId = null;

  function _rdParseFoodImages(food_image_url) {
    if (!food_image_url) return [];
    try {
      const parsed = JSON.parse(food_image_url);
      return Array.isArray(parsed) ? parsed : [food_image_url];
    } catch {
      return [food_image_url];
    }
  }

  function showReviewDetail(reviewId) {
    const review = _adminPendingReviews.find(r => r.id === reviewId);
    if (!review) {
      showToast('리뷰 정보를 찾을 수 없습니다. 새로고침 후 다시 시도하세요.', 'error');
      return;
    }
    _rdCurrentReviewId = reviewId;

    // 가게/유저 정보
    const restName = review.restaurant_name || review.restaurants?.name || '알 수 없음';
    const userNick = review.user_nickname || review.users?.nickname || '익명';
    const userLvl = review.user_level ?? review.users?.spicy_level ?? '?';
    const menu = review.menu_name || '';
    const lvl = review.spicy_level ?? '?';
    const date = review.created_at
      ? new Date(review.created_at).toLocaleString('ko-KR', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
      : '';

    $('#rd-restaurant') && ($('#rd-restaurant').textContent = `${restName}`);
    $('#rd-user-line') && ($('#rd-user-line').textContent =
      `${userNick} (Lv.${userLvl}) · 메뉴: ${menu} · 평가 Lv.${lvl} · ${date}`);
    $('#rd-meta') && ($('#rd-meta').textContent = `ID: ${reviewId.slice(0, 8)}...`);

    // 음식 사진 carousel
    const foodImgs = _rdParseFoodImages(review.food_image_url);
    const foodEl = $('#rd-food-images');
    if (foodEl) {
      if (foodImgs.length === 0) {
        foodEl.innerHTML = '<div style="font-size:11px; color:var(--text-4); padding:20px;">음식 사진 없음</div>';
      } else {
        foodEl.innerHTML = foodImgs.map((url, i) => `
          <div style="flex-shrink:0; width:160px; height:160px; border-radius:var(--r-sm);
            overflow:hidden; border:1px solid var(--border); background:var(--surface);">
            <img src="${escapeHtml(url)}" alt="음식 사진 ${i+1}"
              data-img-viewer="${escapeHtml(url)}"
              style="width:100%; height:100%; object-fit:cover; cursor:zoom-in;"
              onerror="this.parentElement.innerHTML='<div style=&quot;display:flex;align-items:center;justify-content:center;height:100%;font-size:11px;color:var(--text-4)&quot;>이미지 로드 실패</div>'">
          </div>`).join('');
      }
    }

    // 영수증
    const receiptEl = $('#rd-receipt-wrap');
    if (receiptEl) {
      if (review.receipt_image_url) {
        receiptEl.innerHTML = `
          <img src="${escapeHtml(review.receipt_image_url)}" alt="영수증"
            data-img-viewer="${escapeHtml(review.receipt_image_url)}"
            style="max-width:100%; max-height:280px; border-radius:var(--r-sm); cursor:zoom-in;"
            onerror="this.parentElement.innerHTML='<span style=&quot;font-size:11px; color:#c5171e&quot;>영수증 로드 실패</span>'">`;
      } else {
        receiptEl.innerHTML = '<span style="font-size:11px; color:#c5171e; font-weight:600;">⚠ 영수증 없음 — 반려 권장</span>';
      }
    }

    // 코멘트
    const commentEl = $('#rd-comment');
    if (commentEl) {
      commentEl.textContent = review.comment || '(코멘트 없음)';
      if (!review.comment) commentEl.style.color = 'var(--text-4)';
      else commentEl.style.color = 'var(--text)';
    }

    // 반려 form 리셋 + UI 모드 default
    $('#rd-reject-form') && ($('#rd-reject-form').style.display = 'none');
    $('#rd-reject-reason') && ($('#rd-reject-reason').value = '');
    $('#rd-reject-counter') && ($('#rd-reject-counter').textContent = '0');
    $('#rd-actions-default') && ($('#rd-actions-default').style.display = 'flex');
    $('#rd-actions-reject') && ($('#rd-actions-reject').style.display = 'none');

    // Show overlay
    const overlay = $('#review-detail-overlay');
    if (overlay) overlay.style.display = 'flex';
  }

  function closeReviewDetail() {
    const overlay = $('#review-detail-overlay');
    if (overlay) overlay.style.display = 'none';
    _rdCurrentReviewId = null;
  }

  async function _rdHandleApprove() {
    if (!_rdCurrentReviewId) return;
    if (!confirm('이 리뷰를 승인하시겠습니까?')) return;
    const id = _rdCurrentReviewId;
    closeReviewDetail();
    await approveReview(id);  // 기존 함수 — renderAdminView 재호출 포함
  }

  function _rdEnterRejectMode() {
    $('#rd-reject-form') && ($('#rd-reject-form').style.display = 'block');
    $('#rd-actions-default') && ($('#rd-actions-default').style.display = 'none');
    $('#rd-actions-reject') && ($('#rd-actions-reject').style.display = 'flex');
    setTimeout(() => $('#rd-reject-reason')?.focus(), 50);
  }

  function _rdCancelRejectMode() {
    $('#rd-reject-form') && ($('#rd-reject-form').style.display = 'none');
    $('#rd-actions-default') && ($('#rd-actions-default').style.display = 'flex');
    $('#rd-actions-reject') && ($('#rd-actions-reject').style.display = 'none');
  }

  async function _rdHandleRejectConfirm() {
    if (!_rdCurrentReviewId) return;
    const reason = $('#rd-reject-reason')?.value.trim();
    if (!reason) {
      showToast('반려 사유를 입력하세요', 'error');
      $('#rd-reject-reason')?.focus();
      return;
    }
    if (reason.length < 5) {
      showToast('반려 사유는 5자 이상 입력하세요', 'error');
      return;
    }
    const id = _rdCurrentReviewId;
    closeReviewDetail();
    await rejectReview(id, reason);  // 기존 함수
  }

  function bindReviewDetailModal() {
    // 닫기 (X 버튼 + 배경 클릭 + ESC)
    $('#rd-close')?.addEventListener('click', closeReviewDetail);
    $('#review-detail-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'review-detail-overlay') closeReviewDetail();
    });
    document.addEventListener('keydown', e => {
      const overlay = $('#review-detail-overlay');
      if (e.key === 'Escape' && overlay && overlay.style.display === 'flex') closeReviewDetail();
    });

    // 승인
    $('#rd-approve')?.addEventListener('click', _rdHandleApprove);

    // 반려 (2단계)
    $('#rd-reject-toggle')?.addEventListener('click', _rdEnterRejectMode);
    $('#rd-reject-cancel')?.addEventListener('click', _rdCancelRejectMode);
    $('#rd-reject-confirm')?.addEventListener('click', _rdHandleRejectConfirm);

    // 반려 사유 글자수 카운터
    $('#rd-reject-reason')?.addEventListener('input', (e) => {
      const len = e.target.value.length;
      const counter = $('#rd-reject-counter');
      if (counter) counter.textContent = len;
    });

    // 이미지 클릭 → fullscreen viewer (image-viewer.js의 window.openImageViewer 활용)
    // ⚠ 실제 export 이름은 openImageViewer (line 170 in image-viewer.js). show*가 아님.
    $('#review-detail-overlay')?.addEventListener('click', (e) => {
      const imgUrl = e.target.getAttribute?.('data-img-viewer');
      if (!imgUrl) return;
      e.stopPropagation();
      if (typeof window.openImageViewer === 'function') {
        window.openImageViewer(imgUrl);
      } else {
        console.warn('[review-detail] openImageViewer 미로드 — image-viewer.js defer 순서 점검');
        showToast('이미지 viewer를 로드 중입니다. 잠시 후 다시 시도하세요.', 'error');
      }
    });
  }

  // ============== Admin Auth Gate (P1-4, 2026-05-18) ==============
  // /godmap (admin view) 진입 시 별도 인증 modal 강제.
  // Supabase signIn + users.is_admin=true 양쪽 검증 통과해야만 admin view 진입.
  // sessionStorage flag로 동일 세션 내 재인증 면제.
  //
  // ⚠️ 일반 사용자 세션과 분리되지 않음 — admin signIn 시 기존 세션이 admin으로 덮어쓰임.
  // admin 작업 후 일반 사용자로 돌아가려면 재로그인 필요. (사용자 정책 2026-05-18)
  let _pendingAdminOnSuccess = null;

  function requireAdminAuth(onSuccess) {
    _pendingAdminOnSuccess = onSuccess || (() => {});
    const overlay = $('#admin-auth-overlay');
    if (!overlay) {
      console.error('[admin-auth] modal HTML 미발견');
      return;
    }
    // 입력 초기화
    const emailEl = $('#admin-auth-email');
    const pwEl = $('#admin-auth-password');
    const errEl = $('#admin-auth-error');
    if (emailEl) emailEl.value = '';
    if (pwEl) pwEl.value = '';
    if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
    overlay.style.display = 'flex';
    setTimeout(() => emailEl?.focus(), 50);
  }

  function closeAdminAuth(reason) {
    const overlay = $('#admin-auth-overlay');
    if (overlay) overlay.style.display = 'none';
    _pendingAdminOnSuccess = null;
    if (reason === 'cancel' && typeof window.showView === 'function') {
      window.showView('map');
    }
  }

  function showAdminAuthError(msg) {
    const errEl = $('#admin-auth-error');
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = 'block';
    }
  }

  async function handleAdminAuthSubmit() {
    const email = $('#admin-auth-email')?.value.trim();
    const password = $('#admin-auth-password')?.value;
    const submitBtn = $('#admin-auth-submit');

    if (!email || !password) {
      showAdminAuthError('이메일과 비밀번호를 모두 입력하세요');
      return;
    }

    const orig = submitBtn?.textContent;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '🔐 인증 중...'; }

    try {
      const res = await window.API.auth.login(email, password);
      if (!res || !res.success) {
        showAdminAuthError('로그인에 실패했습니다');
        return;
      }
      if (!res.user || !res.user.is_admin) {
        // 일반 사용자 — admin 권한 없음. 세션은 이미 덮어써졌으나 admin 진입 차단.
        showAdminAuthError('이 계정은 관리자 권한이 없습니다');
        return;
      }
      // 성공
      sessionStorage.setItem('admin_auth_passed', '1');
      // 일반 핸들러도 동기화 (CURRENT_USER 갱신)
      onAuthSuccess(res.user);

      const cb = _pendingAdminOnSuccess;
      closeAdminAuth('success');
      if (typeof cb === 'function') cb();
    } catch (e) {
      console.error('[admin-auth] 실패:', e);
      showAdminAuthError(e?.message || '인증 중 오류가 발생했습니다');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; if (orig) submitBtn.textContent = orig; }
    }
  }

  function bindAdminAuthModal() {
    const submitBtn = $('#admin-auth-submit');
    if (submitBtn) submitBtn.addEventListener('click', handleAdminAuthSubmit);

    const cancelBtn = $('#admin-auth-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeAdminAuth('cancel'));

    // Enter 키 → submit
    $('#admin-auth-email')?.addEventListener('keypress', e => {
      if (e.key === 'Enter') $('#admin-auth-password')?.focus();
    });
    $('#admin-auth-password')?.addEventListener('keypress', e => {
      if (e.key === 'Enter') handleAdminAuthSubmit();
    });

    // ESC 키 → cancel
    document.addEventListener('keydown', e => {
      const overlay = $('#admin-auth-overlay');
      if (e.key === 'Escape' && overlay && overlay.style.display === 'flex') {
        closeAdminAuth('cancel');
      }
    });
  }

  // ============== 이벤트 바인딩 ==============
  function bindHandlers() {
    // 로그인
    const loginBtn = $('#btn-login-submit');
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    // Enter 키
    $('#login-email')?.addEventListener('keypress', e => { if (e.key === 'Enter') $('#login-password')?.focus(); });
    $('#login-password')?.addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin(); });

    // 회원가입
    const signupBtn = $('#btn-signup-submit');
    if (signupBtn) signupBtn.addEventListener('click', handleSignup);
    $('#signup-nickname')?.addEventListener('keypress', e => { if (e.key === 'Enter') handleSignup(); });

    // P2-1 (2026-05-18): 회원가입 폼 매운맛 레벨 picker 클릭 핸들러
    document.querySelectorAll('.signup-lvl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.signup-lvl-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const hidden = $('#signup-spicy-level');
        if (hidden) hidden.value = btn.dataset.level;
      });
    });

    // 레벨 설정
    bindLevelGrid();
    const lvBtn = $('#btn-level-submit');
    if (lvBtn) lvBtn.addEventListener('click', handleSetLevel);
    const laterBtn = $('#btn-level-later');
    if (laterBtn) {
      laterBtn.addEventListener('click', () => {
        if (typeof window.showView === 'function') window.showView('map');
      });
    }

    // 리뷰 작성 (Phase 9)
    bindReviewLevelSelector();
    bindReviewRatingSelector();  // 2026-05-20: 자체 별점 시스템
    bindReviewPhotoUploader();
    bindReviewReceipt();
    bindReviewCommentCounter();

    // 맵기 평가 가이드 버튼 (v1 이식 2026-05-19)
    const spicyGuideBtn = $('#rv-spicy-guide-btn');
    if (spicyGuideBtn) {
      spicyGuideBtn.addEventListener('click', () => {
        const overlay = $('#spicy-guide-overlay');
        if (overlay) overlay.classList.add('active');
      });
    }

    // 네이버 지도 링크 paste 감지 (v1 이식 Phase B, 2026-05-19)
    const placeSearchInput = $('#rv-place-search');
    if (placeSearchInput) {
      placeSearchInput.addEventListener('paste', (e) => {
        // paste 이벤트는 input value 갱신 *전*이라 clipboardData에서 직접 읽음
        const pasted = e.clipboardData?.getData('text') || '';
        if (parseNaverMapLink(pasted)) {
          e.preventDefault(); // 링크를 input에 안 넣음
        }
      });
    }
    renderFoodPhotoUploader();
    const reviewSubmitBtn = $('#btn-review-submit');
    if (reviewSubmitBtn) reviewSubmitBtn.addEventListener('click', handleReviewSubmit);
    const reviewCancelBtn = $('#btn-review-cancel');
    if (reviewCancelBtn) reviewCancelBtn.addEventListener('click', () => {
      if (!confirm('작성 중인 내용이 사라집니다. 취소할까요?')) return;
      resetReviewForm();
      if (typeof window.showView === 'function') window.showView('map');
    });

    // 관리자 (Phase 11)
    bindAdminView();
    bindAdminAuthModal();  // P1-4 (2026-05-18)
    bindReviewDetailModal();  // P1-5 (2026-05-18)

    // user-chip 클릭 → mypage view (시안에 이미 data-view="mypage" 있음)
    // mypage view + admin view 진입 시 자동 렌더 — MutationObserver로 감지
    const mypageView = document.querySelector('[data-view="mypage"].view');
    if (mypageView) {
      const observer = new MutationObserver(() => {
        if (mypageView.classList.contains('active')) renderMyPage();
      });
      observer.observe(mypageView, { attributes: true, attributeFilter: ['class'] });
    }
    const adminView = document.querySelector('[data-view="admin"].view');
    if (adminView) {
      const observer = new MutationObserver(() => {
        if (adminView.classList.contains('active')) renderAdminView();
      });
      observer.observe(adminView, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // ============== 초기화 ==============
  // ============== 문의 / 피드백 (2026-06-09) ==============
  function openFeedback() {
    const overlay = $('#feedbackOverlay');
    if (!overlay) return;
    const c = $('#feedbackContent'); if (c) c.value = '';
    const em = $('#feedbackEmail'); if (em) em.value = (CURRENT_USER?.email || '');
    const st = $('#feedbackStatus'); if (st) { st.textContent = ''; st.style.color = ''; }
    overlay.classList.add('active');
    window.__overlayHistoryPush?.();  // 뒤로가기로 문의 닫기 (2026-06-11)
    setTimeout(() => c?.focus(), 50);
  }

  async function submitFeedback() {
    const content = $('#feedbackContent')?.value.trim();
    const email = $('#feedbackEmail')?.value.trim();
    const category = $('#feedbackCategory')?.value || 'etc';
    const status = $('#feedbackStatus');
    const btn = $('#feedbackSubmit');
    if (!content) {
      if (status) { status.textContent = '내용을 입력해주세요'; status.style.color = '#c5171e'; }
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = '보내는 중...'; }
    try {
      await window.API.feedback.submit({ content, email, category });
      if (status) { status.textContent = '✅ 소중한 의견 감사합니다!'; status.style.color = '#1e7e34'; }
      setTimeout(() => { if ($('#feedbackOverlay')?.classList.contains('active')) history.back(); }, 1200);  // 닫기=back (history 정리)
    } catch (e) {
      console.error('[feedback] 제출 실패:', e);
      if (status) { status.textContent = '❌ ' + (e.message || '제출 실패 — 잠시 후 다시 시도해주세요'); status.style.color = '#c5171e'; }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '보내기'; }
    }
  }

  function wireFeedback() {
    $('#inquiryBtn')?.addEventListener('click', openFeedback);
    $('#feedbackClose')?.addEventListener('click', () => history.back());  // 닫기=back (뒤로가기와 통일)
    $('#feedbackSubmit')?.addEventListener('click', submitFeedback);
  }

  // 관리자 대시보드 탭 전환 (2026-06-09) — 리뷰·설정 / 문의
  function wireAdminTabs() {
    document.querySelectorAll('.admin-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.adminTab;
        document.querySelectorAll('.admin-tab').forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.admin-panel').forEach(p => {
          p.style.display = (p.dataset.adminPanel === tab) ? '' : 'none';
        });
        if (tab === 'feedback') renderFeedbackList();  // 진입 시 최신 갱신
      });
    });
  }

  async function init() {
    if (!window.API) {
      // api.js 아직 로드 안 됨 — 100ms 후 재시도 (defer 순서 보호)
      setTimeout(init, 100);
      return;
    }
    bindHandlers();
    wireFeedback();
    wireAdminTabs();
    // Supabase SDK 로드 대기 후 인증 시도
    setTimeout(() => initAuth(), 700);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 디버깅 + 외부 호출용
  window.__appHandlers = {
    getCurrentUser: () => CURRENT_USER,
    initAuth,
    handleLogout,
    renderMyPage,
    switchMypageTab,      // P2-2 (2026-05-18) — mypage 탭 전환
    deleteMyReview,       // P1-1 (2026-05-18) — 내 리뷰 삭제
    handleLogin,
    handleSignup,
    handleSetLevel,
    handleReviewSubmit,   // Phase 9
    resetReviewForm,
    renderAdminView,      // Phase 11
    approveReview,
    rejectReview,
    requireAdminAuth,     // P1-4 (2026-05-18) — admin 진입 gate
    handleAdminAuthSubmit,
    showReviewDetail,     // P1-5 (2026-05-18) — pending 리뷰 상세 modal
    closeReviewDetail,
    // 카카오 장소 검색 (2026-05-18)
    searchPlace,
    selectPlace,
    clearSelectedPlace
  };
})();
