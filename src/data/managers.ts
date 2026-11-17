// 매니저: 이름, 등급, 특성. 후보는 결정적으로 생성된다 (뽑기 확률 없음, 3명 중 고르기).

import type { Category } from "./menus";

export type Rarity = 0 | 1 | 2 | 3;
export const RARITY_NAME = ["일반", "숙련", "장인", "전설"];
export const RARITY_COLOR = ["#b8b0a4", "#7fc0e8", "#e8b84a", "#e87a5a"];

export type SlotKind = "line" | "lift" | "counter";

export interface TraitDef {
  id: string;
  name: string;
  desc: string;
  /** 붙을 수 있는 자리 (없으면 어디든) */
  slot?: SlotKind;
  /** 라인 속도 배수 */
  speed?: number;
  /** 특정 카테고리 라인일 때만 speed 적용 */
  cat?: Category;
  /** 판매가 배수 (카운터) */
  price?: number;
  /** 운반량 배수 (덤웨이터) */
  carry?: number;
  /** 카운터 처리량 배수 */
  serve?: number;
  /** 점심/저녁 러시 때만 */
  rush?: number;
  /** 밤에는 */
  night?: number;
  /** 명성 회복 */
  fame?: number;
}

export const TRAITS: TraitDef[] = [
  { id: "quiet", name: "말이 없다", desc: "효과 없음. 그냥 말이 없다." },
  { id: "knife", name: "칼질 장인", desc: "라인 속도 +30%", slot: "line", speed: 1.3 },
  { id: "oil", name: "기름 냄새를 좋아함", desc: "튀김 라인 속도 +50%", slot: "line", speed: 1.5, cat: "fried" },
  { id: "masher", name: "팔힘이 세다", desc: "으깸 라인 속도 +60%", slot: "line", speed: 1.6, cat: "mashed" },
  { id: "soupy", name: "국물에 진심", desc: "수프 라인 속도 +60%", slot: "line", speed: 1.6, cat: "soup" },
  { id: "baker", name: "오븐 앞에서 평온함", desc: "오븐 라인 속도 +60%", slot: "line", speed: 1.6, cat: "oven" },
  { id: "pan", name: "뒤집기 달인", desc: "부침 라인 속도 +60%", slot: "line", speed: 1.6, cat: "pan" },
  { id: "sweet", name: "단 걸 좋아함", desc: "디저트 라인 속도 +60%", slot: "line", speed: 1.6, cat: "dessert" },
  { id: "goguma", name: "고구마 그룹 출신", desc: "속도 +40%, 가끔 고구마를 섞는다 (판매가 -5%)", speed: 1.4, price: 0.95 },
  { id: "morning", name: "아침형 인간", desc: "러시 때 +50%, 밤에는 -30%", rush: 1.5, night: 0.7 },
  { id: "night", name: "올빼미", desc: "밤에 +60%", night: 1.6 },
  { id: "strong", name: "어깨가 넓다", desc: "덤웨이터 운반량 +40%", slot: "lift", carry: 1.4 },
  { id: "tetris", name: "테트리스 고수", desc: "덤웨이터 운반량 +70%", slot: "lift", carry: 1.7 },
  { id: "smile", name: "웃는 연습 중", desc: "카운터 처리량 +30%. 아직 연습 중이다.", slot: "counter", serve: 1.3 },
  { id: "salesman", name: "말을 잘한다", desc: "판매가 +12%", slot: "counter", price: 1.12 },
  { id: "polite", name: "인사를 두 번 한다", desc: "명성 회복 빠름", slot: "counter", fame: 1.6 },
  { id: "fast", name: "걸음이 빠르다", desc: "효율 +25%", speed: 1.25, carry: 1.25, serve: 1.25 },
  { id: "potatohead", name: "머리가 감자를 닮음", desc: "효율 +15%. 사장님이 좋아한다.", speed: 1.15, carry: 1.15, serve: 1.15 },
  { id: "philosopher", name: "철학적이다", desc: "효율 +10%. 감자의 본질에 대해 자주 말한다.", speed: 1.1, carry: 1.1, serve: 1.1 },
  { id: "overtime", name: "야근을 즐긴다", desc: "효율 +35%. 걱정된다.", speed: 1.35, carry: 1.35, serve: 1.35 },
];
export const TRAIT: Record<string, TraitDef> = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

const FAMILY = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "유", "홍"];
const GIVEN = ["감수", "튀김", "알찬", "보슬", "포근", "단단", "말랑", "누리", "한결", "도담", "바삭", "고소", "든든", "슬기", "노릇", "포실", "초롱", "새봄", "우직", "담백",
  "정직", "성실", "무던", "덤덤", "차분", "묵묵", "가람", "다솜", "해솔", "나래"];

export interface ManagerData {
  id: number;
  name: string;
  rarity: Rarity;
  /** 기본 효율 배수 */
  power: number;
  traits: string[];
  /** 외형 시드 (스프라이트 색 조합) */
  look: number;
}

function hash(n: number) {
  let x = (n * 2654435761 + 1013904223) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; x = Math.imul(x, 3266489917) >>> 0; x ^= x >>> 16;
  return x >>> 0;
}

/** 헤드헌팅 후보: seed와 레벨(명성 단계)로 결정. */
export function makeCandidate(seed: number, tier: number): ManagerData {
  const h = hash(seed);
  const roll = (h % 1000) / 1000;
  // tier가 오를수록 좋은 등급 확률 증가
  const t = Math.min(tier, 10);
  const rarity: Rarity = roll < 0.02 + t * 0.012 ? 3 : roll < 0.12 + t * 0.03 ? 2 : roll < 0.4 + t * 0.03 ? 1 : 0;
  const nTraits = rarity >= 2 ? 2 : 1;
  const traits: string[] = [];
  for (let i = 0; traits.length < nTraits && i < 10; i++) {
    const tr = TRAITS[hash(h + i * 31) % TRAITS.length].id;
    if (!traits.includes(tr)) traits.push(tr);
  }
  const name = FAMILY[(h >>> 5) % FAMILY.length] + GIVEN[(h >>> 11) % GIVEN.length];
  const power = [1.5, 2, 3, 5][rarity] * (1 + ((h >>> 20) % 20) / 100);
  return { id: seed, name, rarity, power, traits, look: h };
}

export function traitsOf(m: ManagerData) {
  return m.traits.map((t) => TRAIT[t]).filter(Boolean);
}
