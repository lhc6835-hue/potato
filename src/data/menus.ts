// 메뉴 데이터. 가격·조리시간·감자 소모량·스테이션 구성은 전부 여기서 정한다.

export type Category =
  | "basic" | "fried" | "mashed" | "pan" | "braised" | "salad" | "soup"
  | "pasta" | "oven" | "burger" | "dessert" | "premium" | "legend";

export const CATEGORY_NAME: Record<Category, string> = {
  basic: "기본", fried: "튀김", mashed: "으깸", pan: "부침", braised: "조림", salad: "샐러드",
  soup: "수프", pasta: "파스타", oven: "오븐", burger: "버거", dessert: "디저트", premium: "프리미엄", legend: "???",
};

/** 손질 스테이션 */
export type PrepKind = "wash" | "peel" | "cut" | "slice" | "spiral" | "mash" | "grate" | "shape";
/** 조리 스테이션 */
export type CookKind = "steam" | "fry" | "boil" | "pan" | "oven" | "freeze" | "pot";
/** 마무리 스테이션 */
export type FinishKind = "plate" | "box" | "cup" | "bowl" | "wrap";

export const PREP_NAME: Record<PrepKind, string> = {
  wash: "세척대", peel: "필러", cut: "칼질대", slice: "슬라이서", spiral: "회오리 커터", mash: "매셔", grate: "강판", shape: "성형대",
};
export const COOK_NAME: Record<CookKind, string> = {
  steam: "찜기", fry: "튀김기", boil: "솥", pan: "철판", oven: "오븐", freeze: "냉동고", pot: "냄비",
};
export const FINISH_NAME: Record<FinishKind, string> = {
  plate: "플레이팅", box: "포장대", cup: "컵 담기", bowl: "그릇 담기", wrap: "랩핑",
};

export interface MenuDef {
  id: string;
  name: string;
  cat: Category;
  /** 기본 판매가(원) */
  price: number;
  /** 한 배치 조리 시간(초) */
  cycle: number;
  /** 레벨 1에서 한 배치당 만드는 개수 */
  batch: number;
  /** 메뉴 1개당 감자 소모량 */
  potatoes: number;
  prep: PrepKind;
  cook: CookKind;
  finish: FinishKind;
  /** 기본 인기도 (손님이 고를 가중치) */
  pop: number;
  /** 해금 챕터 (연구 메뉴는 research: true) */
  chapter: number;
  research?: boolean;
  /** 해외 한정 메뉴의 국가 id */
  country?: string;
  /** 음식 스프라이트 색 [어두움, 중간, 밝음] */
  colors: [string, string, string];
  /** 도감 설명 (담백하게) */
  desc: string;
}

const M = (d: MenuDef) => d;

export const MENUS: MenuDef[] = [
  M({ id: "steamed", name: "찐감자", cat: "basic", price: 1000, cycle: 3, batch: 1, potatoes: 1, prep: "wash", cook: "steam", finish: "plate", pop: 1, chapter: 1,
    colors: ["#9a6b3a", "#d6a75c", "#f4d58d"], desc: "감자를 쪘다. 그게 전부다." }),
  M({ id: "fries", name: "감자튀김", cat: "fried", price: 3200, cycle: 4, batch: 1, potatoes: 1, prep: "cut", cook: "fry", finish: "box", pop: 1.6, chapter: 3,
    colors: ["#b7731f", "#e9b53f", "#ffe58a"], desc: "길게 잘라서 튀겼다. 인류가 이걸 왜 좋아하는지는 아무도 모른다." }),
  M({ id: "hashbrown", name: "해시브라운", cat: "fried", price: 9000, cycle: 5, batch: 1, potatoes: 2, prep: "grate", cook: "fry", finish: "wrap", pop: 1.1, chapter: 3,
    colors: ["#8f5a1e", "#cf9440", "#f2cd7a"], desc: "갈아서 뭉쳐서 튀겼다. 아침 메뉴인데 밤에도 팔린다." }),
  M({ id: "mashed", name: "매시드 포테이토", cat: "mashed", price: 24000, cycle: 6, batch: 1, potatoes: 2, prep: "mash", cook: "pot", finish: "bowl", pop: 1.2, chapter: 3,
    colors: ["#c9b27a", "#efe0b0", "#fff8e0"], desc: "으깼다. 감자의 형태를 포기했다." }),
  M({ id: "pancake", name: "감자전", cat: "pan", price: 62000, cycle: 7, batch: 1, potatoes: 3, prep: "grate", cook: "pan", finish: "plate", pop: 1.0, chapter: 3,
    colors: ["#8a5d22", "#d7a750", "#f6dc90"], desc: "비 오는 날 매출이 두 배다. 기상청과 협업을 검토 중이다." }),
  M({ id: "wedge", name: "웨지감자", cat: "fried", price: 160000, cycle: 7, batch: 1, potatoes: 2, prep: "cut", cook: "fry", finish: "box", pop: 1.3, chapter: 3,
    colors: ["#7d4a1a", "#c6873a", "#efc277"], desc: "감자튀김보다 두껍다. 그래서 더 비싸다." }),
  M({ id: "braised", name: "알감자조림", cat: "braised", price: 420000, cycle: 8, batch: 1, potatoes: 3, prep: "wash", cook: "pot", finish: "bowl", pop: 0.9, chapter: 4,
    colors: ["#4a2a14", "#8a5326", "#c98e4c"], desc: "간장에 졸였다. 반찬인지 메인인지 정하지 못했다." }),
  M({ id: "chips", name: "감자칩", cat: "fried", price: 1100000, cycle: 8, batch: 2, potatoes: 2, prep: "slice", cook: "fry", finish: "box", pop: 1.4, chapter: 4,
    colors: ["#b9852c", "#eac15a", "#fff0a0"], desc: "얇게 썰었다. 봉지에 질소를 넣을지 회의 중이다." }),
  M({ id: "tornado", name: "회오리감자", cat: "fried", price: 2900000, cycle: 9, batch: 1, potatoes: 2, prep: "spiral", cook: "fry", finish: "wrap", pop: 1.5, chapter: 4,
    colors: ["#a0641e", "#dda040", "#ffd77a"], desc: "돌렸다. 감자도 돌고 손님 눈도 돈다." }),
  M({ id: "croquette", name: "감자 고로케", cat: "fried", price: 7500000, cycle: 10, batch: 1, potatoes: 3, prep: "shape", cook: "fry", finish: "wrap", pop: 1.2, chapter: 5, research: true,
    colors: ["#6e3e14", "#b97630", "#e8b064"], desc: "으깨서 빵가루를 입혀 튀겼다. 감자를 두 번 괴롭혔다." }),
  M({ id: "salad", name: "감자 샐러드", cat: "salad", price: 19000000, cycle: 10, batch: 1, potatoes: 3, prep: "mash", cook: "boil", finish: "bowl", pop: 1.0, chapter: 5, research: true,
    colors: ["#c8b680", "#eee0aa", "#fffbe0"], desc: "샐러드라고 부르면 건강해 보인다." }),
  M({ id: "soup", name: "감자수프", cat: "soup", price: 48000000, cycle: 11, batch: 1, potatoes: 4, prep: "peel", cook: "pot", finish: "cup", pop: 1.0, chapter: 5, research: true,
    colors: ["#b7a46a", "#e6d79a", "#fff4c8"], desc: "마시는 감자. 숟가락 쓰는 사람과 안 쓰는 사람이 싸웠다." }),
  M({ id: "gamjatang", name: "감자탕", cat: "soup", price: 125000000, cycle: 12, batch: 1, potatoes: 0, prep: "cut", cook: "boil", finish: "bowl", pop: 1.3, chapter: 5, research: true,
    colors: ["#5e1a12", "#a8341e", "#e2703a"], desc: "감자가 들어가지 않는다. 감자 회사가 팔기에 가장 이상한 메뉴다." }),
  M({ id: "gnocchi", name: "뇨끼", cat: "pasta", price: 320000000, cycle: 12, batch: 2, potatoes: 3, prep: "shape", cook: "boil", finish: "plate", pop: 1.1, chapter: 6, research: true,
    colors: ["#b59a5a", "#e3cc8c", "#fff0bf"], desc: "이탈리아 사람이 감자로 만든 수제비." }),
  M({ id: "rosti", name: "로스티", cat: "pan", price: 820000000, cycle: 13, batch: 1, potatoes: 4, prep: "grate", cook: "pan", finish: "plate", pop: 1.0, chapter: 6, research: true,
    colors: ["#7a4818", "#c08236", "#eec27a"], desc: "스위스식 감자전. 감자전이라고 하면 스위스 사람이 화낸다." }),
  M({ id: "gratin", name: "감자 그라탕", cat: "oven", price: 2.1e9, cycle: 14, batch: 1, potatoes: 4, prep: "slice", cook: "oven", finish: "plate", pop: 1.2, chapter: 6, research: true,
    colors: ["#9c6a22", "#e0b050", "#fff0a8"], desc: "치즈를 올렸다. 치즈가 감자보다 비싸다." }),
  M({ id: "pizza", name: "포테이토 피자", cat: "oven", price: 5.4e9, cycle: 15, batch: 1, potatoes: 5, prep: "slice", cook: "oven", finish: "box", pop: 1.4, chapter: 6, research: true,
    colors: ["#9a3a1a", "#e09a3a", "#ffe08a"], desc: "피자 위에 감자. 탄수화물 위에 탄수화물." }),
  M({ id: "burger", name: "감자 크로켓 버거", cat: "burger", price: 1.4e10, cycle: 16, batch: 1, potatoes: 4, prep: "shape", cook: "fry", finish: "wrap", pop: 1.5, chapter: 7, research: true,
    colors: ["#7a3e14", "#cf8a3a", "#f6d07a"], desc: "고로케를 빵 사이에 넣었다. 아무도 말리지 않았다." }),
  M({ id: "cheeseball", name: "치즈볼 감자", cat: "fried", price: 3.6e10, cycle: 16, batch: 2, potatoes: 3, prep: "shape", cook: "fry", finish: "cup", pop: 1.3, chapter: 7, research: true,
    colors: ["#a86a1c", "#eab04a", "#fff2b0"], desc: "안에 치즈가 들어 있다. 뜨겁다고 경고문을 붙였다." }),
  M({ id: "poutine", name: "푸틴", cat: "fried", price: 9.5e10, cycle: 17, batch: 1, potatoes: 4, prep: "cut", cook: "fry", finish: "bowl", pop: 1.3, chapter: 8, country: "ca",
    colors: ["#5a3214", "#a8682a", "#f0d090"], desc: "감자튀김에 그레이비를 부었다. 캐나다의 자존심이다." }),
  M({ id: "raclette", name: "라클렛", cat: "oven", price: 2.5e11, cycle: 18, batch: 1, potatoes: 4, prep: "wash", cook: "oven", finish: "plate", pop: 1.1, chapter: 8, country: "ch",
    colors: ["#a07a2a", "#f0c050", "#fff4b0"], desc: "녹인 치즈를 긁어서 감자에 얹는다. 긁는 소리가 중요하다." }),
  M({ id: "bravas", name: "파타타스 브라바스", cat: "fried", price: 6.6e11, cycle: 18, batch: 1, potatoes: 4, prep: "cut", cook: "fry", finish: "plate", pop: 1.2, chapter: 8, country: "es",
    colors: ["#8a2a12", "#d0602a", "#f6b070"], desc: "매운 소스를 뿌렸다. 이름이 '용감한 감자'다. 감자는 용감하지 않다." }),
  M({ id: "aloogobi", name: "알루 고비", cat: "braised", price: 1.7e12, cycle: 19, batch: 1, potatoes: 4, prep: "cut", cook: "pot", finish: "bowl", pop: 1.1, chapter: 8, country: "in",
    colors: ["#8a5a10", "#d8a020", "#ffe070"], desc: "감자와 콜리플라워 커리. 콜리플라워가 자기 지분을 주장한다." }),
  M({ id: "vichyssoise", name: "비시수아즈", cat: "soup", price: 4.5e12, cycle: 20, batch: 1, potatoes: 5, prep: "peel", cook: "freeze", finish: "cup", pop: 1.0, chapter: 9, research: true,
    colors: ["#b8b090", "#e8e2c4", "#ffffff"], desc: "차가운 감자수프. 식은 게 아니라 원래 차갑다." }),
  M({ id: "truffle", name: "트러플 퓨레", cat: "mashed", price: 1.2e13, cycle: 22, batch: 1, potatoes: 5, prep: "mash", cook: "pot", finish: "plate", pop: 0.9, chapter: 9, research: true,
    colors: ["#4a3a28", "#c8b48a", "#fff4d8"], desc: "트러플을 넣었다. 가격표에서 0을 세다가 손님이 포기했다." }),
  M({ id: "icecream", name: "감자 아이스크림", cat: "dessert", price: 3.2e13, cycle: 22, batch: 2, potatoes: 3, prep: "mash", cook: "freeze", finish: "cup", pop: 1.4, chapter: 9, research: true,
    colors: ["#a89060", "#efe2b8", "#ffffff"], desc: "맛이 궁금해서 산다. 다 먹고 나서도 궁금하다." }),
  M({ id: "cake", name: "감자 케이크", cat: "dessert", price: 8.5e13, cycle: 24, batch: 1, potatoes: 6, prep: "shape", cook: "oven", finish: "box", pop: 1.2, chapter: 10, research: true,
    colors: ["#8a5a2a", "#e8c080", "#fff4e0"], desc: "감자 모양 케이크가 아니다. 감자로 만든 케이크다. 둘 다 있다." }),
  M({ id: "bread", name: "감자 빵", cat: "dessert", price: 2.3e14, cycle: 24, batch: 2, potatoes: 4, prep: "shape", cook: "oven", finish: "wrap", pop: 1.5, chapter: 10, research: true,
    colors: ["#7a5a3a", "#c0a080", "#eedcc0"], desc: "진짜 감자처럼 생긴 빵. 손님이 가끔 껍질을 벗기려 한다." }),
  M({ id: "course", name: "감자 코스요리", cat: "premium", price: 6.0e14, cycle: 30, batch: 1, potatoes: 10, prep: "peel", cook: "oven", finish: "plate", pop: 1.0, chapter: 11, research: true,
    colors: ["#5a4a6a", "#b8a0c8", "#f0e8ff"], desc: "에피타이저부터 디저트까지 전부 감자. 물도 감자차다." }),
  M({ id: "legend", name: "전설의 감자", cat: "legend", price: 2.0e15, cycle: 40, batch: 1, potatoes: 1, prep: "wash", cook: "steam", finish: "plate", pop: 2.0, chapter: 11, research: true,
    colors: ["#a07010", "#f0c030", "#fffbd0"], desc: "처음 만든 찐감자와 똑같은 레시피다. 그런데 왜인지 다르다." }),
];

export const MENU: Record<string, MenuDef> = Object.fromEntries(MENUS.map((m) => [m.id, m]));
export const menuIndex = (id: string) => MENUS.findIndex((m) => m.id === id);
