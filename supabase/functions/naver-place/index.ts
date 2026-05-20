// Supabase Edge Function: naver-place
// 네이버 지역검색 API 프록시 (CORS 우회 + Client Secret 노출 방지)
//
// 환경변수 (Supabase Dashboard → Project Settings → Edge Functions → Secrets):
//   NAVER_CLIENT_ID     — Naver Developers 발급 Client ID
//   NAVER_CLIENT_SECRET — Naver Developers 발급 Client Secret
//
// 배포: supabase functions deploy naver-place --project-ref <YOUR_REF>
// 호출 (클라이언트): supabaseClient.functions.invoke('naver-place', { body: { name, address } })
//
// 응답:
//   { link: "https://map.naver.com/..." }  ← 정확한 가게 URL (첫 매칭)
//   또는 { error: "..." }                   ← 실패 시
//
// 참고: 네이버 지역검색 API
//   https://developers.naver.com/docs/serviceapi/search/local/local.md
//   무료 quota: 일 25,000회 (2025년 초 기준, 변경 가능)

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("NAVER_CLIENT_ID");
    const clientSecret = Deno.env.get("NAVER_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({
          error: "NAVER_CLIENT_ID/SECRET 환경변수 미설정",
        }),
        { status: 503, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const { name, address } = await req.json();
    if (!name) {
      return new Response(
        JSON.stringify({ error: "name 필드 필수" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // 네이버 지역검색 API 호출 (이름 + 주소로 정확도 ↑)
    const query = address ? `${name} ${address.split(" ").slice(0, 2).join(" ")}` : name;
    const apiUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=1`;

    const naverRes = await fetch(apiUrl, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });

    if (!naverRes.ok) {
      return new Response(
        JSON.stringify({ error: `네이버 API 오류 ${naverRes.status}` }),
        { status: naverRes.status, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const data = await naverRes.json();
    const item: any = data?.items?.[0];

    if (!item) {
      return new Response(
        JSON.stringify({ error: "검색 결과 없음", fallback: true }),
        { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // 네이버 지역 검색 응답: link (네이버 플레이스 URL), title (가게명), address, mapx, mapy 등
    // link가 있으면 그것 우선, 없으면 mapx/mapy로 지도 URL 생성
    let link = item.link;
    if (!link && item.mapx && item.mapy) {
      // mapx/mapy는 KATEC 좌표 (네이버 자체). 사용자 친화 URL은 검색 URL이 더 나음
      link = `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
    }

    return new Response(
      JSON.stringify({
        link,
        title: (item.title || "").replace(/<[^>]+>/g, ""), // <b> 태그 제거
        address: item.roadAddress || item.address,
      }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
