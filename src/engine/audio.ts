// 배경음: OpenGameArt의 CC0 곡들 (출처는 src/sfx/MUSIC-CREDITS.txt). 지역마다 한 곡.
// 효과음: Kenney CC0 오디오 팩 (Impact · RPG · Interface · Sci-fi · Digital · Casino · UI · Music Jingles).
// 원본 ogg를 모노 mp3로 바꿔 src/sfx에 넣었다 (라이선스: src/sfx/KENNEY-LICENSE.txt).
// 같은 소리가 반복돼도 질리지 않게 변형 여러 개 중 무작위로 고르고, 재생 속도(음높이)·볼륨을 살짝 흔든다.
// 타격감은 층으로 쌓는다: 주먹 소리 + 샌드백 재질 소리 (+ 묵직한 저음).
import manifest from "../sfx/manifest.json";

const urls = import.meta.glob("../sfx/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

let ctx: AudioContext | null = null;
let sfxBus: GainNode, jingleBus: GainNode, musicBus: GainNode;
const bufs: Record<string, (AudioBuffer | null)[]> = {};
const last: Record<string, number> = {};
export const audio = { sfx: 0.8, music: 0.6, on: true };

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume();
    return;
  }
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 4;
  comp.attack.value = 0.002;
  comp.release.value = 0.15;
  sfxBus = ctx.createGain();
  jingleBus = ctx.createGain();
  musicBus = ctx.createGain();
  sfxBus.connect(comp);
  jingleBus.connect(comp);
  musicBus.connect(ctx.destination);
  comp.connect(ctx.destination);
  applyVolumes();
  load();
}

/** 소리 파일을 전부 불러온다 (자주 쓰는 것부터) */
async function load() {
  switchBgm();
  const names = Object.keys(manifest as Record<string, number>);
  const first = ["punch_m", "punch_h", "soft_m", "soft_h", "coins", "chips", "click", "knife", "cloth"];
  names.sort((a, b) => (first.includes(b) ? 1 : 0) - (first.includes(a) ? 1 : 0));
  for (const n of names) {
    const count = (manifest as Record<string, number>)[n];
    bufs[n] = new Array(count).fill(null);
    await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const u = urls[`../sfx/${n}_${i}.mp3`];
        if (!u) return;
        try {
          const ab = u.startsWith("data:") ? b64(u) : await (await fetch(u)).arrayBuffer();
          bufs[n][i] = await new Promise<AudioBuffer>((res, rej) => ctx!.decodeAudioData(ab, res, rej));
        } catch { /* 디코딩 실패한 변형은 건너뛴다 */ }
      }),
    );
  }
}

/** 단일 파일 빌드에서는 소리가 data: 주소로 들어 있다: fetch 없이 바로 푼다 */
function b64(u: string): ArrayBuffer {
  const bin = atob(u.slice(u.indexOf(",") + 1)), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export function applyVolumes() {
  if (!ctx) return;
  sfxBus.gain.value = audio.on ? audio.sfx : 0;
  jingleBus.gain.value = audio.on ? Math.max(0.5, audio.music) * 0.8 : 0;
  musicBus.gain.value = audio.on ? audio.music * 0.55 : 0;
}

interface PlayOpt { vol?: number; rate?: number; jit?: number; idx?: number; delay?: number; dur?: number; offset?: number; jingle?: boolean }
/** 이름 붙은 소리 묶음에서 하나를 재생 */
function play(name: string, o: PlayOpt = {}) {
  if (!ctx || !audio.on) return;
  const list = bufs[name];
  if (!list) return;
  const ok = list.filter(Boolean) as AudioBuffer[];
  if (!ok.length) return;
  const b = o.idx !== undefined ? list[o.idx % list.length] ?? ok[0] : ok[Math.floor(Math.random() * ok.length)];
  const s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = b;
  const j = o.jit ?? 0.07;
  s.playbackRate.value = (o.rate ?? 1) * (1 + (Math.random() * 2 - 1) * j);
  const t = ctx.currentTime + (o.delay ?? 0), v = (o.vol ?? 1) * (1 + (Math.random() * 2 - 1) * 0.08);
  g.gain.setValueAtTime(v, t);
  if (o.dur) {
    g.gain.setValueAtTime(v, t + o.dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + o.dur);
  }
  s.connect(g).connect(o.jingle ? jingleBus : sfxBus);
  s.start(t, o.offset ?? 0, o.dur ? o.dur + 0.05 : undefined);
}
/** 같은 소리가 너무 촘촘히 겹치지 않게 */
function gate(key: string, gap: number) {
  const t = performance.now();
  if (t - (last[key] ?? -1e9) < gap * 1000) return false;
  last[key] = t;
  return true;
}

/** 재질: 맞은 샌드백이 무슨 소리를 내는지 */
export type Mat = "soft" | "wood" | "metal" | "stone" | "goo" | "ice" | "ghost";
function mat(m: Mat, k: number, heavy = false) {
  switch (m) {
    case "wood": play(heavy ? "wood_h" : "wood_m", { vol: 0.55 * k }); break;
    case "metal": play(heavy ? "metal_h" : "metal_m", { vol: 0.45 * k }); break;
    case "stone": play("mining", { vol: 0.55 * k }); break;
    case "goo": play("slime", { vol: 0.5 * k, rate: 1.2 }); break;
    case "ice": play(heavy ? "glass_h" : "glass_l", { vol: 0.45 * k }); break;
    case "ghost": play("forcefield", { vol: 0.3 * k, rate: 1.4, dur: 0.35 }); break;
    default: play(heavy ? "soft_h" : "soft_m", { vol: 0.6 * k }); break;
  }
}

export const sfx = {
  /** 맨손·권갑: 주먹 소리 + 재질 */
  punch(power = 1, m: Mat = "soft") {
    if (!gate("punch", 0.025)) return;
    const k = Math.min(1.4, 0.65 + power * 0.3);
    play(power >= 1.6 ? "punch_h" : "punch_m", { vol: 0.9 * k, rate: power >= 1.6 ? 0.9 : 1 });
    mat(m, k, power >= 1.6);
  },
  whoosh(speed = 1) {
    if (!gate("whoosh", 0.07)) return;
    play("cloth", { vol: 0.3 * Math.min(1.5, speed), rate: 1.5 + Math.min(1, speed) * 0.5, dur: 0.25 });
  },
  /** 베기: 칼 베는 소리 + 칼날 스침 + 재질 */
  slash(power = 1, m: Mat = "soft") {
    if (!gate("slash", 0.03)) return;
    play("knife", { vol: 0.85, rate: 1.1 });
    play("draw_knife", { vol: 0.25 * Math.min(1.5, power), rate: 1.4, dur: 0.3 });
    play("punch_m", { vol: 0.4 * Math.min(1.5, power) });
    mat(m, 0.7);
  },
  /** 총: 낮은 쿵 + 쇠붙이 찰칵 (거친 폭발음 대신) */
  shot(kind = 0) {
    if (kind === 2) { if (gate("shot", 0.045)) { play("punch_m", { vol: 0.35, rate: 1.5 }); play("metal_click", { vol: 0.2, rate: 1.6 }); } return; }
    if (!gate("shot", 0.03)) return;
    const big = kind === 1;
    play("low_boom", { vol: big ? 0.7 : 0.5, rate: big ? 1.3 : 1.7, dur: big ? 0.5 : 0.3 });
    play("punch_h", { vol: 0.5, rate: 1.2 });
    play("metal_click", { vol: 0.25, rate: 1.2 });
  },
  flame() {
    if (!gate("flame", 0.2)) return;
    play("thruster", { vol: 0.28, rate: 0.8, dur: 0.3, offset: 0.4 + Math.random() });
  },
  beam() {
    play("low_boom", { vol: 0.6, rate: 1.2, dur: 0.6 });
    play("bell", { vol: 0.25, rate: 1.6, dur: 0.6 });
  },
  shell() {
    if (!gate("shell", 0.06)) return;
    play("tin", { vol: 0.2, rate: 2, delay: 0.12 + Math.random() * 0.1 });
  },
  overheat() {
    play("pot", { vol: 0.4, rate: 1.3 });
    play("thruster", { vol: 0.2, rate: 1.4, dur: 0.6, offset: 1 });
  },
  charge(level: number) {
    if (!gate("charge", 0.12)) return;
    play("tick", { vol: 0.18 + level * 0.22, rate: 0.7 + level * 0.9, jit: 0 });
  },
  ready() { play("glass", { vol: 0.4, rate: 1.4, jit: 0 }); },
  /** 망치 강타: 두꺼운 충돌 + 깊은 울림 */
  slam(power = 1, m: Mat = "soft") {
    const k = Math.min(1.5, 0.6 + power * 0.4);
    play("punch_h", { vol: 0.9 * k, rate: 0.8 });
    play("plate_h", { vol: 0.35 * k, rate: 0.85 });
    if (power > 1.3) play("low_boom", { vol: 0.45 * k, dur: 0.9 });
    mat(m, k, true);
  },
  stab(grade = 1, m: Mat = "soft") {
    if (!gate("stab", 0.03)) return;
    play("knife", { vol: 0.7, rate: 1.4 });
    play(grade >= 2 ? "punch_h" : "punch_m", { vol: 0.5 + grade * 0.2, rate: 1.1 });
    if (grade >= 2) play("bell", { vol: 0.15, rate: 1.5, dur: 0.5 });
    mat(m, 0.6);
  },
  throwIt() {
    if (!gate("throw", 0.05)) return;
    play("cloth", { vol: 0.3, rate: 2, dur: 0.2 });
  },
  thunk(heavy = 0, m: Mat = "soft") {
    if (!gate("thunk", 0.025)) return;
    play(heavy ? "chop" : "wood_l", { vol: heavy ? 0.75 : 0.55, rate: heavy ? 1 : 1.3 });
    mat(m, 0.5);
  },
  clatter() {
    if (!gate("clatter", 0.08)) return;
    play("metal_l", { vol: 0.22, rate: 1.4 });
  },
  twang(power = 1) {
    play("pluck", { vol: 0.45 + power * 0.3, rate: 0.55 + power * 0.25 });
    play("cloth", { vol: 0.18, rate: 2.3, dur: 0.15 });
  },
  draw(level: number) {
    if (!gate("draw", 0.3)) return;
    play("creak", { vol: 0.2 + level * 0.25, rate: 1 + level * 0.4, dur: 0.35 });
  },
  rune() {
    if (!gate("rune", 0.1)) return;
    play("glass", { vol: 0.1, rate: 1.2 + Math.random() * 0.8, jit: 0 });
  },
  /** 마법: 유리 종소리·깊은 울림 위주 (전자음 없이) */
  spell(kind: "missile" | "bolt" | "nova" | "zap" | "hole") {
    if (kind === "missile") { play("glass", { vol: 0.3, rate: 1.6 }); play("cloth", { vol: 0.2, rate: 2.2, dur: 0.18 }); return; }
    if (kind === "bolt") { play("maximize", { vol: 0.4, rate: 0.9 }); play("cloth", { vol: 0.25, rate: 1.6, dur: 0.25 }); return; }
    if (kind === "zap") { play("low_boom", { vol: 0.7, rate: 1.1 }); play("glass_h", { vol: 0.35, rate: 1.3 }); return; }
    if (kind === "hole") { play("low_boom", { vol: 0.6, rate: 0.6 }); play("minimize", { vol: 0.35, rate: 0.6 }); return; }
    play("low_boom", { vol: 0.75 });
    play("bong", { vol: 0.4, rate: 0.8 });
    play("glass", { vol: 0.3, rate: 1.2, delay: 0.05 });
  },
  fizzle() { if (gate("fizzle", 0.3)) play("minimize", { vol: 0.4, rate: 0.8 }); },
  chainWhoosh(speed: number) {
    if (speed < 0.45 || !gate("chainw", 0.22 / Math.min(2, speed))) return;
    play("cloth", { vol: 0.14 * Math.min(2, speed), rate: 1.2 + speed * 0.4, dur: 0.22 });
    if (speed > 1) play("belt", { vol: 0.08, rate: 1.5 });
  },
  clank(power = 1, m: Mat = "soft") {
    if (!gate("clank", 0.04)) return;
    const k = Math.min(1.5, power);
    play("metal_m", { vol: 0.35 * k, rate: 1.1 });
    play("punch_h", { vol: 0.7 * k });
    mat(m, k, power > 1.5);
  },
  /** 폭발: 깊은 울림 + 둔탁한 충돌 (거친 8비트 폭발음 대신) */
  boom(power = 1) {
    if (!gate("boom", 0.06)) return;
    play("low_boom", { vol: 0.7 * Math.min(1.5, 0.6 + power * 0.4), dur: 1.4 });
    play("punch_h", { vol: 0.6, rate: 0.7 });
    play("wood_h", { vol: 0.25, rate: 0.7 });
  },
  zap() { if (gate("zap", 0.07)) { play("low_boom", { vol: 0.4, rate: 1.5, dur: 0.4 }); play("glass_l", { vol: 0.2, rate: 1.8 }); } },
  freeze() { if (gate("freeze", 0.15)) play("glass_l", { vol: 0.45, rate: 1.5 }); },
  /** 샌드백 파괴: 재질이 부서지는 소리 + 묵직한 퍽 + 쏟아지는 동전 */
  shatter(m: Mat = "soft") {
    play("punch_h", { vol: 0.85, rate: 0.75 });
    if (m === "ice") { play("glass_h", { vol: 0.7 }); play("glass_l", { vol: 0.35, delay: 0.08 }); }
    else if (m === "metal") { play("metal_h", { vol: 0.55, rate: 0.85 }); play("pot", { vol: 0.3, delay: 0.1 }); }
    else if (m === "wood") { play("wood_h", { vol: 0.8, rate: 0.85 }); play("plank", { vol: 0.5, rate: 0.9, delay: 0.06 }); play("wood_m", { vol: 0.35, delay: 0.18 }); }
    else if (m === "stone") { play("mining", { vol: 0.7, rate: 0.8 }); play("mining", { vol: 0.35, delay: 0.12 }); }
    else if (m === "goo") play("slime", { vol: 0.7, rate: 0.8 });
    else { play("soft_h", { vol: 0.85, rate: 0.8 }); play("leather", { vol: 0.4, delay: 0.1 }); }
    play("coins", { vol: 0.35, delay: 0.12 });
  },
  coin(n = 0) {
    if (!gate("coin", 0.05)) return;
    play("chips", { vol: 0.18, rate: 1.3 + Math.min(12, n % 24) * 0.03, jit: 0.03 });
  },
  gem() { play("glass", { vol: 0.4, rate: 1.5 }); play("bong", { vol: 0.2, rate: 1.6, delay: 0.05 }); },
  levelUp() { if (gate("lvl", 0.06)) { play("maximize", { vol: 0.4 }); play("glass", { vol: 0.2, rate: 1.4, delay: 0.06 }); } },
  buy() { play("confirm", { vol: 0.45 }); },
  fail() { play("error", { vol: 0.35 }); },
  click() { if (gate("click", 0.03)) play("click", { vol: 0.45 }); },
  perfect() { play("glass", { vol: 0.4, rate: 1.7, jit: 0 }); play("bell", { vol: 0.12, rate: 2, dur: 0.4 }); },
  combo(n: number) { if (gate("combo", 0.05)) play("tick", { vol: 0.15, rate: 1 + Math.min(24, n) * 0.04, jit: 0 }); },
  /** 이벤트 징글: 부드러운 현악 피치카토·스틸 드럼 */
  fever() { play("j_steel", { jingle: true, idx: 8, vol: 0.8, jit: 0 }); },
  boss() { play("j_pizzi", { jingle: true, idx: 4, vol: 0.85, rate: 0.85, jit: 0 }); play("low_boom", { vol: 0.35, rate: 0.7 }); },
  victory() { play("j_pizzi", { jingle: true, idx: 8, vol: 0.85, jit: 0 }); },
  drop() { play("soft_h", { vol: 0.45, rate: 0.85, delay: 0.25 }); play("leather", { vol: 0.35, delay: 0.25 }); },
  goblin() { play("pluck", { vol: 0.4, rate: 1.4 }); play("pluck", { vol: 0.35, rate: 1.8, delay: 0.08 }); play("pluck", { vol: 0.3, rate: 2.1, delay: 0.16 }); },
};

// ---- 배경음: OpenGameArt CC0 곡 8개, 지역마다 한 곡. 지역이 바뀌면 교차 페이드
const BGM_FOR = ["inn", "bard", "mines", "mirror", "forge", "sky", "castle", "abyss"];
const bgmBufs: Record<string, AudioBuffer | null | "loading"> = {};
let cur: { name: string; src: AudioBufferSourceNode; g: GainNode } | null = null;
let want = "inn";

async function bgmBuf(name: string): Promise<AudioBuffer | null> {
  const have = bgmBufs[name];
  if (have && have !== "loading") return have;
  if (have === "loading") return null;
  bgmBufs[name] = "loading";
  const u = urls[`../sfx/bgm_${name}.mp3`];
  try {
    const ab = u.startsWith("data:") ? b64(u) : await (await fetch(u)).arrayBuffer();
    const buf = await new Promise<AudioBuffer>((res, rej) => ctx!.decodeAudioData(ab, res, rej));
    bgmBufs[name] = buf;
    return buf;
  } catch {
    bgmBufs[name] = null;
    return null;
  }
}

async function switchBgm() {
  if (!ctx) return;
  const name = want;
  if (cur?.name === name) return;
  const buf = await bgmBuf(name);
  if (!buf || want !== name || cur?.name === name) return;
  const t = ctx.currentTime, src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buf;
  src.loop = true;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(1, t + 1.5);
  src.connect(g).connect(musicBus);
  src.start(t);
  if (cur) { const old = cur; old.g.gain.setTargetAtTime(0.0001, t, 0.5); old.src.stop(t + 3); }
  cur = { name, src, g };
}

export function music(region: number, _isFever: boolean) {
  want = BGM_FOR[Math.max(0, Math.min(BGM_FOR.length - 1, region))];
  switchBgm();
}
export function startMusic() { switchBgm(); }

export function haptic(ms: number) {
  if (navigator.vibrate) try { navigator.vibrate(ms); } catch { /* 무시 */ }
}
