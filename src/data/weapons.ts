// 무기 61종. pow = 1레벨 기준 위력, req = 해금에 필요한 최고 스테이지, art = 그림 종류.
import type { Elem } from "./elements";
import type { Mode } from "./modes";

export interface RarityDef { name: string; color: string; glow: string }
export const RARITY: RarityDef[] = [
  { name: "일반", color: "#b8b8c8", glow: "#6a6a7a" },
  { name: "고급", color: "#6cdc6c", glow: "#2a8a3a" },
  { name: "희귀", color: "#5ab4ff", glow: "#2a5aa8" },
  { name: "영웅", color: "#c070ff", glow: "#6a2aa8" },
  { name: "전설", color: "#ffb030", glow: "#a8601a" },
  { name: "신화", color: "#ff4a6a", glow: "#a81a3a" },
];

export interface WeaponDef {
  id: string;
  name: string;
  mode: Mode;
  rarity: number;
  elem: Elem;
  pow: number;
  req: number;
  art: string;
  /** 본체 색 램프 (어두움 → 밝음) */
  body: string[];
  /** 손잡이·보조 색 램프 */
  trim: string[];
  desc: string;
  /** 특수 능력 수치 (무기마다 의미가 다르다) */
  sp?: Record<string, number>;
}

const STEEL = ["#1c2230", "#3a4458", "#6e7a90", "#9aa6ba", "#d0d8e6", "#ffffff"];
const IRON = ["#16161c", "#2c2c38", "#4a4a58", "#6e6e7e", "#9a9aa8", "#c8c8d4"];
const WOOD = ["#1e1008", "#3a200e", "#5e3818", "#86562a", "#b07c40", "#d8a868"];
const LEATHER = ["#1a0e08", "#3a1e10", "#62341a", "#8c5028", "#b8743c", "#dca066"];
const GOLD = ["#3a2206", "#7a4a0c", "#c48412", "#f0b424", "#ffe066", "#fff6c4"];
const RED = ["#2a0610", "#5a0e1a", "#a01824", "#d42a30", "#ff5a50", "#ffa090"];
const FROST = ["#0c1a3a", "#1f4f94", "#3f8fdc", "#7ccaf4", "#c4ecff", "#ffffff"];
const DARK = ["#08060e", "#1a1228", "#2e1e46", "#4a2e6e", "#7048a0", "#a07ad0"];
const JADE = ["#06180e", "#0e3a20", "#1a6a38", "#2e9a54", "#5cd07a", "#b4f4b8"];
const BONE = ["#1a1814", "#3a352c", "#5e5648", "#8a806c", "#b8ad96", "#efe6d2"];
const OBSID = ["#06040a", "#140e1c", "#261a30", "#3a2848", "#5a3e6a", "#8a6a9a"];
const VOLTB = ["#0a0f2e", "#1a2e7a", "#2e5ad0", "#5a9cff", "#a8dcff", "#ffffff"];
const ROSE = ["#2a0a1c", "#5a1238", "#9a2058", "#d8407a", "#ff86aa", "#ffd0e0"];

export const WEAPONS: WeaponDef[] = [
  // ---- 연타 (권갑)
  { id: "fist0", name: "맨주먹", mode: "tap", rarity: 0, elem: "none", pow: 1, req: 0, art: "wrap", body: ["#3a1c12", "#7a4028", "#b86a44", "#e09a6a", "#f4c49a", "#fff0d8"], trim: ["#3a3a44", "#7a7a88", "#b8b8c4", "#e0e0e8", "#f4f4f8", "#ffffff"], desc: "붕대를 감은 맨손. 모든 것은 여기서 시작된다." },
  { id: "fist1", name: "가죽 너클", mode: "tap", rarity: 0, elem: "none", pow: 2.2, req: 3, art: "knuckle", body: LEATHER, trim: IRON, desc: "질긴 소가죽 장갑에 쇠 징을 박았다." },
  { id: "fist2", name: "강철 건틀릿", mode: "tap", rarity: 1, elem: "none", pow: 9, req: 18, art: "gauntlet", body: STEEL, trim: LEATHER, desc: "기사단 제식 건틀릿. 10연타마다 강타가 두 배." , sp: { combo: 2 } },
  { id: "fist3", name: "서리 권갑", mode: "tap", rarity: 2, elem: "ice", pow: 55, req: 60, art: "gauntlet", body: FROST, trim: STEEL, desc: "때릴 때마다 냉기가 스며든다. 빙결된 대상에게 치명타 +20%.", sp: { frostCrit: 0.2 } },
  { id: "fist4", name: "뇌신의 주먹", mode: "tap", rarity: 3, elem: "volt", pow: 380, req: 130, art: "spiked", body: VOLTB, trim: GOLD, desc: "다섯 번째 타격마다 번개가 내리친다.", sp: { every: 5 } },
  { id: "fist5", name: "용린 건틀릿", mode: "tap", rarity: 4, elem: "fire", pow: 3600, req: 220, art: "claw", body: RED, trim: GOLD, desc: "화염룡의 비늘로 만든 발톱. 연타가 이어질수록 불길이 커진다.", sp: { ramp: 0.04 } },
  { id: "fist6", name: "천공의 권", mode: "tap", rarity: 5, elem: "holy", pow: 52000, req: 300, art: "divine", body: GOLD, trim: ["#3a2a0a", "#8a6a2a", "#d8b060", "#fff0b0", "#fffbe6", "#ffffff"], desc: "10연타마다 하늘에서 거대한 빛의 주먹이 떨어진다.", sp: { every: 10 } },

  // ---- 베기 (도검)
  { id: "sw1", name: "수련용 목검", mode: "swipe", rarity: 0, elem: "none", pow: 1.4, req: 0, art: "wood", body: WOOD, trim: LEATHER, desc: "가볍고 튼튼한 연습용 목검." },
  { id: "sw2", name: "롱소드", mode: "swipe", rarity: 0, elem: "none", pow: 3.2, req: 6, art: "long", body: STEEL, trim: LEATHER, desc: "모험가의 영원한 친구." },
  { id: "sw3", name: "카타나", mode: "swipe", rarity: 1, elem: "none", pow: 11, req: 22, art: "katana", body: STEEL, trim: ["#0a0a10", "#1a1a28", "#3a1a2a", "#6a2a3a", "#a04050", "#d06070"], desc: "빠르게 벨수록 강해진다. 속도 배율 상한 +50%.", sp: { speedCap: 0.5 } },
  { id: "sw4", name: "쌍검", mode: "swipe", rarity: 2, elem: "none", pow: 42, req: 55, art: "twin", body: STEEL, trim: JADE, desc: "한 번 그으면 두 번 벤다.", sp: { twin: 1 } },
  { id: "sw5", name: "서리 송곳검", mode: "swipe", rarity: 2, elem: "ice", pow: 62, req: 75, art: "rapier", body: FROST, trim: STEEL, desc: "얼어붙은 검날. 베인 자리에 빙결이 남는다." },
  { id: "sw6", name: "혈월도", mode: "swipe", rarity: 3, elem: "shadow", pow: 420, req: 140, art: "curved", body: RED, trim: DARK, desc: "치명타 피해 +100%. 피를 머금은 듯 붉게 빛난다.", sp: { critDmg: 1 } },
  { id: "sw7", name: "염룡검", mode: "swipe", rarity: 4, elem: "fire", pow: 3900, req: 230, art: "flame", body: ["#3a0a0a", "#8a1a10", "#d0401a", "#ff8a2a", "#ffd060", "#fff8d0"], trim: GOLD, desc: "베는 궤적을 따라 불길이 번진다." },
  { id: "sw8", name: "새벽의 성검", mode: "swipe", rarity: 5, elem: "holy", pow: 60000, req: 310, art: "holy", body: ["#3a3a5a", "#8a8ab8", "#c8d0f0", "#f0f4ff", "#fffbe6", "#ffffff"], trim: GOLD, desc: "베기마다 빛의 검기가 날아가 한 번 더 벤다.", sp: { wave: 1 } },

  // ---- 사격 (총기)
  { id: "gun1", name: "플린트락 권총", mode: "hold", rarity: 0, elem: "none", pow: 2, req: 4, art: "pistol", body: WOOD, trim: IRON, desc: "느리지만 한 발 한 발이 묵직하다.", sp: { rate: 4, heat: 9 } },
  { id: "gun2", name: "머스킷", mode: "hold", rarity: 1, elem: "none", pow: 12, req: 20, art: "musket", body: WOOD, trim: STEEL, desc: "장거리 소총. 치명타 확률 +15%.", sp: { rate: 2.2, heat: 14, crit: 0.15, power: 2.4 } },
  { id: "gun3", name: "블런더버스", mode: "hold", rarity: 1, elem: "none", pow: 10, req: 32, art: "blunder", body: WOOD, trim: GOLD, desc: "나팔총. 산탄 6발이 퍼져 나간다.", sp: { rate: 1.6, heat: 18, pellets: 6 } },
  { id: "gun4", name: "마도 개틀링", mode: "hold", rarity: 3, elem: "arcane", pow: 230, req: 120, art: "gatling", body: IRON, trim: ["#2b1252", "#481c88", "#6b2cc0", "#9a48ec", "#c684ff", "#ecc8ff"], desc: "총열이 돌수록 빨라진다. 최대 초당 22발.", sp: { rate: 22, heat: 2.6, spin: 1 } },
  { id: "gun5", name: "드래곤 브레스", mode: "hold", rarity: 3, elem: "fire", pow: 300, req: 160, art: "flamer", body: RED, trim: IRON, desc: "용의 숨결을 뿜는 화염방사기. 화상이 겹겹이 쌓인다.", sp: { rate: 14, heat: 3.2, flame: 1 } },
  { id: "gun6", name: "룬 레일건", mode: "hold", rarity: 4, elem: "volt", pow: 4200, req: 240, art: "rail", body: ["#0a0f2e", "#1a2a5a", "#3a4a7a", "#6a7aa8", "#a8b8e0", "#e0e8ff"], trim: VOLTB, desc: "모든 것을 꿰뚫는 번개 광선.", sp: { rate: 2.5, heat: 16, beam: 1, power: 3 } },
  { id: "gun7", name: "성운포", mode: "hold", rarity: 5, elem: "arcane", pow: 58000, req: 320, art: "cannon", body: DARK, trim: ["#2b1252", "#6b2cc0", "#c684ff", "#ecc8ff", "#fff0ff", "#ffffff"], desc: "작은 별을 쏘아 폭발시킨다.", sp: { rate: 1.8, heat: 20, orb: 1, power: 4 } },

  // ---- 강타 (둔기)
  { id: "ham1", name: "나무 망치", mode: "charge", rarity: 0, elem: "none", pow: 1.8, req: 8, art: "mallet", body: WOOD, trim: WOOD, desc: "목수의 망치. 힘을 모았다 내리쳐라." },
  { id: "ham2", name: "전투 망치", mode: "charge", rarity: 1, elem: "none", pow: 13, req: 26, art: "warhammer", body: IRON, trim: LEATHER, desc: "쇳덩이 머리. 퍼펙트 강타 시 피해 +50%.", sp: { perfect: 0.5 } },
  { id: "ham3", name: "클레이모어", mode: "charge", rarity: 2, elem: "none", pow: 48, req: 50, art: "claymore", body: STEEL, trim: GOLD, desc: "거대한 양손검. 모은 힘을 거대한 참격으로 바꾼다.", sp: { slash: 1 } },
  { id: "ham4", name: "지진 망치", mode: "charge", rarity: 2, elem: "none", pow: 70, req: 90, art: "quake", body: ["#1a1410", "#3a2e24", "#5e4a38", "#86705a", "#b09a80", "#d8c8ae"], trim: IRON, desc: "땅을 울려 바위가 솟구친다.", sp: { quake: 1 } },
  { id: "ham5", name: "천둥 망치", mode: "charge", rarity: 3, elem: "volt", pow: 450, req: 150, art: "thunder", body: STEEL, trim: VOLTB, desc: "내리치는 순간 벼락이 함께 떨어진다.", sp: { bolt: 1 } },
  { id: "ham6", name: "빙하 파쇄기", mode: "charge", rarity: 3, elem: "ice", pow: 520, req: 175, art: "glacier", body: FROST, trim: STEEL, desc: "얼음산을 깨뜨리는 망치. 빙결 대상에게 피해 2배.", sp: { shatter: 1 } },
  { id: "ham7", name: "운석 망치", mode: "charge", rarity: 5, elem: "fire", pow: 64000, req: 330, art: "meteor", body: OBSID, trim: ["#4a1118", "#cc3a1a", "#ff8a2a", "#ffd060", "#fff8d0", "#ffffff"], desc: "완충 시 하늘에서 운석이 떨어진다.", sp: { meteor: 1 } },

  // ---- 찌르기 (창)
  { id: "sp1", name: "죽창", mode: "timing", rarity: 0, elem: "none", pow: 1.8, req: 10, art: "bamboo", body: ["#14200a", "#2a4214", "#4a6e22", "#78a03a", "#a8cc60", "#d8f0a0"], trim: ["#14200a", "#2a4214", "#4a6e22", "#78a03a", "#a8cc60", "#d8f0a0"], desc: "대나무를 깎아 만든 창. 타이밍이 생명이다." },
  { id: "sp2", name: "철창", mode: "timing", rarity: 0, elem: "none", pow: 4, req: 14, art: "iron", body: IRON, trim: WOOD, desc: "군대의 보급형 창." },
  { id: "sp3", name: "할버드", mode: "timing", rarity: 1, elem: "none", pow: 14, req: 30, art: "halberd", body: STEEL, trim: WOOD, desc: "도끼날 달린 창. 굿 판정도 퍼펙트의 70%.", sp: { good: 0.7 } },
  { id: "sp4", name: "맹독 작살", mode: "timing", rarity: 2, elem: "poison", pow: 58, req: 70, art: "harpoon", body: JADE, trim: BONE, desc: "찌를 때마다 독이 퍼진다. 중독은 최대 10중첩." },
  { id: "sp5", name: "용기병 랜스", mode: "timing", rarity: 3, elem: "none", pow: 400, req: 135, art: "lance", body: STEEL, trim: RED, desc: "퍼펙트 연속 보너스가 두 배로 쌓인다.", sp: { streak: 2 } },
  { id: "sp6", name: "폭풍 삼지창", mode: "timing", rarity: 4, elem: "volt", pow: 4000, req: 250, art: "trident", body: VOLTB, trim: GOLD, desc: "세 갈래 번개가 함께 꿰뚫는다.", sp: { prongs: 3 } },
  { id: "sp7", name: "신창", mode: "timing", rarity: 5, elem: "holy", pow: 56000, req: 315, art: "divine", body: GOLD, trim: ["#3a3a5a", "#8a8ab8", "#c8d0f0", "#f0f4ff", "#fffbe6", "#ffffff"], desc: "퍼펙트 때 하늘에서 빛의 창이 함께 내리꽂힌다." },

  // ---- 투척
  { id: "th1", name: "투척 단검", mode: "throw", rarity: 0, elem: "none", pow: 1.6, req: 5, art: "dagger", body: STEEL, trim: LEATHER, desc: "꽂힌 단검은 잠시 그대로 남는다." },
  { id: "th2", name: "수리검", mode: "throw", rarity: 1, elem: "none", pow: 6, req: 24, art: "shuriken", body: IRON, trim: IRON, desc: "한 번에 세 개를 부채꼴로 던진다.", sp: { fan: 3 } },
  { id: "th3", name: "투척 도끼", mode: "throw", rarity: 1, elem: "none", pow: 16, req: 36, art: "axe", body: STEEL, trim: WOOD, desc: "빙글빙글 돌며 날아가 묵직하게 꽂힌다.", sp: { heavy: 1 } },
  { id: "th4", name: "부메랑", mode: "throw", rarity: 2, elem: "none", pow: 44, req: 65, art: "boomerang", body: WOOD, trim: ["#3a0a0a", "#8a1a10", "#d0401a", "#ff8a2a", "#ffd060", "#fff8d0"], desc: "돌아오면서 한 번 더 때린다.", sp: { back: 1 } },
  { id: "th5", name: "화염 폭탄", mode: "throw", rarity: 3, elem: "fire", pow: 380, req: 145, art: "bomb", body: ["#08080c", "#16161e", "#2a2a36", "#44445a", "#6a6a80", "#9a9ab0"], trim: RED, desc: "닿는 순간 폭발한다.", sp: { boom: 1 } },
  { id: "th6", name: "암영 쿠나이", mode: "throw", rarity: 4, elem: "shadow", pow: 3700, req: 235, art: "kunai", body: DARK, trim: ["#0f0a18", "#2c1a4a", "#4a2470", "#7a3aa8", "#b060e0", "#e0a8ff"], desc: "날아가는 도중 그림자 다섯 개로 갈라진다.", sp: { split: 5 } },

  // ---- 궁술 (활)
  { id: "bw1", name: "단궁", mode: "bow", rarity: 0, elem: "none", pow: 1.8, req: 12, art: "short", body: WOOD, trim: ["#c8c0b0", "#e8e0d0", "#ffffff", "#ffffff", "#ffffff", "#ffffff"], desc: "작고 다루기 쉬운 활." },
  { id: "bw2", name: "장궁", mode: "bow", rarity: 1, elem: "none", pow: 14, req: 28, art: "long", body: WOOD, trim: GOLD, desc: "끝까지 당기면 위력이 크게 오른다.", sp: { full: 0.4 } },
  { id: "bw3", name: "석궁", mode: "bow", rarity: 1, elem: "none", pow: 9, req: 40, art: "cross", body: WOOD, trim: IRON, desc: "탭하면 그 자리로 볼트를 바로 쏜다. 장전이 빠르다.", sp: { cross: 1 } },
  { id: "bw4", name: "엘프의 활", mode: "bow", rarity: 2, elem: "poison", pow: 50, req: 80, art: "elf", body: JADE, trim: GOLD, desc: "독 묻은 화살 세 발을 한꺼번에 쏜다.", sp: { multi: 3 } },
  { id: "bw5", name: "화염궁", mode: "bow", rarity: 3, elem: "fire", pow: 430, req: 165, art: "flame", body: RED, trim: GOLD, desc: "불화살이 꽂히면서 폭발한다.", sp: { boom: 1 } },
  { id: "bw6", name: "유성궁", mode: "bow", rarity: 4, elem: "arcane", pow: 4100, req: 255, art: "star", body: DARK, trim: ["#2b1252", "#6b2cc0", "#c684ff", "#ecc8ff", "#fff0ff", "#ffffff"], desc: "쏘아 올린 화살이 유성우가 되어 쏟아진다.", sp: { rain: 8 } },

  // ---- 주문 (지팡이)
  { id: "st1", name: "견습 지팡이", mode: "rune", rarity: 0, elem: "arcane", pow: 1.8, req: 15, art: "wood", body: WOOD, trim: ["#2b1252", "#481c88", "#6b2cc0", "#9a48ec", "#c684ff", "#ecc8ff"], desc: "마법학교 신입생의 지팡이." },
  { id: "st2", name: "화염 지팡이", mode: "rune", rarity: 1, elem: "fire", pow: 13, req: 34, art: "orb", body: WOOD, trim: RED, desc: "모든 주문이 불꽃으로 타오른다." },
  { id: "st3", name: "서리 지팡이", mode: "rune", rarity: 1, elem: "ice", pow: 13, req: 44, art: "crystal", body: STEEL, trim: FROST, desc: "모든 주문이 냉기를 머금는다." },
  { id: "st4", name: "폭풍 지팡이", mode: "rune", rarity: 2, elem: "volt", pow: 52, req: 85, art: "fork", body: IRON, trim: VOLTB, desc: "번개 주문의 위력이 두 배.", sp: { zig: 2 } },
  { id: "st5", name: "맹독 마도서", mode: "rune", rarity: 3, elem: "poison", pow: 400, req: 155, art: "book", body: JADE, trim: BONE, desc: "마나 회복 속도 +60%.", sp: { regen: 0.6 } },
  { id: "st6", name: "심연의 마도서", mode: "rune", rarity: 4, elem: "shadow", pow: 4300, req: 260, art: "book", body: DARK, trim: ["#0f0a18", "#2c1a4a", "#4a2470", "#7a3aa8", "#b060e0", "#e0a8ff"], desc: "원 주문이 블랙홀이 되어 오래 남는다.", sp: { hole: 1 } },
  { id: "st7", name: "대현자의 지팡이", mode: "rune", rarity: 5, elem: "holy", pow: 62000, req: 325, art: "sage", body: GOLD, trim: ["#3a3a5a", "#8a8ab8", "#c8d0f0", "#f0f4ff", "#fffbe6", "#ffffff"], desc: "마나 소모 절반, 모든 주문 위력 +50%.", sp: { cheap: 0.5 } },

  // ---- 휘두르기 (사슬)
  { id: "fl1", name: "쇠공 사슬", mode: "whirl", rarity: 0, elem: "none", pow: 1.8, req: 16, art: "ball", body: IRON, trim: IRON, desc: "죄수의 족쇄에 달린 쇠공." },
  { id: "fl2", name: "모닝스타", mode: "whirl", rarity: 1, elem: "none", pow: 13, req: 38, art: "morning", body: STEEL, trim: WOOD, desc: "가시 박힌 쇠공. 빠를수록 아프다." },
  { id: "fl3", name: "쇠사슬 낫", mode: "whirl", rarity: 2, elem: "none", pow: 46, req: 60, art: "sickle", body: STEEL, trim: WOOD, desc: "사슬 끝에 낫이 달렸다. 스칠 때마다 벤다.", sp: { blade: 1 } },
  { id: "fl4", name: "빙결 유성추", mode: "whirl", rarity: 3, elem: "ice", pow: 410, req: 170, art: "frost", body: FROST, trim: STEEL, desc: "얼음 결정이 박힌 추. 맞으면 얼어붙는다." },
  { id: "fl5", name: "가시 철퇴", mode: "whirl", rarity: 3, elem: "shadow", pow: 470, req: 185, art: "spike", body: OBSID, trim: DARK, desc: "저주받은 가시. 치명타 확률 +20%.", sp: { crit: 0.2 } },
  { id: "fl6", name: "혜성 플레일", mode: "whirl", rarity: 4, elem: "fire", pow: 4400, req: 270, art: "comet", body: RED, trim: GOLD, desc: "불타는 꼬리를 끄는 혜성. 강하게 맞히면 폭발한다.", sp: { boom: 1 } },
];

export const WEAPON = Object.fromEntries(WEAPONS.map((w) => [w.id, w])) as Record<string, WeaponDef>;
