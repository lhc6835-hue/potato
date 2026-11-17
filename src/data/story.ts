// 메인 스토리: 챕터, 목표, 대사. 톤은 무표정하고 담백하게.

import type { GameState } from "../sim/state";
import { REGION } from "./regions";
import { MENU } from "./menus";

export type Speaker = "boss" | "sec" | "goh" | "critic" | "narr";
export const SPEAKER_NAME: Record<Speaker, string> = {
  boss: "박감자 사장", sec: "김비서", goh: "고구마 그룹 고회장", critic: "미식 평론가", narr: "",
};

export type Line = [Speaker, string];

export interface Goal {
  id: string;
  text: string;
  /** 진행도 [현재, 목표] */
  prog: (s: GameState) => [number, number];
}

export type Feature =
  | "build" | "managers" | "floors" | "price" | "research" | "branches" | "events" | "orders" | "rival"
  | "farm" | "market" | "cities" | "prestige" | "overseas" | "expo" | "newmarkets";

export interface Chapter {
  n: number;
  title: string;
  intro: Line[];
  goals: Goal[];
  outro: Line[];
  /** 이 챕터 시작 시 열리는 기능 */
  unlock: Feature[];
  /** 클리어 보상 (그 시점 수입 n초어치) */
  reward: number;
}

const sold = (s: GameState, id: string) => s.soldBy[id] ?? 0;
const totalLines = (s: GameState) => s.branches.reduce((a, b) => a + b.lines.length, 0);
const maxStation = (s: GameState) => Math.max(1, ...s.branches.flatMap((b) => b.lines.flatMap((l) => l.lv)));
const regionsWith = (s: GameState, tier: number) => new Set(s.branches.filter((b) => REGION[b.region]?.tier === tier).map((b) => b.region)).size;
const researchFound = (s: GameState) => s.research.found.filter((id) => MENU[id]?.research).length;
const expoStage = (s: GameState) => s.expo.stage;

const lineManagers = (s: GameState) => s.branches.reduce((a, b) => a + b.lines.filter((l) => l.manager !== null).length, 0);
const home = (s: GameState) => s.branches.find((b) => b.id === "b0") ?? s.branches[0];

export const CHAPTERS: Chapter[] = [
  {
    n: 1, title: "첫 가게", reward: 30,
    unlock: ["build", "managers"],
    intro: [
      ["narr", "감자동 3번지. 작은 감자 가게가 문을 열었다."],
      ["boss", "오늘부터 여기서 찐감자를 판다."],
      ["sec", "사장님, 감자는 지하 창고에 들어와 있습니다. 창고를 누르시면 사장님이 직접 감자를 들고 1층 주방으로 옮기십니다."],
      ["sec", "감자를 옮긴 다음 주방을 누르시면 조리를 시작합니다. 계속 누르시면 더 빨리 익습니다."],
      ["sec", "다 익은 찐감자는 바로 카운터에 진열되고, 손님이 사 갑니다."],
    ],
    goals: [
      { id: "c1-fetch", text: "지하 창고를 눌러 감자 옮기기", prog: (s) => [s.stats.fetches, 1] },
      { id: "c1-steam", text: "찐감자 20개 팔기", prog: (s) => [sold(s, "steamed"), 20] },
      { id: "c1-hire", text: "직원 탭에서 매니저 고용하기", prog: (s) => [s.managers.length, 1] },
      { id: "c1-cook", text: "주방에 조리 매니저 배치하기", prog: (s) => [lineManagers(s), 1] },
    ],
    outro: [
      ["sec", "이제 주방은 매니저가 맡습니다. 사장님은 감자만 날라 주시면 됩니다."],
      ["boss", "감자 나르는 사람도 있으면 좋겠군."],
    ],
  },
  {
    n: 2, title: "운반", reward: 45,
    unlock: [],
    intro: [
      ["sec", "창고에 운반 매니저를 두면 지하에서 주방까지 감자를 알아서 옮깁니다."],
      ["sec", "창고 이름표를 누르면 매니저를 배치할 수 있습니다."],
    ],
    goals: [
      { id: "c2-porter", text: "창고에 운반 매니저 배치하기", prog: (s) => [home(s).supply.manager !== null ? 1 : 0, 1] },
      { id: "c2-lv", text: "찐감자 라인 Lv 10", prog: (s) => [Math.min(...(home(s).lines[0]?.lv ?? [0])), 10] },
      { id: "c2-money", text: "누적 매출 100만원", prog: (s) => [s.earned, 1e6] },
    ],
    outro: [
      ["sec", "가게가 사장님 손 없이도 돌아가기 시작했습니다."],
      ["boss", "그럼 위로 한 층 올리자."],
    ],
  },
  {
    n: 3, title: "2층", reward: 60,
    unlock: ["floors", "price"],
    intro: [
      ["sec", "건물 위에 층을 올리면 새 주방을 열 수 있습니다. 옥상의 '증축'을 눌러 보십시오."],
      ["sec", "위층에서 만든 음식은 덤웨이터로 1층에 내려야 합니다. 처음에는 덤웨이터를 직접 눌러서 보내셔야 합니다."],
    ],
    goals: [
      { id: "c3-floor", text: "2층 증축하기", prog: (s) => [home(s).maxLines, 2] },
      { id: "c3-fries", text: "2층에 감자튀김 라인 짓기", prog: (s) => [home(s).lines.some((l) => l.menu === "fries") ? 1 : 0, 1] },
      { id: "c3-lift", text: "덤웨이터로 음식 10번 내리기", prog: (s) => [s.stats.lifts, 10] },
      { id: "c3-liftmgr", text: "덤웨이터 매니저 배치하기", prog: (s) => [home(s).lift.manager !== null ? 1 : 0, 1] },
      { id: "c3-money", text: "누적 매출 1천만원", prog: (s) => [s.earned, 1e7] },
    ],
    outro: [
      ["sec", "1층과 2층이 모두 자동으로 돌아갑니다."],
      ["boss", "이제 메뉴를 늘릴 차례다."],
    ],
  },
  {
    n: 4, title: "메뉴 늘리기", reward: 90,
    unlock: [],
    intro: [
      ["sec", "새 메뉴가 여러 개 열렸습니다. 층을 더 올려서 메뉴를 늘리면 손님도 늘어납니다."],
      ["sec", "각 주방은 가장 느린 시설이 속도를 정합니다. 빨간 표시가 뜬 시설부터 올리시면 됩니다."],
    ],
    goals: [
      { id: "c4-lines", text: "본점 주방 4개 운영하기", prog: (s) => [home(s).lines.length, 4] },
      { id: "c4-mashed", text: "매시드 포테이토 50개 팔기", prog: (s) => [sold(s, "mashed"), 50] },
      { id: "c4-hire", text: "매니저 6명 고용하기", prog: (s) => [s.managers.length, 6] },
      { id: "c4-lv", text: "아무 시설이나 Lv 25 달성", prog: (s) => [maxStation(s), 25] },
      { id: "c4-money", text: "누적 매출 200억원", prog: (s) => [s.earned, 2e10] },
    ],
    outro: [
      ["sec", "동네에서 우리 가게를 모르는 사람이 없습니다."],
      ["boss", "새로운 메뉴를 직접 만들어 보고 싶다."],
    ],
  },
  {
    n: 5, title: "연구소", reward: 120,
    unlock: ["research"],
    intro: [
      ["sec", "창고 옆에 연구소를 차렸습니다. 조리법과 곁들임을 골라 시험 조리를 할 수 있습니다."],
      ["sec", "아이디어는 주방이 돌아가는 동안 쌓입니다. 맞는 조합을 찾으면 새 메뉴가 생깁니다."],
    ],
    goals: [
      { id: "c5-found", text: "새 레시피 3개 발견하기", prog: (s) => [researchFound(s), 3] },
      { id: "c5-tries", text: "시험 조리 8번 하기", prog: (s) => [s.research.tries, 8] },
      { id: "c5-money", text: "누적 매출 3조원", prog: (s) => [s.earned, 3e12] },
    ],
    outro: [
      ["sec", "손님이 너무 많아서 줄이 가게 밖까지 이어졌습니다."],
      ["boss", "가게를 하나 더 내자."],
    ],
  },
  {
    n: 6, title: "분점", reward: 150,
    unlock: ["branches"],
    intro: [
      ["sec", "지도에서 빈 부지를 골라 분점을 낼 수 있습니다. 상권마다 손님 성향이 다릅니다."],
      ["sec", "분점은 기본 직원이 느리게 운영합니다. 매니저를 배치하면 제 속도가 납니다."],
    ],
    goals: [
      { id: "c6-branches", text: "가게 3개 운영하기 (본점 포함)", prog: (s) => [s.branches.length, 3] },
      { id: "c6-city", text: "감자시에 진출하기", prog: (s) => [s.branches.some((b) => b.region === "gamja-si") ? 1 : 0, 1] },
      { id: "c6-found", text: "레시피 6개 발견하기", prog: (s) => [researchFound(s), 6] },
      { id: "c6-money", text: "누적 매출 300조원", prog: (s) => [s.earned, 3e14] },
    ],
    outro: [
      ["sec", "건너편 건물에 고구마 그룹이 들어왔습니다."],
      ["boss", "경쟁자가 생겼군."],
    ],
  },
  {
    n: 7, title: "경쟁", reward: 180,
    unlock: ["events", "orders", "rival"],
    intro: [
      ["goh", "고구마 그룹 회장입니다. 이 동네 손님은 우리가 가져가겠습니다."],
      ["boss", "손님은 맛있는 쪽으로 갑니다."],
      ["sec", "고구마 그룹의 점유율만큼 손님이 줄어듭니다. 별점을 높게 유지하고 특별 주문을 처리하면 점유율을 되찾을 수 있습니다."],
      ["sec", "이제부터 가끔 이벤트도 생깁니다. 좋은 일도, 나쁜 일도 있습니다."],
    ],
    goals: [
      { id: "c7-rival", text: "고구마 그룹 점유율 10% 이하로", prog: (s) => [Math.max(0, 50 - s.rival.share), 40] },
      { id: "c7-orders", text: "특별 주문 3개 완료하기", prog: (s) => [s.stats.ordersDone, 3] },
      { id: "c7-lines", text: "전 가게 합쳐 주방 12개", prog: (s) => [totalLines(s), 12] },
      { id: "c7-money", text: "누적 매출 2천조원", prog: (s) => [s.earned, 2e15] },
    ],
    outro: [
      ["goh", "오늘은 물러나겠습니다."],
      ["sec", "사장님, 감자 시세가 계속 오르고 있습니다."],
      ["boss", "그럼 직접 키우자."],
    ],
  },
  {
    n: 8, title: "농장", reward: 210,
    unlock: ["farm", "market"],
    intro: [
      ["sec", "농장을 확장하면 감자 일부를 무료로 받을 수 있고, 판매가도 오릅니다."],
      ["sec", "품종마다 잘 맞는 메뉴가 있습니다. 감자 시세가 쌀 때 비축해 두셔도 됩니다."],
    ],
    goals: [
      { id: "c8-var", text: "감자 품종 5종 모으기", prog: (s) => [s.farm.varieties.length, 5] },
      { id: "c8-farm", text: "농장 Lv 5", prog: (s) => [s.farm.lv, 5] },
      { id: "c8-branches", text: "가게 6개 운영하기", prog: (s) => [s.branches.length, 6] },
      { id: "c8-money", text: "누적 매출 5경원", prog: (s) => [s.earned, 5e16] },
    ],
    outro: [
      ["sec", "전국에서 입점 제안이 들어오고 있습니다."],
      ["boss", "전국으로 가자."],
    ],
  },
  {
    n: 9, title: "전국", reward: 240,
    unlock: ["cities", "prestige"],
    intro: [
      ["sec", "서울, 부산, 강원, 대구, 제주에 진출할 수 있습니다. 도시가 클수록 매출도 큽니다."],
      ["sec", "그리고 본사에서 '브랜드 리부트'를 할 수 있게 됐습니다. 회사를 처음부터 다시 시작하는 대신 황금감자를 받아 영구 보너스를 얻습니다."],
      ["sec", "스토리, 업적, 도감은 그대로 남습니다. 막히면 리부트를 고려해 보십시오."],
    ],
    goals: [
      { id: "c9-cities", text: "전국 5개 도시 진출", prog: (s) => [regionsWith(s, 2), 5] },
      { id: "c9-found", text: "레시피 12개 발견하기", prog: (s) => [researchFound(s), 12] },
      { id: "c9-money", text: "누적 매출 1해원", prog: (s) => [s.earned, 1e20] },
    ],
    outro: [
      ["sec", "해외에서도 연락이 왔습니다. 첫 번째는 캐나다입니다."],
      ["boss", "가 보자."],
    ],
  },
  {
    n: 10, title: "해외 진출", reward: 270,
    unlock: ["overseas"],
    intro: [
      ["sec", "해외 지점은 그 나라 한정 메뉴를 함께 들고 시작합니다."],
      ["sec", "나라마다 좋아하는 음식이 다릅니다. 지도에서 확인하실 수 있습니다."],
    ],
    goals: [
      { id: "c10-countries", text: "해외 3개국 진출", prog: (s) => [regionsWith(s, 3), 3] },
      { id: "c10-local", text: "현지 한정 메뉴 3개 판매", prog: (s) => [["poutine", "raclette", "bravas", "aloogobi"].filter((id) => sold(s, id) > 0).length, 3] },
      { id: "c10-money", text: "누적 매출 1천해원", prog: (s) => [s.earned, 1e23] },
    ],
    outro: [
      ["sec", "세계 감자 협회에서 감자 엑스포를 열자는 제안이 왔습니다."],
      ["boss", "좋다. 열자."],
    ],
  },
  {
    n: 11, title: "세계 감자의 날", reward: 300,
    unlock: ["expo"],
    intro: [
      ["sec", "엑스포를 5단계에 걸쳐 짓습니다. 더보기 탭의 '감자 엑스포'에서 진행하실 수 있습니다."],
      ["goh", "고구마 그룹도 협찬하겠습니다."],
      ["boss", "환영합니다."],
    ],
    goals: [
      { id: "c11-expo", text: "감자 엑스포 5단계 완공", prog: (s) => [expoStage(s), 5] },
      { id: "c11-legend", text: "전설의 감자 발견하기", prog: (s) => [s.research.found.includes("legend") ? 1 : 0, 1] },
      { id: "c11-countries", text: "해외 6개국 진출", prog: (s) => [regionsWith(s, 3), 6] },
    ],
    outro: [
      ["narr", "세계 감자 엑스포 개막식."],
      ["boss", "작은 가게에서 시작했습니다. 감자 한 박스였습니다."],
      ["boss", "찾아 주신 손님들, 함께 일한 직원들 덕분에 여기까지 왔습니다. 감사합니다."],
      ["narr", "— 감자 주식회사 —"],
      ["sec", "사장님, 지도 바깥에 아직 가 보지 않은 시장이 있습니다."],
      ["boss", "계속 가 보자."],
    ],
  },
];

export const LAST_CHAPTER = CHAPTERS.length;

/** 챕터 n 이상에서 열리는 기능 */
export const FEATURE_CHAPTER: Record<Feature, number> = {} as any;
for (const c of CHAPTERS) for (const f of c.unlock) FEATURE_CHAPTER[f] = c.n;
FEATURE_CHAPTER.newmarkets = 12;

export function featureOn(s: GameState, f: Feature) {
  if (f === "newmarkets") return s.ended;
  return Math.max(s.chapter, s.prestige.best) >= (FEATURE_CHAPTER[f] ?? 99);
}

export const EXPO_STAGES = [
  { name: "부지 매입", cost: 1e23 },
  { name: "감자 모양 전시관", cost: 5e23 },
  { name: "세계 감자 음식관", cost: 2e24 },
  { name: "고구마관 (협찬)", cost: 8e24 },
  { name: "개막식 무대", cost: 3e25 },
];
