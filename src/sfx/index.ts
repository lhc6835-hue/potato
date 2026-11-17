// 효과음: Kenney "Interface Sounds" (CC0, www.kenney.nl). WebAudio로 재생한다.
// 모바일 브라우저는 첫 터치 전에 소리를 막으므로 첫 입력 때 오디오를 깨운다.

const files = import.meta.glob("./*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

export type Sfx =
  | "tap" | "pickup" | "drop" | "done" | "coin" | "upgrade" | "milestone" | "error" | "open" | "close"
  | "goal" | "achieve" | "next" | "lift" | "arrive" | "hire" | "chapter" | "bad" | "good" | "build";

const VOL: Partial<Record<Sfx, number>> = { coin: 0.35, done: 0.3, tap: 0.5, open: 0.4, close: 0.35, next: 0.4, arrive: 0.4, lift: 0.4 };
/** 같은 소리를 너무 자주 내지 않도록 최소 간격(초) */
const GAP: Partial<Record<Sfx, number>> = { coin: 0.25, done: 0.2, tap: 0.04, drop: 0.1, arrive: 0.2 };

let ctx: AudioContext | null = null;
const buffers = new Map<Sfx, AudioBuffer>();
const last = new Map<Sfx, number>();
let enabled = () => true;

export function setSfxEnabled(fn: () => boolean) {
  enabled = fn;
}

async function load() {
  if (!ctx) return;
  await Promise.all(
    Object.entries(files).map(async ([path, url]) => {
      const name = path.replace("./", "").replace(".mp3", "") as Sfx;
      try {
        const res = await fetch(url);
        const buf = await ctx!.decodeAudioData(await res.arrayBuffer());
        buffers.set(name, buf);
        (window as any).__sfxLoaded = buffers.size;
      } catch {}
    }),
  );
}

/** 첫 사용자 입력에서 부른다 */
export function unlockAudio() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AC();
    load();
  } catch {
    ctx = null;
  }
}

export function sfx(name: Sfx, vol = 1) {
  if (!ctx || !enabled()) return;
  const buf = buffers.get(name);
  if (!buf) return;
  const now = ctx.currentTime;
  const gap = GAP[name] ?? 0.05;
  if (now - (last.get(name) ?? -1) < gap) return;
  last.set(name, now);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = 0.96 + Math.random() * 0.08;
  const g = ctx.createGain();
  g.gain.value = (VOL[name] ?? 0.55) * vol;
  src.connect(g).connect(ctx.destination);
  src.start();
}
