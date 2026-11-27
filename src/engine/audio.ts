// 효과음과 배경음을 전부 WebAudio로 합성한다. 파일 에셋 없음.
// 타격음 = 저음 쿵(사인 하강) + 노이즈 퍽(대역 통과) + 재질별 고음 (쨍, 사각, 퍽).

let ctx: AudioContext | null = null;
let master: GainNode, sfxBus: GainNode, musicBus: GainNode, comp: DynamicsCompressorNode;
let noiseBuf: AudioBuffer;
const last: Record<string, number> = {};
export const audio = { sfx: 0.8, music: 0.45, on: true };

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume();
    return;
  }
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 5;
  comp.attack.value = 0.002;
  comp.release.value = 0.12;
  master = ctx.createGain();
  master.gain.value = 0.9;
  sfxBus = ctx.createGain();
  musicBus = ctx.createGain();
  sfxBus.connect(comp);
  musicBus.connect(comp);
  comp.connect(master).connect(ctx.destination);
  applyVolumes();
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function applyVolumes() {
  if (!ctx) return;
  sfxBus.gain.value = audio.on ? audio.sfx : 0;
  musicBus.gain.value = audio.on ? audio.music * 0.5 : 0;
}

const now = () => ctx!.currentTime;
/** 같은 소리가 너무 촘촘히 겹치지 않게 */
function gate(key: string, gap: number) {
  const t = performance.now();
  if (t - (last[key] ?? -1e9) < gap * 1000) return false;
  last[key] = t;
  return true;
}

function env(g: GainNode, t: number, peak: number, a: number, d: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function tone(type: OscillatorType, f0: number, f1: number, t: number, a: number, d: number, vol: number, dest: AudioNode = sfxBus, pan = 0) {
  const o = ctx!.createOscillator(), g = ctx!.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + a + d);
  env(g, t, vol, a, d);
  let out: AudioNode = g;
  if (pan) {
    const p = ctx!.createStereoPanner();
    p.pan.value = pan;
    g.connect(p);
    out = p;
  }
  o.connect(g);
  out.connect(dest);
  o.start(t);
  o.stop(t + a + d + 0.05);
}

function noise(t: number, a: number, d: number, vol: number, type: BiquadFilterType, f0: number, f1 = f0, q = 1, dest: AudioNode = sfxBus) {
  const s = ctx!.createBufferSource(), f = ctx!.createBiquadFilter(), g = ctx!.createGain();
  s.buffer = noiseBuf;
  s.playbackRate.value = 0.8 + Math.random() * 0.4;
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + a + d);
  env(g, t, vol, a, d);
  s.connect(f).connect(g).connect(dest);
  s.start(t, Math.random() * 0.5);
  s.stop(t + a + d + 0.05);
}

const ok = () => !!ctx && audio.on;
const jit = (x: number, k = 0.08) => x * (1 + (Math.random() * 2 - 1) * k);

/** 재질: 맞은 샌드백이 무슨 소리를 내는지 */
export type Mat = "soft" | "wood" | "metal" | "stone" | "goo" | "ice" | "ghost";
function matTail(m: Mat, t: number, k: number) {
  switch (m) {
    case "wood": tone("triangle", jit(380), 220, t, 0.002, 0.08, 0.18 * k); noise(t, 0.001, 0.05, 0.25 * k, "bandpass", 1800, 900, 3); break;
    case "metal": tone("square", jit(1250), 1180, t, 0.001, 0.22, 0.05 * k); tone("sine", jit(2630), 2500, t, 0.001, 0.35, 0.07 * k); break;
    case "stone": noise(t, 0.001, 0.12, 0.35 * k, "lowpass", 1400, 300, 1); break;
    case "goo": tone("sine", jit(260), 520, t, 0.005, 0.12, 0.22 * k); break;
    case "ice": tone("sine", jit(2200), 1900, t, 0.001, 0.18, 0.08 * k); tone("sine", jit(3300), 3000, t + 0.01, 0.001, 0.12, 0.05 * k); break;
    case "ghost": tone("sine", jit(700), 300, t, 0.01, 0.25, 0.08 * k); break;
    default: noise(t, 0.001, 0.06, 0.2 * k, "bandpass", 700, 400, 1.5);
  }
}

export const sfx = {
  /** 맨손·권갑: 묵직한 퍽 */
  punch(power = 1, mat: Mat = "soft") {
    if (!ok() || !gate("punch", 0.025)) return;
    const t = now(), k = Math.min(1.6, 0.7 + power * 0.3);
    tone("sine", jit(150 + power * 10), 45, t, 0.002, 0.14 + power * 0.04, 0.9 * k);
    noise(t, 0.001, 0.07, 0.6 * k, "lowpass", 2600, 500, 0.8);
    noise(t, 0.001, 0.025, 0.4 * k, "highpass", 3000, 3000, 0.7);
    matTail(mat, t, k);
  },
  whoosh(speed = 1) {
    if (!ok() || !gate("whoosh", 0.06)) return;
    const t = now();
    noise(t, 0.03, 0.12, 0.25 * Math.min(1.5, speed), "bandpass", 600, 2400 * Math.min(1.6, speed), 1.2);
  },
  /** 베기: 바람 + 쉭 + 금속 링 */
  slash(power = 1, mat: Mat = "soft") {
    if (!ok() || !gate("slash", 0.03)) return;
    const t = now();
    noise(t, 0.005, 0.11, 0.45, "bandpass", 4200, 1200, 1.6);
    tone("sine", jit(3400), 3000, t + 0.005, 0.001, 0.28, 0.06 * power);
    tone("triangle", jit(1700), 1500, t + 0.005, 0.001, 0.2, 0.05 * power);
    tone("sine", 120, 50, t, 0.002, 0.1, 0.5 * Math.min(1.4, power));
    matTail(mat, t, 0.8);
  },
  shot(kind = 0) {
    if (!ok() || !gate("shot", kind === 2 ? 0.035 : 0.03)) return;
    const t = now();
    if (kind === 2) {
      // 개틀링: 짧고 높게
      noise(t, 0.001, 0.05, 0.4, "bandpass", 2200, 900, 1);
      tone("square", jit(180), 60, t, 0.001, 0.05, 0.18);
      return;
    }
    const big = kind === 1;
    noise(t, 0.001, big ? 0.3 : 0.16, big ? 0.95 : 0.75, "lowpass", 5200, 400, 0.7);
    tone("sine", jit(big ? 110 : 160), 35, t, 0.001, big ? 0.3 : 0.16, big ? 0.9 : 0.7);
    noise(t + 0.02, 0.01, 0.25, 0.08, "bandpass", 1200, 600, 2);
  },
  flame() {
    if (!ok() || !gate("flame", 0.07)) return;
    noise(now(), 0.02, 0.12, 0.22, "lowpass", 900, 500, 0.7);
  },
  beam() {
    if (!ok()) return;
    const t = now();
    tone("sawtooth", 1800, 120, t, 0.002, 0.4, 0.18);
    tone("square", 900, 80, t, 0.002, 0.35, 0.08);
    noise(t, 0.001, 0.3, 0.5, "lowpass", 6000, 500, 0.7);
  },
  shell() {
    if (!ok() || !gate("shell", 0.05)) return;
    const t = now();
    tone("sine", jit(4200, 0.15), 4000, t, 0.001, 0.06, 0.05);
    tone("sine", jit(5600, 0.15), 5400, t + 0.06, 0.001, 0.04, 0.03);
  },
  overheat() {
    if (!ok()) return;
    const t = now();
    noise(t, 0.05, 0.9, 0.35, "highpass", 3000, 6000, 0.5);
    tone("square", 300, 120, t, 0.01, 0.3, 0.08);
  },
  charge(level: number) {
    if (!ok() || !gate("charge", 0.07)) return;
    tone("triangle", 180 + level * 600, 200 + level * 640, now(), 0.01, 0.07, 0.05 + level * 0.05);
  },
  ready() {
    if (!ok()) return;
    const t = now();
    tone("square", 1320, 1320, t, 0.001, 0.06, 0.06);
    tone("square", 1980, 1980, t + 0.05, 0.001, 0.1, 0.06);
  },
  /** 망치 강타: 바닥까지 울리는 쿵 + 잔해 */
  slam(power = 1, mat: Mat = "soft") {
    if (!ok()) return;
    const t = now(), k = Math.min(1.8, 0.6 + power * 0.6);
    tone("sine", 90, 28, t, 0.002, 0.45 + power * 0.2, 1.1 * k);
    tone("triangle", 220, 40, t, 0.001, 0.2, 0.5 * k);
    noise(t, 0.001, 0.35 + power * 0.25, 0.9 * k, "lowpass", 3200, 120, 0.7);
    noise(t + 0.06, 0.04, 0.5, 0.22 * k, "bandpass", 500, 200, 1);
    matTail(mat, t, k);
  },
  stab(grade = 1, mat: Mat = "soft") {
    if (!ok() || !gate("stab", 0.03)) return;
    const t = now();
    noise(t, 0.002, 0.06, 0.5, "highpass", 2400, 6000, 1);
    tone("sine", jit(220), 70, t + 0.01, 0.002, 0.12, 0.6 + grade * 0.2);
    if (grade >= 2) tone("sine", 2600, 2400, t + 0.01, 0.001, 0.3, 0.08);
    matTail(mat, t, 0.8);
  },
  throwIt() {
    if (!ok() || !gate("throw", 0.05)) return;
    noise(now(), 0.02, 0.1, 0.25, "bandpass", 1000, 3000, 1.5);
  },
  thunk(heavy = 0, mat: Mat = "soft") {
    if (!ok() || !gate("thunk", 0.025)) return;
    const t = now();
    tone("sine", jit(heavy ? 130 : 200), 60, t, 0.001, 0.1 + heavy * 0.08, 0.6 + heavy * 0.3);
    noise(t, 0.001, 0.04, 0.4, "bandpass", 2400, 1400, 2);
    tone("triangle", jit(520), 380, t + 0.005, 0.001, 0.12, 0.08);
    matTail(mat, t, 0.6);
  },
  clatter() {
    if (!ok() || !gate("clatter", 0.06)) return;
    const t = now();
    tone("square", jit(900, 0.2), 800, t, 0.001, 0.04, 0.04);
    tone("square", jit(1300, 0.2), 1200, t + 0.05, 0.001, 0.03, 0.03);
  },
  twang(power = 1) {
    if (!ok()) return;
    const t = now();
    tone("triangle", 180 + power * 60, 120, t, 0.001, 0.25, 0.25);
    noise(t, 0.002, 0.08, 0.2, "bandpass", 2600, 4000, 2);
  },
  draw(level: number) {
    if (!ok() || !gate("draw", 0.09)) return;
    noise(now(), 0.02, 0.06, 0.05 + level * 0.06, "bandpass", 300 + level * 700, 400 + level * 800, 4);
  },
  rune() {
    if (!ok() || !gate("rune", 0.05)) return;
    tone("sine", jit(900 + Math.random() * 600, 0.1), 1400, now(), 0.01, 0.08, 0.03);
  },
  spell(kind: "missile" | "bolt" | "nova" | "zap" | "hole") {
    if (!ok()) return;
    const t = now();
    if (kind === "missile") { tone("sine", 1200, 400, t, 0.002, 0.12, 0.12); return; }
    if (kind === "bolt") { tone("sawtooth", 800, 200, t, 0.005, 0.22, 0.1); noise(t, 0.01, 0.2, 0.3, "bandpass", 1500, 500, 1); return; }
    if (kind === "zap") {
      noise(t, 0.001, 0.6, 1, "lowpass", 8000, 200, 0.6);
      tone("sawtooth", 160, 40, t, 0.001, 0.6, 0.4);
      tone("square", 2400, 600, t, 0.001, 0.08, 0.1);
      return;
    }
    if (kind === "hole") { tone("sine", 60, 30, t, 0.2, 1.4, 0.6); tone("sawtooth", 200, 50, t, 0.1, 1.2, 0.08); return; }
    tone("sine", 100, 30, t, 0.002, 0.8, 1);
    noise(t, 0.001, 0.9, 0.9, "lowpass", 4000, 150, 0.7);
    for (let i = 0; i < 4; i++) tone("sine", 600 + i * 300, 1200 + i * 400, t + i * 0.02, 0.01, 0.3, 0.05);
  },
  fizzle() {
    if (!ok() || !gate("fizzle", 0.3)) return;
    const t = now();
    tone("square", 200, 90, t, 0.005, 0.18, 0.08);
    noise(t, 0.01, 0.2, 0.15, "highpass", 2000, 1000, 1);
  },
  chainWhoosh(speed: number) {
    if (!ok() || speed < 0.4 || !gate("chainw", 0.2 / Math.min(2, speed))) return;
    const t = now();
    noise(t, 0.04, 0.12, 0.12 * Math.min(2, speed), "bandpass", 500 * speed, 1500 * speed, 2);
    tone("square", jit(2000, 0.3), 1900, t, 0.001, 0.02, 0.015);
  },
  clank(power = 1, mat: Mat = "soft") {
    if (!ok() || !gate("clank", 0.04)) return;
    const t = now(), k = Math.min(1.6, power);
    tone("sine", 140, 45, t, 0.001, 0.2, 0.8 * k);
    tone("square", jit(1500), 1400, t, 0.001, 0.12, 0.05 * k);
    noise(t, 0.001, 0.12, 0.6 * k, "lowpass", 3000, 400, 0.8);
    matTail(mat, t, k);
  },
  boom(power = 1) {
    if (!ok() || !gate("boom", 0.05)) return;
    const t = now();
    tone("sine", 80, 25, t, 0.002, 0.8 * power, 1.1);
    noise(t, 0.001, 1 * power, 1, "lowpass", 3000, 80, 0.6);
    noise(t + 0.1, 0.1, 0.8, 0.15, "bandpass", 300, 150, 1);
  },
  zap() {
    if (!ok() || !gate("zap", 0.06)) return;
    const t = now();
    noise(t, 0.001, 0.35, 0.9, "highpass", 1500, 400, 0.6);
    tone("sawtooth", 120, 40, t, 0.001, 0.35, 0.35);
  },
  freeze() {
    if (!ok() || !gate("freeze", 0.15)) return;
    const t = now();
    for (let i = 0; i < 3; i++) tone("sine", 2400 + i * 700, 2200 + i * 600, t + i * 0.03, 0.001, 0.2, 0.04);
  },
  /** 샌드백 파괴: 터지는 소리 + 내용물 쏟아짐 */
  shatter(mat: Mat = "soft") {
    if (!ok()) return;
    const t = now();
    tone("sine", 110, 30, t, 0.002, 0.6, 1);
    noise(t, 0.001, 0.6, 0.9, "lowpass", 5000, 200, 0.7);
    noise(t + 0.05, 0.05, 0.6, 0.3, "bandpass", mat === "metal" || mat === "ice" ? 4000 : 900, 600, 1.2);
    if (mat === "ice" || mat === "metal") for (let i = 0; i < 6; i++) tone("sine", jit(2000 + i * 400, 0.2), 1800, t + i * 0.04, 0.001, 0.15, 0.04);
  },
  coin(n = 0) {
    if (!ok() || !gate("coin", 0.035)) return;
    const t = now(), f = 1320 * Math.pow(2, (n % 12) / 24);
    tone("square", f, f, t, 0.001, 0.05, 0.04);
    tone("square", f * 1.5, f * 1.5, t + 0.05, 0.001, 0.12, 0.04);
  },
  gem() {
    if (!ok()) return;
    const t = now();
    [1760, 2217, 2637, 3520].forEach((f, i) => tone("triangle", f, f, t + i * 0.05, 0.001, 0.2, 0.06));
  },
  levelUp() {
    if (!ok() || !gate("lvl", 0.05)) return;
    const t = now();
    [523, 659, 784, 1047].forEach((f, i) => tone("square", f, f, t + i * 0.045, 0.002, 0.09, 0.05));
  },
  buy() {
    if (!ok()) return;
    const t = now();
    tone("square", 880, 880, t, 0.001, 0.06, 0.05);
    tone("square", 1320, 1320, t + 0.06, 0.001, 0.1, 0.05);
  },
  fail() {
    if (!ok()) return;
    const t = now();
    tone("square", 330, 160, t, 0.01, 0.3, 0.08);
  },
  click() {
    if (!ok() || !gate("click", 0.03)) return;
    tone("square", 1200, 900, now(), 0.001, 0.03, 0.04);
  },
  perfect() {
    if (!ok()) return;
    const t = now();
    tone("square", 1568, 1568, t, 0.001, 0.05, 0.05);
    tone("square", 2093, 2093, t + 0.04, 0.001, 0.12, 0.05);
  },
  combo(n: number) {
    if (!ok() || !gate("combo", 0.05)) return;
    const f = 440 * Math.pow(2, Math.min(24, n) / 12);
    tone("triangle", f, f, now(), 0.001, 0.08, 0.05);
  },
  fever() {
    if (!ok()) return;
    const t = now();
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone("sawtooth", f, f, t + i * 0.06, 0.003, 0.18, 0.06));
    tone("sine", 60, 30, t, 0.01, 1.2, 0.6);
  },
  boss() {
    if (!ok()) return;
    const t = now();
    [0, 0.35, 0.7].forEach((d) => { tone("sawtooth", 110, 100, t + d, 0.01, 0.3, 0.12); tone("sine", 55, 50, t + d, 0.01, 0.35, 0.5); });
  },
  victory() {
    if (!ok()) return;
    const t = now();
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone("square", f, f, t + i * 0.08, 0.002, 0.14, 0.06));
  },
  drop() {
    if (!ok()) return;
    const t = now();
    tone("sine", 400, 900, t, 0.01, 0.15, 0.08);
    tone("sine", 120, 60, t + 0.18, 0.001, 0.15, 0.4);
  },
  goblin() {
    if (!ok()) return;
    const t = now();
    [988, 1175, 988, 1319].forEach((f, i) => tone("square", f, f, t + i * 0.07, 0.002, 0.06, 0.04));
  },
};

// ---- 배경음: 지역마다 음계와 템포가 다른 칩튠 루프
const SCALES = [
  [0, 2, 4, 7, 9], // 수련장: 밝은 5음
  [0, 2, 3, 7, 9], // 숲
  [0, 3, 5, 7, 10], // 광산: 단조 5음
  [0, 2, 3, 7, 8], // 얼음
  [0, 1, 4, 5, 7, 8, 10], // 화산: 프리지안 도미넌트
  [0, 2, 4, 7, 11], // 하늘
  [0, 1, 3, 6, 7, 10], // 마왕성
  [0, 1, 3, 6, 8], // 심연
];
const ROOT = [57, 55, 52, 54, 50, 60, 49, 47];
const BPM = [112, 100, 96, 88, 126, 104, 118, 92];
let seqTimer = 0, step = 0, nextT = 0, region = 0, fever = false;
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function scheduleStep(t: number) {
  const sc = SCALES[region], root = ROOT[region], s = step % 64, bar = Math.floor(s / 16);
  const prog = [0, 3, 4, 2][bar];
  const deg = (i: number) => root + sc[((i % sc.length) + sc.length) % sc.length] + 12 * Math.floor(i / sc.length);
  const sp = 60 / (BPM[region] * (fever ? 1.25 : 1)) / 4;
  // 베이스
  if (s % 4 === 0) tone("triangle", midi(deg(prog) - 24), midi(deg(prog) - 24), t, 0.005, sp * 3, 0.32, musicBus);
  if (s % 8 === 6) tone("triangle", midi(deg(prog + 2) - 24), midi(deg(prog + 2) - 24), t, 0.005, sp * 1.5, 0.22, musicBus);
  // 아르페지오
  const pat = [0, 2, 4, 2, 5, 4, 2, 4];
  if (s % 2 === 0) tone("square", midi(deg(prog + pat[(s / 2) % 8])), midi(deg(prog + pat[(s / 2) % 8])), t, 0.003, sp * 1.2, 0.035, musicBus);
  // 멜로디 (가끔)
  const h = (step * 2654435761) >>> 0;
  if (s % 4 === 2 && (h & 7) < 3) {
    const n = deg(prog + 7 + ((h >> 4) % 5));
    tone("square", midi(n), midi(n), t, 0.003, sp * 2.5, 0.03, musicBus);
  }
  // 타악
  if (s % 8 === 0) { tone("sine", 120, 40, t, 0.001, 0.12, 0.35, musicBus); }
  if (s % 8 === 4) noise(t, 0.001, 0.08, 0.12, "bandpass", 1800, 1200, 0.8, musicBus);
  if (s % 2 === 1 || fever) noise(t, 0.001, 0.025, fever ? 0.06 : 0.035, "highpass", 7000, 7000, 0.7, musicBus);
  return sp;
}

export function music(regionId: number, isFever: boolean) {
  region = Math.max(0, Math.min(SCALES.length - 1, regionId));
  fever = isFever;
}

export function startMusic() {
  if (seqTimer || !ctx) return;
  nextT = ctx.currentTime + 0.1;
  seqTimer = window.setInterval(() => {
    if (!ctx || ctx.state !== "running") return;
    while (nextT < ctx.currentTime + 0.15) {
      if (audio.on && audio.music > 0) nextT += scheduleStep(nextT);
      else nextT += 0.1;
      step++;
    }
  }, 40);
}

export function haptic(ms: number) {
  if (navigator.vibrate) try { navigator.vibrate(ms); } catch { /* 무시 */ }
}
