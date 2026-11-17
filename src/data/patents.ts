// 특허 트리: 브랜드 리부트로 얻은 황금감자로 영구 해금.

export interface PatentDef {
  id: string;
  name: string;
  desc: string;
  branch: "prod" | "biz" | "lab" | "special";
  /** 레벨별 비용: base * grow^lv */
  base: number;
  grow: number;
  max: number;
  /** 선행 특허 */
  req?: string;
}

export const PATENTS: PatentDef[] = [
  { id: "speed", name: "고속 조리법", desc: "모든 라인 속도 +25% / 레벨", branch: "prod", base: 1, grow: 1.6, max: 25 },
  { id: "carry", name: "접이식 쟁반", desc: "덤웨이터 운반량 +30% / 레벨", branch: "prod", base: 1, grow: 1.6, max: 20 },
  { id: "serve", name: "셀프 계산대", desc: "카운터 처리량 +30% / 레벨", branch: "prod", base: 1, grow: 1.6, max: 20 },
  { id: "start", name: "종잣돈", desc: "리부트 시작 자금 ×10 / 레벨", branch: "biz", base: 2, grow: 2, max: 10 },
  { id: "price", name: "브랜드 가치", desc: "판매가 +10% / 레벨", branch: "biz", base: 2, grow: 1.7, max: 30, req: "start" },
  { id: "offline", name: "야간 근무 협약", desc: "오프라인 수익 시간 +2시간 / 레벨", branch: "biz", base: 3, grow: 1.8, max: 11 },
  { id: "franchise", name: "프랜차이즈 매뉴얼", desc: "새 분점 시작 레벨 +10% / 레벨", branch: "biz", base: 5, grow: 2, max: 5, req: "price" },
  { id: "rent", name: "부동산 감각", desc: "분점 개설 비용 -15% / 레벨", branch: "biz", base: 4, grow: 1.9, max: 5 },
  { id: "ideas", name: "브레인스토밍", desc: "아이디어 생산 +50% / 레벨", branch: "lab", base: 2, grow: 1.7, max: 10 },
  { id: "memory", name: "레시피 노트", desc: "리부트해도 발견한 레시피를 기억한다", branch: "lab", base: 10, grow: 1, max: 1, req: "ideas" },
  { id: "manager", name: "인맥", desc: "리부트 후에도 매니저 1명 유지 / 레벨", branch: "lab", base: 6, grow: 2.2, max: 5 },
  { id: "auto", name: "자동 발주", desc: "특별 주문을 자동 수락", branch: "special", base: 15, grow: 1, max: 1 },
  { id: "golden", name: "황금 종자", desc: "농장에서 황금감자를 키울 수 있다", branch: "special", base: 25, grow: 1, max: 1, req: "auto" },
  { id: "luck", name: "운수 좋은 날", desc: "좋은 이벤트 확률 +20% / 레벨", branch: "special", base: 4, grow: 1.8, max: 5 },
];
export const PATENT: Record<string, PatentDef> = Object.fromEntries(PATENTS.map((p) => [p.id, p]));
export const patentCost = (p: PatentDef, lv: number) => Math.ceil(p.base * Math.pow(p.grow, lv));

/** 회차 규칙 (핸디캡을 고르면 황금감자 추가) */
export const RULES = [
  { id: "nofry", name: "튀김기 금지", desc: "튀김 카테고리 메뉴를 만들 수 없다.", mult: 1.5 },
  { id: "pricey", name: "감자 파동", desc: "감자 시세가 항상 2배.", mult: 1.3 },
  { id: "strike", name: "매니저 파업", desc: "매니저를 고용할 수 없다.", mult: 2.0 },
  { id: "tiny", name: "좁은 건물", desc: "분점마다 최대 3층.", mult: 1.4 },
];
