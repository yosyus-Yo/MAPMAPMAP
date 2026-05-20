#!/usr/bin/env bash
# dev-v2.sh — public-v2/ 로컬 개발 서버
#
# 사용법:
#   bash scripts/dev-v2.sh         # 기본 포트 8080
#   PORT=3000 bash scripts/dev-v2.sh
#
# 참조: public-v2/README.md

set -euo pipefail

PORT="${PORT:-8080}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Stage B (2026-05-18): public-v2/ → public/v2/ 이동.
SERVE_DIR="$ROOT/public/v2"

if [ ! -d "$SERVE_DIR" ]; then
  echo "❌ $SERVE_DIR 디렉토리가 없습니다." >&2
  exit 1
fi

if [ ! -f "$SERVE_DIR/index.html" ]; then
  echo "❌ $SERVE_DIR/index.html이 없습니다." >&2
  exit 1
fi

# 포트 점유 확인
if lsof -i:"$PORT" >/dev/null 2>&1; then
  echo "⚠️  포트 $PORT 가 이미 사용 중입니다. PORT=다른포트 로 재시도하세요." >&2
  exit 1
fi

echo "🌶  맵맵맵 신버전 (public/v2/) 로컬 서버"
echo "   📂 $SERVE_DIR"
echo "   🌐 http://localhost:$PORT"
echo "   ⛔ 종료: Ctrl+C"
echo ""
echo "ℹ️  Supabase prod 연결 / 카카오맵 도메인 제한 없음."
echo "   테스트 데이터 정리 편의용 prefix는 public-v2/README.md 참조."
echo ""

cd "$SERVE_DIR"
exec python3 -m http.server "$PORT"
