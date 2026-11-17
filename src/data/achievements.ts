// 업적. 하나당 영구 매출 +2% (복리). 일부는 숨김.

import { MENUS } from "./menus";
import type { GameState } from "../sim/state";
import { fmt } from "../util/format";

export interface AchDef {
  id: string;
  name: string;
  desc: string;
  hidden?: boolean;
  check: (s: GameState) => boolean;
}

const A: AchDef[] = [];
const add = (id: string, name: string, desc: string, check: (s: GameState) => boolean, hidden = false) => A.push({ id, name, desc, check, hidden });

// 메뉴별 판매
const SOLD_TIERS: [number, string][] = [[100, "입문"], [10000, "숙련"], [1e6, "장인"]];
for (const m of MENUS)
  for (const [n, t] of SOLD_TIERS)
    add(`sold-${m.id}-${n}`, `${m.name} ${t}`, `${m.name} ${fmt(n)}개 판매`, (s) => (s.soldBy[m.id] ?? 0) >= n, m.id === "legend");

// 누적 매출
const MONEY: [number, string][] = [
  [1e5, "첫 장사"], [1e8, "억대 감자"], [1e12, "조 단위 감자"], [1e16, "경 단위 감자"], [1e20, "해 단위 감자"],
  [1e24, "자 단위 감자"], [1e28, "양 단위 감자"], [1e32, "구 단위 감자"], [1e36, "간 단위 감자"], [1e40, "정 단위 감자"], [1e44, "재 단위 감자"], [1e48, "극 단위 감자"],
];
for (const [n, name] of MONEY) add(`earn-${n}`, name, `모든 회차 누적 매출 ${fmt(n)}원`, (s) => s.earnedAll >= n);

// 분점
for (const n of [2, 5, 10, 20, 35, 50]) add(`branch-${n}`, `분점 ${n}개`, `분점 ${n}개 운영`, (s) => s.branches.length >= n);
// 매니저
for (const n of [1, 5, 15, 30, 60]) add(`mgr-${n}`, `동료 ${n}명`, `매니저 ${n}명 고용`, (s) => s.managers.length >= n);
add("mgr-legend", "전설과 함께", "전설 등급 매니저 고용", (s) => s.managers.some((m) => m.data.rarity === 3));
// 탭
for (const n of [100, 1000, 10000]) add(`tap-${n}`, `손가락 ${n}`, `주방 ${fmt(n)}번 누르기`, (s) => s.stats.taps >= n);
// 레벨
for (const n of [25, 100, 250, 500]) add(`lv-${n}`, `스테이션 Lv ${n}`, `아무 스테이션 Lv ${n}`, (s) => s.branches.some((b) => b.lines.some((l) => l.lv.some((v) => v >= n))));
// 층
add("floors-6", "고층 감자", "한 분점에 6층 운영", (s) => s.branches.some((b) => b.lines.length >= 6));
add("floors-12", "감자 마천루", "한 분점에 12층 운영", (s) => s.branches.some((b) => b.lines.length >= 12));
// 연구
for (const n of [1, 5, 10, 17]) add(`found-${n}`, `연구원 ${n}`, `레시피 ${n}개 발견`, (s) => s.research.found.length >= n);
for (const n of [5, 20, 40]) add(`fail-${n}`, `실패는 감자의 어머니 ${n}`, `실패작 ${n}개`, (s) => s.research.fails.length >= n);
add("gamjatang", "뼈 국물", "감자탕 발견", (s) => s.research.found.includes("gamjatang"), true);
// 품종
for (const n of [3, 6, 10]) add(`var-${n}`, `품종 수집가 ${n}`, `품종 ${n}종`, (s) => s.farm.varieties.length >= n);
// 별점
add("rating-5", "만점 감자", "분점 별점 4.9 이상", (s) => s.branches.some((b) => b.rating >= 4.9));
add("rating-low", "위기", "분점 별점 1.5 이하", (s) => s.branches.some((b) => b.rating <= 1.5), true);
// 가격
add("price-max", "고가 전략", "가격 2배로 설정", (s) => s.branches.some((b) => b.priceMult >= 1.99), true);
add("price-min", "박리다매", "가격 0.6배로 설정", (s) => s.branches.some((b) => b.priceMult <= 0.61), true);
// 주문, 이벤트
for (const n of [1, 10, 50]) add(`order-${n}`, `주문 처리 ${n}`, `특별 주문 ${n}개 완료`, (s) => s.stats.ordersDone >= n);
add("rival-win", "경쟁 승리", "고구마 그룹 점유율 0%", (s) => s.rival.defeated);
// 회차
for (const n of [1, 3, 10, 25]) add(`reboot-${n}`, `리부트 ${n}회`, `브랜드 리부트 ${n}회`, (s) => s.prestige.reboots >= n);
add("rule", "도전", "회차 규칙을 걸고 리부트", (s) => s.prestige.rules.length > 0);
add("rule-all", "최고 난이도", "회차 규칙 4개 모두 걸기", (s) => s.prestige.rules.length >= 4, true);
// 엔딩, 신시장
add("ending", "세계 감자의 날", "엔딩 보기", (s) => s.ended);
for (const n of [1, 5, 10, 25, 50]) add(`nm-${n}`, `신시장 개척 ${n}`, `신시장 ${n}곳 진출`, (s) => s.bestMarket >= n);
// 손님
add("cust-all", "손님 도감 완성", "모든 손님 만나기", (s) => s.seenCustomers.length >= 11);
for (const n of [10, 25, 44]) add(`review-${n}`, `리뷰 수집 ${n}`, `리뷰 ${n}개 모으기`, (s) => s.reviews.length >= n);
// 시간
add("day-30", "한 달", "게임 내 30일", (s) => s.clock >= 30 * 24 * 20);
add("play-10h", "열 시간", "플레이 10시간", (s) => s.played >= 36000);

export const ACHIEVEMENTS = A;
export const ACH: Record<string, AchDef> = Object.fromEntries(A.map((a) => [a.id, a]));
