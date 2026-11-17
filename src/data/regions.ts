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
  home: { name: "본점", desc: "모든 것이 시작된 곳. 특별한 건 없다.", traffic: 1, price: 1, elastic: 1, lunch: 1, dinner: 1, likes: [], rent: 1 },
  campus: { name: "대학가", desc: "싸면 많이 팔린다. 비싸면 안 팔린다. 정직하다.", traffic: 1.4, price: 0.85, elastic: 1.8, lunch: 1.2, dinner: 1.3, likes: ["fried", "basic"], rent: 0.8 },
  office: { name: "오피스", desc: "점심에 전쟁이 난다. 저녁엔 다들 퇴근했다.", traffic: 1.0, price: 1.1, elastic: 1.0, lunch: 2.2, dinner: 0.6, likes: ["soup", "burger", "salad"], rent: 1.3 },
  tourist: { name: "관광지", desc: "비싸도 산다. 사진 찍고 나서 먹는다.", traffic: 1.1, price: 1.5, elastic: 0.5, lunch: 1.2, dinner: 1.2, likes: ["fried", "dessert", "premium"], rent: 1.6 },
  residential: { name: "주택가", desc: "단골이 많다. 단골은 말이 많다.", traffic: 0.9, price: 1.0, elastic: 1.0, lunch: 1.0, dinner: 1.6, likes: ["braised", "soup", "pan"], rent: 0.9 },
  station: { name: "역세권", desc: "손님이 많고 빠르게 지나간다. 앉을 생각이 없다.", traffic: 1.7, price: 0.95, elastic: 1.2, lunch: 1.4, dinner: 1.4, likes: ["fried", "burger", "basic"], rent: 1.4 },
  airport: { name: "공항", desc: "모든 게 비싸다. 손님도 그걸 안다.", traffic: 1.2, price: 1.8, elastic: 0.3, lunch: 1.1, dinner: 1.1, likes: ["premium", "oven", "mashed"], rent: 2.5 },
  market: { name: "전통시장", desc: "부침개 냄새에 이끌려 온다. 흥정을 시도한다.", traffic: 1.3, price: 0.9, elastic: 1.3, lunch: 1.3, dinner: 1.1, likes: ["pan", "braised", "basic"], rent: 0.9 },
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
  { id: "gamja-dong", name: "감자동", tier: 0, mult: 1, chapter: 1, slots: ["home", "residential", "market"], desc: "감자처럼 생긴 동네. 위에서 보면 진짜 감자 모양이다." },
  { id: "gamja-si", name: "감자시", tier: 1, mult: 8, chapter: 5, slots: ["campus", "office", "station", "tourist", "residential", "market"], desc: "감자동이 속한 도시. 시청 앞에 감자 동상이 있다. 우리가 세운 게 아니다." },
  { id: "seoul", name: "서울", tier: 2, mult: 120, chapter: 8, slots: ["office", "station", "campus", "tourist", "airport", "residential"], likes: ["burger", "dessert"], desc: "모든 게 빠르다. 감자튀김도 빨리 식는다." },
  { id: "busan", name: "부산", tier: 2, mult: 260, chapter: 8, slots: ["tourist", "market", "station", "residential", "office"], likes: ["soup", "pan"], desc: "바다가 보이는 감자집. 손님들이 감자를 회처럼 먹을 수 있냐고 묻는다." },
  { id: "gangwon", name: "강원", tier: 2, mult: 560, chapter: 8, slots: ["tourist", "market", "residential", "home"], likes: ["basic", "pan", "braised"], desc: "감자의 고향. 여기서 감자를 파는 건 일종의 도전이다." },
  { id: "daegu", name: "대구", tier: 2, mult: 1200, chapter: 8, slots: ["campus", "market", "office", "station", "residential"], likes: ["fried", "braised"], desc: "덥다. 감자 아이스크림 반응이 좋다." },
  { id: "jeju", name: "제주", tier: 2, mult: 2600, chapter: 8, slots: ["tourist", "airport", "residential", "market"], likes: ["dessert", "premium"], desc: "관광객이 감자 모양 기념품을 산다. 우리 것이 아니다." },
  { id: "ca", name: "캐나다", tier: 3, mult: 9e3, chapter: 9, localMenu: "poutine", flag: "🇨🇦", slots: ["station", "tourist", "residential", "campus"], likes: ["fried", "soup"], desc: "푸틴의 나라. 감자튀김에 소스를 부어야 예의다." },
  { id: "ch", name: "스위스", tier: 3, mult: 3e4, chapter: 9, localMenu: "raclette", flag: "🇨🇭", slots: ["tourist", "airport", "residential"], likes: ["oven", "premium", "pan"], desc: "치즈와 감자, 그리고 시계. 배달이 1초도 늦지 않는다." },
  { id: "es", name: "스페인", tier: 3, mult: 1e5, chapter: 9, localMenu: "bravas", flag: "🇪🇸", slots: ["tourist", "market", "station", "residential"], likes: ["fried", "pan"], desc: "저녁을 밤 10시에 먹는다. 저녁 러시가 늦게 온다." },
  { id: "in", name: "인도", tier: 3, mult: 3.4e5, chapter: 9, localMenu: "aloogobi", flag: "🇮🇳", slots: ["market", "station", "campus", "residential", "office"], likes: ["braised", "soup"], desc: "감자를 알루라고 부른다. 우리 회사는 이제 알루 주식회사다." },
  { id: "us", name: "미국", tier: 3, mult: 1.2e6, chapter: 10, flag: "🇺🇸", slots: ["airport", "office", "station", "tourist", "campus"], likes: ["fried", "burger", "mashed"], desc: "모든 사이즈가 라지다. 스몰을 시키면 라지가 나온다." },
  { id: "fr", name: "프랑스", tier: 3, mult: 4e6, chapter: 10, flag: "🇫🇷", slots: ["tourist", "residential", "market", "office"], likes: ["soup", "mashed", "premium"], desc: "프렌치 프라이가 프랑스 음식이냐고 물었다가 혼났다." },
  { id: "pe", name: "페루", tier: 3, mult: 1.4e7, chapter: 10, flag: "🇵🇪", slots: ["market", "tourist", "residential"], likes: ["basic", "braised", "salad"], desc: "감자 품종이 4천 종인 나라. 우리 품종 도감이 부끄럽다." },
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
  const desc = base === "달" ? "중력이 약해서 감자튀김이 떠다닌다. 손님은 그걸 잡아서 먹는다."
    : base === "화성" ? "감자를 키울 수 있다는 걸 영화에서 봤다. 진짜였다."
    : base === "해저도시" ? "튀김기 사용 허가를 받는 데 3년 걸렸다."
    : base === "구름섬" ? "배달은 낙하산으로 한다. 반품은 받지 않는다."
    : "지도에 없던 곳. 감자 수요는 있다. 언제나 있다.";
  return { id: `nm-${n}`, name, tier: 4, mult: 5e7 * Math.pow(4, n), chapter: 11, slots, likes, flag: "🌐", desc };
}

export function regionById(id: string): RegionDef {
  if (id.startsWith("nm-")) return newMarket(parseInt(id.slice(3), 10));
  return REGION[id];
}
