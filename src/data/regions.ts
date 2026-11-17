// 지역(동네 → 도시 → 전국 → 해외 → 신시장)과 상권 특성.

import type { Category } from "./menus";

export type DistrictKind = "home" | "campus" | "office" | "tourist" | "residential" | "station" | "airport" | "market";

export interface DistrictDef {
  name: string;
  desc: string;
  /** 손님 흐름 배수 */
  traffic: number;
  /** 판매가 배수 */
  price: number;
  /** 가격 민감도 (높을수록 비싸면 손님이 확 줄어든다) */
  elastic: number;
  /** 점심 러시 강도, 저녁 러시 강도 */
  lunch: number;
  dinner: number;
  /** 선호 카테고리 (+30%) */
  likes: Category[];
  /** 임대료 배수 (개점 비용) */
  rent: number;
}

export const DISTRICTS: Record<DistrictKind, DistrictDef> = {
  home: { name: "본점", desc: "처음 문을 연 가게.", traffic: 1, price: 1, elastic: 1, lunch: 1, dinner: 1, likes: [], rent: 1 },
  campus: { name: "대학가", desc: "손님이 많고 가격에 민감하다.", traffic: 1.4, price: 0.85, elastic: 1.8, lunch: 1.2, dinner: 1.3, likes: ["fried", "basic"], rent: 0.8 },
  office: { name: "오피스", desc: "점심에 손님이 몰리고 저녁엔 한산하다.", traffic: 1.0, price: 1.1, elastic: 1.0, lunch: 2.2, dinner: 0.6, likes: ["soup", "burger", "salad"], rent: 1.3 },
  tourist: { name: "관광지", desc: "비싸도 잘 팔린다.", traffic: 1.1, price: 1.5, elastic: 0.5, lunch: 1.2, dinner: 1.2, likes: ["fried", "dessert", "premium"], rent: 1.6 },
  residential: { name: "주택가", desc: "단골이 많고 저녁 손님이 많다.", traffic: 0.9, price: 1.0, elastic: 1.0, lunch: 1.0, dinner: 1.6, likes: ["braised", "soup", "pan"], rent: 0.9 },
  station: { name: "역세권", desc: "유동 인구가 많다.", traffic: 1.7, price: 0.95, elastic: 1.2, lunch: 1.4, dinner: 1.4, likes: ["fried", "burger", "basic"], rent: 1.4 },
  airport: { name: "공항", desc: "가격을 높게 받아도 손님이 줄지 않는다. 임대료가 비싸다.", traffic: 1.2, price: 1.8, elastic: 0.3, lunch: 1.1, dinner: 1.1, likes: ["premium", "oven", "mashed"], rent: 2.5 },
  market: { name: "전통시장", desc: "부침과 조림이 잘 팔린다.", traffic: 1.3, price: 0.9, elastic: 1.3, lunch: 1.3, dinner: 1.1, likes: ["pan", "braised", "basic"], rent: 0.9 },
};

export interface RegionDef {
  id: string;
  name: string;
  /** 지도에서 묶이는 단계: 0 동네, 1 도시, 2 전국, 3 해외 */
  tier: number;
  /** 매출·비용 배수 */
  mult: number;
  /** 해금 챕터 */
  chapter: number;
  slots: DistrictKind[];
  /** 해외 국가: 현지 한정 메뉴 */
  localMenu?: string;
  /** 지역 선호 카테고리 */
  likes?: Category[];
  flag?: string;
  desc: string;
}

export const REGIONS: RegionDef[] = [
  { id: "gamja-dong", name: "감자동", tier: 0, mult: 1, chapter: 1, slots: ["home", "residential", "market"], desc: "첫 가게가 있는 동네." },
  { id: "gamja-si", name: "감자시", tier: 1, mult: 8, chapter: 6, slots: ["campus", "office", "station", "tourist", "residential", "market"], desc: "감자동이 속한 도시. 상권이 다양하다." },
  { id: "seoul", name: "서울", tier: 2, mult: 120, chapter: 9, slots: ["office", "station", "campus", "tourist", "airport", "residential"], likes: ["burger", "dessert"], desc: "가장 큰 시장. 버거와 디저트가 인기다." },
  { id: "busan", name: "부산", tier: 2, mult: 260, chapter: 9, slots: ["tourist", "market", "station", "residential", "office"], likes: ["soup", "pan"], desc: "관광객이 많다. 수프와 부침이 인기다." },
  { id: "gangwon", name: "강원", tier: 2, mult: 560, chapter: 9, slots: ["tourist", "market", "residential", "home"], likes: ["basic", "pan", "braised"], desc: "감자 산지. 기본 메뉴와 부침, 조림이 인기다." },
  { id: "daegu", name: "대구", tier: 2, mult: 1200, chapter: 9, slots: ["campus", "market", "office", "station", "residential"], likes: ["fried", "braised"], desc: "튀김과 조림이 인기다." },
  { id: "jeju", name: "제주", tier: 2, mult: 2600, chapter: 9, slots: ["tourist", "airport", "residential", "market"], likes: ["dessert", "premium"], desc: "관광객이 많다. 디저트와 프리미엄 메뉴가 인기다." },
  { id: "ca", name: "캐나다", tier: 3, mult: 9e3, chapter: 10, localMenu: "poutine", flag: "🇨🇦", slots: ["station", "tourist", "residential", "campus"], likes: ["fried", "soup"], desc: "푸틴의 나라. 튀김과 수프가 인기다." },
  { id: "ch", name: "스위스", tier: 3, mult: 3e4, chapter: 10, localMenu: "raclette", flag: "🇨🇭", slots: ["tourist", "airport", "residential"], likes: ["oven", "premium", "pan"], desc: "라클렛의 나라. 오븐 요리가 인기다." },
  { id: "es", name: "스페인", tier: 3, mult: 1e5, chapter: 10, localMenu: "bravas", flag: "🇪🇸", slots: ["tourist", "market", "station", "residential"], likes: ["fried", "pan"], desc: "파타타스 브라바스의 나라. 튀김과 부침이 인기다." },
  { id: "in", name: "인도", tier: 3, mult: 3.4e5, chapter: 10, localMenu: "aloogobi", flag: "🇮🇳", slots: ["market", "station", "campus", "residential", "office"], likes: ["braised", "soup"], desc: "알루 고비의 나라. 조림과 수프가 인기다." },
  { id: "us", name: "미국", tier: 3, mult: 1.2e6, chapter: 11, flag: "🇺🇸", slots: ["airport", "office", "station", "tourist", "campus"], likes: ["fried", "burger", "mashed"], desc: "큰 시장. 튀김, 버거, 으깸이 인기다." },
  { id: "fr", name: "프랑스", tier: 3, mult: 4e6, chapter: 11, flag: "🇫🇷", slots: ["tourist", "residential", "market", "office"], likes: ["soup", "mashed", "premium"], desc: "수프와 으깸, 프리미엄 메뉴가 인기다." },
  { id: "pe", name: "페루", tier: 3, mult: 1.4e7, chapter: 11, flag: "🇵🇪", slots: ["market", "tourist", "residential"], likes: ["basic", "braised", "salad"], desc: "감자의 원산지. 기본 메뉴와 샐러드가 인기다." },
];

export const REGION: Record<string, RegionDef> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

// ---- 신시장 (엔딩 후 무한 생성)

const NM_PREFIX = ["뉴", "노스", "사우스", "그레이트", "리틀", "어퍼", "로어", "센트럴", "오래된", "새로운"];
const NM_BASE = ["포테이토니아", "타토랜드", "스푸드섬", "튜버리아", "알루스탄", "파파공화국", "감자대륙", "덩이줄기만", "녹말연방", "껍질왕국", "달", "화성", "해저도시", "구름섬"];
const NM_KINDS: DistrictKind[] = ["campus", "office", "tourist", "residential", "station", "airport", "market"];
const ALL_CATS: Category[] = ["basic", "fried", "mashed", "pan", "braised", "salad", "soup", "pasta", "oven", "burger", "dessert", "premium"];

function hash(n: number) {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13; x = Math.imul(x, 3266489909) >>> 0; x ^= x >>> 16;
  return x >>> 0;
}

/** n번째 신시장 (0부터). 결정적으로 만들어진다. */
export function newMarket(n: number): RegionDef {
  const h = hash(n + 77);
  const base = NM_BASE[h % NM_BASE.length];
  const name = (base === "달" || base === "화성" ? "" : NM_PREFIX[(h >>> 8) % NM_PREFIX.length] + " ") + base + (n >= NM_BASE.length ? ` ${Math.floor(n / NM_BASE.length) + 1}` : "");
  const count = 3 + ((h >>> 12) % 3);
  const slots: DistrictKind[] = [];
  for (let i = 0; i < count; i++) slots.push(NM_KINDS[hash(h + i) % NM_KINDS.length]);
  const likes = [ALL_CATS[(h >>> 4) % ALL_CATS.length], ALL_CATS[(h >>> 10) % ALL_CATS.length]];
  const desc = "새로 열린 시장. 갈수록 규모가 커진다.";
  return { id: `nm-${n}`, name, tier: 4, mult: 5e7 * Math.pow(4, n), chapter: 12, slots, likes, flag: "🌐", desc };
}

export function regionById(id: string): RegionDef {
  if (id.startsWith("nm-")) return newMarket(parseInt(id.slice(3), 10));
  return REGION[id];
}
