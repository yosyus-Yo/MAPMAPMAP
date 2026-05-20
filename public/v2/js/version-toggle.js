/**
 * 버전 토글 (Stage B, 2026-05-18)
 *
 * 동작:
 *   - 신버전(/v2/)에서 "구버전" 버튼 클릭 → localStorage 저장 + /로 이동
 *   - localStorage['mmm_version_pref'] = 'v1' → 다음 방문 시 자동 redirect
 *
 * 키: mmm_version_pref ('v1' | 'v2')
 *   - 미설정 시 사용자가 처음 진입한 경로 그대로 (자동 redirect 없음)
 */

(function () {
  'use strict';

  const KEY = 'mmm_version_pref';

  function init() {
    const btn = document.getElementById('versionToggleV1');
    if (!btn) return;

    btn.addEventListener('click', () => {
      try {
        localStorage.setItem(KEY, 'v1');
      } catch (e) {
        // localStorage 접근 실패해도 이동은 진행
      }
      // 구버전으로 이동 (vercel deploy 환경 기준 도메인 루트)
      location.href = '/';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 디버깅용
  window.__versionToggle = {
    setPref: (v) => localStorage.setItem(KEY, v),
    getPref: () => localStorage.getItem(KEY),
    clear: () => localStorage.removeItem(KEY)
  };
})();
