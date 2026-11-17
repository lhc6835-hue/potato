// 연구소: 조리법 + 곁들임 (+ 품종) 조합으로 새 메뉴를 발견한다.

export const METHODS = [
  { id: "fry", name: "튀기기" }, { id: "boil", name: "삶기" }, { id: "bake", name: "굽기" }, { id: "mash", name: "으깨기" },
  { id: "pan", name: "부치기" }, { id: "freeze", name: "얼리기" }, { id: "braise", name: "졸이기" }, { id: "shape", name: "빚기" },
  { id: "steam", name: "찌기" },
] as const;

export const TOPPINGS = [
  { id: "none", name: "아무것도 안 넣음" }, { id: "crumb", name: "빵가루" }, { id: "mayo", name: "마요네즈" }, { id: "cream", name: "크림" },
  { id: "cheese", name: "치즈" }, { id: "tomato", name: "토마토" }, { id: "bun", name: "햄버거 빵" }, { id: "sugar", name: "설탕" },
  { id: "truffle", name: "트러플" }, { id: "bone", name: "돼지뼈" }, { id: "butter", name: "버터" },
] as const;

export type MethodId = (typeof METHODS)[number]["id"];
export type ToppingId = (typeof TOPPINGS)[number]["id"];

/** 정답 조합 → 메뉴 id. variety가 있으면 그 품종이 활성일 때만 */
export const RECIPES: { menu: string; method: MethodId; top: ToppingId; variety?: string; hint: string }[] = [
  { menu: "croquette", method: "shape", top: "crumb", hint: "빚은 다음에 무언가 바삭한 걸 묻히면 어떨까." },
  { menu: "salad", method: "mash", top: "mayo", hint: "으깬 감자에 하얗고 꾸덕한 소스." },
  { menu: "soup", method: "boil", top: "cream", hint: "삶아서 부드러운 걸 붓는다." },
  { menu: "gamjatang", method: "boil", top: "bone", hint: "감자가 안 들어가는 감자 요리가 있다고 한다. 뼈가 들어간다." },
  { menu: "gnocchi", method: "shape", top: "tomato", hint: "빚어서 빨간 소스를 끼얹는 이탈리아식." },
  { menu: "rosti", method: "pan", top: "butter", hint: "부치는데, 기름 대신 고소한 걸로." },
  { menu: "gratin", method: "bake", top: "cheese", hint: "구울 때 위에 녹는 걸 올린다." },
  { menu: "pizza", method: "bake", top: "tomato", hint: "구울 때 빨간 걸 바른다. 둥글다." },
  { menu: "burger", method: "fry", top: "bun", hint: "튀긴 걸 빵 사이에 끼운다. 아무도 말리지 않는다." },
  { menu: "cheeseball", method: "fry", top: "cheese", hint: "튀기는데 안에서 늘어나는 게 있다." },
  { menu: "vichyssoise", method: "freeze", top: "cream", hint: "차가운 수프. 프랑스 사람이 만들었다." },
  { menu: "truffle", method: "mash", top: "truffle", hint: "으깬 감자에 아주 비싼 버섯." },
  { menu: "icecream", method: "freeze", top: "sugar", hint: "얼리고, 달게." },
  { menu: "cake", method: "bake", top: "sugar", hint: "굽고, 달게. 생일에 먹는다." },
  { menu: "bread", method: "bake", top: "butter", hint: "구울 때 버터를 넣으면 빵이 된다고 한다." },
  { menu: "course", method: "braise", top: "truffle", hint: "오래 졸이고 비싼 걸 넣으면 코스가 된다는 소문." },
  { menu: "legend", method: "steam", top: "none", variety: "golden", hint: "처음으로 돌아가라. 단, 빛나는 감자로." },
];

/** 틀렸을 때 나오는 결과 (조합마다 고정) */
const FAILS = [
  "그냥 생감자다.", "감자가 조금 슬퍼 보인다.", "형태는 감자다. 맛도 감자다.", "이건 먹을 수 있는 건가. 먹을 수는 있다.",
  "냄새는 좋다. 냄새만 좋다.", "김비서가 조용히 창문을 열었다.", "감자를 존중하지 않은 결과물이다.", "모양이 고구마를 닮았다. 위험하다.",
  "평론가가 보면 안 될 물건이다.", "연구원이 한 입 먹고 퇴근했다.", "단단하다. 너무 단단하다.", "흐물흐물하다. 의지가 없어 보인다.",
  "감자인데 감자가 아닌 것 같다.", "새로운 맛이다. 다시는 안 먹을 맛이다.", "사장님이 '음'이라고만 했다.", "색이 이상하다. 원래 이 색이 아니었다.",
  "탔다. 감자가 아니라 마음이.", "식감이 지우개 같다.", "이건 디저트도 반찬도 아니다.", "아무도 이게 뭔지 모른다.",
];

const key = (m: string, t: string) => `${m}+${t}`;

export function failText(m: string, t: string) {
  let h = 0;
  for (const c of key(m, t)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  // 특별한 실패들
  if (m === "steam" && t === "none") return "찐감자다. 이미 팔고 있다.";
  if (m === "freeze" && t === "none") return "감자를 얼렸다. 차갑다.";
  if (m === "boil" && t === "none") return "삶은 감자다. 찐감자와 무엇이 다른지 회의가 열렸다.";
  if (t === "bone" && m !== "boil") return "뼈다귀 감자. 강아지가 좋아했다.";
  if (t === "sugar" && m === "fry") return "맛탕이 됐다. 고구마 그룹에서 연락이 왔다.";
  return FAILS[h % FAILS.length];
}

export const comboKey = key;

/** 시도 비용 (아이디어) */
export const tryCost = (tries: number) => 10 + tries * 4;
