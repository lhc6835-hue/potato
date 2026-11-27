// pixelfx 코어(JS)의 느슨한 타입 선언. 엔진 자체는 MIT 라이선스(../LICENSE).
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Color = number;
export interface Frame { w: number; h: number; ox: number; oy: number; color: Uint32Array; light: Uint32Array }
export interface Mask { w: number; h: number; data: ArrayLike<number> }
export interface ShadeOut { c: number; a: number; l: number; k: number }
type CF<A extends any[]> = Color | ((...a: A) => Color);
type AF<A extends any[]> = number | ((...a: A) => number);
export declare class Painter {
  constructor(frame: Frame);
  fade: number; lightK: number; layer: string; w: number; h: number;
  reset(): Painter;
  place(x: number, y: number, flip?: boolean, angle?: number): Painter;
  toX(x: number, y: number): number; toY(x: number, y: number): number;
  fromX(x: number, y: number): number; fromY(x: number, y: number): number;
  put(sx: number, sy: number, c: Color, a?: number): void;
  add(sx: number, sy: number, c: Color, k?: number): void;
  blendPx(sx: number, sy: number, c: Color, a: number): void;
  blend(x: number, y: number, c: Color, a: number): void;
  disc(x: number, y: number, r: number, c: CF<[number, number]>, a: AF<[number, number]>): void;
  get(x: number, y: number): Color;
  px(x: number, y: number, c: Color): void;
  dot(x: number, y: number, c: Color, a?: number): void;
  light(x: number, y: number, c: Color, k?: number): void;
  each(x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number, sx: number, sy: number) => void): void;
  shade(x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number, o: ShadeOut) => Color | void | undefined | 0): void;
  line(x0: number, y0: number, x1: number, y1: number, c: CF<[number]>, a?: AF<[number]>): void;
  polyline(pts: number[][], c: CF<[number]>, a?: AF<[number]>): void;
  beam(x0: number, y0: number, x1: number, y1: number, w: number, c: CF<[number, number]>, a?: AF<[number, number]>): void;
  circle(x: number, y: number, r: number, c: CF<[number, number]>, a?: AF<[number, number]>): void;
  ellipse(x: number, y: number, rx: number, ry: number, c: CF<[number, number]>, a?: AF<[number, number]>): void;
  ring(x: number, y: number, r: number, w: number, c: CF<[number, number]>, a?: AF<[number, number]>): void;
  arc(x: number, y: number, r: number, w: number | ((u: number) => number), a0: number, a1: number, c: CF<[number, number]>, a?: AF<[number, number]>): void;
  rect(x: number, y: number, w: number, h: number, c: Color, a?: number): void;
  poly(pts: number[][], c: CF<[number, number]>, a?: AF<[number, number]>): void;
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: CF<[number, number]>, a?: AF<[number, number]>): void;
  glow(x: number, y: number, r: number, c: Color, k?: number): void;
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: Color, k?: number): void;
  glowRing(x: number, y: number, R: number, r: number, c: Color, k?: number): void;
  sprite(rows: string[], pal: Record<string, string | number>, x: number, y: number, o?: { scale?: number; a?: number; flip?: boolean; flipY?: boolean; tint?: Color }): void;
  text(s: string, x: number, y: number, c: CF<[number, number]>, o?: { font?: string; scale?: number; align?: string; outline?: Color; shadow?: Color; a?: number }): void;
  measure(s: string, o?: { font?: string; scale?: number }): [number, number];
  mask(m: Mask, x: number, y: number, c: CF<[number, number]>, a?: AF<[number, number]>): void;
  outline(m: Mask, x: number, y: number, c: CF<[number, number]>, a?: AF<[number, number]>): void;
}
export declare class Rng { constructor(seed?: number); next(): number; range(a: number, b: number): number; int(a: number, b: number): number; chance(p: number): boolean; pick<T>(a: T[]): T; sign(): number }
export declare const TAU: number;
export declare function clamp(x: number, a?: number, b?: number): number;
export declare function lerp(a: number, b: number, t: number): number;
export declare function seg(t: number, t0: number, t1: number): number;
export declare function smooth(e0: number, e1: number, x: number): number;
export declare function bump(t: number, t0: number, t1: number): number;
export declare function rand(...n: number[]): number;
export declare function noise2(x: number, y: number, seed?: number): number;
export declare function fbm(x: number, y: number, seed?: number, oct?: number): number;
export declare const ease: Record<string, (t: number) => number>;
export declare function hex(h: string | number): Color;
export declare function toHex(c: Color): string;
export declare function rgb(r: number, g: number, b: number): Color;
export declare function mix(a: Color, b: Color, t: number): Color;
export declare function scale(c: Color, k: number): Color;
export declare function ramp(l: string[]): Color[];
export declare function fit(r: (string | number)[], n: number): Color[];
export declare function at(r: Color[], t: number): Color;
export declare function luma(c: Color): number;
export declare const PAL: Record<string, string[]>;
export declare const RAMP: Record<string, Color[]>;
export declare const WHITE: Color;
export declare const BLACK: Color;
export declare const INK: Color;
export declare function bolt(r: Rng, x0: number, y0: number, x1: number, y1: number, o?: { jag?: number; depth?: number }): number[][];
export declare function forks(r: Rng, path: number[][], o?: { count?: number; len?: number; jag?: number; spread?: number }): number[][][];
export declare function star(cx: number, cy: number, r0: number, r1: number, n?: number, rot?: number): number[][];
export declare function ngon(cx: number, cy: number, r: number, n?: number, rot?: number): number[][];
export declare class Particles { constructor(o?: any); list: any[]; count: number; spawn(k: number, x: number, y: number, vx: number, vy: number, life: number, col?: Color | string, size?: number, delay?: number, flag?: number): void; update(dt: number): void; draw(p: Painter, layer?: string): void }
export declare class Bits { constructor(o?: any); list: any[]; add(b: any): void; update(dt: number): void; draw(p: Painter): void }
export declare class Lights { constructor(); add(x: number, y: number, r: number, c: Color, k: number, life: number): void; update(dt: number): void; draw(p: Painter): void }
export declare class Blazes { constructor(ps: Particles); add(x: number, y: number, life: number, power: number): void; update(dt: number): void; drawBack(p: Painter): void }
export declare const P: Record<string, number>;
export declare const PF: Record<string, number>;
export declare const B: Record<string, number>;
export declare const GRAVITY: number;
export declare const FIRE_RAMP: Color[];
export declare const SMOKE_RAMP: Color[];
export declare function sparkle(p: Painter, x: number, y: number, arm: number, c: Color, tip?: Color, k?: number): void;
export declare function flare(p: Painter, x: number, y: number, L: number, k: number, ramp: Color[]): void;
export declare function band(p: Painter, cx: number, cy: number, r: number, sy: number, th: number, k: number, ramp: Color[], keep?: (g: number) => boolean, hot?: boolean): void;
export declare function crystal(p: Painter, x: number, base: number, h: number, w: number, lean: number, ramp: Color[], o?: any): void;
export declare function createFrame(w: number, h: number, ox?: number, oy?: number): Frame;
export declare function clearFrame(f: Frame): Frame;
export declare function painterFor(f: Frame): Painter;
export interface FxInstance { meta: any; options: any; t: number; update(dt: number): void; draw(f: Frame, layer?: string): void; stop(): void; done(): boolean }
export declare function createFx(mod: any, o?: any): FxInstance;
export declare function composite(f: Frame, out: Uint8ClampedArray, bg?: Uint32Array | number | null, lightK?: number): Uint8ClampedArray;
export declare function textWidth(s: string, font?: string): number;
