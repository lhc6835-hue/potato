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
  { id: "influencer", name: "인플루언서 방문", desc: "손님 흐름 ×4", dur: 45, good: true, local: true, chapter: 6, weight: 3,
    report: "사장님, 팔로워 300만 명인 사람이 감자를 찍고 있습니다. 먹지는 않습니다." },
  { id: "festival", name: "감자 축제", desc: "손님 ×2, 판매가 +20%", dur: 90, good: true, local: false, chapter: 6, weight: 2,
    report: "동네에서 감자 축제가 열렸습니다. 우리가 연 게 아닙니다." },
  { id: "tv", name: "방송 출연", desc: "손님 ×2.5, 판매가 +10%", dur: 60, good: true, local: false, chapter: 7, weight: 2,
    report: "사장님이 '감자의 달인'에 나왔습니다. 사장님은 3초 나왔습니다." },
  { id: "harvest", name: "대풍년", desc: "감자 시세 60% 하락", dur: 120, good: true, local: false, chapter: 6, weight: 2,
    report: "감자가 너무 많이 났습니다. 농부들이 감자를 나눠주고 있습니다." },
  { id: "shortage", name: "감자 파동", desc: "감자 시세 ×3", dur: 90, good: false, local: false, chapter: 6, weight: 2,
    report: "감자 값이 올랐습니다. 이유는 모릅니다. 감자도 모를 겁니다." },
  { id: "rain", name: "비", desc: "손님 -20%. 감자전은 잘 팔린다", dur: 80, good: false, local: false, chapter: 6, weight: 2,
    report: "비가 옵니다. 사람들이 밖에 안 나옵니다. 감자전 생각은 합니다." },
  { id: "overheat", name: "튀김기 과열", desc: "한 분점 조리 속도 70% 감소. 탭해서 수리", dur: 60, good: false, local: true, fixable: true, chapter: 6, weight: 2,
    report: "튀김기에서 연기가 납니다. 감자 냄새가 아닙니다." },
  { id: "inspection", name: "위생 점검", desc: "손님 절반. 탭해서 점검 마치기", dur: 50, good: false, local: true, fixable: true, chapter: 6, weight: 1,
    report: "구청에서 점검을 나왔습니다. 김비서가 앞치마를 다렸습니다." },
  { id: "rival", name: "고구마 그룹 맞불", desc: "한 분점 손님 -40%", dur: 70, good: false, local: true, chapter: 6, weight: 2,
    report: "고구마 그룹이 바로 앞에서 군고구마를 굽고 있습니다. 냄새가 강력합니다." },
  { id: "sale", name: "반값 행사", desc: "판매가 -30%, 손님 ×2.2", dur: 60, good: true, local: false, chapter: 6, weight: 1,
    report: "김비서가 실수로 반값 전단지를 뿌렸습니다. 손님이 몰려옵니다." },
];
export const EVENT: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
