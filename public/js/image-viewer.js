/**
 * Fullscreen 이미지 viewer (후속2, 2026-05-18)
 *
 * 사이드바 카드 / 리뷰 패널 / 리뷰 모달의 모든 이미지를 클릭 시 큰 화면으로 표시.
 *
 * 사용:
 *   window.openImageViewer(url, [allUrls])   // 단일 또는 배열
 *
 * 자동 위임 (이벤트 위임):
 *   - .sb-review-card .rc-thumb (사이드바 카드 사진)
 *   - .rp-review .photo (리뷰 패널 인라인 사진)
 *   - .review-photos img (구버전 호환)
 */

(function () {
  'use strict';

  let _state = {
    urls: [],
    idx: 0
  };

  function buildDOM() {
    if (document.getElementById('imgViewerOverlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'img-viewer-overlay';
    overlay.id = 'imgViewerOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '이미지 보기');
    overlay.innerHTML = `
      <div class="img-viewer-counter" id="ivCounter" style="display:none"></div>
      <button class="img-viewer-close" id="ivClose" aria-label="닫기">×</button>
      <button class="img-viewer-nav img-viewer-prev" id="ivPrev" aria-label="이전" style="display:none">‹</button>
      <button class="img-viewer-nav img-viewer-next" id="ivNext" aria-label="다음" style="display:none">›</button>
      <div class="img-viewer-container">
        <img class="img-viewer-img" id="ivImg" alt="">
      </div>
    `;
    document.body.appendChild(overlay);

    // 닫기
    document.getElementById('ivClose').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      // overlay 자체 (배경) 클릭 시 닫기. 이미지/버튼 클릭은 무시
      if (e.target === overlay || e.target.classList.contains('img-viewer-container')) {
        close();
      }
    });

    // 좌우 네비
    document.getElementById('ivPrev').addEventListener('click', (e) => {
      e.stopPropagation();
      change(-1);
    });
    document.getElementById('ivNext').addEventListener('click', (e) => {
      e.stopPropagation();
      change(1);
    });

    // 키보드
    document.addEventListener('keydown', (e) => {
      if (overlay.style.display !== 'flex' && !overlay.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') change(-1);
      else if (e.key === 'ArrowRight') change(1);
    });
  }

  function open(urlOrUrls, startIdx) {
    buildDOM();
    const urls = Array.isArray(urlOrUrls) ? urlOrUrls.filter(Boolean) : [urlOrUrls].filter(Boolean);
    if (!urls.length) return;
    _state.urls = urls;
    _state.idx = Math.max(0, Math.min(urls.length - 1, startIdx || 0));
    render();

    const overlay = document.getElementById('imgViewerOverlay');
    overlay.style.display = 'flex';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden'; // 배경 스크롤 막기
  }

  function close() {
    const overlay = document.getElementById('imgViewerOverlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    _state.urls = [];
    _state.idx = 0;
  }

  function change(delta) {
    if (!_state.urls.length) return;
    const newIdx = _state.idx + delta;
    if (newIdx < 0 || newIdx >= _state.urls.length) return;
    _state.idx = newIdx;
    render();
  }

  function render() {
    const img = document.getElementById('ivImg');
    const counter = document.getElementById('ivCounter');
    const prev = document.getElementById('ivPrev');
    const next = document.getElementById('ivNext');

    if (img) {
      img.src = _state.urls[_state.idx];
      img.alt = `${_state.idx + 1} / ${_state.urls.length}`;
      img.onerror = () => {
        img.src = '';
        img.alt = '이미지 로드 실패';
      };
    }

    const multi = _state.urls.length > 1;
    if (counter) {
      counter.style.display = multi ? 'block' : 'none';
      counter.textContent = `${_state.idx + 1} / ${_state.urls.length}`;
    }
    if (prev) {
      prev.style.display = multi ? 'flex' : 'none';
      prev.disabled = _state.idx === 0;
    }
    if (next) {
      next.style.display = multi ? 'flex' : 'none';
      next.disabled = _state.idx === _state.urls.length - 1;
    }
  }

  // 자동 이벤트 위임 — 사이드바 카드 썸네일 클릭
  function bindDelegation() {
    document.body.addEventListener('click', (e) => {
      // 사이드바 카드 썸네일
      const sbThumb = e.target.closest('.sb-review-card .rc-thumb');
      if (sbThumb && sbThumb.src) {
        e.stopPropagation(); // 카드 클릭 (focusReview)으로 버블링 막기
        open(sbThumb.src);
        return;
      }

      // 리뷰 패널 인라인 사진 (rp-review .photo)
      const rpPhoto = e.target.closest('.rp-review .photo');
      if (rpPhoto && rpPhoto.src) {
        e.stopPropagation();
        // 같은 리뷰 안의 모든 사진을 모음
        const parent = rpPhoto.closest('.rp-review');
        const allImgs = parent ? Array.from(parent.querySelectorAll('.photo')).map(i => i.src) : [rpPhoto.src];
        const startIdx = allImgs.indexOf(rpPhoto.src);
        open(allImgs, startIdx);
        return;
      }
    });
  }

  function init() {
    buildDOM();
    bindDelegation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 외부 호출용
  window.openImageViewer = open;
  window.closeImageViewer = close;
})();
