// 한글 픽셀 글자: Galmuri 폰트를 1x로 래스터해 1비트 마스크로 만든다 (캐시).
// "치명타!", "퍼펙트!" 같은 화면 속 외침에 쓴다. 테두리·그라데이션은 그릴 때 입힌다.
import type { Painter, Color } from "../vendor/pixelfx/core/index.js";

export interface HMask { w: number; h: number; data: Uint8Array }
const cache = new Map<string, HMask>();
let cv: HTMLCanvasElement | null = null;

export function hmask(str: string, bold = true): HMask {
  const key = (bold ? "b" : "r") + str;
  let m = cache.get(key);
  if (m) return m;
  if (!cv) cv = document.createElement("canvas");
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  const font = `${bold ? "bold " : ""}12px Galmuri11, monospace`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(str).width) + 2, h = 14;
  cv.width = w;
  cv.height = h;
  ctx.font = font;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#fff";
  ctx.clearRect(0, 0, w, h);
  ctx.fillText(str, 1, 1);
  const d = ctx.getImageData(0, 0, w, h).data, data = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) data[i] = d[i * 4 + 3] > 110 ? 1 : 0;
  m = { w, h, data };
  if (cache.size > 300) cache.clear();
  cache.set(key, m);
  return m;
}

/** 가운데 정렬로 그린다. k = 배율(정수), top/bot = 위·아래 색, ol = 테두리 */
export function htext(p: Painter, str: string, cx: number, y: number, top: Color, bot: Color, ol: Color, k = 1, a = 1) {
  const m = hmask(str);
  const x0 = Math.round(cx - (m.w * k) / 2), y0 = Math.round(y);
  const at = (x: number, yy: number) => x >= 0 && yy >= 0 && x < m.w && yy < m.h && m.data[yy * m.w + x];
  for (let yy = -1; yy <= m.h; yy++)
    for (let x = -1; x <= m.w; x++) {
      if (at(x, yy)) continue;
      if (at(x - 1, yy) || at(x + 1, yy) || at(x, yy - 1) || at(x, yy + 1) || at(x - 1, yy - 1) || at(x + 1, yy + 1) || at(x - 1, yy + 1) || at(x + 1, yy - 1))
        p.rect(x0 + x * k, y0 + yy * k, k, k, ol, a);
    }
  for (let yy = 0; yy < m.h; yy++)
    for (let x = 0; x < m.w; x++) if (at(x, yy)) p.rect(x0 + x * k, y0 + yy * k, k, k, yy < m.h * 0.5 ? top : bot, a);
}
