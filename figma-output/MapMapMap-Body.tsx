/**
 * 맵맵맵 (Map Map Map) — Home Screen Body
 *
 * Source:    https://www.figma.com/design/mJZFrJG8hD2J771pn8vf7t/Untitled--복사-?node-id=18-2
 * Extracted: 2026-04-21 via Figma MCP (get_design_context)
 * Frame:     Body (18:2) — 390×858 mobile
 *
 * ⚠️ NOTES:
 * - Image asset URLs (imgImage, imgOverlayShadow*, imgLogo2, imgContainer*) expire in 7 days (until ~2026-04-28).
 *   Download them to local /public before the deadline.
 * - Tailwind v4 syntax is assumed (content-stretch, shrink-0, etc.). For v3, some utilities need polyfills.
 * - Noto Sans KR font must be loaded in the consuming project.
 * - Fixed 390px width — not responsive as-is.
 */

const imgImage = "https://www.figma.com/api/mcp/asset/075e9152-20ca-4fbb-9093-32dd4753322d";
const imgOverlayShadow = "https://www.figma.com/api/mcp/asset/a44a6b2c-9757-498b-ae96-470d492e11eb";
const imgOverlayShadow1 = "https://www.figma.com/api/mcp/asset/1e4192b6-5a61-4205-9a14-bff46c3d08ae";
const imgOverlayShadow2 = "https://www.figma.com/api/mcp/asset/2f6199fa-5911-4943-90f6-41b2f4739a4e";
const imgLogo2 = "https://www.figma.com/api/mcp/asset/387eb03b-c65d-4240-b266-bbc7847592c7";
const imgContainer = "https://www.figma.com/api/mcp/asset/789feee2-e587-484e-8f2e-3e710bfbfb6f";
const imgContainer1 = "https://www.figma.com/api/mcp/asset/a919e4ac-c82a-4d48-b6f0-20c983379da4";
const imgContainer2 = "https://www.figma.com/api/mcp/asset/ec248e3b-c81a-4aaa-8949-c11e58a0784d";
const imgContainer3 = "https://www.figma.com/api/mcp/asset/bee9d970-2d81-4024-be25-56082bbf64f1";
const imgContainer4 = "https://www.figma.com/api/mcp/asset/2f113940-9f84-4830-a663-8a285caa95f6";

export default function Body() {
  return (
    <div className="content-stretch flex flex-col isolate items-start pb-[112px] relative shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] size-full" data-node-id="18:2" style={{ backgroundImage: "linear-gradient(90deg, rgb(26, 26, 46) 0%, rgb(26, 26, 46) 100%), linear-gradient(90deg, rgb(0, 0, 0) 0%, rgb(0, 0, 0) 100%)" }} data-name="Body">
      <div className="backdrop-blur-[12px] bg-[rgba(26,26,46,0.9)] border-[rgba(255,255,255,0.05)] border-b border-solid content-stretch flex items-center justify-between pb-[17px] pt-[24px] px-[20px] relative shrink-0 w-full z-[3]" data-node-id="18:34" data-name="Header">
        <div className="relative shrink-0" data-node-id="18:35" data-name="Container">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[6px] items-center relative size-full">
            <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-node-id="18:212">
              <div className="col-1 ml-0 mt-0 relative row-1 size-[39px]" data-node-id="18:194" data-name="logo 2">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLogo2} />
              </div>
            </div>
            <div className="content-stretch flex items-center relative shrink-0 w-[88px]" data-node-id="18:40" data-name="Heading 1">
              <div className="flex flex-col font-['Noto_Sans_KR:Black',sans-serif] font-black h-[28px] justify-center leading-[0] relative shrink-0 text-[20px] text-white tracking-[-0.5px] w-[55px]" data-node-id="18:41">
                <p className="leading-[28px]">맵맵맵</p>
              </div>
              <div className="content-stretch flex flex-col items-start pl-[4px] pt-[4px] relative shrink-0 size-[10px]" data-node-id="18:42" data-name="Margin">
                <div className="bg-[#c5171e] rounded-[9999px] shrink-0 size-[6px]" data-node-id="18:43" data-name="Background" />
              </div>
            </div>
          </div>
        </div>
        <div className="relative shrink-0" data-node-id="18:44" data-name="Container">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
            <div className="content-stretch flex items-center justify-center relative rounded-[9999px] shrink-0 size-[40px]" data-node-id="18:45" data-name="Button">
              <div className="relative shrink-0 size-[19.5px]" data-node-id="18:46" data-name="Container">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgContainer} />
              </div>
            </div>
            <div className="content-stretch flex items-center justify-center relative rounded-[9999px] shrink-0 size-[40px]" data-node-id="18:48" data-name="Button">
              <div className="h-[21.667px] relative shrink-0 w-[17.333px]" data-node-id="18:49" data-name="Container">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgContainer1} />
              </div>
              <div className="absolute bg-[#c5171e] right-[10px] rounded-[9999px] size-[8px] top-[10px]" data-node-id="18:51" data-name="Background">
                <div className="absolute bg-[rgba(255,255,255,0)] right-0 rounded-[9999px] shadow-[0px_0px_0px_2px_#1a1a2e] size-[8px] top-0" data-node-id="18:52" data-name="Overlay+Shadow" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="content-stretch flex flex-col gap-[12px] h-[886px] items-start pb-[96px] pt-[8px] px-[20px] relative shrink-0 w-full z-[2]" data-node-id="18:60" data-name="Main">
        <div className="content-stretch flex flex-col h-[192px] items-start justify-center overflow-clip relative rounded-[24px] shadow-[0px_0px_20px_0px_rgba(197,23,30,0.3)] shrink-0 w-full" data-node-id="18:61" style={{ backgroundImage: "linear-gradient(119.99999949974539deg, rgb(197, 23, 30) 0%, rgb(255, 94, 58) 100%)" }} data-name="Background+Shadow">
          <div className="absolute bg-[rgba(255,255,255,0.1)] blur-[20px] bottom-[-32px] right-[-16px] rounded-[9999px] size-[160px]" data-node-id="18:62" data-name="Overlay+Blur" />
          <div className="absolute bg-[rgba(251,146,60,0.2)] blur-[20px] left-[32px] rounded-[9999px] size-[128px] top-[-32px]" data-node-id="18:63" data-name="Overlay+Blur" />
          <div className="absolute inset-0 mix-blend-overlay opacity-10" data-node-id="18:64" data-name="Image">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img alt="" className="absolute h-[415.62%] left-0 max-w-none top-0 w-[228%]" src={imgImage} />
            </div>
          </div>
          <div className="content-stretch flex flex-[1_0_0] flex-col items-start justify-between min-h-px p-[24px] relative w-full" data-node-id="18:65" data-name="Container">
            <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-node-id="18:66" data-name="Container">
              <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0" data-node-id="18:67" data-name="Container">
                <div className="backdrop-blur-[6px] bg-[rgba(255,255,255,0.2)] border border-[rgba(255,255,255,0.1)] border-solid content-stretch flex flex-col items-start px-[11px] py-[5px] relative rounded-[9999px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 w-[100px]" data-node-id="18:68" data-name="Overlay+Border+Shadow+OverlayBlur">
                  <div className="flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold h-[17px] justify-center leading-[0] relative shrink-0 text-[11px] text-white tracking-[0.275px] w-[89px]" data-node-id="18:69">
                    <p className="leading-[16.5px]">🔥 HOT PLACE</p>
                  </div>
                </div>
                <div className="content-stretch flex flex-col items-start relative shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05)] shrink-0 w-full" data-node-id="18:70" data-name="Heading 2">
                  <div className="flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold h-[60px] justify-center leading-[0] relative shrink-0 text-[24px] text-white w-[145.92px]" data-node-id="18:71">
                    <p className="leading-[30px] mb-0">맵고수들의</p>
                    <p className="leading-[30px]">성지 순례 지도</p>
                  </div>
                </div>
              </div>
              <div className="backdrop-blur-[6px] bg-[rgba(255,255,255,0.2)] border border-[rgba(255,255,255,0.1)] border-solid content-stretch flex items-center justify-center p-px relative rounded-[9999px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 size-[40px]" data-node-id="18:72" data-name="Overlay+Border+Shadow+OverlayBlur">
                <div className="relative shrink-0 size-[16px]" data-node-id="18:73" data-name="Container">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgContainer2} />
                </div>
              </div>
            </div>
            <div className="content-stretch flex items-end relative shrink-0 w-full" data-node-id="18:75" data-name="Container">
              <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0" data-node-id="18:76" data-name="Container">
                <div className="flex flex-col font-['Noto_Sans_KR:Medium',sans-serif] font-medium h-[20px] justify-center leading-[0] relative shrink-0 text-[14px] text-[rgba(255,255,255,0.8)] w-[144.48px]" data-node-id="18:77">
                  <p className="leading-[20px]">내 맵레벨에 딱 맞는 맛집</p>
                </div>
                <div className="bg-[rgba(255,255,255,0.4)] h-[4px] overflow-clip relative rounded-[9999px] shrink-0 w-[48px]" data-node-id="18:78" data-name="Overlay">
                  <div className="absolute bg-white inset-[0_33.33%_0_0] rounded-[9999px]" data-node-id="18:79" data-name="Background" />
                </div>
              </div>
              <div className="absolute bottom-[-23.9px] flex h-[62.895px] items-center justify-center right-[17.99px] w-[32.008px]">
                <div className="-rotate-10 flex-none">
                  <div className="content-stretch flex flex-col items-start opacity-90 relative shadow-[0px_4px_3px_0px_rgba(0,0,0,0.1),0px_10px_8px_0px_rgba(0,0,0,0.04)]" data-node-id="18:80" data-name="Shadow">
                    <div className="flex flex-col font-['Liberation_Sans:Regular',sans-serif] h-[60px] justify-center leading-[0] not-italic relative shrink-0 text-[60px] text-white w-[21.922px]" data-node-id="18:81">
                      <p className="leading-[60px]">🗺️</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[#232336] content-stretch flex flex-col items-start overflow-clip p-[4px] relative rounded-[24px] shadow-[0px_0px_0px_1px_rgba(255,255,255,0.05),0px_10px_30px_-10px_rgba(0,0,0,0.5)] shrink-0 w-full" data-node-id="18:82" data-name="Background+Shadow">
          <div className="absolute bg-gradient-to-b from-[rgba(255,255,255,0.05)] inset-0 to-[rgba(255,255,255,0)]" data-node-id="18:83" data-name="Gradient" />
          <div className="bg-[#232336] content-stretch flex items-center justify-between overflow-clip p-[20px] relative rounded-[20px] shrink-0 w-full" data-node-id="18:84" data-name="Background">
            <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-node-id="18:85" data-name="Container">
              <div className="content-stretch flex items-center relative shrink-0 w-full" data-node-id="18:86" data-name="Container">
                <div className="content-stretch flex flex-col items-start relative shrink-0 w-[125px]" data-node-id="18:89" data-name="Heading 3">
                  <div className="flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] relative shrink-0 text-[18px] text-white w-[100.09px]" data-node-id="18:90">
                    <p className="leading-[28px]">맵BTI 테스트</p>
                  </div>
                </div>
              </div>
              <div className="content-stretch flex flex-col items-start pl-[4px] relative shrink-0 w-full" data-node-id="18:91" data-name="Container">
                <div className="flex flex-col font-['Noto_Sans_KR:Medium',sans-serif] font-medium h-[16px] justify-center leading-[0] relative shrink-0 text-[#a0a0b0] text-[12px] w-[153px]" data-node-id="18:92">
                  <p className="leading-[16px]">나의 매운맛 성향은 무엇일까?</p>
                </div>
              </div>
              <div className="content-stretch flex flex-col items-start pt-[8px] relative shrink-0" data-node-id="18:93" data-name="Button:margin">
                <div className="bg-[#232336] border border-[rgba(255,255,255,0.1)] border-solid content-stretch flex gap-[4px] items-center px-[17px] py-[9px] relative rounded-[9999px] shrink-0" data-node-id="18:94" data-name="Button">
                  <div className="flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[12px] text-center text-white w-[58.56px]" data-node-id="18:95">
                    <p className="leading-[16px]">테스트 시작</p>
                  </div>
                  <div className="h-[7px] relative shrink-0 w-[4.317px]" data-node-id="18:96" data-name="Container">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgContainer3} />
                  </div>
                </div>
              </div>
            </div>
            <div className="content-stretch flex items-center justify-center relative shrink-0 size-[96px]" data-node-id="18:98" data-name="Container">
              <div className="absolute bg-[rgba(197,23,30,0)] blur-[12px] inset-0 rounded-[9999px]" data-node-id="18:99" data-name="Overlay+Blur" />
              <div className="border-2 border-[rgba(255,255,255,0.05)] border-solid content-stretch flex items-center justify-center overflow-clip p-[2px] relative rounded-[9999px] shrink-0 size-[86px]" data-node-id="18:100" data-name="Background+Border+Shadow">
                <div aria-hidden="true" className="absolute bg-white inset-0 pointer-events-none rounded-[9999px]" />
                <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-center text-white whitespace-nowrap" data-node-id="18:217">
                  <p className="leading-[36px]">🥵</p>
                </div>
                <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_2px_4px_2px_rgba(0,0,0,0.05)]" />
              </div>
            </div>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-node-id="18:105" data-name="Container">
          <div className="content-stretch flex items-center justify-between px-[4px] relative shrink-0 w-full" data-node-id="18:106" data-name="Container">
            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="18:107" data-name="Heading 3">
              <div className="flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] relative shrink-0 text-[18px] text-white w-[87.84px]" data-node-id="18:108">
                <p className="leading-[28px]">테마별 추천</p>
              </div>
              <div className="bg-[#f97316] rounded-[9999px] shrink-0 size-[6px]" data-node-id="18:109" data-name="Background" />
            </div>
            <div className="content-stretch flex items-center relative shrink-0" data-node-id="18:110" data-name="Button">
              <div className="flex flex-col font-['Noto_Sans_KR:Medium',sans-serif] font-medium h-[16px] justify-center leading-[0] relative shrink-0 text-[#a0a0b0] text-[12px] text-center w-[59px]" data-node-id="18:111">
                <p className="leading-[16px] whitespace-pre-wrap">{`전체보기  >`}</p>
              </div>
            </div>
          </div>
          <div className="h-[237.33px] relative shrink-0 w-full" data-node-id="18:114" data-name="Margin">
            <div className="absolute h-[237.33px] left-[-20px] overflow-clip right-[-20px] top-0" data-node-id="18:115" data-name="Container">
              <div className="absolute bottom-[24px] content-stretch flex flex-col items-start left-[20px] top-0 w-[160px]" data-node-id="18:116" data-name="Container">
                <div className="aspect-[3/4] bg-[rgba(255,255,255,0)] overflow-clip relative rounded-[16px] shadow-[0px_0px_0px_1px_rgba(255,255,255,0.05),0px_10px_15px_-3px_rgba(0,0,0,0.4),0px_4px_6px_-4px_rgba(0,0,0,0.4)] shrink-0 w-full" data-node-id="18:117" data-name="Overlay+Shadow">
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <img alt="" className="absolute h-full left-[-16.67%] max-w-none top-0 w-[133.33%]" src={imgOverlayShadow} />
                  </div>
                  <div className="absolute bg-gradient-to-t from-[rgba(0,0,0,0.9)] inset-0 to-[rgba(0,0,0,0)] via-1/2 via-[rgba(0,0,0,0.2)]" data-node-id="18:119" data-name="Gradient" />
                  <div className="absolute backdrop-blur-[6px] bg-[rgba(0,0,0,0.6)] border border-[rgba(255,255,255,0.1)] border-solid content-stretch flex gap-[4px] items-center left-[12px] px-[11px] py-[5px] rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] top-[12px]" data-node-id="18:120" data-name="Overlay+Border+Shadow+OverlayBlur">
                    <div className="bg-[#f97316] rounded-[9999px] shrink-0 size-[8px]" data-node-id="18:121" data-name="Background" />
                    <div className="relative shrink-0" data-node-id="18:122" data-name="Container">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
                        <div className="flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[10px] text-white tracking-[0.5px] uppercase w-[25px]" data-node-id="18:123">
                          <p className="leading-[15px]">Lv.4</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-[16px] content-stretch flex flex-col gap-[4px] items-start left-[12px] right-[12px]" data-node-id="18:124" data-name="Container">
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="18:125" data-name="Container">
                      <div className="flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#fb923c] text-[10px] tracking-[0.25px] uppercase w-full" data-node-id="18:126">
                        <p className="leading-[15px]">Stess Relief</p>
                      </div>
                    </div>
                    <div className="h-[37.5px] overflow-clip relative shrink-0 w-full" data-node-id="18:127" data-name="Container">
                      <div className="-translate-y-1/2 absolute flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold justify-center leading-[0] left-0 text-[15px] text-white top-[17.88px] w-[100.82px]" data-node-id="18:128">
                        <p className="leading-[18.75px] mb-0">스트레스 풀리는</p>
                        <p className="leading-[18.75px]">화끈한 맛 🔥</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-[24px] content-stretch flex flex-col items-start left-[196px] top-0 w-[160px]" data-node-id="18:129" data-name="Container">
                <div className="aspect-[3/4] bg-[rgba(255,255,255,0)] overflow-clip relative rounded-[16px] shadow-[0px_0px_0px_1px_rgba(255,255,255,0.05),0px_10px_15px_-3px_rgba(0,0,0,0.4),0px_4px_6px_-4px_rgba(0,0,0,0.4)] shrink-0 w-full" data-node-id="18:130" data-name="Overlay+Shadow">
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <img alt="" className="absolute h-full left-[-16.67%] max-w-none top-0 w-[133.33%]" src={imgOverlayShadow1} />
                  </div>
                  <div className="absolute bg-gradient-to-t from-[rgba(0,0,0,0.9)] inset-0 to-[rgba(0,0,0,0)] via-1/2 via-[rgba(0,0,0,0.2)]" data-node-id="18:132" data-name="Gradient" />
                  <div className="absolute backdrop-blur-[6px] bg-[rgba(0,0,0,0.6)] border border-[rgba(255,255,255,0.1)] border-solid content-stretch flex gap-[4px] items-center left-[12px] px-[11px] py-[5px] rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] top-[12px]" data-node-id="18:133" data-name="Overlay+Border+Shadow+OverlayBlur">
                    <div className="bg-[#facc15] rounded-[9999px] shrink-0 size-[8px]" data-node-id="18:134" data-name="Background" />
                    <div className="relative shrink-0" data-node-id="18:135" data-name="Container">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
                        <div className="flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[10px] text-white tracking-[0.5px] uppercase w-[35px]" data-node-id="18:136">
                          <p className="leading-[15px]">Lv.1~2</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-[16px] content-stretch flex flex-col gap-[4px] items-start left-[12px] right-[12px]" data-node-id="18:137" data-name="Container">
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="18:138" data-name="Container">
                      <div className="flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#facc15] text-[10px] tracking-[0.25px] uppercase w-full" data-node-id="18:139">
                        <p className="leading-[15px]">Beginner</p>
                      </div>
                    </div>
                    <div className="h-[37.5px] overflow-clip relative shrink-0 w-full" data-node-id="18:140" data-name="Container">
                      <div className="-translate-y-1/2 absolute flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold justify-center leading-[0] left-0 text-[15px] text-white top-[19.17px] w-[94px]" data-node-id="18:141">
                        <p className="leading-[18.75px] mb-0">입문자용</p>
                        <p className="leading-[18.75px]">맛있게 맵다 🌶️</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-[24px] content-stretch flex flex-col items-start left-[372px] top-0 w-[160px]" data-node-id="18:142" data-name="Container">
                <div className="aspect-[3/4] bg-[rgba(255,255,255,0)] overflow-clip relative rounded-[16px] shadow-[0px_0px_0px_1px_rgba(255,255,255,0.05),0px_10px_15px_-3px_rgba(0,0,0,0.4),0px_4px_6px_-4px_rgba(0,0,0,0.4)] shrink-0 w-full" data-node-id="18:143" data-name="Overlay+Shadow">
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <img alt="" className="absolute h-full left-[-16.67%] max-w-none top-0 w-[133.33%]" src={imgOverlayShadow2} />
                  </div>
                  <div className="absolute bg-gradient-to-t from-[rgba(0,0,0,0.9)] inset-0 to-[rgba(0,0,0,0)] via-1/2 via-[rgba(0,0,0,0.2)]" data-node-id="18:145" data-name="Gradient" />
                  <div className="absolute backdrop-blur-[6px] bg-[rgba(0,0,0,0.6)] border border-[rgba(197,23,30,0.5)] border-solid content-stretch flex gap-[4px] items-center left-[12px] px-[11px] py-[5px] rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] top-[12px]" data-node-id="18:146" data-name="Overlay+Border+Shadow+OverlayBlur">
                    <div className="bg-[#c5171e] rounded-[9999px] shrink-0 size-[8px]" data-node-id="18:147" data-name="Background" />
                    <div className="relative shrink-0" data-node-id="18:148" data-name="Container">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
                        <div className="flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[10px] text-white tracking-[0.5px] uppercase w-[22.19px]" data-node-id="18:149">
                          <p className="leading-[15px]">Lv.5</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-[16px] content-stretch flex flex-col gap-[4px] items-start left-[12px] right-[12px]" data-node-id="18:150" data-name="Container">
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="18:151" data-name="Container">
                      <div className="flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#c5171e] text-[10px] tracking-[0.25px] uppercase w-full" data-node-id="18:152">
                        <p className="leading-[15px]">Hell Challenge</p>
                      </div>
                    </div>
                    <div className="h-[37.5px] overflow-clip relative shrink-0 w-full" data-node-id="18:153" data-name="Container">
                      <div className="-translate-y-1/2 absolute flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold justify-center leading-[0] left-0 text-[15px] text-white top-[17.88px] w-[64.9px]" data-node-id="18:154">
                        <p className="leading-[18.75px] mb-0">지옥의 맛</p>
                        <p className="leading-[18.75px]">도전하라 💀</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="content-stretch flex flex-col items-start pb-[24px] relative shrink-0 w-full" data-node-id="18:155" data-name="Container">
          <div className="content-stretch flex flex-col items-start px-[4px] relative shrink-0 w-full" data-node-id="18:156" data-name="Heading 3">
            <div className="flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[18px] text-white w-full" data-node-id="18:157">
              <p className="leading-[28px]">실시간 맵 리뷰</p>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 contents left-0 z-[1]" data-node-id="31:267">
        <div className="absolute backdrop-blur-[12px] bg-[rgba(21,21,37,0.95)] border-[rgba(255,255,255,0.1)] border-solid border-t bottom-0 content-stretch flex flex-col h-[81px] items-start left-0 max-w-[420px] pt-px rounded-tl-[24px] rounded-tr-[24px] shadow-[0px_-4px_20px_0px_rgba(0,0,0,0.4)] w-[390px]" data-node-id="18:3" data-name="Nav">
          <div className="h-[80px] relative shrink-0 w-full" data-node-id="18:4" data-name="Container">
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center pb-[8px] px-[8px] relative size-full">
              <div className="content-stretch flex flex-col gap-[4px] items-center justify-center pl-[28.19px] pr-[28.2px] relative shrink-0" data-node-id="18:5" data-name="Button">
                <div className="content-stretch flex flex-col items-center relative shrink-0" data-node-id="18:6" data-name="Background">
                  <div aria-hidden="true" className="absolute bg-white inset-0 mix-blend-saturation pointer-events-none" />
                  <div className="flex flex-col font-['Liberation_Sans:Regular',sans-serif] h-[36px] justify-center leading-[0] not-italic relative shrink-0 text-[#9ca3af] text-[24px] text-center w-[8.77px]" data-node-id="18:7">
                    <p className="leading-[36px]">🗺️</p>
                  </div>
                </div>
                <div className="content-stretch flex flex-col items-center relative shrink-0" data-node-id="18:8" data-name="Container">
                  <div className="flex flex-col font-['Noto_Sans_KR:Medium',sans-serif] font-medium h-[15px] justify-center leading-[0] relative shrink-0 text-[#9ca3af] text-[10px] text-center w-[18.41px]" data-node-id="18:9">
                    <p className="leading-[15px]">지도</p>
                  </div>
                </div>
              </div>
              <div className="content-stretch flex flex-col gap-[4px] items-center justify-center pl-[18.98px] pr-[19.01px] relative shrink-0" data-node-id="18:10" data-name="Button">
                <div className="content-stretch flex flex-col items-center relative shrink-0" data-node-id="18:11" data-name="Background">
                  <div aria-hidden="true" className="absolute bg-white inset-0 mix-blend-saturation pointer-events-none" />
                  <div className="flex flex-col font-['Liberation_Sans:Regular',sans-serif] h-[36px] justify-center leading-[0] not-italic relative shrink-0 text-[#9ca3af] text-[24px] text-center w-[8.77px]" data-node-id="18:12">
                    <p className="leading-[36px]">💬</p>
                  </div>
                </div>
                <div className="content-stretch flex flex-col items-center relative shrink-0" data-node-id="18:13" data-name="Container">
                  <div className="flex flex-col font-['Noto_Sans_KR:Medium',sans-serif] font-medium h-[15px] justify-center leading-[0] relative shrink-0 text-[#9ca3af] text-[10px] text-center w-[36.81px]" data-node-id="18:14">
                    <p className="leading-[15px]">커뮤니티</p>
                  </div>
                </div>
              </div>
              <div className="h-[56.5px] relative shrink-0 w-[74.8px]" data-node-id="18:15" data-name="Button:margin">
                <div className="absolute content-stretch flex flex-col gap-[4px] items-center left-0 pl-[9.39px] pr-[9.41px] top-[-24px]" data-node-id="18:16" data-name="Button">
                  <div className="bg-[#1a1a2e] border-4 border-[#1a1a2e] border-solid content-stretch flex items-center justify-center p-[4px] relative rounded-[9999px] shadow-[0px_-4px_10px_0px_rgba(0,0,0,0.3)] shrink-0 size-[56px]" data-node-id="18:17" data-name="Background+Border+Shadow">
                    <div className="flex-[1_0_0] h-full min-w-px relative rounded-[9999px] shadow-[0px_0px_20px_0px_rgba(197,23,30,0.3)]" data-node-id="18:18" style={{ backgroundImage: "linear-gradient(120.00000035819761deg, rgb(197, 23, 30) 0%, rgb(255, 94, 58) 100%)" }} data-name="Background+Shadow">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
                        <div className="content-stretch flex flex-col items-center relative shadow-[0px_2px_2px_0px_rgba(0,0,0,0.06),0px_4px_3px_0px_rgba(0,0,0,0.07)] shrink-0" data-node-id="18:19" data-name="Shadow">
                          <div className="flex flex-col font-['Liberation_Sans:Regular',sans-serif] h-[42px] justify-center leading-[0] not-italic relative shrink-0 text-[#c5171e] text-[28px] text-center w-[10.23px]" data-node-id="18:20">
                            <p className="leading-[42px]">🏠</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex flex-col items-start pt-[4px] relative shrink-0" data-node-id="18:21" data-name="Margin">
                    <div className="content-stretch flex flex-col items-center relative shrink-0" data-node-id="18:22" data-name="Container">
                      <div className="flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold h-[17px] justify-center leading-[0] relative shrink-0 text-[#c5171e] text-[11px] text-center w-[10.13px]" data-node-id="18:23">
                        <p className="leading-[16.5px]">홈</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="content-stretch flex flex-col gap-[4px] items-center justify-center pl-[18.99px] pr-[19px] relative shrink-0" data-node-id="18:24" data-name="Button">
                <div className="content-stretch flex flex-col items-center relative shrink-0" data-node-id="18:25" data-name="Background">
                  <div aria-hidden="true" className="absolute bg-white inset-0 mix-blend-saturation pointer-events-none" />
                  <div className="flex flex-col font-['Liberation_Sans:Regular',sans-serif] h-[36px] justify-center leading-[0] not-italic relative shrink-0 text-[#9ca3af] text-[24px] text-center w-[8.77px]" data-node-id="18:26">
                    <p className="leading-[36px]">🛒</p>
                  </div>
                </div>
                <div className="content-stretch flex flex-col items-center relative shrink-0" data-node-id="18:27" data-name="Container">
                  <div className="flex flex-col font-['Noto_Sans_KR:Medium',sans-serif] font-medium h-[15px] justify-center leading-[0] relative shrink-0 text-[#9ca3af] text-[10px] text-center w-[36.81px]" data-node-id="18:28">
                    <p className="leading-[15px]">슈퍼맵켓</p>
                  </div>
                </div>
              </div>
              <div className="content-stretch flex flex-col gap-[4px] items-center justify-center pl-[14.4px] pr-[14.41px] relative shrink-0" data-node-id="18:29" data-name="Button">
                <div className="content-stretch flex flex-col items-center relative shrink-0" data-node-id="18:30" data-name="Background">
                  <div aria-hidden="true" className="absolute bg-white inset-0 mix-blend-saturation pointer-events-none" />
                  <div className="flex flex-col font-['Liberation_Sans:Regular',sans-serif] h-[36px] justify-center leading-[0] not-italic relative shrink-0 text-[#9ca3af] text-[24px] text-center w-[8.77px]" data-node-id="18:31">
                    <p className="leading-[36px]">👤</p>
                  </div>
                </div>
                <div className="content-stretch flex flex-col items-center relative shrink-0" data-node-id="18:32" data-name="Container">
                  <div className="flex flex-col font-['Noto_Sans_KR:Medium',sans-serif] font-medium h-[15px] justify-center leading-[0] relative shrink-0 text-[#9ca3af] text-[10px] text-center w-[46px]" data-node-id="18:33">
                    <p className="leading-[15px]">마이페이지</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-[96px] content-stretch flex flex-col h-[44px] items-start right-[20px]" data-node-id="18:53" data-name="Container">
          <div className="bg-[#c5171e] content-stretch flex gap-[8px] items-center pl-[16px] pr-[20px] py-[12px] relative rounded-[9999px] shrink-0" data-node-id="18:54" data-name="Button">
            <div className="absolute bg-[rgba(255,255,255,0)] inset-[0_-0.02px_0_0] rounded-[9999px] shadow-[0px_10px_15px_-3px_rgba(197,23,30,0.4),0px_4px_6px_-4px_rgba(197,23,30,0.4)]" data-node-id="18:55" data-name="Button:shadow" />
            <div className="relative shrink-0 size-[14px]" data-node-id="18:56" data-name="Container">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgContainer4} />
            </div>
            <div className="content-stretch flex flex-col items-center relative shrink-0" data-node-id="18:58" data-name="Container">
              <div className="flex flex-col font-['Noto_Sans_KR:Bold',sans-serif] font-bold h-[20px] justify-center leading-[0] relative shrink-0 text-[14px] text-center text-white tracking-[0.35px] w-[52.92px]" data-node-id="18:59">
                <p className="leading-[20px]">제보하기</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
