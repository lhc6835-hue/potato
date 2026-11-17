# 감자 주식회사 (Potato Inc.)

감자 한 박스로 시작해서 감자튀김, 매시드 포테이토, 뇨끼까지 만들고, 동네에서 해외까지 분점을 늘려 가는 사이드뷰 픽셀 타이쿤.
브라우저에서 PC와 모바일 모두 플레이할 수 있다.

- 기획서: [docs/GDD.md](docs/GDD.md)
- 이펙트: [patch-gg/pixelfx](https://github.com/patch-gg/pixelfx) 코어(MIT)로 이 게임 전용 이펙트를 새로 만들었다 (`src/fx`). 라이브러리 샘플 이펙트는 쓰지 않는다.
- 폰트: Galmuri (OFL)

## 실행

```bash
npm install
```

```bash
npm run dev
```

빌드는 `npm run build` → `dist/` (정적 파일이라 아무 곳에나 올리면 된다).

파일 하나로 뽑으려면 `npm run build:single` → `dist-single/index.html` (폰트·스크립트 전부 포함, 더블클릭으로 실행).

## 조작

- 위아래로 드래그(PC는 휠)해서 건물을 본다.
- 주방 층을 누르면 조리한다. 층 이름표를 누르면 업그레이드 시트가 열린다.
- 홀, 덤웨이터, 지하 창고를 누르면 각각의 시트가 열린다.
- 위쪽 목표 카드를 누르면 챕터 목표를 볼 수 있다.

## 폴더

```
src/
  vendor/pixelfx/core   pixelfx 엔진 (MIT)
  fx/                   자체 제작 이펙트
  art/                  코드로 그린 스프라이트 (사람, 시설, 음식)
  data/                 메뉴, 지역, 매니저, 챕터, 이벤트, 업적, 연구, 품종, 특허
  sim/                  경제·생산·게임 루프·저장
  render/               건물 단면 렌더러
  ui/                   Preact UI
tools/bot.ts            밸런스 봇 (npx tsx tools/bot.ts 12)
```
