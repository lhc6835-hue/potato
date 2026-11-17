// 랜덤 이벤트. 효과 수치는 econ.ts의 EVENT_EFFECTS에 있다.

export interface EventDef {
  id: string;
  name: string;
  desc: string;
  /** 지속 시간(초) */
  dur: number;
  good: boolean;
  /** 한 분점에만 걸리는가 */
  local: boolean;
  /** 탭해서 끝낼 수 있는가 (사고형) */
  fixable?: boolean;
  /** 등장 챕터 */
  chapter: number;
  weight: number;
  /** 시작할 때 김비서 보고 */
  report: string;
}

export const EVENTS: EventDef[] = [
  { id: "influencer", name: "인플루언서 방문", desc: "손님 흐름 ×4", dur: 45, good: true, local: true, chapter: 7, weight: 3,
    report: "유명 인플루언서가 가게에 와서 촬영 중입니다. 잠깐 손님이 크게 늘어납니다." },
  { id: "festival", name: "감자 축제", desc: "손님 ×2, 판매가 +20%", dur: 90, good: true, local: false, chapter: 7, weight: 2,
    report: "동네에서 감자 축제가 열렸습니다. 손님이 늘고 가격도 더 받을 수 있습니다." },
  { id: "tv", name: "방송 출연", desc: "손님 ×2.5, 판매가 +10%", dur: 60, good: true, local: false, chapter: 8, weight: 2,
    report: "가게가 방송에 소개됐습니다. 한동안 손님이 몰립니다." },
  { id: "harvest", name: "대풍년", desc: "감자 시세 60% 하락", dur: 120, good: true, local: false, chapter: 7, weight: 2,
    report: "올해 감자 농사가 풍년입니다. 감자 값이 크게 내렸습니다." },
  { id: "shortage", name: "감자 파동", desc: "감자 시세 ×3", dur: 90, good: false, local: false, chapter: 7, weight: 2,
    report: "감자 값이 크게 올랐습니다. 비축해 둔 감자가 있으면 지금 쓰십시오." },
  { id: "rain", name: "비", desc: "손님 -20%. 감자전은 잘 팔린다", dur: 80, good: false, local: false, chapter: 7, weight: 2,
    report: "비가 옵니다. 손님은 줄지만 감자전은 두 배 값에 팔립니다." },
  { id: "overheat", name: "튀김기 과열", desc: "한 분점 조리 속도 70% 감소. 탭해서 수리", dur: 60, good: false, local: true, fixable: true, chapter: 7, weight: 2,
    report: "주방 기계가 과열됐습니다. 오른쪽 카드를 연타해서 빨리 수리하십시오." },
  { id: "inspection", name: "위생 점검", desc: "손님 절반. 탭해서 점검 마치기", dur: 50, good: false, local: true, fixable: true, chapter: 7, weight: 1,
    report: "위생 점검이 나왔습니다. 오른쪽 카드를 연타해서 점검을 빨리 마치십시오." },
  { id: "rival", name: "고구마 그룹 맞불", desc: "한 분점 손님 -40%", dur: 70, good: false, local: true, chapter: 7, weight: 2,
    report: "고구마 그룹이 가게 앞에서 판촉 행사를 하고 있습니다. 손님이 줄어듭니다." },
  { id: "sale", name: "반값 행사", desc: "판매가 -30%, 손님 ×2.2", dur: 60, good: true, local: false, chapter: 7, weight: 1,
    report: "반값 행사를 시작했습니다. 값은 덜 받지만 손님이 크게 늡니다." },
];
export const EVENT: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
