#!/usr/bin/env python3
"""로컬 개발 서버 — SPA fallback (vercel.json rewrites 로컬 재현).

mapmadmap은 SPA라 /map, /onboarding 등 경로의 실제 파일이 없고 index.html 하나로
JS 라우팅한다. Vercel은 vercel.json rewrites로 처리하지만, 기본 python http.server는
이를 모르고 404를 낸다. 본 서버는 '확장자 없는 미존재 경로 → index.html' fallback으로
프로덕션과 동일하게 새로고침을 처리한다.

사용: python3 scripts/dev-server.py [port]   (기본 8080)
"""
import http.server
import socketserver
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')
os.chdir(ROOT)


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 캐시 비활성화 — 파일 수정 후 일반 새로고침만으로 최신 코드 반영 (2026-06-09)
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        clean = self.path.split('?')[0]
        local = self.translate_path(clean)
        # 파일이 없고(또는 디렉토리) 확장자도 없으면 SPA 라우트로 보고 index.html 반환
        base = os.path.basename(clean.rstrip('/'))
        if (not os.path.exists(local) or os.path.isdir(local)) and '.' not in base:
            self.path = '/index.html'
        return super().do_GET()


with socketserver.TCPServer(('', PORT), SPAHandler) as httpd:
    print(f'SPA dev server: http://localhost:{PORT}  (SPA fallback ON — /map 새로고침 OK)')
    httpd.serve_forever()
