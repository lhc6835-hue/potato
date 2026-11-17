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

export const CHAPTERS: Chapter[] = [
  {
    n: 1, title: "감자 한 박스", reward: 30,
    unlock: ["build", "managers"],
    intro: [
      ["narr", "감자동 3번지. 작은 가게 하나와 감자 한 박스."],
      ["boss", "김비서. 우리는 오늘부터 감자를 판다."],
      ["sec", "네, 사장님. 무슨 감자를 파십니까."],
      ["boss", "찐감자다."],
      ["sec", "그냥 감자를 찌는 겁니까."],
      ["boss", "그렇다. 주방을 눌러서 감자를 쪄라."],
    ],
    goals: [
      { id: "c1-steam", text: "찐감자 30개 팔기", prog: (s) => [sold(s, "steamed"), 30] },
      { id: "c1-fries", text: "2층에 감자튀김 라인 짓기", prog: (s) => [s.branches[0].lines.some((l) => l.menu === "fries") ? 1 : 0, 1] },
      { id: "c1-hire", text: "매니저 1명 고용하기", prog: (s) => [s.managers.length, 1] },
      { id: "c1-money", text: "누적 매출 50만원", prog: (s) => [s.earned, 5e5] },
    ],
    outro: [
      ["sec", "사장님, 매니저가 생겼으니 주방을 계속 누르지 않으셔도 됩니다."],
      ["boss", "알고 있다. 손가락이 아팠다."],
    ],
  },
  {
    n: 2, title: "첫 번째 간판", reward: 60,
    unlock: ["floors", "price"],
    intro: [
      ["sec", "사장님, 손님들이 간판이 어디 있냐고 묻습니다."],
      ["boss", "간판은 감자 모양으로 달아라."],
      ["sec", "이미 감자 모양입니다. 그냥 감자를 붙여 놨습니다."],
      ["boss", "좋다. 이제 메뉴를 늘린다. 위로."],
    ],
    goals: [
      { id: "c2-lines", text: "메뉴 3개 운영하기", prog: (s) => [s.branches[0].lines.length, 3] },
      { id: "c2-mashed", text: "매시드 포테이토 50개 팔기", prog: (s) => [sold(s, "mashed"), 50] },
      { id: "c2-lift", text: "덤웨이터 Lv 10", prog: (s) => [s.branches[0].lift.lv, 10] },
      { id: "c2-money", text: "누적 매출 1억원", prog: (s) => [s.earned, 1e8] },
    ],
    outro: [
      ["sec", "사장님, 동네 사람들이 우리를 '그 감자집'이라고 부릅니다."],
      ["boss", "다른 감자집이 있나?"],
      ["sec", "없습니다."],
      ["boss", "그럼 됐다."],
    ],
  },
  {
    n: 3, title: "사람이 재산이다", reward: 90,
    unlock: [],
    intro: [
      ["boss", "김비서. 사람이 재산이다."],
      ["sec", "명언입니까."],
      ["boss", "아니다. 매니저를 더 뽑으라는 뜻이다."],
    ],
    goals: [
      { id: "c3-hire", text: "매니저 5명 고용하기", prog: (s) => [s.managers.length, 5] },
      { id: "c3-floor", text: "건물 4층까지 증축하기", prog: (s) => [s.branches[0].maxLines, 4] },
      { id: "c3-lv", text: "아무 스테이션이나 Lv 25 달성", prog: (s) => [maxStation(s), 25] },
      { id: "c3-tornado", text: "회오리감자 100개 팔기", prog: (s) => [sold(s, "tornado"), 100] },
      { id: "c3-money", text: "누적 매출 200억원", prog: (s) => [s.earned, 2e10] },
    ],
    outro: [
      ["sec", "사장님, 매니저 중 한 명이 감자의 본질에 대해 물었습니다."],
      ["boss", "뭐라고 답했나."],
      ["sec", "감자라고 했습니다."],
      ["boss", "정답이다."],
    ],
  },
  {
    n: 4, title: "연구소", reward: 120,
    unlock: ["research"],
    intro: [
      ["boss", "김비서. 감자로 만들 수 있는 음식이 몇 개인지 아나."],
      ["sec", "모릅니다."],
      ["boss", "나도 모른다. 그래서 연구소를 차린다."],
      ["sec", "연구소는 창고 옆 빈방입니다."],
      ["boss", "충분하다. 조리법과 재료를 섞어 봐라. 뭔가 나온다."],
    ],
    goals: [
      { id: "c4-found", text: "새 레시피 3개 발견하기", prog: (s) => [researchFound(s), 3] },
      { id: "c4-fail", text: "실패작 5개 만들기", prog: (s) => [s.research.fails.length, 5] },
      { id: "c4-money", text: "누적 매출 3조원", prog: (s) => [s.earned, 3e12] },
    ],
    outro: [
      ["sec", "사장님, 감자탕에는 감자가 들어가지 않는다는 보고가 있습니다."],
      ["boss", "알고 있다. 그래도 판다."],
      ["sec", "왜 파십니까."],
      ["boss", "이름에 감자가 들어간다."],
    ],
  },
  {
    n: 5, title: "분점", reward: 150,
    unlock: ["branches"],
    intro: [
      ["sec", "사장님, 손님들이 줄을 너무 길게 섭니다. 옆 동네까지 줄이 이어졌습니다."],
      ["boss", "그럼 옆 동네에 가게를 하나 더 낸다."],
      ["sec", "줄이 반으로 줄겠습니다."],
      ["boss", "아니다. 줄이 두 개가 된다."],
    ],
    goals: [
      { id: "c5-branches", text: "분점 3개 운영하기 (본점 포함)", prog: (s) => [s.branches.length, 3] },
      { id: "c5-city", text: "감자시에 진출하기", prog: (s) => [s.branches.some((b) => b.region === "gamja-si") ? 1 : 0, 1] },
      { id: "c5-found", text: "레시피 6개 발견하기", prog: (s) => [researchFound(s), 6] },
      { id: "c5-money", text: "누적 매출 300조원", prog: (s) => [s.earned, 3e14] },
    ],
    outro: [
      ["sec", "사장님, 보라색 정장을 입은 사람이 건너편 건물을 샀습니다."],
      ["boss", "보라색이라."],
      ["sec", "네. 고구마 그룹이라고 합니다."],
      ["boss", "…드디어 왔군."],
    ],
  },
  {
    n: 6, title: "고구마의 습격", reward: 180,
    unlock: ["events", "orders", "rival"],
    intro: [
      ["goh", "박감자 사장. 오랜만이오."],
      ["boss", "처음 보는데요."],
      ["goh", "…그렇소. 처음이오. 아무튼 이 동네 탄수화물은 우리 고구마가 접수하겠소."],
      ["boss", "감자는 고구마가 아닙니다."],
      ["goh", "알고 있소."],
      ["sec", "사장님, 특별 주문과 이벤트로 손님을 되찾아야 합니다."],
    ],
    goals: [
      { id: "c6-rival", text: "고구마 그룹 점유율 10% 이하로", prog: (s) => [Math.max(0, 50 - s.rival.share), 40] },
      { id: "c6-orders", text: "특별 주문 3개 완료하기", prog: (s) => [s.stats.ordersDone, 3] },
      { id: "c6-lines", text: "전 분점 합쳐 라인 12개", prog: (s) => [totalLines(s), 12] },
      { id: "c6-money", text: "누적 매출 2천조원", prog: (s) => [s.earned, 2e15] },
    ],
    outro: [
      ["goh", "…오늘은 여기까지 하겠소."],
      ["boss", "내일도 오십니까."],
      ["goh", "내일은 쉬오."],
      ["sec", "사장님, 고회장이 나가면서 감자튀김을 사 갔습니다."],
    ],
  },
  {
    n: 7, title: "흙의 맛", reward: 210,
    unlock: ["farm", "market"],
    intro: [
      ["sec", "사장님, 감자 시세가 또 올랐습니다."],
      ["boss", "그럼 감자를 직접 키운다."],
      ["sec", "농사를 지어 보신 적이 있습니까."],
      ["boss", "없다. 감자도 처음엔 그랬을 거다."],
    ],
    goals: [
      { id: "c7-var", text: "감자 품종 5종 모으기", prog: (s) => [s.farm.varieties.length, 5] },
      { id: "c7-farm", text: "농장 Lv 5", prog: (s) => [s.farm.lv, 5] },
      { id: "c7-branches", text: "분점 6개 운영하기", prog: (s) => [s.branches.length, 6] },
      { id: "c7-money", text: "누적 매출 5경원", prog: (s) => [s.earned, 5e16] },
    ],
    outro: [
      ["sec", "사장님, 품종마다 맛이 다르다는 걸 손님들이 알아챘습니다."],
      ["boss", "다 감자 맛인데."],
      ["sec", "네. 그래도 다르다고 합니다."],
    ],
  },
  {
    n: 8, title: "전국구", reward: 240,
    unlock: ["cities", "prestige"],
    intro: [
      ["boss", "김비서. 전국에 감자를 판다."],
      ["sec", "전국에는 이미 감자가 있습니다."],
      ["boss", "우리 감자는 없다."],
      ["sec", "그리고 사장님, 회사를 팔고 다시 시작하면 '황금감자'를 받을 수 있다는 투자 제안이 왔습니다."],
      ["boss", "다시 시작하라고?"],
      ["sec", "네. 더 빠르게 다시 여기까지 오실 수 있습니다. 선택은 자유입니다."],
    ],
    goals: [
      { id: "c8-cities", text: "전국 5개 도시 진출", prog: (s) => [regionsWith(s, 2), 5] },
      { id: "c8-found", text: "레시피 12개 발견하기", prog: (s) => [researchFound(s), 12] },
      { id: "c8-money", text: "누적 매출 1해원", prog: (s) => [s.earned, 1e20] },
    ],
    outro: [
      ["sec", "사장님, 해외에서 연락이 왔습니다. 캐나다입니다."],
      ["boss", "캐나다에도 감자가 있나."],
      ["sec", "감자튀김에 소스를 부어 먹는다고 합니다."],
      ["boss", "…가 보자."],
    ],
  },
  {
    n: 9, title: "바다 건너 감자", reward: 270,
    unlock: ["overseas"],
    intro: [
      ["narr", "인천공항. 박감자 사장은 감자 한 알을 들고 출국 심사대에 섰다."],
      ["sec", "사장님, 생감자는 반입이 안 됩니다."],
      ["boss", "…쪄 오겠다."],
    ],
    goals: [
      { id: "c9-countries", text: "해외 3개국 진출", prog: (s) => [regionsWith(s, 3), 3] },
      { id: "c9-local", text: "현지 한정 메뉴 3개 판매", prog: (s) => [["poutine", "raclette", "bravas", "aloogobi"].filter((id) => sold(s, id) > 0).length, 3] },
      { id: "c9-money", text: "누적 매출 1천해원", prog: (s) => [s.earned, 1e23] },
    ],
    outro: [
      ["sec", "사장님, 세계 감자 협회에서 연락이 왔습니다."],
      ["boss", "그런 게 있었나."],
      ["sec", "어제 생겼습니다. 우리 때문에."],
    ],
  },
  {
    n: 10, title: "세계 감자의 날", reward: 300,
    unlock: ["expo"],
    intro: [
      ["sec", "세계 감자 협회가 '세계 감자의 날'을 지정하려 합니다. 조건은 감자 엑스포 개최입니다."],
      ["boss", "엑스포를 열자."],
      ["goh", "…나도 끼워 주시오."],
      ["boss", "고구마도 덩이줄기입니까."],
      ["goh", "아니오. 뿌리요."],
      ["boss", "…들어오십시오."],
    ],
    goals: [
      { id: "c10-expo", text: "감자 엑스포 5단계 완공", prog: (s) => [expoStage(s), 5] },
      { id: "c10-legend", text: "전설의 감자 발견하기", prog: (s) => [s.research.found.includes("legend") ? 1 : 0, 1] },
      { id: "c10-countries", text: "해외 6개국 진출", prog: (s) => [regionsWith(s, 3), 6] },
    ],
    outro: [
      ["narr", "세계 감자 엑스포 개막식."],
      ["boss", "감자는…"],
      ["boss", "…감자입니다."],
      ["narr", "박수가 쏟아졌다. 고회장도 조용히 박수를 쳤다."],
      ["sec", "사장님, 연설이 짧았습니다."],
      ["boss", "감자는 길게 말할 필요가 없다."],
      ["narr", "— 감자 주식회사 끝 —"],
      ["sec", "…사장님. 지도 끝에 처음 보는 땅이 보입니다."],
      ["boss", "거기에도 감자가 필요하겠군."],
    ],
  },
];

export const LAST_CHAPTER = CHAPTERS.length;

/** 챕터 n 이상에서 열리는 기능 */
export const FEATURE_CHAPTER: Record<Feature, number> = {} as any;
for (const c of CHAPTERS) for (const f of c.unlock) FEATURE_CHAPTER[f] = c.n;
FEATURE_CHAPTER.newmarkets = 11;

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
