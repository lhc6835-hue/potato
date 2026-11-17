// 단일 HTML 파일 빌드: 스크립트, 스타일, 폰트를 전부 index.html 안에 넣는다.
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [preact(), viteSingleFile()],
  build: { target: "es2020", outDir: "dist-single", assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 5000 },
});
