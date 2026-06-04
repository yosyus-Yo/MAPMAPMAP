/**
 * MapMapMap v2 메인 애플리케이션 스크립트
 * (2026-05-20 index.html L818-2245 인라인 분리)
 *
 * 포함:
 *   - View routing (showView, hash change)
 *   - Kakao Map 초기화 + 마커 + 클러스터링
 *   - mapSidebar (목록/페이지네이션)
 *   - openReviewModal + closeReviewModal + 사진 캐러셀
 *   - reviewPanel CTA + Spicy guide modal + my-location-btn
 *   - 부트스트랩 (DOMContentLoaded)
 *
 * 외부 의존:
 *   - kakao.maps SDK (인라인 로드, 위 18-22 라인 cdnjs)
 *   - window.API (api.js)
 *   - window.__slime (slime-physics.js)
 *   - app-handlers.js (initAuth, renderUserChip 등)
 *
 * defer 적재 → DOM 파싱 완료 후 + 다른 defer 모듈들과 같은 timing.
 */

// View routing
    const navItems = document.querySelectorAll('.nav-item, .user-chip-floating[data-view], .guest-login-btn[data-view], .ob-header[data-view]');
    const views = document.querySelectorAll('.view');

    // View alias 매핑 (P1-3, 2026-05-18) — 비밀 URL로 admin 진입 등
    // 권한 체크는 renderAdminView()의 is_admin 검증에서 처리됨 (api.js + app-handlers.js).
    // 비-admin 사용자가 #godmap으로 들어와도 "🚫 관리자 권한이 필요합니다" 메시지만 표시됨.
    const VIEW_ALIASES = {
      'godmap': 'admin'
    };
    function resolveViewName(name) {
      return VIEW_ALIASES[name] || name;
    }
    // 노출 — 다른 스크립트에서도 사용 가능
    window.resolveViewName = resolveViewName;

    function showView(name, opts = {}) {
      const resolved = resolveViewName(name);

      // P1-8 (2026-05-18): view 전환 시 잔존 모달/패널 모두 닫기.
      // reviewModal/reviewPanel이 열린 상태에서 view 전환되면 새 view 위에 떠 있는 버그 방지.
      try {
        const m = document.getElementById('reviewModal');
        if (m && m.classList.contains('open') && typeof window.closeReviewModal === 'function') {
          window.closeReviewModal();
        }
      } catch (e) {}

      // 비회원 review-write gate (2026-05-20) — 입력 낭비 방지 + UX 친화
      if (resolved === 'review') {
        const cu = window.__appHandlers?.getCurrentUser?.() || null;
        if (!cu) {
          if (typeof showToast === 'function') showToast('리뷰 작성은 로그인 후 가능합니다');
          return showView('onboarding');
        }
      }

      // Admin gate (P1-4, 2026-05-18) — admin view 진입 시 별도 인증 강제.
      // sessionStorage['admin_auth_passed']==='1' 이면 통과.
      // 없으면 modal 표시 후 인증 성공 시점에 showView 재호출.
      if (resolved === 'admin' && sessionStorage.getItem('admin_auth_passed') !== '1') {
        if (window.__appHandlers && typeof window.__appHandlers.requireAdminAuth === 'function') {
          window.__appHandlers.requireAdminAuth(() => showView(name));
          return; // 인증 통과 후 onSuccess가 showView 재호출
        }
        // 핸들러 미로드 시 fallback: map으로 돌려보냄
        console.warn('[admin-gate] requireAdminAuth 핸들러 미로드 — map으로 fallback');
        return showView('map');
      }

      document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === resolved));
      views.forEach(v => v.classList.toggle('active', v.dataset.view === resolved));
      // 인증 전 view에선 nav 숨김
      const noNav = (resolved === 'onboarding' || resolved === 'level-setup');
      document.body.classList.toggle('no-nav', noNav);
      // 2026-06-02: 현재 view를 body 클래스로 노출 (데스크톱 반응형 — 지도 화면일 때 리뷰 사이드바 동시 표시용)
      [...document.body.classList].filter(c => c.startsWith('view-')).forEach(c => document.body.classList.remove(c));
      document.body.classList.add('view-' + resolved);
      // URL path 갱신 (2026-05-20: hash → pathname clean URL).
      // alias 입력 시에도 사용자가 입력한 alias 그대로 유지 (예: /godmap).
      // 2026-05-20: admin → /godmap으로 URL 표시 (admin URL 노출 방지, vercel /admin redirect → /).
      const urlName = (name === 'admin') ? 'godmap' : name;
      // 2026-06-01: history 모드 분기.
      // 사용자 네비게이션(다른 view로 전환)은 pushState로 스택에 쌓아
      // 브라우저 뒤로가기가 이전 view(예: 로그인→맵)로 돌아가게 함.
      // popstate 핸들러는 { history: 'none' }로 호출해 이중 기록 방지.
      const histMode = opts.history || 'auto';
      try {
        if (histMode === 'none') {
          // 브라우저가 이미 history를 이동시킨 상태 — 조작하지 않음
        } else if (histMode === 'push' || (histMode === 'auto' && pathToView() !== urlName)) {
          history.pushState(null, '', `/${urlName}`);
        } else {
          history.replaceState(null, '', `/${urlName}`);
        }
      } catch(e) {}
    }

    // pathname → view name 추출 (2026-05-20)
    // /map → 'map', /onboarding → 'onboarding', / → 'map' (default)
    function pathToView() {
      const path = location.pathname.replace(/^\//, '').replace(/\/$/, '');
      return path || 'map';
    }
    // 다른 스크립트(app-handlers.js)에서 사용 가능하도록 노출
    window.pathToView = pathToView;

    // 2026-06-02: 최신 리뷰가 독립 탭(reviews view)으로 분리 → 지도 바텀시트 토글 로직 제거.
    //   시트가 더 이상 지도 위에 없으므로 핸들 드래그/슬라임 충돌 회피 코드 불필요.
    navItems.forEach(n => n.addEventListener('click', () => showView(n.dataset.view)));
    // 2026-05-20: hash → pathname routing 전환
    const initial = pathToView();
    // alias 해소 후 실제 view 존재 여부 확인
    if ([...views].some(v => v.dataset.view === resolveViewName(initial))) showView(initial);

    // popstate 리스너 (2026-05-20, 기존 hashchange 대체) — 사용자가 뒤로/앞으로 가거나 URL 직접 입력 시 view 전환
    window.addEventListener('popstate', () => {
      const name = pathToView();
      const resolved = resolveViewName(name);
      if ([...views].some(v => v.dataset.view === resolved)) showView(name, { history: 'none' });
    });

    // ========== Supabase + Leaflet 통합 ==========
    const SUPABASE_URL = 'https://xwnqpsnagdcleseqifqv.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_plHB6vw9K1bbWpr6xtkFXA_heBnWR4U';

    // Leaflet → Kakao Maps SDK 교체 (2026-05-19)
    // 한국 지명/POI(공원/학교/역/동) 풍부한 표시 + 한글 라벨. 거지맵과 동일 기반.
    // SDK는 <head>의 정적 script 태그로 사전 로드됨 (autoload=false → kakao.maps.load() 필요)

    let RESTAURANTS = []; // Supabase에서 채워짐
    let leafMap = null;       // (변수명 유지 — 호출처가 많음) Kakao Map 인스턴스
    let detailMap = null;     // (변수명 유지) Kakao Map 인스턴스
    let supabaseClient = null;
    let mainMarkers = [];     // 가게 마커 + CustomOverlay 추적 (재렌더링용)

    // Kakao 지도 타입 매핑 (UI #tileToggle의 dataset.tile 값과 매칭)
    let currentTileName = 'voyager';  // 기본 = ROADMAP

    function loadScript(src) {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    async function loadDeps() {
      // Kakao Maps SDK는 <head>의 정적 script 태그(2026-05-18 신설)에서 사전 로드 중.
      // 여기서는 Supabase만 로드 + Kakao SDK 준비 대기.
      const results = await Promise.allSettled([
        loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'),
      ]);
      const supabaseOk = results[0].status === 'fulfilled';

      // Kakao SDK가 로드됐는지 대기 (autoload=false라 kakao.maps.load() 필요)
      const kakaoOk = await waitKakaoSdk();
      console.log('Deps:', { kakao: kakaoOk, supabase: supabaseOk });

      if (!kakaoOk) {
        console.error('❌ Kakao Maps SDK 로드 실패 — fallback 모드');
        document.body.classList.add('show-fallback');
      }
      if (supabaseOk && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
      return { kakaoOk, supabaseOk };
    }

    // Kakao Maps SDK 준비 대기 (autoload=false → kakao.maps.load 호출 필요)
    function waitKakaoSdk(maxRetries = 50) {
      return new Promise((resolve) => {
        let tries = 0;
        const check = () => {
          if (window.kakao && window.kakao.maps && typeof window.kakao.maps.load === 'function') {
            window.kakao.maps.load(() => resolve(true));
            return;
          }
          if (++tries > maxRetries) {
            console.error('[kakao] SDK 로드 대기 timeout');
            resolve(false);
            return;
          }
          setTimeout(check, 100);  // 100ms × 50 = 최대 5초 대기
        };
        check();
      });
    }

    async function fetchRestaurants() {
      if (!supabaseClient) {
        console.error('❌ Supabase client 없음');
        document.getElementById('sb-list').innerHTML = `<div class="sb-row" style="color:#c5171e">❌ Supabase SDK 로드 실패</div>`;
        return [];
      }
      try {
        // 1차: review_count > 0
        let { data, error, status, statusText } = await supabaseClient
          .from('restaurants')
          .select('*')
          .gt('review_count', 0)
          .order('review_count', { ascending: false });

        console.log('1차 페치:', { status, statusText, count: data?.length, error });

        if (error) {
          console.error('❌ Supabase 1차 에러:', error);
          // 에러여도 fallback 시도
        }

        // 1차 실패 또는 0건 → 전체 페치
        if (!data || data.length === 0) {
          console.log('⚠️ 1차 0건 → 전체 페치 시도');
          const fallback = await supabaseClient
            .from('restaurants')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
          console.log('2차 페치:', { count: fallback.data?.length, error: fallback.error });
          if (fallback.error) {
            throw new Error(`${fallback.error.code || ''}: ${fallback.error.message}`);
          }
          data = fallback.data;
        }

        RESTAURANTS = data || [];
        console.log(`✅ Supabase에서 ${RESTAURANTS.length}개 가게 로드`, RESTAURANTS.slice(0, 3));
        return RESTAURANTS;
      } catch (e) {
        console.error('❌ Supabase 페칭 실패 (전체):', e);
        document.getElementById('sb-list').innerHTML = `
          <div class="sb-row" style="color:#c5171e; line-height:1.5">
            ❌ 데이터 로드 실패<br>
            <span style="font-size:10px; font-family:monospace; color:var(--text-3)">${escapeHtml(e.message || String(e))}</span><br>
            <span style="font-size:10px; color:var(--text-4)">F12 → Console에서 자세한 에러 확인</span>
          </div>`;
        return [];
      }
    }

    function updateStats() {
      const count = RESTAURANTS.length;
      const verified = RESTAURANTS.reduce((s, r) => s + (r.review_count || 0), 0);
      const avg = count ? RESTAURANTS.reduce((s, r) => s + (r.avg_level || 0), 0) / count : 0;
      document.getElementById('stat-count').textContent = count;
      document.getElementById('stat-avg').textContent = avg.toFixed(1) + ' 🔥';
      document.getElementById('stat-verified').textContent = verified;
      document.getElementById('stat-match').textContent = count ? '100%' : '—';
      // sb-count는 renderSidebarList()가 리뷰 수 기반으로 갱신 (Phase 5)
    }

    // ============== 사이드바: 최신 리뷰 ==============
    // Phase 5/4d (2026-05-18): "매운맛 랭킹" → "최신 리뷰" 교체.
    // 사용자가 명시한 사이드바 정책 (구버전 frontend의 최신 리뷰를 신버전 사이드바에서 표시)
    let RECENT_REVIEWS = [];

    async function fetchRecentReviews(limit = 1000) {  // 2026-05-18: 20 → 1000 (전체 리뷰, 페이지네이션으로 표시)
      await getMyLevel();  // 2026-06-02: 색 배지용 내 레벨 캐시 보장 (렌더 전)
      if (!supabaseClient) {
        console.warn('[sidebar] Supabase client 없음 — 빈 리스트 반환');
        return [];
      }
      try {
        const { data, error } = await supabaseClient
          .from('reviews')
          .select(`
            id, menu_name, spicy_level, food_image_url, comment, created_at,
            users (nickname, spicy_level),
            restaurants (id, name, address, category, lat, lng)
          `)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          console.error('[sidebar] 리뷰 페치 에러:', error);
          throw new Error(`${error.code || ''}: ${error.message}`);
        }

        RECENT_REVIEWS = (data || []).map(r => ({
          id: r.id,
          menu_name: r.menu_name,
          spicy_level: r.spicy_level,
          food_image_url: r.food_image_url,
          comment: r.comment,
          created_at: r.created_at,
          user_nickname: r.users?.nickname || '익명',
          user_level: r.users?.spicy_level ?? null,
          restaurant_id: r.restaurants?.id || null,
          restaurant_name: r.restaurants?.name || '알 수 없음',
          restaurant_address: r.restaurants?.address || '',
          restaurant_category: r.restaurants?.category || null,
          restaurant_lat: r.restaurants?.lat ?? null,
          restaurant_lng: r.restaurants?.lng ?? null
        }));
        console.log(`[sidebar] ✅ ${RECENT_REVIEWS.length}건 최신 리뷰 로드`);
        return RECENT_REVIEWS;
      } catch (e) {
        console.error('[sidebar] fetchRecentReviews 실패:', e);
        document.getElementById('sb-list').innerHTML = `
          <div class="sb-review-card error">
            ❌ 최신 리뷰 로드 실패
            <div class="err-detail">${escapeHtml(e.message || String(e))}</div>
          </div>`;
        return [];
      }
    }

    // 2026-05-18: ALL_REVIEWS_FOR_NEARBY 제거 → RECENT_REVIEWS가 limit 1000으로 늘어나 통합.

    function formatRelativeTime(iso) {
      if (!iso) return '';
      const diff = Date.now() - new Date(iso).getTime();
      if (diff < 0) return '방금';
      const m = Math.floor(diff / 60000);
      if (m < 1) return '방금';
      if (m < 60) return `${m}분 전`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}시간 전`;
      const d = Math.floor(h / 24);
      if (d < 7) return `${d}일 전`;
      return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }

    function parseFirstImage(food_image_url) {
      if (!food_image_url) return null;
      // 구버전 호환: 단일 URL 또는 JSON array string
      try {
        const parsed = JSON.parse(food_image_url);
        return Array.isArray(parsed) && parsed.length ? parsed[0] : food_image_url;
      } catch {
        return food_image_url;
      }
    }

    // 모든 음식 사진을 배열로 반환 (food_image_url이 JSON array string인 경우 전부 펼침)
    function parseAllFoodImages(food_image_url) {
      if (!food_image_url) return [];
      try {
        const parsed = JSON.parse(food_image_url);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
        return [food_image_url];
      } catch {
        return [food_image_url];
      }
    }

    // 리뷰 객체에서 음식 사진만 추출 (영수증 제외 — 2026-05-18 A안)
    // 영수증은 검증용 개인정보(가격/카드/날짜)라 모달 carousel에 노출 안 함.
    function getAllPhotoUrls(rv) {
      return parseAllFoodImages(rv.food_image_url);
    }

    // 기존 호출자 호환을 위해 함수명 유지 (renderSidebarList).
    // 본문은 RECENT_REVIEWS 렌더링으로 교체.
    // 인자 옵션 (Phase 5b 추가): reviewsToRender 전달 시 그것을 사용. 미전달 시 RECENT_REVIEWS 사용.
    // filterName 인자 (2026-05-18 추가): 'nearby'일 때 거리 표시 + 카운터를 "가까운순"으로 변경
    // 2026-05-18 페이지네이션: PAGE_SIZE 단위 slice + 페이지 컨트롤 UI 자동 추가
    function renderSidebarList(reviewsToRender, filterName) {
      const list = document.getElementById('sb-list');
      if (!list) return;
      const allReviews = Array.isArray(reviewsToRender) ? reviewsToRender : RECENT_REVIEWS;

      if (!allReviews.length) {
        list.innerHTML = `
          <div class="sb-review-card empty">
            아직 등록된 리뷰가 없어요<br>
            <span style="font-size:10px; color:var(--text-4)">첫 인증을 남겨보세요 🌶</span>
          </div>`;
        // count는 전체 기준 유지 (필터 후 0건이어도 RECENT_REVIEWS 총 수 표시)
        const sbCountEmpty = document.getElementById('sb-count');
        if (sbCountEmpty) sbCountEmpty.textContent = `${RECENT_REVIEWS.length}건 · 최신순`;
        return;
      }

      // 페이지네이션 slice
      const totalPages = Math.max(1, Math.ceil(allReviews.length / PAGE_SIZE));
      if (_currentPage >= totalPages) _currentPage = totalPages - 1;
      if (_currentPage < 0) _currentPage = 0;
      const start = _currentPage * PAGE_SIZE;
      const reviews = allReviews.slice(start, start + PAGE_SIZE);

      // 비로그인/레벨 미설정 시 색 배지 안내 (2026-06-02)
      const guideNote = (myCurrentLevel() === null || myCurrentLevel() === undefined)
        ? `<div class="spice-login-note">ℹ️ 로그인 후 매운맛 레벨을 설정하면 내 기준으로 🟢🟠🔴 색이 표시돼요</div>`
        : '';
      list.innerHTML = guideNote + reviews.map(r => {
        const firstChar = (r.user_nickname || '?').charAt(0);
        const lvl = r.spicy_level ?? '?';
        const userLvl = r.user_level !== null ? `Lv.${r.user_level}` : '';
        const thumb = parseFirstImage(r.food_image_url);
        const thumbHtml = thumb ? `<img class="rc-thumb" src="${escapeHtml(thumb)}" alt="" loading="lazy" onerror="this.style.display='none'">` : '';
        const comment = r.comment ? escapeHtml(r.comment) : '';
        const commentHtml = comment ? `<div class="rc-comment">${comment}</div>` : '';
        const menu = r.menu_name ? escapeHtml(r.menu_name) : '';
        const restaurantId = r.restaurant_id ? escapeHtml(r.restaurant_id) : '';
        // nearby 필터일 때 거리 표시 (날짜 옆 또는 카드 우측에)
        const distanceHtml = (filterName === 'nearby' && typeof r._distance === 'number')
          ? `<span class="rc-distance" style="font-size:10px; color:var(--spice); font-weight:700; font-family:'Berkeley Mono',ui-monospace,monospace; margin-left:6px">📍 ${escapeHtml(formatDistance(r._distance))}</span>`
          : '';

        return `
          <div class="sb-review-card" data-review-id="${escapeHtml(r.id)}" data-restaurant-id="${restaurantId}" onclick="focusReview('${restaurantId}', ${r.restaurant_lat ?? 'null'}, ${r.restaurant_lng ?? 'null'})">
            <div class="rc-head">
              <div class="rc-user">
                <span class="rc-avatar">${escapeHtml(firstChar)}</span>
                ${escapeHtml(r.user_nickname)}
                <span class="rc-user-lvl">${escapeHtml(userLvl)}</span>
              </div>
              <span class="rc-date">${escapeHtml(formatRelativeTime(r.created_at))}${distanceHtml}</span>
            </div>
            <div class="rc-restaurant">${escapeHtml(r.restaurant_name)}${menu ? `<span class="rc-menu-inline"> · ${menu}</span>` : ''}</div>
            <span class="rc-level">평가 Lv.${lvl} 🌶</span>${spiceBadgeHtml(r.spicy_level)}
            ${commentHtml}
            ${thumbHtml}
          </div>`;
      }).join('');

      // 페이지 컨트롤 (총 페이지 2개 이상일 때만 표시)
      if (totalPages > 1) {
        const pageBtnHtml = `
          <div class="sb-pagination" style="display:flex; align-items:center; justify-content:center; gap:6px; padding:10px 4px; font-size:11px">
            <button class="sb-page-btn" data-page-action="prev" ${_currentPage === 0 ? 'disabled' : ''} style="padding:5px 10px; border:1px solid var(--border); background:${_currentPage === 0 ? 'var(--surface)' : 'var(--panel)'}; color:${_currentPage === 0 ? 'var(--text-4)' : 'var(--text)'}; border-radius:6px; cursor:${_currentPage === 0 ? 'default' : 'pointer'}; font-size:11px">‹ 이전</button>
            <span style="color:var(--text-3); font-family:'Berkeley Mono',ui-monospace,monospace; padding:0 6px">${_currentPage + 1} / ${totalPages}</span>
            <button class="sb-page-btn" data-page-action="next" ${_currentPage >= totalPages - 1 ? 'disabled' : ''} style="padding:5px 10px; border:1px solid var(--border); background:${_currentPage >= totalPages - 1 ? 'var(--surface)' : 'var(--panel)'}; color:${_currentPage >= totalPages - 1 ? 'var(--text-4)' : 'var(--text)'}; border-radius:6px; cursor:${_currentPage >= totalPages - 1 ? 'default' : 'pointer'}; font-size:11px">다음 ›</button>
          </div>`;
        list.insertAdjacentHTML('beforeend', pageBtnHtml);

        list.querySelectorAll('.sb-page-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const action = btn.dataset.pageAction;
            if (action === 'prev' && _currentPage > 0) {
              _currentPage--;
              renderSidebarList(reviewsToRender, filterName);
              list.scrollTop = 0;
            } else if (action === 'next' && _currentPage < totalPages - 1) {
              _currentPage++;
              renderSidebarList(reviewsToRender, filterName);
              list.scrollTop = 0;
            }
          });
        });
      }

      // count 갱신 (nearby 모드면 "가까운순", 그 외 "최신순") + 페이지 정보
      const sbCount = document.getElementById('sb-count');
      if (sbCount) {
        const orderLabel = filterName === 'nearby' ? '가까운순' : '최신순';
        const pageInfo = totalPages > 1 ? ` (${_currentPage + 1}/${totalPages})` : '';
        sbCount.textContent = `${allReviews.length}건 · ${orderLabel}${pageInfo}`;
      }
    }

    // 사이드바 카드 클릭 핸들러 — 지도가 있으면 가게 위치로 이동
    // 2026-05-19: Kakao Maps 교체 후 setView → setCenter/setLevel로 변환
    window.focusReview = function (restaurantId, lat, lng) {
      if (lat && lng && leafMap && window.kakao && window.kakao.maps) {
        leafMap.setCenter(new window.kakao.maps.LatLng(lat, lng));
        leafMap.setLevel(3);  // Leaflet zoom 16 ≈ Kakao level 3
      }
      if (restaurantId) {
        openReviewPanel(restaurantId);
      }
    };

    // 로그인/레벨설정 후 최신 리뷰 재렌더 (2026-06-02): 색 배지 반영.
    // app-handlers가 로그인 성공·레벨 설정 직후 호출 → _myLevel 무효화 + 사이드바 다시 그림.
    window.refreshRecentReviews = function () {
      _myLevel = null;  // 다음 getMyLevel 호출 시 재조회 (단, spiceBadgeHtml은 CURRENT_USER 우선)
      try { renderSidebarList(); } catch (e) { console.warn('[refreshRecentReviews] 실패:', e); }
    };

    // ============== 사이드바 탭 필터 (Phase 5b, 2026-05-18) ==============
    let _myLevel = null; // 로그인 사용자 매운맛 레벨 cache (lazy fetch)

    // ============== 페이지네이션 state (2026-05-18) ==============
    const PAGE_SIZE = 10;
    let _currentPage = 0;
    let _currentFilterName = 'all'; // 현재 활성 필터 (페이지 이동 시 필요)

    // 현재 내 매운맛 레벨 (2026-06-02 fix): app-handlers의 CURRENT_USER를 우선 참조.
    // getMyLevel()의 supabase 재조회는 별도 auth 인스턴스/타이밍으로 null이 될 수 있어,
    // 로그인 권위 출처(CURRENT_USER)를 먼저 보고 없으면 캐시(_myLevel) fallback.
    function myCurrentLevel() {
      const cu = window.__appHandlers && window.__appHandlers.getCurrentUser && window.__appHandlers.getCurrentUser();
      if (cu && cu.spicy_level !== null && cu.spicy_level !== undefined) return cu.spicy_level;
      return _myLevel;
    }

    // 내 레벨 대비 상대 매운맛 색 배지 HTML (2026-06-02)
    // diff = 리뷰레벨 - 내레벨 → ≤0 safe(🟢) / =1 warning(🟠) / ≥2 danger(🔴)
    // 내 레벨이 null(비로그인/레벨 미설정)이거나 reviewLevel이 없으면 '' (배지 없음)
    function spiceBadgeHtml(reviewLevel) {
      const myLevel = myCurrentLevel();
      if (myLevel === null || myLevel === undefined) return '';
      if (reviewLevel === null || reviewLevel === undefined) return '';
      const diff = reviewLevel - myLevel;
      const [cls, label] = diff <= 0 ? ['safe', '맛있게 먹을 수 있어요']
        : diff === 1 ? ['warning', '조금 매울 수 있어요']
        : ['danger', '도전이 필요해요'];
      return `<span class="spice-badge ${cls}">${label}</span>`;
    }

    async function getMyLevel() {
      if (_myLevel !== null) return _myLevel;
      if (!supabaseClient) return null;
      try {
        const { data: { user: authUser } } = await supabaseClient.auth.getUser();
        if (!authUser) return null;
        const { data, error } = await supabaseClient
          .from('users')
          .select('spicy_level')
          .eq('id', authUser.id)
          .single();
        if (error || !data) return null;
        _myLevel = data.spicy_level ?? null;
        console.log(`[sidebar-filter] 내 레벨 캐싱: Lv.${_myLevel}`);
        return _myLevel;
      } catch (e) {
        console.warn('[sidebar-filter] 내 레벨 조회 실패:', e);
        return null;
      }
    }

    // ============== 내 위치 + 거리 계산 (2026-05-18) ==============
    let _userPosition = null; // {lat, lng} cache
    let _userPositionDenied = false;

    function getUserPosition() {
      // 캐시 있으면 즉시 반환
      if (_userPosition) return Promise.resolve(_userPosition);
      if (_userPositionDenied) return Promise.resolve(null);
      if (!navigator.geolocation) return Promise.resolve(null);
      // (app-handlers.js의 searchPlace에서 거리순 정렬용으로 호출 — 2026-05-19)
      // 아래 함수 정의 종료 후 window.getUserPosition 노출 (스코프 끝에서)

      return new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
          pos => {
            _userPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            console.log(`[nearby] 위치 획득: ${_userPosition.lat.toFixed(4)}, ${_userPosition.lng.toFixed(4)}`);
            resolve(_userPosition);
          },
          err => {
            console.warn('[nearby] geolocation 거부/실패:', err.message);
            _userPositionDenied = true;
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
        );
      });
    }

    // app-handlers.js에서 호출하기 위해 window 노출 (2026-05-19, 카카오 검색 거리순 정렬)
    window.getUserPosition = getUserPosition;

    // ============== 내 위치로 이동 + 지도 범례 토글 (v1 이식 Phase B, 2026-05-19) ==============
    let _userLocationMarker = null;

    async function moveToMyLocation() {
      if (!leafMap) {
        console.warn('[my-location] leafMap 미초기화 — 지도 로드 후 다시 시도');
        return;
      }
      // 권한 재요청 허용 (이전 거부 캐시 무시) — 사용자가 명시적으로 클릭한 경우
      _userPositionDenied = false;
      const userPos = await getUserPosition();
      if (!userPos) {
        // 권한 거부 — 브라우저 자체 UI에 의존
        console.warn('[my-location] 위치 권한 거부 또는 획득 실패');
        return;
      }
      const moveLatLng = new window.kakao.maps.LatLng(userPos.lat, userPos.lng);
      leafMap.setCenter(moveLatLng);
      leafMap.setLevel(4);

      // 사용자 위치 마커 (파란 점)
      if (_userLocationMarker) {
        try { _userLocationMarker.setMap(null); } catch (e) {}
      }
      const markerHtml = `<div style="width:18px;height:18px;background:#4285F4;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`;
      _userLocationMarker = new window.kakao.maps.CustomOverlay({
        position: moveLatLng,
        content: markerHtml,
        yAnchor: 0.5,
        xAnchor: 0.5,
      });
      _userLocationMarker.setMap(leafMap);
    }

    function toggleMapLegend() {
      const el = document.getElementById('map-legend');
      if (el) el.classList.toggle('collapsed');
    }

    // 이벤트 바인딩 (DOM 이미 파싱된 시점이라 즉시 등록 가능)
    document.getElementById('map-my-location-btn')?.addEventListener('click', moveToMyLocation);
    document.getElementById('map-legend-header')?.addEventListener('click', toggleMapLegend);

    // 2026-06-01: 모바일에서는 범례를 기본 접힌(작은 칩) 상태로 시작 — 탭하면 5단계 펼쳐짐
    if (window.matchMedia('(max-width: 768px)').matches) {
      document.getElementById('map-legend')?.classList.add('collapsed');
    }


    // Haversine distance (km)
    function haversineKm(lat1, lng1, lat2, lng2) {
      const toRad = d => d * Math.PI / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    }

    function formatDistance(km) {
      if (km === null || km === undefined || isNaN(km)) return '';
      if (km < 1) return `${Math.round(km * 1000)}m`;
      if (km < 10) return `${km.toFixed(1)}km`;
      return `${Math.round(km)}km`;
    }

    function filterReviews(filterName) {
      if (filterName === 'photo') {
        // 사진 있는 리뷰만
        return RECENT_REVIEWS.filter(r => !!parseFirstImage(r.food_image_url));
      }
      if (filterName === 'my-level') {
        // 내 레벨 이하의 리뷰만 (안전하게 먹을 수 있는 매운맛)
        if (_myLevel === null) return null; // null = 로그인 안내 필요
        return RECENT_REVIEWS.filter(r => r.spicy_level !== null && r.spicy_level <= _myLevel);
      }
      if (filterName === 'nearby') {
        // 내 위치 기반 거리순 정렬 (RECENT_REVIEWS는 limit 1000으로 늘어 전체 사용)
        if (!_userPosition) return null; // null = geolocation 안내 필요
        const enriched = RECENT_REVIEWS
          .filter(r => r.restaurant_lat !== null && r.restaurant_lng !== null)
          .map(r => ({
            ...r,
            _distance: haversineKm(_userPosition.lat, _userPosition.lng, r.restaurant_lat, r.restaurant_lng)
          }));
        enriched.sort((a, b) => a._distance - b._distance);
        return enriched;
      }
      // 'all' 또는 그 외
      return RECENT_REVIEWS;
    }

    async function applySidebarFilter(filterName) {
      // 필터 변경 시 페이지 리셋
      _currentPage = 0;
      _currentFilterName = filterName;

      if (filterName === 'my-level') {
        await getMyLevel();
      }
      if (filterName === 'nearby') {
        // 로딩 표시 + geolocation 요청 (RECENT_REVIEWS는 이미 limit 1000으로 로드됨)
        const list = document.getElementById('sb-list');
        if (list && !_userPosition && !_userPositionDenied) {
          list.innerHTML = `<div class="sb-review-card empty">📍 내 위치 확인 중...<br><span style="font-size:10px; color:var(--text-4)">브라우저 권한 허용 필요</span></div>`;
        }
        await getUserPosition();
      }
      const filtered = filterReviews(filterName);

      if (filtered === null) {
        const list = document.getElementById('sb-list');
        if (list) {
          if (filterName === 'nearby') {
            list.innerHTML = `
              <div class="sb-review-card empty">
                📍 위치 권한이 필요해요<br>
                <span style="font-size:10px; color:var(--text-4)">브라우저 설정에서 위치 액세스를 허용해주세요</span>
              </div>`;
          } else {
            list.innerHTML = `
              <div class="sb-review-card empty">
                로그인 후 사용 가능합니다<br>
                <span style="font-size:10px; color:var(--text-4)">상단 마이페이지에서 매운맛 레벨을 먼저 설정해주세요</span>
              </div>`;
          }
        }
        const sbCount = document.getElementById('sb-count');
        if (sbCount) sbCount.textContent = `${RECENT_REVIEWS.length}건 · 최신순`;
        return;
      }

      // nearby 모드일 때 카운터를 "가까운순"으로 표시하기 위해 플래그 전달
      renderSidebarList(filtered, filterName);
    }

    // 사이드바 탭 클릭 시 필터 발동
    // 시안의 일반 sb-tabs 핸들러는 active 토글만 처리 — 필터링은 본 핸들러 책임.
    document.querySelectorAll('.map-sidebar .sb-tab[data-filter]').forEach(tab => {
      tab.addEventListener('click', () => {
        const filter = tab.dataset.filter || 'all';
        applySidebarFilter(filter);
      });
    });

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    window.focusRestaurant = function(id) {
      const r = RESTAURANTS.find(x => x.id === id);
      if (!r) return;
      if (leafMap && r.lat && r.lng) leafMap.setView([r.lat, r.lng], 16);
      openReviewPanel(id);
    };

    // ============== 리뷰 패널 ==============
    // 리뷰 패널에서 "내가 인증 남기기" 클릭 시 사용할 현재 가게 ID
    let _currentRestaurantId = null;

    // 음식점 패널 페이지네이션 state (2026-05-19)
    const RP_PAGE_SIZE = 10;
    let _rpAllReviews = [];     // 페치된 전체 리뷰 (페이지네이션 source)
    let _rpCurrentRestaurant = null;
    let _rpPage = 0;
    // Likes state (Phase B, 2026-05-19)
    let _rpLikeCounts = {};     // { reviewId: count }
    let _rpMyLikedSet = new Set();  // 내가 좋아요 한 리뷰 ID 집합

    async function openReviewPanel(id) {
      _currentRestaurantId = id;  // 2026-05-18: "✍ 내가 인증 남기기" 핸들러용
      await getMyLevel();  // 2026-06-02: 색 배지용 내 레벨 캐시 보장 (리뷰 렌더 전)
      const r = RESTAURANTS.find(x => x.id === id);
      if (!r) return;
      _rpCurrentRestaurant = r;
      _rpPage = 0;

      // Head + stats 즉시 갱신
      document.getElementById('rp-name').innerHTML = `${escapeHtml(r.name)}${Math.round(r.avg_level || 0) >= 4 ? ' 🔥' : ''}`;
      // category 데이터가 없거나 placeholder('-','—','–')인 매장은 '매운맛'으로 통일
      // (일부 매장만 category 입력되어 '—'/'-'로 표시되던 불일치 해결, 2026-06-02)
      const _cat = (r.category || '').trim();
      const _catLabel = (_cat && !['-', '—', '–', '–', '·'].includes(_cat)) ? _cat : '매운맛';
      document.getElementById('rp-meta').textContent = `${_catLabel} · ${(r.address || '').slice(0, 30)}`;
      const lvl = Math.round(r.avg_level || 0);
      // 2026-05-20: 가짜 평점 제거 (Option A) + 실제 avg_rating 표시 (Option B)
      // avg_rating이 null이면 "—" 표시 (아직 별점 리뷰 없음)
      const star = (r.avg_rating !== null && r.avg_rating !== undefined)
        ? r.avg_rating.toFixed(1)
        : '—';
      document.getElementById('rp-rating').innerHTML = `<span class="star">★</span> ${star}`;
      document.getElementById('rp-level').textContent = 'Lv.' + lvl + ' 🔥';
      document.getElementById('rp-count').textContent = r.review_count || 0;

      // 추가 정보 채우기 (카테고리/주소/전화)
      renderExtraInfo(r);

      // body는 로딩 표시
      document.getElementById('rp-body').innerHTML = '<div class="rp-loading">⏳ 리뷰 로드 중...</div>';
      // 사진 캐러셀 초기 숨김 (리뷰 페치 후 채움)
      document.getElementById('rp-photos-carousel').style.display = 'none';

      // 패널 슬라이드 인
      const panel = document.getElementById('reviewPanel');
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
      // 범례를 패널 오른쪽으로 밀어냄 (2026-05-19, CSS에서 처리)
      document.body.classList.add('review-panel-open');
      // 🟢 슬라임 충돌: 패널이 슬라이드 인하는 동안 매 프레임 wake up 강제 → 패널이 슬라임 obstacle로 push
      // CSS 자동 이동 제거 후, 충돌 검사가 매 프레임 동작해야 패널이 슬라임을 진짜로 밀어냄
      if (window.__slime && typeof window.__slime.wakeUp === 'function') {
        const SLIDE_DURATION = 600;  // 350 → 600ms: 패널 슬라이드 + 슬라임 미끄러짐 tail 충분히
        const wakeStart = Date.now();
        const wakeInterval = setInterval(() => {
          window.__slime.wakeUp();
          const slimeEl = document.getElementById('map-legend');
          const panelEl = document.getElementById('reviewPanel');
          if (slimeEl && panelEl) {
            const sRect = slimeEl.getBoundingClientRect();
            const pRect = panelEl.getBoundingClientRect();
            const overlap = sRect.left < pRect.right && sRect.right > pRect.left
                         && sRect.top < pRect.bottom && sRect.bottom > pRect.top;
            if (overlap) {
              // 우측 push 강화 (3-5 → 7-10) + y 진동
              window.__slime.applyImpulse(7 + Math.random() * 3, -1.5 + Math.random() * 3);
            }
          }
          if (Date.now() - wakeStart > SLIDE_DURATION) clearInterval(wakeInterval);
        }, 16);
      }

      // Supabase에서 리뷰 페치 (limit 100 — 충분히 큰 양, 클라이언트 페이지네이션)
      if (!supabaseClient) {
        document.getElementById('rp-body').innerHTML = '<div class="rp-empty">Supabase SDK 미로드</div>';
        return;
      }
      try {
        const { data, error } = await supabaseClient
          .from('reviews')
          .select('*, users (nickname, spicy_level)')
          .eq('restaurant_id', id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(100);

        let reviews;
        if (error) {
          // RLS/스키마 다를 가능성 → status 필터 빼고 재시도
          console.warn('1차 리뷰 페치 실패, status 필터 제거 후 재시도:', error);
          const fb = await supabaseClient
            .from('reviews')
            .select('*, users (nickname, spicy_level)')
            .eq('restaurant_id', id)
            .order('created_at', { ascending: false })
            .limit(100);
          if (fb.error) throw fb.error;
          reviews = fb.data;
        } else {
          reviews = data;
        }
        _rpAllReviews = reviews || [];

        // Likes 정보 batch 페치 (Phase B, 2026-05-19)
        _rpLikeCounts = {};
        _rpMyLikedSet = new Set();
        const reviewIds = _rpAllReviews.map(rv => rv.id).filter(Boolean);
        if (reviewIds.length > 0 && window.API?.likes) {
          try {
            const [countsRes, mineRes] = await Promise.all([
              window.API.likes.getCountsForReviews(reviewIds),
              window.API.likes.getMyLikedReviewIds(reviewIds),
            ]);
            _rpLikeCounts = countsRes?.counts || {};
            _rpMyLikedSet = mineRes?.likedSet || new Set();
          } catch (e) {
            // RLS / 테이블 미존재 시 silent — likes UI는 0/미선택으로 표시됨
            console.warn('[likes] batch fetch 실패 (테이블 미존재 가능):', e?.message || e);
          }
        }

        renderPhotosCarousel(_rpAllReviews);
        renderReviews(_rpAllReviews, r);
      } catch (e) {
        console.error('리뷰 페치 실패:', e);
        document.getElementById('rp-body').innerHTML = `
          <div class="rp-empty" style="color:#c5171e">
            ❌ 리뷰 로드 실패<br>
            <span style="font-size:10px; color:var(--text-4); font-family:monospace">${escapeHtml(e.message || String(e))}</span>
          </div>`;
      }
    }

    // 추가 정보 (카테고리/주소/전화) 표시 (2026-05-19)
    function renderExtraInfo(r) {
      const setRow = (id, val) => {
        const row = document.getElementById(id);
        const v = row?.querySelector('.rp-extra-val');
        if (val && v) { v.textContent = val; row.style.display = ''; }
        else if (row) { row.style.display = 'none'; }
      };
      setRow('rp-extra-category', r.category || '');
      setRow('rp-extra-address', r.address || '');
      setRow('rp-extra-phone', r.phone || '');

      // 2026-05-20: 외부 지도 링크 (카카오 deeplink + 네이버 검색 URL)
      renderExternalMapLinks(r);
    }

    // 카카오/네이버 외부 지도 링크 생성 (2026-05-20)
    // - 카카오: kakao_place_id 있으면 정확한 deeplink, 없으면 검색 URL
    // - 네이버: 검색 URL만 사용 (2026-05-20 API 폐기 — name만 검색 시 API 가치 작음)
    function renderExternalMapLinks(r) {
      const links = document.getElementById('rp-extra-links');
      const kakaoLink = document.getElementById('rp-link-kakao');
      const naverLink = document.getElementById('rp-link-naver');
      if (!links || !kakaoLink || !naverLink) return;

      const name = r.name || '';
      const address = r.address || '';
      if (!name) {
        links.style.display = 'none';
        return;
      }
      links.style.display = '';

      // 카카오맵 — kakao_place_id 있으면 deeplink, 없으면 검색 URL (2026-05-20: name만, address 제외 — 사용자 요청)
      if (r.kakao_place_id) {
        kakaoLink.href = `https://place.map.kakao.com/${encodeURIComponent(r.kakao_place_id)}`;
      } else {
        kakaoLink.href = `https://map.kakao.com/?q=${encodeURIComponent(name)}`;
      }
      kakaoLink.style.display = '';

      // 네이버 — 검색 URL만 사용 (2026-05-20: API 폐기 결정, name만 검색하므로 API 가치 작음)
      // 이전: Edge Function 호출로 정확한 URL 가져왔으나 사용자 정책에 따라 폐기
      // Edge Function 자체는 Supabase에 남아있을 수 있으나 클라이언트가 호출 안 함 (가용 비용 0)
      naverLink.href = `https://map.naver.com/p/search/${encodeURIComponent(name)}`;
      naverLink.style.display = '';
    }

    // 사진 캐러셀 — 모든 리뷰의 음식 사진을 가로 슬라이드로 (2026-05-19)
    function renderPhotosCarousel(reviews) {
      const carousel = document.getElementById('rp-photos-carousel');
      const track = document.getElementById('rp-photos-track');
      const dots = document.getElementById('rp-photos-dots');
      if (!carousel || !track || !dots) return;

      // 모든 리뷰의 사진 URL 수집 (첫 리뷰 먼저, 최대 20장)
      const allPhotos = [];
      (reviews || []).forEach(rv => {
        const urls = getAllPhotoUrls(rv);
        urls.forEach(u => { if (u && allPhotos.length < 20) allPhotos.push(u); });
      });

      if (allPhotos.length === 0) {
        carousel.style.display = 'none';
        track.innerHTML = '';
        dots.innerHTML = '';
        return;
      }

      carousel.style.display = '';
      track.innerHTML = allPhotos.map((u, i) =>
        `<img src="${escapeHtml(u)}" loading="lazy" alt="음식 사진 ${i+1}" data-photo-idx="${i}" onerror="this.style.display='none'">`
      ).join('');
      dots.innerHTML = allPhotos.map((_, i) =>
        `<div class="dot${i === 0 ? ' active' : ''}" data-idx="${i}"></div>`
      ).join('');

      // 이미지 클릭 → openImageViewer (전체 사진 배열 전달)
      track.onclick = (e) => {
        const img = e.target.closest('img[data-photo-idx]');
        if (!img) return;
        const idx = parseInt(img.dataset.photoIdx, 10);
        if (typeof window.openImageViewer === 'function') {
          window.openImageViewer(allPhotos, idx);
        }
      };

      // 스크롤 시 dot active 업데이트
      track.onscroll = () => {
        const slideWidth = track.clientWidth - 28;  // gap 보정 (calc(100% - 28px))
        const activeIdx = Math.round(track.scrollLeft / slideWidth);
        dots.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === activeIdx));
      };
    }

    let _currentReviews = []; // 모달에서 사용 (전체)

    // 리뷰 렌더링 — 페이지네이션 적용 (10개씩, 2026-05-19)
    function renderReviews(reviews, restaurant) {
      _currentReviews = reviews || [];
      const body = document.getElementById('rp-body');
      if (!reviews || reviews.length === 0) {
        body.innerHTML = `
          <div class="rp-empty">
            아직 등록된 리뷰가 없어요<br>
            <span style="font-size:11px; color:var(--text-4)">첫 인증을 남겨보세요 🌶</span>
          </div>`;
        return;
      }

      const totalPages = Math.ceil(reviews.length / RP_PAGE_SIZE);
      const safePage = Math.max(0, Math.min(_rpPage, totalPages - 1));
      _rpPage = safePage;
      const startIdx = safePage * RP_PAGE_SIZE;
      const pageReviews = reviews.slice(startIdx, startIdx + RP_PAGE_SIZE);

      const title = `<div class="rp-section-title">📝 인증 리뷰 (${reviews.length}건) — 클릭해서 자세히</div>`;

      const cards = pageReviews.map((rv, pageIdx) => {
        const globalIdx = startIdx + pageIdx;  // 전체 리뷰 배열 내 index (openReviewModal용)
        const userLevel = rv.users?.spicy_level ?? rv.user_level ?? 0;
        const reviewLevel = rv.spicy_level ?? rv.level ?? 0;
        const nickname = rv.users?.nickname || rv.user_nickname || '익명';
        const date = rv.created_at ? new Date(rv.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '';
        const content = rv.content || rv.review_text || rv.comment || '';
        let photos = '';
        const photoUrls = getAllPhotoUrls(rv);
        if (photoUrls.length) {
          photos = '<div class="photos">' + photoUrls.map(u => `<img class="photo" src="${escapeHtml(u)}" loading="lazy" onerror="this.style.display='none'">`).join('') + '</div>';
        }
        // 공감 버튼 (Phase B, 2026-05-19)
        const likeCount = _rpLikeCounts[rv.id] || 0;
        const isLiked = _rpMyLikedSet.has(rv.id);
        const likeBtn = rv.id ? `
          <div class="footer">
            <button type="button"
                    class="like-btn${isLiked ? ' liked' : ''}"
                    data-review-id="${escapeHtml(String(rv.id))}"
                    onclick="event.stopPropagation(); rpToggleLike('${escapeHtml(String(rv.id))}', this)"
                    title="${isLiked ? '공감 취소' : '공감하기'}">
              <span class="heart">${isLiked ? '❤' : '🤍'}</span>
              <span class="count">${likeCount}</span>
            </button>
          </div>` : '';

        return `
          <div class="rp-review" onclick="openReviewModal(${globalIdx})">
            <div class="head">
              <div class="user">${escapeHtml(nickname)} <span class="badge">Lv.${userLevel}</span></div>
              <div class="date">${escapeHtml(date)}</div>
            </div>
            <div class="body">
              <div class="rc-level" style="margin-bottom:6px">평가 Lv.${reviewLevel} 🌶 ${spiceBadgeHtml(reviewLevel)}</div>
              ${escapeHtml(content.length > 80 ? content.slice(0, 80) + '…' : content)}
            </div>
            ${photos}
            ${likeBtn}
          </div>`;
      }).join('');

      // 페이지네이션 (총 10개 초과 시만 표시)
      let pagination = '';
      if (reviews.length > RP_PAGE_SIZE) {
        pagination = `
          <div class="rp-pagination">
            <button onclick="rpChangePage(${safePage - 1})" ${safePage === 0 ? 'disabled' : ''}>‹ 이전</button>
            <span class="rp-page-info">${safePage + 1} / ${totalPages}</span>
            <button onclick="rpChangePage(${safePage + 1})" ${safePage >= totalPages - 1 ? 'disabled' : ''}>다음 ›</button>
          </div>`;
      }

      body.innerHTML = title + cards + pagination;
      // 페이지 전환 시 body 상단으로 스크롤
      body.scrollTop = 0;
    }

    window.rpChangePage = function(newPage) {
      _rpPage = newPage;
      renderReviews(_rpAllReviews, _rpCurrentRestaurant);
    };

    // 공감 버튼 토글 (Phase B, 2026-05-19)
    // 카드 클릭(openReviewModal)과 충돌 방지: onclick에서 event.stopPropagation()
    window.rpToggleLike = async function(reviewId, btnEl) {
      if (!reviewId || !btnEl) return;
      if (!window.API?.likes?.toggle) {
        showToast('공감 기능 API 미준비');
        return;
      }

      // 비로그인 사전 차단 (UX 친화)
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
          showToast('로그인 후 공감할 수 있어요');
          return;
        }
      } catch (e) {
        showToast('로그인 상태 확인 실패');
        return;
      }

      // 더블 클릭 방지 (disable during request)
      if (btnEl.disabled) return;
      btnEl.disabled = true;

      // Optimistic UI
      const wasLiked = btnEl.classList.contains('liked');
      const countEl = btnEl.querySelector('.count');
      const heartEl = btnEl.querySelector('.heart');
      const prevCount = parseInt(countEl?.textContent || '0', 10);

      try {
        const res = await window.API.likes.toggle(reviewId);
        if (!res?.success) throw new Error('toggle 실패');

        // 서버 응답 기준 동기화
        if (res.liked) {
          btnEl.classList.add('liked');
          if (heartEl) heartEl.textContent = '❤';
          _rpMyLikedSet.add(reviewId);
          btnEl.title = '공감 취소';
        } else {
          btnEl.classList.remove('liked');
          if (heartEl) heartEl.textContent = '🤍';
          _rpMyLikedSet.delete(reviewId);
          btnEl.title = '공감하기';
        }
        if (countEl) countEl.textContent = String(res.count);
        _rpLikeCounts[reviewId] = res.count;

        // 2026-05-20 fix: 같은 reviewId를 표시하는 모든 .like-btn 동기화 (패널 ↔ 모달 양방향)
        document.querySelectorAll(`.like-btn[data-review-id="${CSS.escape(String(reviewId))}"]`).forEach(otherBtn => {
          if (otherBtn === btnEl) return;
          otherBtn.classList.toggle('liked', res.liked);
          const h = otherBtn.querySelector('.heart');
          const c = otherBtn.querySelector('.count');
          if (h) h.textContent = res.liked ? '❤' : '🤍';
          if (c) c.textContent = String(res.count);
          otherBtn.title = res.liked ? '공감 취소' : '공감하기';
        });
      } catch (e) {
        console.error('[likes] toggle 실패:', e);
        // 롤백 (optimistic UI는 안 건드렸으므로 사용자 메시지만)
        const msg = (e?.message || '').includes('review_likes')
          ? '공감 테이블 미준비 (Supabase SQL 실행 필요)'
          : '공감 처리 실패: ' + (e?.message || e);
        showToast(msg);
      } finally {
        btnEl.disabled = false;
      }
    };

    // ============== 리뷰 상세 모달 ==============
    let _modalPhotos = [];
    let _modalPhotoIdx = 0;

    window.openReviewModal = function(idx) {
      const rv = _currentReviews[idx];
      if (!rv) return;

      // 2026-05-20 fix: 같은 리뷰카드 다시 누르면 토글 닫기 (사용자 요청)
      const _modal = document.getElementById('reviewModal');
      if (_modal && _modal.classList.contains('open') && _modal.dataset.currentIdx === String(idx)) {
        window.closeReviewModal();
        return;
      }
      if (_modal) _modal.dataset.currentIdx = String(idx);

      const nickname = rv.users?.nickname || rv.user_nickname || '익명';
      const userLevel = rv.users?.spicy_level ?? rv.user_level ?? 0;
      const reviewLevel = rv.spicy_level ?? rv.level ?? 0;
      const date = rv.created_at ? new Date(rv.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) : '';
      const content = rv.content || rv.review_text || rv.comment || '(내용 없음)';

      document.getElementById('rm-avatar').textContent = nickname.charAt(0) || '?';
      document.getElementById('rm-nickname').innerHTML = `${escapeHtml(nickname)} <span class="badge">Lv.${userLevel}</span>`;
      document.getElementById('rm-date').textContent = date;
      document.getElementById('rm-content').textContent = content;
      // 최신 리뷰와 동일하게 "평가 Lv.N 🌶" 텍스트로 통일 (막대 제거, 2026-06-02)
      document.getElementById('rm-level').textContent = '평가 Lv.' + reviewLevel + ' 🌶';
      // 내 레벨 대비 색 배지 (2026-06-02)
      const _rmBadge = document.getElementById('rm-spice-badge');
      if (_rmBadge) _rmBadge.innerHTML = spiceBadgeHtml(reviewLevel);

      // 사진들 — food_image_url JSON array 펼침 + receipt 마지막. 음식 사진부터 보임 (이전에는 첫 URL이 깨져 🚫 표시됨)
      _modalPhotos = getAllPhotoUrls(rv);
      _modalPhotoIdx = 0;
      renderModalPhoto();

      // 썸네일들
      const thumbsSection = document.getElementById('rm-thumbs-section');
      const thumbs = document.getElementById('rm-thumbs');
      if (_modalPhotos.length > 1) {
        thumbsSection.style.display = '';
        thumbs.innerHTML = _modalPhotos.map((u, i) =>
          `<img class="rm-photo-thumb${i === _modalPhotoIdx ? ' active' : ''}" src="${escapeHtml(u)}" onclick="setModalPhoto(${i})" onerror="this.style.display='none'">`
        ).join('');
      } else {
        thumbsSection.style.display = 'none';
      }

      // 공감 버튼 상태 렌더 + 클릭 핸들러 (2026-05-20)
      // rpToggleLike(reviewId, btnEl) 재사용 — btnEl은 .heart/.count 자식이 있는 button이면 OK
      const likeBtn = document.getElementById('rm-like-btn');
      if (likeBtn && rv.id) {
        const isLiked = (_rpMyLikedSet && _rpMyLikedSet.has(rv.id)) || false;
        const count = (_rpLikeCounts && _rpLikeCounts[rv.id]) || 0;
        likeBtn.dataset.reviewId = rv.id;
        likeBtn.classList.toggle('liked', isLiked);
        const heartEl = likeBtn.querySelector('.heart');
        const countEl = likeBtn.querySelector('.count');
        if (heartEl) heartEl.textContent = isLiked ? '❤' : '🤍';
        if (countEl) countEl.textContent = String(count);
        likeBtn.title = isLiked ? '공감 취소' : '공감하기';
        // onclick 매번 재등록 (closure로 rv.id 캡처)
        likeBtn.onclick = (e) => {
          e.stopPropagation();
          if (typeof window.rpToggleLike === 'function') {
            window.rpToggleLike(rv.id, likeBtn);
          }
        };
      }

      // 열기
      document.getElementById('reviewModal').classList.add('open');
      // 🟢 슬라임 충돌: reviewModal slide-in 동안 매 프레임 wake up + 우측 push impulse (2026-05-19)
      if (window.__slime && typeof window.__slime.wakeUp === 'function') {
        const SLIDE_DURATION = 600;
        const wakeStart = Date.now();
        const wakeInterval = setInterval(() => {
          window.__slime.wakeUp();
          const slimeEl = document.getElementById('map-legend');
          const modalEl = document.getElementById('reviewModal');
          if (slimeEl && modalEl) {
            const sRect = slimeEl.getBoundingClientRect();
            const mRect = modalEl.getBoundingClientRect();
            const overlap = sRect.left < mRect.right && sRect.right > mRect.left
                         && sRect.top < mRect.bottom && sRect.bottom > mRect.top;
            if (overlap) {
              window.__slime.applyImpulse(7 + Math.random() * 3, -1.5 + Math.random() * 3);
            }
          }
          if (Date.now() - wakeStart > SLIDE_DURATION) clearInterval(wakeInterval);
        }, 16);
      }
    };

    function renderModalPhoto() {
      const hero = document.getElementById('rm-hero');
      const counter = document.getElementById('rm-counter');
      const prev = document.getElementById('rm-prev');
      const next = document.getElementById('rm-next');
      // 기존 img 제거
      hero.querySelectorAll('img, .rm-hero-empty').forEach(el => el.remove());

      if (_modalPhotos.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'rm-hero-empty';
        empty.textContent = '🍜';
        hero.insertBefore(empty, hero.firstChild);
        counter.style.display = 'none';
        prev.style.display = 'none';
        next.style.display = 'none';
        return;
      }

      const img = document.createElement('img');
      img.src = _modalPhotos[_modalPhotoIdx];
      img.onerror = function() {
        this.style.display = 'none';
        const empty = document.createElement('div');
        empty.className = 'rm-hero-empty';
        empty.textContent = '🚫';
        hero.insertBefore(empty, hero.firstChild);
      };
      hero.insertBefore(img, hero.firstChild);

      if (_modalPhotos.length > 1) {
        counter.style.display = '';
        counter.textContent = `${_modalPhotoIdx + 1} / ${_modalPhotos.length}`;
        prev.style.display = '';
        next.style.display = '';
        prev.disabled = _modalPhotoIdx === 0;
        next.disabled = _modalPhotoIdx === _modalPhotos.length - 1;
      } else {
        counter.style.display = 'none';
        prev.style.display = 'none';
        next.style.display = 'none';
      }
    }

    window.changePhoto = function(delta) {
      const newIdx = _modalPhotoIdx + delta;
      if (newIdx < 0 || newIdx >= _modalPhotos.length) return;
      _modalPhotoIdx = newIdx;
      renderModalPhoto();
      // 썸네일 active 갱신
      document.querySelectorAll('.rm-photo-thumb').forEach((t, i) => t.classList.toggle('active', i === _modalPhotoIdx));
    };

    window.setModalPhoto = function(idx) {
      _modalPhotoIdx = idx;
      renderModalPhoto();
      document.querySelectorAll('.rm-photo-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
    };

    window.closeReviewModal = function() {
      const m = document.getElementById('reviewModal');
      if (m) {
        m.classList.remove('open');
        delete m.dataset.currentIdx;  // 2026-05-20 fix: 토글 상태 reset
      }
    };

    window.closeReviewPanel = function() {
      const panel = document.getElementById('reviewPanel');
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      // 범례 원위치 복귀
      document.body.classList.remove('review-panel-open');
    };

    // 리뷰 패널의 "✍ 내가 인증 남기기" → 제보 view + 가게 prefill (2026-05-18)
    window.startReviewFromCurrentPanel = async function() {
      // 로그인 확인
      const user = window.__appHandlers && window.__appHandlers.getCurrentUser && window.__appHandlers.getCurrentUser();
      if (!user) {
        if (!confirm('로그인 후 사용 가능합니다. 로그인 페이지로 이동할까요?')) return;
        if (typeof window.showView === 'function') window.showView('onboarding');
        return;
      }
      // 매운맛 레벨 미설정
      if (user.spicy_level === null || user.spicy_level === undefined) {
        alert('매운맛 레벨을 먼저 설정해주세요');
        if (typeof window.showView === 'function') window.showView('level-setup');
        return;
      }

      const r = RESTAURANTS.find(x => x.id === _currentRestaurantId);
      if (!r) {
        alert('가게 정보를 찾을 수 없습니다');
        return;
      }

      // 제보 폼 hidden 채움 + 선택 카드 표시
      const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
      setVal('rv-restaurant-name', r.name || '');
      setVal('rv-restaurant-address', r.address || '');
      setVal('rv-restaurant-lat', r.lat ?? '');
      setVal('rv-restaurant-lng', r.lng ?? '');

      const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v ?? ''; };
      setText('rv-selected-name', r.name || '');
      setText('rv-selected-address', r.address || '');

      // UI 전환: 검색 group 숨김 + 선택 카드 표시
      const searchGroup = document.getElementById('rv-search-group');
      if (searchGroup) searchGroup.style.display = 'none';
      const selected = document.getElementById('rv-selected-place');
      if (selected) selected.style.display = 'block';
      const results = document.getElementById('rv-place-results');
      if (results) results.style.display = 'none';

      // 패널 + 리뷰 사진 모달 모두 닫고 제보 view로 이동 (P1-8, 2026-05-18)
      // closeReviewModal: 사용자가 리뷰 사진을 클릭해서 모달을 연 상태에서
      // [✍ 인증 남기기]를 누르면 모달이 review view 위에 잔존하던 버그 수정
      closeReviewPanel();
      if (typeof window.closeReviewModal === 'function') window.closeReviewModal();
      if (typeof window.showView === 'function') window.showView('review');
    };

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        // 모달이 열려 있으면 모달만 닫음
        const modal = document.getElementById('reviewModal');
        if (modal && modal.classList.contains('open')) {
          closeReviewModal();
        } else {
          closeReviewPanel();
        }
      }
      // 모달 사진 좌우 화살표
      if (document.getElementById('reviewModal')?.classList.contains('open')) {
        if (e.key === 'ArrowLeft') changePhoto(-1);
        if (e.key === 'ArrowRight') changePhoto(1);
      }
    });

    // Kakao Maps 타입 매핑 (기존 tileToggle UI 4종 → Kakao MapTypeId)
    // voyager = ROADMAP (기본 일반 지도), positron = ROADMAP (light 변형 부재 → 동일), dark = ROADMAP, osm = HYBRID(위성+라벨)
    // 단순화: voyager/positron/dark는 ROADMAP, osm은 HYBRID로 매핑
    function kakaoMapTypeFor(name) {
      if (!window.kakao || !window.kakao.maps) return null;
      const t = window.kakao.maps.MapTypeId;
      if (name === 'osm') return t.HYBRID;
      return t.ROADMAP;  // voyager/positron/dark
    }

    function initMainMap() {
      const el = document.getElementById('kakao-map');
      if (!el || leafMap) return;
      if (!window.kakao || !window.kakao.maps) {
        console.error('[map] Kakao SDK 미준비 — initMainMap 스킵');
        return;
      }
      leafMap = new window.kakao.maps.Map(el, {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780),  // 서울 시청
        level: 7,  // Leaflet zoom 12 ≈ Kakao level 7
      });
      const mapType = kakaoMapTypeFor(currentTileName);
      if (mapType) leafMap.setMapTypeId(mapType);
      // 줌 컨트롤 추가 (우측) — 2026-06-01: 모바일에선 제거 (핀치 줌으로 충분, 화면 정리)
      if (!window.matchMedia('(max-width: 768px)').matches) {
        const zoomControl = new window.kakao.maps.ZoomControl();
        leafMap.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
      }
      document.body.classList.add('kakao-loaded');
      addMainMarkers();
      tryUserLocation(leafMap);
      setTimeout(() => leafMap.relayout(), 200);
    }

    function changeTile(name) {
      currentTileName = name;
      const mapType = kakaoMapTypeFor(name);
      if (mapType) {
        if (leafMap) leafMap.setMapTypeId(mapType);
        if (detailMap) detailMap.setMapTypeId(mapType);
      }
      // 버튼 active 토글
      document.querySelectorAll('#tileToggle button').forEach(b => b.classList.toggle('active', b.dataset.tile === name));
    }
    document.getElementById('tileToggle')?.addEventListener('click', e => {
      const btn = e.target.closest('button[data-tile]');
      if (btn) changeTile(btn.dataset.tile);
    });

    // 불꽃 마커 HTML 생성 (2026-05-18 v4, 디자인 PNG 사용)
    // 사용자 제공 SVG file.svg에서 5개 마커 영역을 PNG로 추출하여 사용.
    // Lv.0 → lv0(순한), Lv.1 → lv1, ..., Lv.5 → lv4(클램프)
    function buildFlameMarkerHtml(lvl, title = '', restaurantId = '') {
      const safeLvl = Math.max(0, Math.min(5, lvl));
      // 6단계(0~5) → 5개 PNG(0~4) 매핑: Lv.0과 Lv.1을 lv0로 동일 매핑
      const imgIdx = Math.max(0, Math.min(4, safeLvl - 1));
      const idAttr = restaurantId ? ` data-restaurant-id="${escapeHtml(String(restaurantId))}"` : '';
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      return `<div class="fm-marker"${idAttr}${titleAttr} style="cursor:pointer">
        <img class="fm-img" src="img/marker-lv${imgIdx}.png" alt="Lv.${safeLvl}" draggable="false"/>
      </div>`;
    }

    function addMainMarkers() {
      if (!leafMap || !window.kakao) return;
      // 기존 마커 정리
      mainMarkers.forEach(m => { try { m.setMap(null); } catch (e) {} });
      mainMarkers = [];

      RESTAURANTS.forEach(r => {
        if (!r.lat || !r.lng) return;
        const lvl = Math.round(r.avg_level || 0);
        const pos = new window.kakao.maps.LatLng(r.lat, r.lng);

        // 커스텀 불꽃 마커 (CustomOverlay)
        const overlay = new window.kakao.maps.CustomOverlay({
          position: pos,
          content: buildFlameMarkerHtml(lvl, r.name, r.id),
          yAnchor: 0.9,  // 핀 끝점이 좌표를 가리키도록 (iconAnchor [24,54] / iconSize [48,60] = y 0.9)
          xAnchor: 0.5,
          clickable: true,
        });
        overlay.setMap(leafMap);
        mainMarkers.push(overlay);

        // CustomOverlay는 직접 click 이벤트 안 됨 → content HTML이 div이므로 DOM listener 부착
        // (마운트 후 querySelector로 찾아 listener — 본 timing 문제로 inline onclick으로 처리)
        // 대신 content HTML 안에 inline onclick 부착 (escape XSS 주의)
        // buildFlameMarkerHtml은 img를 감싸는 div이므로 wrapper div 자체에 onclick 부여
        // → buildFlameMarkerHtml을 수정하지 않고 content를 별도 wrapper로 감싼다:
        // (이미 위에서 setMap 했으므로 content가 DOM에 들어감 — 비동기 부착)
        setTimeout(() => {
          // CustomOverlay content는 직접 DOM 추출 어려움 → 좌표 hash로 querySelector
          // 가장 안전: content HTML에 data-restaurant-id 부여 + delegated listener
        }, 0);
      });

      // 마커 클릭은 delegated listener로 처리 (한 번만 등록)
      if (!leafMap._mp_marker_delegated) {
        const mapContainer = document.getElementById('kakao-map');
        if (mapContainer) {
          mapContainer.addEventListener('click', (e) => {
            const wrapper = e.target.closest('.fm-marker[data-restaurant-id]');
            if (wrapper) {
              const id = wrapper.dataset.restaurantId;
              if (id && typeof openReviewPanel === 'function') openReviewPanel(id);
            }
          });
          leafMap._mp_marker_delegated = true;
        }
      }
    }

    function initDetailMap() {
      const el = document.getElementById('detail-map');
      if (!el || detailMap) return;
      if (!window.kakao || !window.kakao.maps) {
        console.error('[map] Kakao SDK 미준비 — initDetailMap 스킵');
        return;
      }
      const r = RESTAURANTS[0];
      const lat = r?.lat || 37.5703;
      const lng = r?.lng || 126.9826;
      detailMap = new window.kakao.maps.Map(el, {
        center: new window.kakao.maps.LatLng(lat, lng),
        level: 3,  // Leaflet zoom 16 ≈ Kakao level 3
      });
      const mapType = kakaoMapTypeFor(currentTileName);
      if (mapType) detailMap.setMapTypeId(mapType);
      const zoomControl = new window.kakao.maps.ZoomControl();
      detailMap.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
      if (r && r.lat && r.lng) {
        const lvl = Math.round(r.avg_level || 0);
        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(r.lat, r.lng),
          content: buildFlameMarkerHtml(lvl),
          yAnchor: 0.9, xAnchor: 0.5,
        });
        overlay.setMap(detailMap);
      }
      setTimeout(() => detailMap.relayout(), 200);
    }

    function tryUserLocation(map) {
      if (!navigator.geolocation || !map || !window.kakao) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLatLng = new window.kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
          const userOverlay = new window.kakao.maps.CustomOverlay({
            position: userLatLng,
            content: '<div class="km-user-loc"></div>',
            yAnchor: 0.5, xAnchor: 0.5,
          });
          userOverlay.setMap(map);
          map.setCenter(userLatLng);
          map.setLevel(5);  // Leaflet zoom 14 ≈ Kakao level 5
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    // 부트스트랩
    (async () => {
      try {
        const { kakaoOk, supabaseOk } = await loadDeps();

        if (supabaseOk) {
          // 가게 목록 (지도 마커용) + 최신 리뷰 (사이드바용) 병렬 페치
          // 2026-05-18: limit 인자 제거 → default 1000 사용 (전체 리뷰, 페이지네이션으로 표시)
          await Promise.allSettled([
            fetchRestaurants(),
            fetchRecentReviews()
          ]);
        }
        updateStats();
        renderSidebarList();

        if (!kakaoOk) {
          console.warn('⚠️ Kakao Maps SDK 없음 — fallback mockup 표시');
          return; // map init 스킵
        }

        const initIfActive = (viewName, initFn) => {
          const v = document.querySelector(`[data-view="${viewName}"]`);
          if (v?.classList.contains('active')) initFn();
        };
        initIfActive('map', initMainMap);
        initIfActive('detail', initDetailMap);

        const observer = new MutationObserver(() => {
          if (!leafMap && document.querySelector('[data-view="map"]')?.classList.contains('active')) {
            setTimeout(initMainMap, 100);
          }
          if (!detailMap && document.querySelector('[data-view="detail"]')?.classList.contains('active')) {
            setTimeout(initDetailMap, 100);
          }
        });
        observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
      } catch (e) {
        console.error('초기화 실패:', e);
        document.body.classList.add('show-fallback');
      }
    })();

    // Onboarding tabs
    document.getElementById('tab-login')?.addEventListener('click', () => {
      document.getElementById('tab-login').classList.add('active');
      document.getElementById('tab-signup').classList.remove('active');
      document.getElementById('form-login').style.display = '';
      document.getElementById('form-signup').style.display = 'none';
    });
    document.getElementById('tab-signup')?.addEventListener('click', () => {
      document.getElementById('tab-signup').classList.add('active');
      document.getElementById('tab-login').classList.remove('active');
      document.getElementById('form-signup').style.display = '';
      document.getElementById('form-login').style.display = 'none';
    });

    // Level option toggle
    document.querySelectorAll('.level-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.level-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
    document.querySelectorAll('.level-pick').forEach(p => {
      p.addEventListener('click', () => {
        document.querySelectorAll('.level-pick').forEach(x => x.classList.remove('selected'));
        p.classList.add('selected');
      });
    });

    // Filter pills (지도)
    document.querySelectorAll('.filter-bar .filter-pill').forEach(p => {
      p.addEventListener('click', () => p.classList.toggle('active'));
    });

    // Tab groups (mp-tabs / sb-tabs)
    // P2-2 (2026-05-18): mp-tab 클릭 시 app-handlers의 renderMyPage()를 재호출하여
    // 해당 탭(reviews/favorites/points/settings)에 맞는 데이터 렌더
    document.querySelectorAll('.mp-tabs').forEach(group => {
      group.querySelectorAll('.mp-tab').forEach(t => t.addEventListener('click', () => {
        group.querySelectorAll('.mp-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        const tabName = t.dataset.mpTab;
        if (tabName && window.__appHandlers && typeof window.__appHandlers.switchMypageTab === 'function') {
          window.__appHandlers.switchMypageTab(tabName);
        }
      }));
    });
    document.querySelectorAll('.sb-tabs').forEach(group => {
      group.querySelectorAll('.sb-tab').forEach(t => t.addEventListener('click', () => {
        group.querySelectorAll('.sb-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
      }));
    });

    // Detail back
    document.querySelector('.dt-back')?.addEventListener('click', () => showView('map'));
    // Sidebar row click → detail
    document.querySelectorAll('.sb-row').forEach(r => r.addEventListener('click', () => showView('detail')));

    console.log('🌶 mapmapmap Linear-Blaze SPA — 7 views ready. Hash routing 활성.');
