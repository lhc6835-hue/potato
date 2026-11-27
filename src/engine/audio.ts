// 효과음: Kenney CC0 오디오 팩 (Impact · RPG · Interface · Sci-fi · Digital · Casino · UI · Music Jingles).
// 원본 ogg를 모노 mp3로 바꿔 src/sfx에 넣었다 (라이선스: src/sfx/KENNEY-LICENSE.txt).
// 같은 소리가 반복돼도 질리지 않게 변형 여러 개 중 무작위로 고르고, 재생 속도(음높이)·볼륨을 살짝 흔든다.
// 타격감은 층으로 쌓는다: 주먹 소리 + 샌드백 재질 소리 (+ 묵직한 저음).
import manifest from "../sfx/manifest.json";

const urls = import.meta.glob("../sfx/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

let ctx: AudioContext | null = null;
let sfxBus: GainNode, jingleBus: GainNode;
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
  sfxBus.connect(comp);
  jingleBus.connect(comp);
  comp.connect(ctx.destination);
  applyVolumes();
  load();
}

/** 소리 파일을 전부 불러온다 (자주 쓰는 것부터) */
async function load() {
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
  jingleBus.gain.value = audio.on ? audio.music * 0.8 : 0;
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
    play("cloth", { vol: 0.35 * Math.min(1.5, speed), rate: 1.6 + Math.min(1, speed) * 0.6, dur: 0.25 });
  },
  /** 베기: 칼 베는 소리 + 칼 뽑는 쇳소리 + 재질 */
  slash(power = 1, m: Mat = "soft") {
    if (!gate("slash", 0.03)) return;
    play("knife", { vol: 0.9, rate: 1.1 });
    play("draw_knife", { vol: 0.35 * Math.min(1.5, power), rate: 1.5, dur: 0.3 });
    play("punch_m", { vol: 0.4 * Math.min(1.5, power) });
    mat(m, 0.7);
  },
  shot(kind = 0) {
    if (kind === 2) { if (gate("shot", 0.04)) play("laser_s", { vol: 0.45, rate: 1.1 }); return; }
    if (!gate("shot", 0.03)) return;
    const big = kind === 1;
    play("explosion", { vol: big ? 0.8 : 0.6, rate: big ? 1.25 : 1.7, dur: big ? 0.45 : 0.28 });
    play("metal_click", { vol: 0.35, rate: 1.3 });
  },
  flame() {
    if (!gate("flame", 0.18)) return;
    play("thruster", { vol: 0.45, dur: 0.25, offset: 0.4 + Math.random() });
  },
  beam() {
    play("laser_l", { vol: 0.8, rate: 0.85 });
    play("zap", { vol: 0.4, rate: 1.2 });
  },
  shell() {
    if (!gate("shell", 0.06)) return;
    play("tin", { vol: 0.25, rate: 2.2, delay: 0.12 + Math.random() * 0.1 });
  },
  overheat() {
    play("phaser_down", { vol: 0.6 });
    play("thruster", { vol: 0.35, rate: 1.6, dur: 0.8, offset: 1 });
  },
  charge(level: number) {
    if (!gate("charge", 0.11)) return;
    play("tick", { vol: 0.25 + level * 0.3, rate: 0.7 + level * 1.1, jit: 0 });
  },
  ready() { play("high_up", { vol: 0.5, jit: 0 }); },
  /** 망치 강타: 두꺼운 나무·쇠 충돌 + 저음 폭발 + 주먹 */
  slam(power = 1, m: Mat = "soft") {
    const k = Math.min(1.5, 0.6 + power * 0.4);
    play("punch_h", { vol: 0.9 * k, rate: 0.8 });
    play("plate_h", { vol: 0.5 * k, rate: 0.85 });
    if (power > 1.3) play("low_boom", { vol: 0.55 * k, dur: 0.9 });
    mat(m, k, true);
  },
  stab(grade = 1, m: Mat = "soft") {
    if (!gate("stab", 0.03)) return;
    play("knife", { vol: 0.7, rate: 1.4 });
    play(grade >= 2 ? "punch_h" : "punch_m", { vol: 0.5 + grade * 0.2, rate: 1.1 });
    if (grade >= 2) play("bell", { vol: 0.18, rate: 1.5, dur: 0.5 });
    mat(m, 0.6);
  },
  throwIt() {
    if (!gate("throw", 0.05)) return;
    play("cloth", { vol: 0.35, rate: 2.1, dur: 0.2 });
  },
  thunk(heavy = 0, m: Mat = "soft") {
    if (!gate("thunk", 0.025)) return;
    play(heavy ? "chop" : "wood_l", { vol: heavy ? 0.8 : 0.6, rate: heavy ? 1 : 1.3 });
    mat(m, 0.5);
  },
  clatter() {
    if (!gate("clatter", 0.08)) return;
    play("metal_l", { vol: 0.25, rate: 1.4 });
  },
  twang(power = 1) {
    play("pluck", { vol: 0.5 + power * 0.3, rate: 0.55 + power * 0.25 });
    play("cloth", { vol: 0.2, rate: 2.4, dur: 0.15 });
  },
  draw(level: number) {
    if (!gate("draw", 0.3)) return;
    play("creak", { vol: 0.2 + level * 0.3, rate: 1 + level * 0.4, dur: 0.35 });
  },
  rune() {
    if (!gate("rune", 0.09)) return;
    play("glass", { vol: 0.12, rate: 1.2 + Math.random() * 0.8, jit: 0 });
  },
  spell(kind: "missile" | "bolt" | "nova" | "zap" | "hole") {
    if (kind === "missile") { play("laser_r", { vol: 0.4, rate: 1.3 }); return; }
    if (kind === "bolt") { play("phaser_down", { vol: 0.5 }); return; }
    if (kind === "zap") { play("zap", { vol: 0.8 }); play("explosion", { vol: 0.6, rate: 1.1 }); return; }
    if (kind === "hole") { play("forcefield", { vol: 0.6, rate: 0.5 }); play("low_boom", { vol: 0.4, rate: 0.7 }); return; }
    play("low_boom", { vol: 0.8 });
    play("explosion", { vol: 0.6, rate: 0.9 });
    play("powerup", { vol: 0.3, rate: 1.4, dur: 0.4 });
  },
  fizzle() { if (gate("fizzle", 0.3)) play("error", { vol: 0.4 }); },
  chainWhoosh(speed: number) {
    if (speed < 0.45 || !gate("chainw", 0.22 / Math.min(2, speed))) return;
    play("cloth", { vol: 0.15 * Math.min(2, speed), rate: 1.2 + speed * 0.4, dur: 0.22 });
    if (speed > 1) play("metal_click", { vol: 0.08, rate: 1.8 });
  },
  clank(power = 1, m: Mat = "soft") {
    if (!gate("clank", 0.04)) return;
    const k = Math.min(1.5, power);
    play("metal_h", { vol: 0.45 * k, rate: 1.1 });
    play("punch_h", { vol: 0.7 * k });
    mat(m, k, power > 1.5);
  },
  boom(power = 1) {
    if (!gate("boom", 0.06)) return;
    play("explosion", { vol: 0.8, rate: 1.05 - Math.min(0.3, power * 0.1) });
    if (power >= 1) play("low_boom", { vol: 0.6 * Math.min(1.5, power), dur: 1.4 });
  },
  zap() { if (gate("zap", 0.07)) play("zap", { vol: 0.55, rate: 1.1 }); },
  freeze() { if (gate("freeze", 0.15)) play("glass_l", { vol: 0.5, rate: 1.5 }); },
  /** 샌드백 파괴 */
  shatter(m: Mat = "soft") {
    play("explosion", { vol: 0.55, rate: 0.9 });
    play("punch_h", { vol: 0.9, rate: 0.8 });
    if (m === "ice") play("glass_h", { vol: 0.8 });
    else if (m === "metal") play("metal_h", { vol: 0.7, rate: 0.8 });
    else if (m === "wood") play("wood_h", { vol: 0.8, rate: 0.85 });
    else if (m === "stone") play("mining", { vol: 0.8, rate: 0.8 });
    else if (m === "goo") play("slime", { vol: 0.8, rate: 0.8 });
    else play("soft_h", { vol: 0.9, rate: 0.8 });
    play("coins", { vol: 0.4, delay: 0.08 });
  },
  coin(n = 0) {
    if (!gate("coin", 0.045)) return;
    play("chips", { vol: 0.22, rate: 1.4 + Math.min(12, n % 24) * 0.04, jit: 0.03 });
  },
  gem() { play("pep", { vol: 0.45, rate: 1.3 }); play("glass", { vol: 0.3, rate: 1.6 }); },
  levelUp() { if (gate("lvl", 0.06)) play("powerup", { vol: 0.45, rate: 1.15, dur: 0.6 }); },
  buy() { play("confirm", { vol: 0.5 }); },
  fail() { play("error", { vol: 0.45 }); },
  click() { if (gate("click", 0.03)) play("click", { vol: 0.5 }); },
  perfect() { play("two", { vol: 0.5, rate: 1.2, jit: 0 }); },
  combo(n: number) { if (gate("combo", 0.05)) play("tick", { vol: 0.2, rate: 1 + Math.min(24, n) * 0.04, jit: 0 }); },
  fever() { play("j_nes", { jingle: true, idx: 9, vol: 0.9, jit: 0 }); play("powerup", { vol: 0.4, rate: 0.9 }); },
  boss() { play("j_hit", { jingle: true, idx: 14, vol: 0.9, jit: 0 }); play("low_boom", { vol: 0.5, rate: 0.7 }); },
  victory() { play("j_nes", { jingle: true, idx: 3, vol: 0.8, jit: 0 }); },
  drop() { play("soft_h", { vol: 0.5, rate: 0.85, delay: 0.25 }); play("leather", { vol: 0.4, delay: 0.25 }); },
  goblin() { play("three", { vol: 0.5, rate: 1.2 }); },
};

// 배경음 루프는 Kenney 오디오 팩에 없어서 쓰지 않는다. 대신 피버·보스·지역 이동 같은 순간에 Kenney 징글을 튼다.
export function music(_region: number, _fever: boolean) { /* 없음 */ }
export function startMusic() { /* 없음 */ }

export function haptic(ms: number) {
  if (navigator.vibrate) try { navigator.vibrate(ms); } catch { /* 무시 */ }
}
