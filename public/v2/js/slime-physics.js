/**
 * 슬라임 물리 v4 (2026-05-20 외부 모듈 분리)
 *
 * 출처: index.html L1337-1659에서 추출.
 * 동작: map-legend 박스를 슬라임처럼 드래그 가능 + 충돌 + 반사 + squish.
 * 외부 API: window.__slime.{getState, applyImpulse, wakeUp}
 *
 * 의존성: DOM (#map-legend, #map-legend-header, #reviewPanel, #reviewModal, .map-sidebar, #map-my-location-btn)
 * 적재 시점: defer (DOMContentLoaded 후 자동 실행 — 외부 IIFE)
 */

    // ============== 🟢 슬라임 물리 v2 (통통 + 다중 충돌 + 패널 push, 2026-05-19) ==============
    // 변경점:
    //   1) 통통 강화: STRETCH_MAX↑ + 정지 직전 spring overshoot + idle wobble
    //   2) 다중 obstacle 충돌: reviewPanel(좌)/mapSidebar(우)/my-location-btn 모두 AABB collision
    //   3) 리뷰 패널 open 시 슬라임에 push impulse — 패널이 슬라임을 밀어냄
    (function initSlimePhysics() {
      const el = document.getElementById('map-legend');
      const header = document.getElementById('map-legend-header');
      if (!el || !header) return;

      let x = 0, y = 0;
      let vx = 0, vy = 0;
      let dragging = false;
      let dragOffsetX = 0, dragOffsetY = 0;
      let mouseX = 0, mouseY = 0;
      let didDrag = false;
      let rafId = null;

      // 슬라임 물리 v4 — 드래그=direct lerp + squish / 자유=반사 BOUNCE 0.7 (2026-05-19)
      const SPRING_K = 0.22;             // release 후에만 사용
      const DAMPING = 0.78;
      const FRICTION = 0.975;
      const BOUNCE = 0.7;                // 자유 충돌 시 입사각=반사각 반사 (감쇠 30%)
      const MIN_VELOCITY = 0.15;         // 반사 후 작은 velocity 빠른 정지
      const STRETCH_MAX = 0.42;
      const STRETCH_GAIN = 0.022;
      const COLLIDE_PUSH = 0;
      const DRAG_LERP = 0.45;            // 드래그 중 direct positioning 보간 강도
      // 드래그 squish 시스템
      const SQUISH_MAX = 90;             // 최대 압박 거리 (px)
      const SQUISH_DAMP = 0.82;          // release 후 squish 감쇠
      const SQUISH_TO_VELOCITY = 0.35;   // squish 1px → velocity 0.35 (release 튕김 강도)
      let squishX = 0, squishY = 0;      // 누적 압박 거리 (mouseTarget - slimePos)

      // 외부에서 push impulse를 줄 수 있도록 노출 (리뷰 패널 open 시 사용)
      function applyImpulse(ix, iy) {
        vx += ix;
        vy += iy;
        if (!rafId) rafId = requestAnimationFrame(tick);
      }

      // ================ Obstacle 수집 ================
      // 슬라임이 부딪힐 수 있는 사각형 영역 (viewport 좌표)
      function collectObstacles() {
        const obstacles = [];
        // 2026-05-19: 창(reviewPanel/reviewModal) obstacle을 세로로 무한 확장 (vertical 기둥)
        // → 창의 x 범위 안에는 위/아래 빈 공간에도 슬라임 진입 불가 → 항상 squish 발동
        const VERTICAL_INFINITE = 100000;
        const reviewPanel = document.getElementById('reviewPanel');
        if (reviewPanel && reviewPanel.classList.contains('open')) {
          const r = reviewPanel.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            obstacles.push({
              rect: { left: r.left, right: r.right, top: -VERTICAL_INFINITE, bottom: VERTICAL_INFINITE },
              name: 'reviewPanel'
            });
          }
        }
        // 리뷰 상세 슬라이드 패널 (reviewPanel 옆에서 추가 슬라이드 인, 2026-05-19)
        const reviewModal = document.getElementById('reviewModal');
        if (reviewModal && reviewModal.classList.contains('open')) {
          const r = reviewModal.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            obstacles.push({
              rect: { left: r.left, right: r.right, top: -VERTICAL_INFINITE, bottom: VERTICAL_INFINITE },
              name: 'reviewModal'
            });
          }
        }
        const sidebar = document.querySelector('.map-sidebar');
        if (sidebar) {
          const r = sidebar.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) obstacles.push({ rect: r, name: 'sidebar' });
        }
        const mlBtn = document.getElementById('map-my-location-btn');
        if (mlBtn) {
          const r = mlBtn.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) obstacles.push({ rect: r, name: 'mlBtn' });
        }
        return obstacles;
      }

      // AABB 충돌 해결 (최소 침투 거리로 push)
      // 🟢 2026-05-19 fix: slimeRect를 in-place mutate하여 iter loop의 stale rect 누적 차단
      //    (이전: 매 iter마다 getBoundingClientRect 재호출하지만 transform 미적용이라 동일 rect → 같은 push 4배 누적)
      function resolveObstacleCollision(slimeRect, ob) {
        const o = ob.rect;
        // AABB 교차 확인
        if (slimeRect.right <= o.left || slimeRect.left >= o.right) return false;
        if (slimeRect.bottom <= o.top || slimeRect.top >= o.bottom) return false;
        // 침투 거리 4방향 계산
        const overlapLeft = slimeRect.right - o.left;
        const overlapRight = o.right - slimeRect.left;
        const overlapTop = slimeRect.bottom - o.top;
        const overlapBottom = o.bottom - slimeRect.top;
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        // 🟢 2026-05-19: 동적 obstacle 슬라이드 속도 sync
        //   push distance(overlap*)가 obstacle의 frame당 이동 속도 = max(반사 BOUNCE, push 속도)로 vx/vy 설정
        //   - 정적 obstacle + slime 자유 충돌: |v|*BOUNCE가 더 큼 → 입사각=반사각 반사 유지
        //   - 동적 obstacle (reviewModal slide-in 등): overlap*가 더 큼 → obstacle 속도와 동기화 → 미끄러짐
        if (minOverlap === overlapLeft) {
          x -= overlapLeft;
          slimeRect.left -= overlapLeft; slimeRect.right -= overlapLeft;
          if (dragging) vx = 0;
          else vx = -Math.max(Math.abs(vx) * BOUNCE, overlapLeft);
        } else if (minOverlap === overlapRight) {
          x += overlapRight;
          slimeRect.left += overlapRight; slimeRect.right += overlapRight;
          if (dragging) vx = 0;
          else vx = Math.max(Math.abs(vx) * BOUNCE, overlapRight);
        } else if (minOverlap === overlapTop) {
          y -= overlapTop;
          slimeRect.top -= overlapTop; slimeRect.bottom -= overlapTop;
          if (dragging) vy = 0;
          else vy = -Math.max(Math.abs(vy) * BOUNCE, overlapTop);
        } else {
          y += overlapBottom;
          slimeRect.top += overlapBottom; slimeRect.bottom += overlapBottom;
          if (dragging) vy = 0;
          else vy = Math.max(Math.abs(vy) * BOUNCE, overlapBottom);
        }
        return true;
      }

      function clampToBounds() {
        const parent = el.offsetParent;
        if (!parent) return false;
        const pRect = parent.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        const padding = 6;
        let bounced = false;
        if (r.left < pRect.left + padding) {
          x += (pRect.left + padding - r.left);
          vx = Math.abs(vx) * BOUNCE; bounced = true;
        }
        if (r.right > pRect.right - padding) {
          x -= (r.right - (pRect.right - padding));
          vx = -Math.abs(vx) * BOUNCE; bounced = true;
        }
        if (r.top < pRect.top + padding) {
          y += (pRect.top + padding - r.top);
          vy = Math.abs(vy) * BOUNCE; bounced = true;
        }
        if (r.bottom > pRect.bottom - padding) {
          y -= (r.bottom - (pRect.bottom - padding));
          vy = -Math.abs(vy) * BOUNCE; bounced = true;
        }
        return bounced;
      }

      function resolveAllCollisions() {
        let collided = clampToBounds();
        // 🟢 2026-05-19 fix: mutable rect 1개를 iter 전체에서 reuse (DOMRect는 readonly이라 copy)
        //    매 iter마다 getBoundingClientRect() 재호출하면 transform 미적용 stale rect → 같은 push 누적
        const r0 = el.getBoundingClientRect();
        const slimeRect = { left: r0.left, right: r0.right, top: r0.top, bottom: r0.bottom };
        for (let i = 0; i < 4; i++) {
          const obs = collectObstacles();
          let any = false;
          for (const ob of obs) {
            if (resolveObstacleCollision(slimeRect, ob)) { any = true; collided = true; break; }
          }
          if (!any) break;
        }
        return collided;
      }

      function applyTransform() {
        const speed = Math.hypot(vx, vy);
        const squishMag = Math.hypot(squishX, squishY);
        // squish가 있으면 squish 방향으로 짜부 (압박 효과 우선)
        if (squishMag > 1.5) {
          const sqAngle = Math.atan2(squishY, squishX);
          const sqAmount = Math.min(0.5, squishMag / 120);  // 0~0.5
          const sx = 1 - sqAmount * 0.55;  // 압박 방향 축소
          const sy = 1 + sqAmount * 0.4;   // 직교 방향 부풀음
          el.style.transform =
            `translate(${x}px, ${y}px) rotate(${sqAngle}rad) scale(${sx}, ${sy}) rotate(${-sqAngle}rad)`;
          el.classList.add('is-physics-active');
          return;
        }
        if (speed < 0.05 && !dragging) {
          el.style.transform = `translate(${x}px, ${y}px)`;
          el.classList.remove('is-physics-active');
          return;
        }
        // 일반 stretch: velocity 방향으로 늘어남
        const angle = Math.atan2(vy, vx);
        const stretch = Math.min(STRETCH_MAX, speed * STRETCH_GAIN);
        const sx = 1 + stretch;
        const sy = 1 - stretch * 0.6;
        el.style.transform =
          `translate(${x}px, ${y}px) rotate(${angle}rad) scale(${sx}, ${sy}) rotate(${-angle}rad)`;
        el.classList.add('is-physics-active');
      }

      function tick() {
        if (dragging) {
          // v4: direct positioning (spring 누적 제거 → 벽 충돌 시 흔들림 0)
          // mouse가 가야 할 곳까지의 거리를 lerp로 부드럽게 이동.
          // 충돌 후 wall에 clamp되고 다음 프레임도 같은 자리로 lerp → 안정.
          const tx = mouseX + dragOffsetX;
          const ty = mouseY + dragOffsetY;
          const elBase = el.getBoundingClientRect();
          const curCenterX = elBase.left + elBase.width / 2;
          const curCenterY = elBase.top + elBase.height / 2;
          const dx = (tx - curCenterX) * DRAG_LERP;
          const dy = (ty - curCenterY) * DRAG_LERP;
          x += dx;
          y += dy;
          // velocity는 부호 판별용으로만 유지 (resolveObstacleCollision의 BOUNCE 분기 차단됨 — dragging=true)
          vx = dx;
          vy = dy;
          resolveAllCollisions();
          // squish 측정: mouse target vs 실제 위치 차이 (벽 너머에 mouse가 있으면 그만큼 누적)
          const afterRect = el.getBoundingClientRect();
          let sx = tx - (afterRect.left + afterRect.width / 2);
          let sy = ty - (afterRect.top + afterRect.height / 2);
          const sqMag = Math.hypot(sx, sy);
          if (sqMag > SQUISH_MAX) {
            sx = (sx / sqMag) * SQUISH_MAX;
            sy = (sy / sqMag) * SQUISH_MAX;
          }
          // ease (lerp 0.3) — 부드러운 squish 변화
          squishX += (sx - squishX) * 0.3;
          squishY += (sy - squishY) * 0.3;
          applyTransform();
          rafId = requestAnimationFrame(tick);
          return;
        }
        // release 후: squish ease back (0으로 회복) + 평소 마찰
        squishX *= SQUISH_DAMP;
        squishY *= SQUISH_DAMP;
        if (Math.abs(squishX) < 0.3) squishX = 0;
        if (Math.abs(squishY) < 0.3) squishY = 0;
        vx *= FRICTION;
        vy *= FRICTION;
        x += vx;
        y += vy;
        const bounced = resolveAllCollisions();
        applyTransform();
        const speed = Math.hypot(vx, vy);
        const squishMag = Math.hypot(squishX, squishY);
        if (speed < MIN_VELOCITY && squishMag < 0.5 && !bounced) {
          vx = 0; vy = 0; squishX = 0; squishY = 0;
          el.style.transform = `translate(${x}px, ${y}px)`;
          el.classList.remove('is-physics-active');
          rafId = null;
          return;
        }
        rafId = requestAnimationFrame(tick);
      }

      function getPoint(e) {
        if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        return { x: e.clientX, y: e.clientY };
      }

      function onPointerDown(e) {
        if (e.target.closest('.map-legend-toggle')) return;
        const p = getPoint(e);
        const r = el.getBoundingClientRect();
        dragOffsetX = (r.left + r.width / 2) - p.x;
        dragOffsetY = (r.top + r.height / 2) - p.y;
        mouseX = p.x; mouseY = p.y;
        dragging = true;
        didDrag = false;
        el.classList.add('is-dragging');
        if (!rafId) rafId = requestAnimationFrame(tick);
        e.preventDefault();
      }

      function onPointerMove(e) {
        if (!dragging) return;
        const p = getPoint(e);
        if (Math.hypot(p.x - mouseX, p.y - mouseY) > 3) didDrag = true;
        mouseX = p.x; mouseY = p.y;
        e.preventDefault();
      }

      function onPointerUp() {
        if (!dragging) return;
        dragging = false;
        el.classList.remove('is-dragging');
        // 🟢 squish → spring impulse 변환 (눌린 만큼 튕겨나감)
        const squishMag = Math.hypot(squishX, squishY);
        if (squishMag > 5) {
          vx += squishX * SQUISH_TO_VELOCITY;
          vy += squishY * SQUISH_TO_VELOCITY;
        }
        // squish는 tick에서 천천히 ease back (시각적으로 펴지는 효과)
        if (didDrag) {
          header.addEventListener('click', stopNextClick, { capture: true, once: true });
        }
        if (!rafId) rafId = requestAnimationFrame(tick);
      }

      function stopNextClick(e) { e.stopPropagation(); e.preventDefault(); }

      // 2026-05-19: header → el 전체 영역에서 드래그 가능. 토글 버튼은 onPointerDown 안에서 closest로 제외.
      el.addEventListener('mousedown', onPointerDown);
      el.addEventListener('touchstart', onPointerDown, { passive: false });
      el.style.cursor = 'grab';
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('touchmove', onPointerMove, { passive: false });
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchend', onPointerUp);
      window.addEventListener('touchcancel', onPointerUp);

      window.addEventListener('resize', () => {
        if (rafId) return;
        if (resolveAllCollisions()) {
          if (!rafId) rafId = requestAnimationFrame(tick);
        }
      });

      // 외부 API — 리뷰 패널 open/close에서 호출
      window.__slime = {
        getState: () => ({ x, y, vx, vy, dragging }),
        applyImpulse,
        wakeUp: () => { if (!rafId) rafId = requestAnimationFrame(tick); }
      };
    })();
