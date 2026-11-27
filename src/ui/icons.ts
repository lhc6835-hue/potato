// UI 아이콘도 게임 그림 함수로 그린다: 작은 프레임에 그려 자동으로 잘라내고 dataURL로 캐시.
import { createFrame, clearFrame, painterFor, composite, Painter, hex } from "../vendor/pixelfx/core/index.js";
import type { WeaponDef } from "../data/weapons";
import type { BagDef } from "../data/bags";
import type { CrewDef } from "../data/crew";
import { drawWeapon } from "../art/weapons";
import { Bag } from "../game/bag";
import { drawCrewChar } from "../game/crew";

const cache = new Map<string, string>();

function render(key: string, w: number, h: number, draw: (p: Painter) => void, silhouette = false, pad = 1): string {
  const hit = cache.get(key);
  if (hit) return hit;
  const f = createFrame(w, h);
  clearFrame(f);
  draw(painterFor(f));
  const rgba = new Uint8ClampedArray(w * h * 4);
  composite(f, rgba, null);
  // 그려진 영역만 잘라낸다
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (rgba[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { x0 = y0 = 0; x1 = w - 1; y1 = h - 1; }
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, side = Math.max(cw, ch);
  const cv = document.createElement("canvas");
  cv.width = side;
  cv.height = side;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(cw, ch);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const i = ((y + y0) * w + x + x0) * 4, j = (y * cw + x) * 4;
      if (silhouette) { img.data[j] = 20; img.data[j + 1] = 16; img.data[j + 2] = 28; img.data[j + 3] = rgba[i + 3] > 40 ? 255 : 0; }
      else for (let k = 0; k < 4; k++) img.data[j + k] = rgba[i + k];
    }
  ctx.putImageData(img, Math.floor((side - cw) / 2), Math.floor((side - ch) / 2));
  const url = cv.toDataURL();
  cache.set(key, url);
  return url;
}

export function weaponIcon(w: WeaponDef) {
  return render("w" + w.id, 80, 80, (p) => {
    const long = w.mode === "timing" || w.mode === "charge" || w.mode === "rune" || w.mode === "whirl";
    const flat = w.mode === "tap" || w.mode === "bow" || w.mode === "throw" || (w.mode === "hold");
    p.place(long ? 16 : flat ? 30 : 22, long ? 62 : flat ? 40 : 54, false, long ? -0.8 : flat ? (w.mode === "hold" ? -0.35 : 0) : -0.8);
    drawWeapon(p, w, 0.4);
  });
}

export function bagIcon(d: BagDef, silhouette = false) {
  return render("b" + d.id + (silhouette ? "s" : ""), 70, 110, (p) => {
    const b = new Bag(d, 1, { boss: d.boss, seed: 5 });
    b.ax = 35; b.ay = 2; b.L = 4; b.entering = false; b.drop = 0; b.t = 0.5;
    b.draw(p, () => {});
  }, silhouette);
}

export function crewIcon(c: CrewDef, silhouette = false) {
  return render("c" + c.id + (silhouette ? "s" : ""), 30, 34, (p) => drawCrewChar(p, c, 14, 30, 1, -1, 0, 1), silhouette);
}

const ICONS: Record<string, [string[], Record<string, string>]> = {
  coin: [["..####..", ".#yyyy#.", "#yywyyy#", "#ywyyoy#", "#yyyyoy#", "#yyyooy#", ".#oooo#.", "..####.."], { "#": "#5a3a08", y: "#ffd040", w: "#fff8c0", o: "#c88a18" }],
  gem: [["..####..", ".#wllp#.", "#wllllp#", "#llllpp#", ".#llpp#.", "..#lp#..", "...##..."], { "#": "#2a0a4a", w: "#ffffff", l: "#d090ff", p: "#8a3ad0" }],
  soul: [["...#....", "..#w#...", ".#wcc#..", ".#cccc#.", "#cccccc#", "#ccbbcc#", ".#cbbc#.", "..####.."], { "#": "#10203a", w: "#ffffff", c: "#80e0ff", b: "#3a90d0" }],
  stone: [["..###...", ".#wll#..", "#wllll##", "#lllmmm#", "#llmmmd#", ".#mmdd#.", "..####.."], { "#": "#14202e", w: "#ffffff", l: "#9adcff", m: "#4a90c8", d: "#2a5a8a" }],
  star: [["...#...", "..#y#..", "##yyy##", "#yyyyy#", ".#yyy#.", "#y#.#y#", "#.....#"], { "#": "#5a3a08", y: "#ffd040" }],
  chest: [[".######.", "#oooooo#", "#ywwwwy#", "########", "#oo##oo#", "#ooyyoo#", "#oooooo#", "########"], { "#": "#2a1606", o: "#8a5420", y: "#ffd040", w: "#b87a34" }],
  boost: [["...##...", "..#yy#..", ".#yyyy#.", "#yyyyyy#", "...yy...", "...yy...", "...yy..."], { "#": "#5a3a08", y: "#80ff60" }],
};
export function pix(name: string) {
  const [rows, pal] = ICONS[name];
  return render("i" + name, rows[0].length + 2, rows.length + 2, (p) => p.sprite(rows, pal, 1, 1), false, 0);
}
void hex;
