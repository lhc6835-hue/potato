// 지역 7곳 + 심연, 샌드백 37종. 모양(shape)마다 그림 함수가 있고, 램프로 재질을 칠한다.
import type { Elem } from "./elements";

export type Shape =
  | "sack" | "dummy" | "barrel" | "ball" | "slime" | "stump" | "mushroom" | "golem" | "keg"
  | "crystal" | "snowman" | "egg" | "chest" | "skull" | "ghost" | "statue" | "cloud" | "rift";

export type Debris =
  | "straw" | "sand" | "wood" | "leaf" | "goo" | "rock" | "metal" | "gear" | "ice" | "snow"
  | "lava" | "feather" | "gold" | "bone" | "ecto" | "crystal" | "powder" | "spore" | "void";

export interface BagDef {
  id: string;
  name: string;
  region: number;
  shape: Shape;
  /** 본체 램프 (어두움 → 밝음, 6~7단) */
  ramp: string[];
  /** 띠·장식 램프 */
  trim: string[];
  debris: Debris;
  hp: number;
  gold: number;
  weak?: Elem;
  resist?: Elem;
  boss?: boolean;
  face?: "cute" | "angry" | "sleepy" | "evil" | "stone" | "none";
  deco?: string[];
  desc: string;
}

export interface RegionDef {
  id: number;
  name: string;
  sub: string;
  /** 하늘: 위 → 아래 */
  sky: string[];
  /** 먼 배경 실루엣 색 (먼 쪽 → 가까운 쪽) */
  far: string[];
  floor: string[];
  wall: string[];
  props: string;
  accent: string;
  music: number;
}

export const REGIONS: RegionDef[] = [
  { id: 0, name: "초보자의 수련장", sub: "모든 영웅은 여기서 첫 주먹을 뻗었다", sky: ["#2a3a6a", "#3a5a8a", "#5a86b0", "#8ab8d0", "#c8e0d8"], far: ["#4a6a7a", "#3a5260", "#2a3c48"], floor: ["#2a1a10", "#4a3018", "#6e4a26", "#8e6434", "#b08448"], wall: ["#1e140e", "#3a2818", "#5a4026", "#7a5834"], props: "dojo", accent: "#ffd27a", music: 0 },
  { id: 1, name: "엘프의 숲", sub: "고목 사이로 빛 알갱이가 떠다닌다", sky: ["#0e2a2a", "#164040", "#1e5a4a", "#3a7a52", "#6aa060"], far: ["#103a2a", "#0c2e20", "#082216"], floor: ["#0e1a0a", "#1c3012", "#2e4a1a", "#46682a", "#6a8e3a"], wall: ["#0a140a", "#162616", "#223a20", "#30502a"], props: "forest", accent: "#b4ff8a", music: 1 },
  { id: 2, name: "드워프 광산", sub: "용광로의 열기가 갱도를 데운다", sky: ["#0c0a0c", "#1a1418", "#2a1e1e", "#3e2a22", "#5a3a26"], far: ["#2a2024", "#1e181c", "#141014"], floor: ["#141010", "#241c1a", "#382a24", "#4e3a2e", "#6a503c"], wall: ["#100c0c", "#201818", "#302422", "#44342e"], props: "mine", accent: "#ffa040", music: 2 },
  { id: 3, name: "얼음 협곡", sub: "숨결마저 얼어붙는 북쪽 끝", sky: ["#0a1430", "#14285a", "#2a4a88", "#5a84c0", "#a8d0f0"], far: ["#6a8ab8", "#4a6a98", "#344e78"], floor: ["#2a3a5a", "#46628a", "#6a8ab8", "#9abce0", "#d0e8ff"], wall: ["#1a2440", "#2a3a60", "#3e5484", "#5a74a8"], props: "ice", accent: "#c8f0ff", music: 3 },
  { id: 4, name: "화산 대장간", sub: "용암이 흐르는 전설의 대장간", sky: ["#14040a", "#2e0a10", "#5a1414", "#8a2a14", "#c85a1a"], far: ["#3a1210", "#2a0c0c", "#1a0808"], floor: ["#100808", "#201010", "#3a1a14", "#56281a", "#783a20"], wall: ["#0e0606", "#1e0c0c", "#301410", "#461e14"], props: "volcano", accent: "#ff7030", music: 4 },
  { id: 5, name: "하늘섬 신전", sub: "구름 위에 떠 있는 신들의 정원", sky: ["#3a5ab0", "#5a80d0", "#86aae8", "#b8d4f8", "#f0f4ff"], far: ["#e8eef8", "#c8d4e8", "#a8b8d4"], floor: ["#5a5a6e", "#86869a", "#b0b0c4", "#d4d4e2", "#f4f4fa"], wall: ["#4a4a5e", "#6e6e84", "#9494aa", "#bcbcce"], props: "sky", accent: "#ffe27a", music: 5 },
  { id: 6, name: "마왕성", sub: "모든 샌드백의 원흉이 기다린다", sky: ["#08040e", "#140a1e", "#22102e", "#341844", "#4a2058"], far: ["#1e1028", "#160c1e", "#0e0814"], floor: ["#0a080e", "#16121c", "#221a2c", "#30243e", "#423252"], wall: ["#08060c", "#120e18", "#1e1828", "#2c223a"], props: "castle", accent: "#c060ff", music: 6 },
  { id: 7, name: "끝없는 심연", sub: "여기서부터는 지도에 없다", sky: ["#020206", "#06060e", "#0c0a1a", "#141028", "#1e1438"], far: ["#1a1030", "#120a22", "#0a0616"], floor: ["#06040a", "#0e0a16", "#181224", "#241a36", "#32244a"], wall: ["#040308", "#0a0812", "#14101e", "#1e182c"], props: "abyss", accent: "#ff60c0", music: 7 },
];

const STRAW = ["#2a1c08", "#5a3e12", "#8a6420", "#b88c34", "#dcb456", "#f4dc8a", "#fff4c8"];
const CANVAS = ["#1e1410", "#3e2a1c", "#62442a", "#86603a", "#a87c4c", "#c8a06a", "#e8c894"];
const RED = ["#200810", "#4a0e18", "#7a1a20", "#a82a26", "#d0442e", "#f07042", "#ffa070"];
const LEATH = ["#1a0c08", "#36180e", "#582816", "#7c3c20", "#a0542c", "#c47442", "#e09a62"];
const WOODR = ["#1a0e06", "#33200e", "#4e3216", "#6c4820", "#8c602c", "#b07e3c", "#d4a056"];
const IRON = ["#0e0e14", "#1e1e28", "#30303e", "#464656", "#606072", "#80808e", "#aaaab6"];
const MOSS = ["#0a1608", "#142a10", "#1e4016", "#2c5a1e", "#3e7a28", "#5a9e36", "#86c450"];
const SLIME = ["#06200e", "#0c3a18", "#145a26", "#22803a", "#3aaa50", "#70d470", "#c0ffb0"];
const ICE = ["#0e1e44", "#1a3a72", "#2a5ea6", "#4a8ad0", "#7ab8ec", "#b4e0ff", "#ecf8ff"];
const SNOW = ["#2a3450", "#4a5a7a", "#7084a8", "#9cb0d0", "#c4d4ec", "#e4eefa", "#ffffff"];
const LAVA = ["#100404", "#240808", "#3a0e0a", "#56160c", "#7a2410", "#a83a14", "#d85a1a"];
const OBS = ["#06040a", "#100c16", "#1c1624", "#2a2236", "#3c3248", "#544660", "#76668a"];
const MARBLE = ["#4a4a5a", "#6c6c80", "#9090a4", "#b4b4c6", "#d4d4e2", "#ececf4", "#ffffff"];
const GOLDR = ["#2a1804", "#5a360a", "#8e5a10", "#c48a18", "#ecb828", "#ffe066", "#fff8c8"];
const BONE = ["#1a1610", "#3a3226", "#5e5442", "#887c64", "#b4a88a", "#dcd2b4", "#fffae6"];
const GHOST = ["#141a2e", "#243050", "#3a4c78", "#5a74a4", "#88a8d0", "#bcd8f0", "#eaf6ff"];
const VOID = ["#04020a", "#0e0620", "#1e0c3a", "#341458", "#521e7a", "#7a2c9e", "#b048c8"];
const PINK = ["#2a0a1a", "#4a1430", "#782048", "#a83064", "#d04a84", "#f07aa8", "#ffb4d0"];
const MUSH = ["#2a0a0a", "#5a1212", "#8a1e1a", "#b83224", "#e04e34", "#f47e5a", "#ffc0a0"];
const CRYS = ["#14062a", "#2a0e52", "#46188a", "#6a2ac0", "#9a4aec", "#c88aff", "#f0d8ff"];
const CLOUD = ["#6a7aa0", "#8a9ac0", "#acbcdc", "#ccdaf0", "#e4eefa", "#f6faff", "#ffffff"];

export const BAGS: BagDef[] = [
  // 0 초보자의 수련장
  { id: "straw", name: "짚 허수아비", region: 0, shape: "dummy", ramp: STRAW, trim: CANVAS, debris: "straw", hp: 1, gold: 1, face: "cute", deco: ["rope"], desc: "짚을 엮어 만든 수련용 인형. 언제나 웃고 있다." },
  { id: "leather", name: "가죽 샌드백", region: 0, shape: "sack", ramp: RED, trim: IRON, debris: "sand", hp: 1.1, gold: 1.1, face: "none", deco: ["bands", "stitch"], desc: "가장 표준적인 샌드백. 묵직한 손맛." },
  { id: "sandsack", name: "모래 자루", region: 0, shape: "sack", ramp: CANVAS, trim: LEATH, debris: "sand", hp: 0.9, gold: 1, face: "sleepy", deco: ["patch", "rope"], desc: "기운 자국이 많은 낡은 자루. 모래가 샌다." },
  { id: "barrel", name: "나무통 샌드백", region: 0, shape: "barrel", ramp: WOODR, trim: IRON, debris: "wood", hp: 1.3, gold: 1.3, face: "none", deco: ["hoops"], desc: "술통을 재활용했다. 부서지면 나무 조각이 튄다.", resist: "none" },
  { id: "kingstraw", name: "허수아비 왕", region: 0, shape: "dummy", ramp: STRAW, trim: GOLDR, debris: "straw", hp: 1, gold: 3, boss: true, face: "angry", deco: ["crown", "cape"], desc: "수련장의 지배자. 왕관이 좀 비뚤어졌다." },

  // 1 엘프의 숲
  { id: "mossbag", name: "이끼 샌드백", region: 1, shape: "sack", ramp: CANVAS, trim: MOSS, debris: "leaf", hp: 1, gold: 1, face: "none", deco: ["moss", "bands"], desc: "숲에 오래 매달려 이끼가 자랐다.", weak: "fire" },
  { id: "shroom", name: "버섯 샌드백", region: 1, shape: "mushroom", ramp: MUSH, trim: BONE, debris: "spore", hp: 1.1, gold: 1.2, face: "cute", deco: ["dots"], desc: "때리면 포자가 퐁퐁 터진다.", weak: "fire", resist: "poison" },
  { id: "vine", name: "덩굴 인형", region: 1, shape: "dummy", ramp: MOSS, trim: WOODR, debris: "leaf", hp: 1.2, gold: 1.2, face: "sleepy", deco: ["vines", "flower"], desc: "덩굴이 스스로 엉켜 만들어진 인형.", weak: "fire" },
  { id: "slime", name: "슬라임 주머니", region: 1, shape: "slime", ramp: SLIME, trim: SLIME, debris: "goo", hp: 0.9, gold: 1.4, face: "cute", deco: ["shine"], desc: "말랑말랑. 때리면 출렁인다.", weak: "volt", resist: "poison" },
  { id: "treant", name: "고목 정령", region: 1, shape: "stump", ramp: WOODR, trim: MOSS, debris: "wood", hp: 1, gold: 3, boss: true, face: "angry", deco: ["moss", "leaves"], desc: "천 년을 산 나무의 정령. 수련 상대가 필요했다.", weak: "fire" },

  // 2 드워프 광산
  { id: "ore", name: "광석 자루", region: 2, shape: "sack", ramp: IRON, trim: GOLDR, debris: "rock", hp: 1.1, gold: 1.3, face: "none", deco: ["ore", "bands"], desc: "광석이 가득 든 자루. 금맥이 반짝인다." },
  { id: "steel", name: "강철 샌드백", region: 2, shape: "sack", ramp: IRON, trim: IRON, debris: "metal", hp: 1.4, gold: 1.2, face: "none", deco: ["rivets", "plates"], desc: "드워프 공방제. 맞을 때마다 쨍 하고 울린다.", weak: "volt", resist: "none" },
  { id: "gearbot", name: "톱니 골렘", region: 2, shape: "golem", ramp: IRON, trim: GOLDR, debris: "gear", hp: 1.3, gold: 1.4, face: "stone", deco: ["gears", "eyeglow"], desc: "태엽을 감으면 맞을 준비가 된다.", weak: "volt" },
  { id: "keg", name: "화약통", region: 2, shape: "keg", ramp: WOODR, trim: RED, debris: "powder", hp: 0.8, gold: 1.6, face: "none", deco: ["hoops", "skullmark", "fuse"], desc: "부서지면 펑! 조심히 다루자.", weak: "fire" },
  { id: "mithril", name: "미스릴 골렘", region: 2, shape: "golem", ramp: ["#0e1a2a", "#1a3048", "#2a4a6a", "#40688e", "#6090b4", "#90bcd8", "#d0ecff"], trim: GOLDR, debris: "crystal", hp: 1, gold: 3.2, boss: true, face: "stone", deco: ["runes", "eyeglow"], desc: "드워프 왕의 비밀 병기. 단단함이 자랑이다.", resist: "volt" },

  // 3 얼음 협곡
  { id: "iceblock", name: "얼음 덩어리", region: 3, shape: "crystal", ramp: ICE, trim: SNOW, debris: "ice", hp: 1.1, gold: 1.3, face: "none", deco: ["frost"], desc: "깨지면 얼음 파편이 반짝이며 흩날린다.", weak: "fire", resist: "ice" },
  { id: "furbag", name: "털가죽 샌드백", region: 3, shape: "sack", ramp: SNOW, trim: LEATH, debris: "snow", hp: 1.2, gold: 1.2, face: "none", deco: ["fur", "bands"], desc: "설인 털로 만들었다. 따뜻하고 푹신하다.", weak: "fire" },
  { id: "snowman", name: "눈사람", region: 3, shape: "snowman", ramp: SNOW, trim: RED, debris: "snow", hp: 1, gold: 1.3, face: "cute", deco: ["scarf", "carrot"], desc: "누가 매달아 놨는지는 아무도 모른다.", weak: "fire", resist: "ice" },
  { id: "crystalbag", name: "수정 샌드백", region: 3, shape: "crystal", ramp: CRYS, trim: ICE, debris: "crystal", hp: 1.3, gold: 1.5, face: "none", deco: ["glint", "runes"], desc: "빛을 머금은 수정. 깨질 때 소리가 아름답다." },
  { id: "frostgiant", name: "서리 거인 인형", region: 3, shape: "statue", ramp: ICE, trim: SNOW, debris: "ice", hp: 1, gold: 3.4, boss: true, face: "angry", deco: ["frost", "horns"], desc: "거인족이 연습용으로 쓰던 거대 인형.", weak: "fire", resist: "ice" },

  // 4 화산 대장간
  { id: "lavarock", name: "용암석 샌드백", region: 4, shape: "ball", ramp: LAVA, trim: ["#4a1008", "#8a2a0c", "#d0501a", "#ff8a2a", "#ffc04a", "#ffe890", "#fff8d0"], debris: "lava", hp: 1.2, gold: 1.4, face: "none", deco: ["lavacrack"], desc: "속에서 용암이 끓고 있다.", weak: "ice", resist: "fire" },
  { id: "obsidian", name: "흑요석 샌드백", region: 4, shape: "crystal", ramp: OBS, trim: ["#4a1008", "#8a2a0c", "#d0501a", "#ff8a2a", "#ffc04a", "#ffe890", "#fff8d0"], debris: "crystal", hp: 1.5, gold: 1.3, face: "none", deco: ["glint"], desc: "화산 유리. 날카롭고 단단하다.", weak: "ice" },
  { id: "anvilbag", name: "모루 샌드백", region: 4, shape: "barrel", ramp: IRON, trim: LAVA, debris: "metal", hp: 1.4, gold: 1.5, face: "none", deco: ["rivets", "hoops", "heat"], desc: "대장장이들이 몰래 두들기던 쇳덩이.", weak: "ice" },
  { id: "dragonhide", name: "용가죽 샌드백", region: 4, shape: "sack", ramp: RED, trim: GOLDR, debris: "lava", hp: 1.3, gold: 1.6, face: "none", deco: ["scales", "bands"], desc: "용의 가죽은 불에 타지 않는다.", resist: "fire", weak: "ice" },
  { id: "dragonegg", name: "화염룡의 알", region: 4, shape: "egg", ramp: LAVA, trim: GOLDR, debris: "lava", hp: 1, gold: 3.6, boss: true, face: "none", deco: ["lavacrack", "scales"], desc: "부화 직전. 안에서 뭔가가 꿈틀거린다.", weak: "ice", resist: "fire" },

  // 5 하늘섬 신전
  { id: "cloudbag", name: "구름 샌드백", region: 5, shape: "cloud", ramp: CLOUD, trim: GOLDR, debris: "feather", hp: 1, gold: 1.5, face: "sleepy", deco: [], desc: "때려도 때려도 몽글몽글.", weak: "volt" },
  { id: "marble", name: "대리석 석상", region: 5, shape: "statue", ramp: MARBLE, trim: GOLDR, debris: "rock", hp: 1.5, gold: 1.4, face: "stone", deco: ["laurel"], desc: "신전 앞을 지키던 석상. 이제는 샌드백.", weak: "shadow" },
  { id: "angel", name: "천사 인형", region: 5, shape: "dummy", ramp: MARBLE, trim: GOLDR, debris: "feather", hp: 1.2, gold: 1.6, face: "cute", deco: ["halo", "wings"], desc: "맞을 때마다 깃털이 흩날린다.", weak: "shadow", resist: "holy" },
  { id: "goldbag", name: "황금 샌드백", region: 5, shape: "sack", ramp: GOLDR, trim: MARBLE, debris: "gold", hp: 1.3, gold: 2.4, face: "none", deco: ["bands", "glint"], desc: "신들의 사치품. 금화가 우수수 쏟아진다." },
  { id: "guardian", name: "천공의 수호자", region: 5, shape: "golem", ramp: MARBLE, trim: GOLDR, debris: "rock", hp: 1, gold: 3.8, boss: true, face: "stone", deco: ["halo", "runes", "eyeglow"], desc: "하늘섬을 지키는 고대 골렘.", weak: "shadow", resist: "holy" },

  // 6 마왕성
  { id: "mimic", name: "미믹 상자", region: 6, shape: "chest", ramp: WOODR, trim: GOLDR, debris: "gold", hp: 1.2, gold: 2, face: "evil", deco: ["teeth"], desc: "보물 상자인 척한다. 혀를 날름거린다.", weak: "holy" },
  { id: "skullbag", name: "해골 샌드백", region: 6, shape: "skull", ramp: BONE, trim: VOID, debris: "bone", hp: 1.3, gold: 1.5, face: "none", deco: ["eyeglow"], desc: "딱딱 이를 부딪치며 웃는다.", weak: "holy", resist: "shadow" },
  { id: "ghostbag", name: "원령 인형", region: 6, shape: "ghost", ramp: GHOST, trim: VOID, debris: "ecto", hp: 1, gold: 1.7, face: "evil", deco: ["chains"], desc: "반투명하다. 신성한 무기에 약하다.", weak: "holy", resist: "poison" },
  { id: "darkcrys", name: "마정석", region: 6, shape: "crystal", ramp: VOID, trim: PINK, debris: "void", hp: 1.5, gold: 1.6, face: "none", deco: ["runes", "glint"], desc: "마왕의 힘이 응축된 결정.", weak: "holy", resist: "shadow" },
  { id: "demonlord", name: "마왕의 그림자", region: 6, shape: "statue", ramp: VOID, trim: RED, debris: "void", hp: 1, gold: 4, boss: true, face: "evil", deco: ["horns", "cape", "eyeglow"], desc: "마왕이 남긴 그림자 분신. 진짜는 어디에?", weak: "holy", resist: "shadow" },

  // 7 심연
  { id: "riftbag", name: "차원 샌드백", region: 7, shape: "rift", ramp: VOID, trim: PINK, debris: "void", hp: 1.3, gold: 2, face: "none", deco: ["stars"], desc: "안을 들여다보면 다른 우주가 보인다." },
  { id: "abysslord", name: "심연의 군주", region: 7, shape: "skull", ramp: OBS, trim: PINK, debris: "void", hp: 1, gold: 5, boss: true, face: "none", deco: ["horns", "eyeglow", "crown"], desc: "끝없는 심연의 주인. 몇 번이고 되살아난다." },
];

export const BAG = Object.fromEntries(BAGS.map((b) => [b.id, b])) as Record<string, BagDef>;
export const STAGES_PER_REGION = 50;
export const BOSS_EVERY = 10;
