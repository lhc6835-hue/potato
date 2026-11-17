// 손님 종류와 한 줄 리뷰. 무표정하게, 적정선에서.

export interface CustomerDef {
  id: string;
  name: string;
  /** 등장 챕터 */
  chapter: number;
  weight: number;
  /** 외형: 피부, 머리, 옷, 하의, 소품 */
  look: { skin: string; hair: string; shirt: string; pants: string; acc?: "glasses" | "monocle" | "shades" | "cap" | "bag" | "hat" | "scarf" };
  hairStyle: 0 | 1 | 2 | 3 | 4;
  lines: string[];
}

export const CUSTOMERS: CustomerDef[] = [
  { id: "office", name: "직장인", chapter: 1, weight: 5, hairStyle: 0, look: { skin: "#e8c4a0", hair: "#2a2220", shirt: "#d8dce4", pants: "#3a4258" },
    lines: ["점심으로 딱 좋네요.", "빨리 나와서 좋아요.", "동료들 것도 사 갈게요.", "내일도 올게요."] },
  { id: "student", name: "대학생", chapter: 1, weight: 4, hairStyle: 1, look: { skin: "#f0cca8", hair: "#4a3020", shirt: "#6a8ac0", pants: "#2a3040", acc: "bag" },
    lines: ["가격이 착해요.", "양이 넉넉하네요.", "시험 기간엔 여기죠.", "친구한테 추천할게요."] },
  { id: "grandma", name: "할머니", chapter: 1, weight: 3, hairStyle: 2, look: { skin: "#e0b898", hair: "#d8d4cc", shirt: "#a85a6a", pants: "#4a3a3a", acc: "scarf" },
    lines: ["옛날 생각나는 맛이네.", "손주 주려고 샀어요.", "간이 딱 맞네.", "잘 먹고 가요."] },
  { id: "kid", name: "어린이", chapter: 3, weight: 2, hairStyle: 3, look: { skin: "#f4d4b4", hair: "#3a2a1a", shirt: "#e8b040", pants: "#4a6a9a", acc: "cap" },
    lines: ["케첩 더 주세요.", "맛있어요!", "엄마랑 또 올래요.", "이거 제일 좋아요."] },
  { id: "tourist", name: "관광객", chapter: 4, weight: 2, hairStyle: 4, look: { skin: "#f4d8c0", hair: "#c8a048", shirt: "#e87a6a", pants: "#d8c8a0", acc: "hat" },
    lines: ["여기 유명하다던데요.", "사진 찍어도 되죠?", "여행 와서 먹은 것 중에 최고예요.", "포장도 되나요?"] },
  { id: "worker", name: "공사장 아저씨", chapter: 4, weight: 2, hairStyle: 0, look: { skin: "#c89870", hair: "#1a1a1a", shirt: "#e88a2a", pants: "#4a4a4a", acc: "cap" },
    lines: ["든든하네요.", "하나 더 주세요.", "일하고 먹으니 꿀맛이네요.", "내일 또 옵니다."] },
  { id: "critic", name: "미식 평론가", chapter: 5, weight: 1, hairStyle: 0, look: { skin: "#ecc8a8", hair: "#5a4a3a", shirt: "#2a2a3a", pants: "#2a2a3a", acc: "monocle" },
    lines: ["식감이 좋군요.", "간이 균형 잡혀 있습니다.", "기본에 충실한 맛입니다.", "칼럼에 소개하겠습니다."] },
  { id: "spy", name: "수상한 손님", chapter: 7, weight: 1, hairStyle: 0, look: { skin: "#e0bc98", hair: "#2a1a2a", shirt: "#8a7a5a", pants: "#3a2a4a", acc: "shades" },
    lines: ["…맛있군.", "레시피가 궁금하네요.", "생각보다 잘하는군요.", "또 오겠습니다."] },
  { id: "chef", name: "다른 가게 셰프", chapter: 6, weight: 1, hairStyle: 1, look: { skin: "#ecc4a0", hair: "#1a1a1a", shirt: "#f4f4f0", pants: "#3a3a3a" },
    lines: ["튀김 온도가 정확하네요.", "재료가 신선하네요.", "배울 점이 많습니다.", "잘 먹었습니다."] },
  { id: "foreigner", name: "해외 손님", chapter: 10, weight: 2, hairStyle: 4, look: { skin: "#a87050", hair: "#1a1a1a", shirt: "#4aa07a", pants: "#2a3a4a" },
    lines: ["Very good!", "우리나라에도 생기면 좋겠어요.", "감자 요리 좋아해요.", "또 올게요."] },
  { id: "astronaut", name: "우주인", chapter: 12, weight: 1, hairStyle: 3, look: { skin: "#f0d0b0", hair: "#f4f4f4", shirt: "#e8e8ec", pants: "#c8c8d0" },
    lines: ["지구 음식이 그리웠어요.", "역시 감자는 감자네요.", "우주에서도 먹고 싶어요.", "잘 먹었습니다."] },
];
export const CUSTOMER: Record<string, CustomerDef> = Object.fromEntries(CUSTOMERS.map((c) => [c.id, c]));
