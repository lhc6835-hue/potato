// 사람 스프라이트. 정면, 8x16. 점 두 개 눈, 일자 입. 볼터치 없음, 표정 변화 없음.
// 문자: h 머리카락, s 피부, e 눈, m 입, c 상의, d 상의 그림자, p 하의, k 신발, a 앞치마, w 모자(흰색), t 넥타이, x 소품

export interface Look {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  shoes?: string;
  acc?: string;
}

const HEAD: Record<0 | 1 | 2 | 3 | 4, readonly string[]> = {
  // 짧은 머리
  0: ["..hhhh..", ".hhhhhh.", ".hssssh.", ".sesses.", ".ssssss.", "..smms..", "...ss..."],
  // 앞머리 있는 머리
  1: ["..hhhh..", ".hhhhhh.", ".hhhhhh.", ".sesses.", ".ssssss.", "..smms..", "...ss..."],
  // 할머니 뽀글머리
  2: [".hhhhhh.", "hhhhhhhh", "hhsssshh", ".sesses.", ".ssssss.", "..smms..", "...ss..."],
  // 짧은 아이 머리 (모자 쓸 때)
  3: ["..hhhh..", ".hhhhhh.", ".hssssh.", ".sesses.", ".ssssss.", "..smms..", "...ss..."],
  // 긴 머리
  4: ["..hhhh..", ".hhhhhh.", "hhssssh.", "hsesses.", "hssssss.", "h.smms..", "...ss..."],
};

const BODY_STAND = [".dccccd.", "dccccccd", "sccccccs", "sccccccs", ".pppppp.", ".pp..pp.", ".pp..pp.", ".kk..kk."];
const BODY_WALK1 = [".dccccd.", "dccccccd", "sccccccs", ".cccccc.", ".pppppp.", ".pp..pp.", "pp....pp", "kk....kk"];
const BODY_WALK2 = [".dccccd.", "dccccccd", ".cccccc.", "sccccccs", ".pppppp.", "..pppp..", "..pppp..", "..kkkk.."];
const BODY_SIT = [".dccccd.", "dccccccd", "sccccccs", "sccccccs", ".pppppp.", "pppppppp", "kk....kk", "........"];
// 일하는 팔: 팔을 앞으로 (조리대 위)
const BODY_WORK1 = [".dccccd.", "dccccccd", "sccccccs", ".cccccc.", ".pppppp.", ".pp..pp.", ".pp..pp.", ".kk..kk."];
const BODY_WORK2 = ["sdccccds", "dccccccd", ".cccccc.", ".cccccc.", ".pppppp.", ".pp..pp.", ".pp..pp.", ".kk..kk."];

export type Pose = "stand" | "walk1" | "walk2" | "sit" | "work1" | "work2";
const BODIES: Record<Pose, readonly string[]> = { stand: BODY_STAND, walk1: BODY_WALK1, walk2: BODY_WALK2, sit: BODY_SIT, work1: BODY_WORK1, work2: BODY_WORK2 };

const cache = new Map<string, string[]>();

/** 사람 한 명의 행들. 머리 스타일, 자세, 모자/앞치마/넥타이 */
export function personRows(style: keyof typeof HEAD, pose: Pose, opts: { chefHat?: boolean; apron?: boolean; tie?: boolean; cap?: boolean; glasses?: boolean; shades?: boolean; monocle?: boolean } = {}) {
  const key = `${style}|${pose}|${JSON.stringify(opts)}`;
  let r = cache.get(key);
  if (r) return r;
  let head: string[] = [...HEAD[style]];
  if (opts.chefHat) head = ["..wwww..", ".wwwwww.", ".wwwwww.", ".hssssh.", ...head.slice(3)];
  if (opts.cap) head = ["........", ".xxxxxx.", "xxxxxxxx", ...head.slice(2)];
  if (opts.glasses) head = head.map((l) => (l === ".sesses." ? ".xexxex." : l));
  if (opts.shades) head = head.map((l) => (l === ".sesses." ? ".xxxxxx." : l));
  if (opts.monocle) head = head.map((l) => (l === ".sesses." ? ".sessxx." : l));
  let body: string[] = [...BODIES[pose]];
  if (opts.apron) body = body.map((l, i) => (i >= 1 && i <= 4 ? l.replace(/c{4}/, "aaaa") : l));
  if (opts.tie) body = body.map((l, i) => (i <= 2 ? l.slice(0, 3) + "tt" + l.slice(5) : l));
  r = [...head, ...body];
  cache.set(key, r);
  return r;
}

export function personPal(l: Look) {
  return {
    h: l.hair, s: l.skin, e: "#2a2220", m: shade(l.skin, 0.72), c: l.shirt, d: shade(l.shirt, 0.82), p: l.pants, k: l.shoes ?? "#2a2422",
    a: "#f4f0e6", w: "#f8f6f0", t: "#a83a32", x: l.acc ?? "#3a3a4a",
  };
}

export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * k), g = Math.min(255, ((n >> 8) & 255) * k), b = Math.min(255, (n & 255) * k);
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

// ---- 직원 외형 (매니저 look 시드로)

const SKINS = ["#f0cca8", "#e8c4a0", "#d8a880", "#c89068", "#f4d8bc", "#a87050"];
const HAIRS = ["#2a2220", "#4a3020", "#1a1a1a", "#6a4a2a", "#8a6a3a", "#3a2a3a", "#c8c0b4"];
const SHIRTS = ["#5a7a9a", "#7a5a8a", "#4a8a6a", "#9a6a4a", "#3a4a6a", "#8a8a5a", "#6a3a3a"];

export function staffLook(seed: number): { look: Look; style: 0 | 1 | 4 } {
  const h = (seed >>> 0) % 997;
  return {
    look: { skin: SKINS[h % SKINS.length], hair: HAIRS[(h >> 2) % HAIRS.length], shirt: SHIRTS[(h >> 4) % SHIRTS.length], pants: "#3a3a44" },
    style: ([0, 1, 4] as const)[(h >> 3) % 3],
  };
}

export const COOK_LOOK: Look = { skin: "#ecc8a4", hair: "#2a2220", shirt: "#f4f0e6", pants: "#4a4a52" };

// ---- 초상화 (대화용, 16x18). 단순, 무표정.

export const PORTRAITS: Record<string, { rows: string[]; pal: Record<string, string> }> = {
  // 박감자 사장: 감자 같은 울퉁불퉁한 머리, 콧수염, 작은 넥타이
  boss: {
    rows: [
      "....bbbbbbb.....",
      "..bbbbbbbbbbb...",
      ".bbBbbbbbbbbbb..",
      ".bbbbbbbbbBbbbb.",
      "bbbbbbbbbbbbbbb.",
      "bbbbebbbbbebbbb.",
      "bbbbbbbbbbbbbbb.",
      "bbbbbbbbbbbbbbb.",
      ".bbbMMMMMMMbbb..",
      ".bbbbbbbbbbbbb..",
      "..bbbbbmmbbbb...",
      "....bbbbbbb.....",
      "...ccccttcccc...",
      "..cccccttccccc..",
      ".ccccccttcccccc.",
      ".cccccccccccccc.",
    ],
    pal: { b: "#c8945a", B: "#a87440", e: "#2a2220", M: "#3a2a1a", m: "#8a5a34", c: "#3a3a4a", t: "#a83a32" },
  },
  // 김비서: 안경, 단정한 머리
  sec: {
    rows: [
      "....hhhhhhh.....",
      "..hhhhhhhhhhh...",
      ".hhhhhhhhhhhhh..",
      ".hhssssssssshh..",
      ".hssssssssssshh.",
      ".sgggssssgggsh..",
      ".sgegsssssgegs..",
      ".sgggssssgggs...",
      ".sssssssssssss..",
      ".sssssssssssss..",
      "..ssssmmmmssss..",
      "...sssssssss....",
      "...wwwccwww.....",
      "..wwwwccwwwww...",
      ".wwwwwccwwwwww..",
      ".wwwwwwwwwwwww..",
    ],
    pal: { h: "#2a2228", s: "#ecc8a8", e: "#2a2220", g: "#5a5a6a", m: "#b88a74", w: "#3a4258", c: "#e8e4dc" },
  },
  // 고회장: 보라색 정장, 넓은 얼굴, 고구마색 머리
  goh: {
    rows: [
      "...hhhhhhhhh....",
      "..hhhhhhhhhhh...",
      ".hhhhhhhhhhhhh..",
      ".hsssssssssssh..",
      ".sssssssssssss..",
      ".ssseesssseess..",
      ".sssssssssssss..",
      ".sssssssssssss..",
      ".sssssssssssss..",
      "..ssmmmmmmmss...",
      "..sssssssssss...",
      "...sssssssss....",
      "..ppppwwwpppp...",
      ".pppppwwwppppp..",
      "pppppppgppppppp.",
      "pppppppppppppp..",
    ],
    pal: { h: "#6a3048", s: "#e0b494", e: "#2a2220", m: "#9a6a5a", p: "#6a3a8a", w: "#f0ecf4", g: "#e8c040" },
  },
  critic: {
    rows: [
      "....hhhhhhh.....",
      "..hhhhhhhhhhh...",
      ".hhhhhhhhhhhhh..",
      ".hsssssssssshh..",
      ".sssssssssssss..",
      ".ssseessssgggs..",
      ".sssssssssgegs..",
      ".ssssssssssggg..",
      ".sssssssssssssg.",
      "..sssmmmmmsss.g.",
      "..sssssssssss...",
      "...sssssssss....",
      "..kkkkwwwkkkk...",
      ".kkkkkwwwkkkkk..",
      "kkkkkkkrkkkkkkk.",
      "kkkkkkkkkkkkkk..",
    ],
    pal: { h: "#5a4a3a", s: "#ecc8a8", e: "#2a2220", g: "#d8b040", m: "#b08070", k: "#2a2a3a", w: "#f4f4f0", r: "#a83a32" },
  },
};
