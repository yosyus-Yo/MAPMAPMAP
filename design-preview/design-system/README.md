# 맵맵맵 디자인 시스템 v1

> **원칙**: 이모지 0개. 모든 시각 요소는 커스텀 SVG/일러스트.
> **시그니처**: 매운맛 레벨 6단계 (Lv.0–5) 자체 마크 시스템.

---

## 1. 컬러 토큰

### 매운맛 스파이스 스케일 (시그니처)
```
--spice-0:  #C8C8C8   /* 회색 — 매운맛 없음 (순함) */
--spice-1:  #FCD34D   /* 옅은 노랑 — 약간 매움 */
--spice-2:  #FB923C   /* 주황 — 매움 */
--spice-3:  #EF4444   /* 빨강 — 강함 (브랜드 시그니처) */
--spice-4:  #B91C1C   /* 진홍 — 매우 강함 */
--spice-5:  #1F0606   /* 검은 그을림 — 극강 */
```

### 브랜드 컬러 (기존 유지)
```
--brand-red:    #C5171E
--brand-orange: #FF6B35
--gradient: linear-gradient(135deg, #C5171E 0%, #FF6B35 100%)
```

### 중립 컬러
```
--bg:         #FAFAF7
--surface:    #F5F2EE
--surface-2:  #EBE6DF
--panel:      #FFFFFF
--text:       #1A1A1A
--text-2:     #3F3F3F
--text-3:     #6E6E6E
--text-4:     #9A9A9A
--border:     rgba(0,0,0,0.08)
```

---

## 2. 타이포그래피

```
--font-sans: 'Pretendard Variable', 'Pretendard', 'Inter', system-ui, sans-serif
--font-mono: 'Berkeley Mono', 'JetBrains Mono', ui-monospace, monospace
```

| 토큰 | 크기 | 무게 | 용도 |
|---|---|:---:|---|
| `--text-display` | 32px | 800 | 히어로 타이틀 |
| `--text-h1` | 22px | 700 | 가게명 |
| `--text-h2` | 16px | 700 | 섹션 헤더 |
| `--text-body` | 14px | 510 | 본문 |
| `--text-meta` | 12px | 590 | 메타 정보 (mono) |
| `--text-caption` | 11px | 700 | 캡션, 칩 |
| `--text-tiny` | 9px | 700 | 마이크로 라벨 |

---

## 3. 스페이싱 / 라운드

```
스페이싱: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 80 px
라운드:   6 / 10 / 14 / 18 / 999(pill) px
```

---

## 4. 아이콘 시스템

### 그리드 규칙
- **24×24 grid** 기본 (16/24/32 사이즈로 스케일)
- **stroke 1.75px** (스트로크 아이콘) / **filled** (정보 강조)
- `currentColor` 사용 — CSS color로 색 제어

### 카테고리 (5종)
- `category-noodle` 면류 (짬뽕/라면/칼국수)
- `category-rice` 분식/한식 (떡볶이/김밥)
- `category-meat` 고기/구이
- `category-japanese` 일식/돈까스
- `category-chinese` 중식

### UI (16종)
- `ui-map` / `ui-search` / `ui-certify` / `ui-heart` / `ui-list` (nav 5개)
- `ui-location` / `ui-filter` / `ui-close` / `ui-chevron-right` / `ui-chevron-left`
- `ui-camera` / `ui-receipt` / `ui-share` / `ui-bookmark`
- `ui-flame` (일반 불꽃) / `ui-star` (별점)

### 매운맛 레벨 (6종) — 시그니처
- `spice-level-0` ~ `spice-level-5`
- 둥근 시그니처 마크 + 단계별 충전도

---

## 5. 마커 디자인 규약

지도 위 가게 마커 = "**캡슐 + 시그니처 + 친숙 정보**" 3중 구조:

```
┌──────────────────┐
│ [▣] Lv.3         │  ← spice-level-3 SVG + 텍스트
│ 9,000원 · ★4.8   │  ← 친숙 정보 (가격 + 별점)
└──────────────────┘
배경: 사용자 상대 색상 (안전/주의/위험)
```

거지맵의 가격 친숙성을 가져오면서, 시그니처 마크로 mapmadmap 식별성 확보.

---

## 6. 자산 분담

### Claude SVG 직접 작성
- ✅ 매운맛 레벨 6단계
- ✅ 카테고리 아이콘 5종
- ✅ UI 아이콘 16종
- ✅ 마커 컴포넌트 (HTML+SVG)

### Google Nano Banana 프롬프트 (별도 파일)
- 마스코트 캐릭터 (기본 + 6 표정 변화)
- 빈 상태 일러스트 4종
- 온보딩 일러스트 3종
- 히어로 배너 1종
- OG 이미지 1종

→ `nano-banana-prompts.md` 참조

---

## 7. 확장 원칙

새 아이콘/일러스트 추가 시:
1. **24×24 grid + 1.75 stroke** 준수
2. **currentColor**로 색 제어 가능하게
3. **`<title>` 포함** — 접근성 + 검색
4. **SVGO 압축** 후 commit (50% 용량 절감)
5. 파일명 규칙: `<카테고리>-<이름>.svg` (kebab-case)
