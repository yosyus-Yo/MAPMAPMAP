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

    // 네이버 지역검색 API 호출 (이름 + 주소로 정확도 ↑). display=5: 검색 후보 최대 5건.
    const query = address ? `${name} ${address.split(" ").slice(0, 2).join(" ")}` : name;
    const apiUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5`;

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
    const rawItems: any[] = Array.isArray(data?.items) ? data.items : [];

    // 네이버 지역 검색 응답 정규화: title(가게명, <b> 태그 제거), address(도로명 우선), link.
    // 좌표(mapx/mapy)는 KATECH라 그대로 못 쓰므로 클라이언트가 주소→카카오 지오코딩으로 변환한다.
    const items = rawItems.map((item: any) => ({
      title: (item.title || "").replace(/<[^>]+>/g, ""),
      address: item.roadAddress || item.address || "",
      category: (item.category || "").replace(/<[^>]+>/g, ""),
      link: item.link || `https://map.naver.com/p/search/${encodeURIComponent(query)}`,
    })).filter((it: any) => it.title && it.address);

    return new Response(
      JSON.stringify({ items, fallback: items.length === 0 }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
