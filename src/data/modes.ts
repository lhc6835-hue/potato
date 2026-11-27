// 공격 방식 9종. 같은 방식의 무기는 같은 조작을 쓰고, 무기마다 특수 효과가 붙는다.
export type Mode = "tap" | "swipe" | "hold" | "charge" | "timing" | "throw" | "bow" | "rune" | "whirl";

export interface ModeDef {
  name: string;
  weapon: string;
  /** 조작 한 줄 설명 */
  how: string;
  /** 방식 계수: 한 번 맞힐 때의 기본 배율 (조작 빈도 차이를 맞춘다) */
  k: number;
  /** 한 번 맞힐 때 피버 게이지 증가량 */
  fever: number;
}

export const MODES: Record<Mode, ModeDef> = {
  tap: { name: "연타", weapon: "권갑", how: "탭! 탭! 빠르게 두드리세요", k: 1, fever: 1.1 },
  swipe: { name: "베기", weapon: "도검", how: "샌드백을 가로질러 스와이프!", k: 2.4, fever: 2.2 },
  hold: { name: "사격", weapon: "총기", how: "누르고 있으면 연사, 과열 주의", k: 0.6, fever: 0.55 },
  charge: { name: "강타", weapon: "둔기", how: "꾹 눌러 힘을 모았다가 놓기", k: 9, fever: 7 },
  timing: { name: "찌르기", weapon: "창", how: "링이 겹칠 때 탭! 퍼펙트를 노리세요", k: 4.2, fever: 4 },
  throw: { name: "투척", weapon: "투척 무기", how: "샌드백 쪽으로 튕기듯 던지기", k: 2.6, fever: 2.2 },
  bow: { name: "궁술", weapon: "활", how: "뒤로 당겼다가 놓기, 머리를 노리세요", k: 5.5, fever: 4.5 },
  rune: { name: "주문", weapon: "지팡이", how: "룬을 그리세요: 원 · 번개(Z) · 직선", k: 3, fever: 3.5 },
  whirl: { name: "휘두르기", weapon: "사슬 무기", how: "끌고 다니며 빙빙 돌려 후려치기", k: 2.6, fever: 2 },
};

export const MODE_ORDER: Mode[] = ["tap", "swipe", "hold", "charge", "timing", "throw", "bow", "rune", "whirl"];
