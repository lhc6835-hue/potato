# 감자 주식회사 (Potato Inc.)

감자 한 박스로 시작해서 감자튀김, 매시드 포테이토, 뇨끼까지 만들고, 동네에서 해외까지 분점을 늘려 가는 사이드뷰 픽셀 타이쿤.
브라우저에서 PC와 모바일 모두 플레이할 수 있다.

- 기획서: [docs/GDD.md](docs/GDD.md)
- 이펙트: [patch-gg/pixelfx](https://github.com/patch-gg/pixelfx) 코어(MIT)로 이 게임 전용 이펙트를 새로 만들었다 (`src/fx`). 라이브러리 샘플 이펙트는 쓰지 않는다.
- 폰트: Galmuri (OFL)
- 효과음: Kenney Interface Sounds (CC0, www.kenney.nl)

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

- 노란 화살표가 머리 위에 있는 사람이 플레이어(박감자 사장)다.
- 지하 창고(또는 감자가 빈 주방)를 누르면 사장이 감자를 가져와 주방 감자 통에 붓는다.
- 주방을 누르면 사장이 가서 조리한다. 계속 누르면 빨리 익는다.
- 2층부터는 덤웨이터를 눌러 음식을 1층 카운터로 내린다.
- 매니저를 고용해 창고(운반), 주방(조리), 덤웨이터에 배치하면 그 일이 자동이 된다.
- 위아래로 드래그(PC는 휠)해서 건물을 본다. 이름표를 누르면 업그레이드 시트가 열린다.
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
