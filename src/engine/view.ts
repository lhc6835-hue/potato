// 픽셀 화면: 논리 해상도 W×H의 프레임에 그리고, 정수 배율로 키워 보여 준다.
import { createFrame, composite, Frame } from "../vendor/pixelfx/core/index.js";

export class View {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  buf: HTMLCanvasElement;
  bctx: CanvasRenderingContext2D;
  W = 200;
  H = 260;
  k = 2;
  frame!: Frame;
  bg!: Frame;
  img!: ImageData;
  onResize: () => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.buf = document.createElement("canvas");
    this.bctx = this.buf.getContext("2d")!;
  }

  /** 담는 칸의 CSS 크기에 맞춰 논리 해상도를 고른다: 폭 180~260px 정도가 되도록 */
  fit(cssW: number, cssH: number) {
    const dpr = window.devicePixelRatio || 1;
    const k = Math.max(1, Math.round(Math.min(cssW / 190, cssH / 230)));
    const W = Math.ceil(cssW / k), H = Math.ceil(cssH / k);
    if (W === this.W && H === this.H && k === this.k && this.frame) return;
    this.W = W;
    this.H = H;
    this.k = k;
    this.frame = createFrame(W, H);
    this.bg = createFrame(W, H);
    this.img = new ImageData(W, H);
    this.buf.width = W;
    this.buf.height = H;
    this.canvas.width = Math.round(W * k * dpr);
    this.canvas.height = Math.round(H * k * dpr);
    this.canvas.style.width = W * k + "px";
    this.canvas.style.height = H * k + "px";
    this.onResize();
  }

  /** 프레임을 배경 위에 합성해 화면에 그린다. sx, sy = 흔들림 (논리 px) */
  present(sx: number, sy: number, fill: string) {
    composite(this.frame, this.img.data, this.bg.color);
    this.bctx.putImageData(this.img, 0, 0);
    const c = this.ctx, s = this.canvas.width / this.W;
    c.imageSmoothingEnabled = false;
    c.fillStyle = fill;
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.drawImage(this.buf, Math.round(sx * s), Math.round(sy * s), this.W * s, this.H * s);
  }

  /** 화면 좌표(이벤트) → 논리 좌표 */
  toLogical(clientX: number, clientY: number): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [((clientX - r.left) / r.width) * this.W, ((clientY - r.top) / r.height) * this.H];
  }
}
