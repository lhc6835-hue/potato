// 개발용: 코드로 그린 그림을 PNG로 뽑아 눈으로 확인한다. npx tsx tools/shot.ts bags
import { writeFileSync, mkdirSync } from "node:fs";
// @ts-ignore
import { encodePNG } from "./png.mjs";
import { createFrame, clearFrame, painterFor, composite } from "../src/vendor/pixelfx/core/index.js";

export function sheet(name: string, w: number, h: number, zoom: number, draw: (f: ReturnType<typeof createFrame>) => void, bg = 0xff1a1418) {
  const f = createFrame(w, h);
  clearFrame(f);
  draw(f);
  const rgba = new Uint8ClampedArray(w * h * 4);
  composite(f, rgba, bg);
  const W = w * zoom, H = h * zoom, out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = ((y / zoom | 0) * w + (x / zoom | 0)) * 4, j = (y * W + x) * 4;
      out[j] = rgba[i]; out[j + 1] = rgba[i + 1]; out[j + 2] = rgba[i + 2]; out[j + 3] = 255;
    }
  mkdirSync("records", { recursive: true });
  writeFileSync(`records/${name}.png`, encodePNG(W, H, out));
  console.log(`records/${name}.png`);
}
export { painterFor };
