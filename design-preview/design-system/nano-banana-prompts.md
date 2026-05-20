# 맵맵맵 — Nano Banana 이미지 생성 프롬프트

> Google Nano Banana(Gemini 이미지 생성)에서 사용할 프롬프트 모음.
> Claude가 SVG로 만들 수 없는 **마스코트/일러스트/풍부한 시각 요소**만 여기에 정리.

---

## 공통 스타일 가이드 (모든 프롬프트에 prepend 권장)

```
Style: flat illustration, modern minimalist, Korean food brand aesthetic.
Palette: warm beige background (#F5F2EE), brand red (#C5171E), brand orange (#FF6B35),
charcoal text (#1A1A1A). NO gradients except in flame highlights.
Line weight: 2px clean strokes. Rounded corners. NO photorealism.
NO emojis, NO text labels in the image. Centered composition.
Format: PNG, transparent background unless specified, 1024×1024.
```

---

## 1. 마스코트 캐릭터 — "맵이" (Mapi)

**콘셉트**: mapmadmap의 시그니처 캐릭터. 한국 고추를 의인화한 귀엽고 친근한 캐릭터지만 **이모지처럼 보이지 않게** 디자인. 로고와 통일된 라인/색감.

### 1-1. 기본 포즈 (히어로용)
```
A cute mascot character named "Mapi" for a Korean spicy food map app.
The character is an anthropomorphized red chili pepper standing upright, with rounded body shape, two small black dot eyes (round, friendly), a tiny smile mouth, and a small green leaf cap on top.
Body color is brand red (#C5171E to #FF6B35 subtle vertical gradient).
The character has tiny stubby arms and stands on the ground with simple feet.
Pose: standing straight, slight head tilt to the left, one arm waving hello.
Background: transparent.
Style: flat illustration, 2D, clean vector look like Toss/Kakao mascots.
NOT photorealistic, NOT 3D rendered. NO text. NO emoji-style.
1024×1024, centered, with 80px padding around the character.
```

### 1-2. 표정 변화 6종 (매운맛 레벨별)

각 레벨에 대해 위 1-1 설명 베이스 + 다음 표정 추가:

| Lv | 표정 변화 |
|---|---|
| **Lv.0** | "calm closed-mouth smile, eyes are gentle smiling crescents (^_^), body color slightly desaturated (light pink #F8C8C8). The character looks completely relaxed." |
| **Lv.1** | "small open mouth showing tongue tip, one bead of sweat on forehead. Body color soft red (#FCA5A5). Slightly raised eyebrows showing mild surprise." |
| **Lv.2** | "open mouth with tongue out, two sweat drops on forehead. Eyes wide. Body color brand orange-red (#FB923C). Holding water glass in one hand." |
| **Lv.3** | "wide open mouth showing breath of air coming out, three sweat drops, eyebrows furrowed in concentration. Body color brand red (#EF4444). Both arms reaching for water." |
| **Lv.4** | "very wide open mouth with small flame visible inside, eyes squinted shut, multiple sweat drops streaming. Body color deep red (#B91C1C). Sitting on ground, fanning mouth with hand." |
| **Lv.5** | "screaming open mouth with bright orange-yellow flames bursting out, X-shaped eyes (knocked out), entire body slightly charred dark crimson (#7F1D1D) with smoke wisps. Lying flat on ground, hands up in surrender." |

**용도**: 사용자 본인 매운맛 레벨 설정 화면, 인증 완료 화면, 도전 결과 화면

---

## 2. 빈 상태 일러스트 (Empty States)

기본 스타일: 위 공통 가이드 + flat illustration, 480×360 가로비, 마스코트 1마리 + 컨텍스트 소품.

### 2-1. 가게 없음 — "주변에 매운맛 가게가 없어요"
```
Flat illustration, 480×360, transparent background.
Center: Mapi mascot character (red chili pepper, see masterprompt) standing on a small map fragment with magnifying glass in one hand, looking confused.
Around: small location pin icons floating with question marks above them (drawn as line icons, not emoji).
Subtle dotted radar circles emanating from the map fragment.
Color palette: warm beige, brand red, brand orange, soft gray.
Mood: friendly, hopeful, not sad.
Centered composition, plenty of negative space.
```

### 2-2. 리뷰 없음 — "첫 인증을 남겨주세요"
```
Flat illustration, 480×360, transparent background.
Center: Mapi mascot holding up an empty paper receipt and a pen, looking inviting toward the viewer.
Background: subtle scattered floating elements — empty speech bubbles, blank star outlines (not emoji).
Mood: encouraging, welcoming.
Color palette: warm beige, brand red, brand orange.
```

### 2-3. 검색 결과 없음
```
Flat illustration, 480×360, transparent background.
Center: Mapi mascot looking at a large empty bowl held in both hands, head tilted in confusion.
Background: chopsticks crossed in X pattern behind, faded "?" symbol drawn as clean geometry (not emoji).
Mood: gently humorous, not negative.
```

### 2-4. 인터넷 연결 없음
```
Flat illustration, 480×360, transparent background.
Center: Mapi mascot looking at a disconnected antenna/signal bars (drawn as clean line shapes, not emoji or photo).
Wifi-like radial lines with one having a small disconnect break.
Mood: informational, calm.
```

---

## 3. 온보딩 일러스트 3종 (앱 첫 사용 가이드)

각 768×1024 세로비. 모바일 풀스크린 hero용.

### 3-1. 화면 1 — "당신의 매운맛 레벨을 알려주세요"
```
Flat illustration, 768×1024, transparent background.
Top half: 6 Mapi mascot characters in a horizontal row, each showing a different spice level expression (Lv.0 calm to Lv.5 charred).
Below them: a horizontal slider/scale graphic going from light to dark red, with a hand pointing at one position.
Bottom: subtle Korean food elements (bowl outline, chopsticks) as decorative motifs.
Color: full spice scale visible.
```

### 3-2. 화면 2 — "지도에서 매운맛 가게를 찾으세요"
```
Flat illustration, 768×1024, transparent background.
Center: stylized map fragment (Korean Seoul districts as soft rounded shapes, no real text labels) with multiple custom marker pins on it.
Each pin is a colored circle in the spice scale colors, with small numbers 0-5.
Mapi mascot standing next to the map, pointing at one pin with one hand.
Mood: exploratory, fun.
```

### 3-3. 화면 3 — "방문 후 인증하고 포인트 받으세요"
```
Flat illustration, 768×1024, transparent background.
Center: Mapi mascot holding up a smartphone screen showing a small receipt photo.
Around the phone: clean line-drawn coins (not photorealistic) floating gently, "+500" written in custom hand-lettered style (this is acceptable as it's part of illustration, not UI text).
Below: subtle confetti elements in brand colors.
Mood: rewarding, celebratory.
```

---

## 4. 히어로 배너 (랜딩 페이지)

### 4-1. 메인 페이지 히어로
```
Wide hero illustration, 1920×800, transparent background.
Left side (40%): bold typographic space (will be filled with "맵맵맵" title in code, leave empty).
Right side (60%): dynamic scene — large stylized Korean food map background with multiple Mapi mascots scattered across, each showing different spice levels.
A few rising flame motifs (clean vector, not realistic flames) trail upward from the hottest spots.
Color: warm gradient from beige (#FFF8F0) on left to soft orange (#FFE9D6) on right.
Mood: energetic, appetizing, inviting.
NO text. NO emoji. Just pure illustration.
```

---

## 5. 공유 OG 이미지 (소셜 미디어)

### 5-1. 카카오톡/Instagram 공유 카드
```
Square 1200×1200 (or 1200×630 for Twitter/Facebook), opaque background (#F5F2EE).
Top: large "맵맵맵" wordmark logo (use existing logo.svg as reference) in brand red.
Center: Mapi mascot Lv.3 expression, large and centered.
Below: 3 spice level icons in a row (level-1, level-3, level-5) showing the brand's signature mark system.
Bottom: tagline space (leave empty for code overlay).
Background: subtle radial glow from center in warm orange.
Mood: bold, signature, instantly recognizable.
```

---

## 6. 스플래시 화면 (앱 로딩)

### 6-1. 모바일 스플래시
```
Mobile portrait 1080×2400, opaque background (#FAFAF7).
Top center: Mapi mascot (basic pose, large, ~400px tall).
Below mascot, after some negative space: 3 dot loading indicator (3 small filled circles in brand red) - standard loading dots, not emoji.
Behind mascot: extremely subtle "맵맵맵" repeating text pattern at very low opacity (5%), creating a tone-on-tone background.
Mood: minimal, brand-focused, anticipatory.
```

---

## 7. 광고/인스타 푸시 (프로모션)

### 7-1. 베타 리워드 안내 카드
```
Square 1080×1080 illustration, opaque background.
Center: Mapi mascot holding up coin with "+500" hand-lettered on it (part of illustration).
Behind: 3 receipt outlines with check marks (clean line drawing, not emoji).
Sparkle elements as 4-pointed stars (geometric, not emoji-style sparkles).
Color: bright, celebratory — brand orange + warm gold.
Mood: enthusiastic, rewarding.
```

### 7-2. "오늘의 매운맛 챌린지"
```
Square 1080×1080, opaque background (#1F0606 dark mode).
Center: Mapi mascot in Lv.5 expression with charred body, surrounded by stylized flame motifs (clean vector flames, not realistic photo flames).
Behind: faint outline of a coliseum-like challenge arena drawn in brand red lines.
Color: dark, dramatic, contrast-heavy.
Mood: epic, challenging, FOMO-inducing.
```

---

## Nano Banana 사용 팁

### 일관성 확보
- **Mapi 마스코트**는 1번 잘 만든 후 **참조 이미지로 reuse**. Nano Banana의 "Use as reference" 기능 활용.
- 6개 표정 일러스트는 **batch 모드**로 같은 시드(seed)에 표정만 다르게 prompt해서 생성.

### 다듬기
- 생성 후 **Figma/Illustrator로 vectorize** 권장 (Adobe Vector Pen 또는 vectorizer.ai)
- 라이브 서비스 자산은 vector화해야 다양한 사이즈에서 깨지지 않음.

### 거부 핸들링
- "spicy" 키워드가 너무 많으면 일부 모델이 거부할 수 있음 → **"hot food"**, **"Korean cuisine"**로 우회.
- "screaming" / "knocked out" 표정은 **"surprised reaction"** / **"funny dramatic expression"** 으로 부드럽게.

### 산출물 위치 권장
```
mapmadmap_complete/design-preview/design-system/illustrations/
├── mascot/mapi-base.png
├── mascot/mapi-lv0.png ~ lv5.png
├── empty/no-restaurants.png
├── empty/no-reviews.png
├── empty/no-search.png
├── empty/offline.png
├── onboarding/step-1.png ~ step-3.png
├── hero/main-banner.png
├── og/og-square.png
├── og/og-twitter.png
├── splash/mobile-splash.png
└── promo/beta-reward.png
└── promo/challenge.png
```

---

## 우선순위 (시간 제한 시)

**Tier 1 (필수)**: Mapi 기본 + Lv 6 표정 = 7장
**Tier 2 (중요)**: 빈 상태 4종 + 온보딩 3종 = 7장
**Tier 3 (마케팅)**: 히어로/OG/스플래시/프로모 = 5장

총 19장. Nano Banana 1회 생성당 30초 가정 시 약 10-15분 소요.
