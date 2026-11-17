// 게임 전체 상태. 이 객체 하나가 그대로 저장된다.

import type { DistrictKind } from "../data/regions";
import type { ManagerData, SlotKind } from "../data/managers";

export interface LineState {
  menu: string;
  /** [손질, 조리, 마무리] 레벨 */
  lv: [number, number, number];
  manager: number | null;
  /** 현재 배치 진행도 0..1 */
  progress: number;
  cooking: boolean;
  /** 이번 배치에서 나올 개수 */
  batchOut: number;
  /** 완성품 트레이 */
  tray: number;
  /** 누적 생산 */
  made: number;
  /** 알바생이 돌리는 중 (느림) */
  auto?: boolean;
}

export interface BranchState {
  id: string;
  region: string;
  slot: number;
  district: DistrictKind;
  lines: LineState[];
  /** 지을 수 있는 최대 라인(층) 수 */
  maxLines: number;
  lift: { lv: number; manager: number | null; t: number; moving: boolean; load: Record<string, number>; call: boolean };
  counter: { lv: number; manager: number | null };
  supply: { lv: number };
  storage: number;
  stock: Record<string, number>;
  /** 가격 배수 0.6 ~ 2.0 */
  priceMult: number;
  /** 별점 1..5 */
  rating: number;
  /** 최근 초당 수입 (지수 평균) */
  income: number;
  /** 판매 누적 */
  sold: number;
  revenue: number;
  /** 이번 프레임 판매 (연출용, 저장 안 함) */
  _salePulse?: number;
  _unmet?: number;
  _demand?: number;
}

export interface HiredManager {
  data: ManagerData;
  /** 배치 위치 */
  at: { branch: string; slot: SlotKind; line: number } | null;
}

export interface EventState {
  id: string;
  /** 남은 시간 */
  left: number;
  /** 지속 시간 */
  dur: number;
  branch?: string;
  data?: any;
}

export interface GameState {
  v: number;
  money: number;
  /** 이번 회차 누적 매출 */
  earned: number;
  /** 모든 회차 누적 매출 */
  earnedAll: number;
  /** 게임 내 시간(초). 1시간 = 20초 */
  clock: number;
  /** 실제 플레이 시간(초) */
  played: number;
  chapter: number;
  goals: Record<string, boolean>;
  /** 대화 본 기록 */
  seen: Record<string, boolean>;
  branches: BranchState[];
  active: number;
  managers: HiredManager[];
  hires: number;
  candSeed: number;
  candidates: ManagerData[];
  /** 레시피 연구 */
  research: { ideas: number; found: string[]; fails: string[]; tries: number };
  /** 해금된 메뉴 */
  menus: string[];
  /** 메뉴별 판매 누적 */
  soldBy: Record<string, number>;
  achievements: string[];
  /** 회차 */
  prestige: { golden: number; spent: number; reboots: number; patents: Record<string, number>; rules: string[]; best: number };
  market: { price: number; trend: number; history: number[]; bank: number };
  expo: { stage: number };
  farm: { lv: number; varieties: string[]; active: string };
  events: EventState[];
  eventTimer: number;
  /** 고구마 그룹 */
  rival: { share: number; defeated: boolean };
  seenCustomers: string[];
  reviews: string[];
  ended: boolean;
  newMarkets: number;
  bestMarket: number;
  settings: { sound: boolean; vibrate: boolean; buyMode: 1 | 10 | 0 };
  lastSave: number;
  lastTick: number;
  /** 특별 주문 */
  order: { menu: string; need: number; got: number; left: number; reward: number; branch: string } | null;
  orderTimer: number;
  stats: { taps: number; lifts: number; customers: number; ordersDone: number; criticBest: number; maxIncome: number };
}

export function newBranch(id: string, region: string, slot: number, district: DistrictKind, firstMenu: string | null): BranchState {
  return {
    id, region, slot, district,
    lines: firstMenu ? [newLine(firstMenu)] : [],
    maxLines: 3,
    lift: { lv: 1, manager: null, t: 0, moving: false, load: {}, call: false },
    counter: { lv: 1, manager: null },
    supply: { lv: 1 },
    storage: 30,
    stock: {},
    priceMult: 1,
    rating: 3.5,
    income: 0,
    sold: 0,
    revenue: 0,
  };
}

export function newLine(menu: string, lv = 1): LineState {
  return { menu, lv: [lv, lv, lv], manager: null, progress: 0, cooking: false, batchOut: 0, tray: 0, made: 0 };
}

export function newGame(): GameState {
  return {
    v: 1,
    money: 0,
    earned: 0,
    earnedAll: 0,
    clock: 9 * 20,
    played: 0,
    chapter: 1,
    goals: {},
    seen: {},
    branches: [newBranch("b0", "gamja-dong", 0, "home", "steamed")],
    active: 0,
    managers: [],
    hires: 0,
    candSeed: 1000,
    candidates: [],
    research: { ideas: 0, found: [], fails: [], tries: 0 },
    menus: ["steamed"],
    soldBy: {},
    achievements: [],
    prestige: { golden: 0, spent: 0, reboots: 0, patents: {}, rules: [], best: 0 },
    market: { price: 1, trend: 0, history: [], bank: 0 },
    expo: { stage: 0 },
    farm: { lv: 0, varieties: ["sumi"], active: "sumi" },
    events: [],
    eventTimer: 90,
    rival: { share: 0, defeated: false },
    seenCustomers: [],
    reviews: [],
    ended: false,
    newMarkets: 0,
    bestMarket: 0,
    settings: { sound: true, vibrate: true, buyMode: 1 },
    lastSave: Date.now(),
    lastTick: Date.now(),
    order: null,
    orderTimer: 240,
    stats: { taps: 0, lifts: 0, customers: 0, ordersDone: 0, criticBest: 0, maxIncome: 0 },
  };
}
