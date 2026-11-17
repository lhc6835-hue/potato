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
    lines: ["점심시간 40분 남았다.", "바삭하다. 그게 다다.", "부장님 몫도 산다. 식은 걸로.", "어제도 왔다. 내일도 올 것 같다."] },
  { id: "student", name: "대학생", chapter: 1, weight: 4, hairStyle: 1, look: { skin: "#f0cca8", hair: "#4a3020", shirt: "#6a8ac0", pants: "#2a3040", acc: "bag" },
    lines: ["과제하다 왔다. 과제는 안 했다.", "양이 많다. 가성비가 좋다.", "용돈의 절반을 썼다.", "친구한테 추천할 거다. 친구가 없다."] },
  { id: "grandma", name: "할머니", chapter: 1, weight: 3, hairStyle: 2, look: { skin: "#e0b898", hair: "#d8d4cc", shirt: "#a85a6a", pants: "#4a3a3a", acc: "scarf" },
    lines: ["우리 때는 감자를 그냥 쪄 먹었다.", "손주 주려고 샀다. 내가 먹었다.", "간이 딱 맞다.", "사장 양반 얼굴이 감자를 닮았다."] },
  { id: "kid", name: "어린이", chapter: 2, weight: 2, hairStyle: 3, look: { skin: "#f4d4b4", hair: "#3a2a1a", shirt: "#e8b040", pants: "#4a6a9a", acc: "cap" },
    lines: ["케첩 더 주세요.", "엄마가 하나만 사랬다. 두 개 샀다.", "감자는 원래 이렇게 생겼나.", "커서 감자 사장이 될 거다."] },
  { id: "tourist", name: "관광객", chapter: 3, weight: 2, hairStyle: 4, look: { skin: "#f4d8c0", hair: "#c8a048", shirt: "#e87a6a", pants: "#d8c8a0", acc: "hat" },
    lines: ["사진 찍었다. 먹는 건 나중에.", "가이드북에 없던 집이다.", "Potato. Good.", "고향 감자보다 낫다. 고향에 비밀이다."] },
  { id: "worker", name: "공사장 아저씨", chapter: 3, weight: 2, hairStyle: 0, look: { skin: "#c89870", hair: "#1a1a1a", shirt: "#e88a2a", pants: "#4a4a4a", acc: "cap" },
    lines: ["힘쓰려면 감자다.", "곱빼기 있나. 없으면 두 개.", "이 건물 내가 지은 거다. 아마도.", "감자는 배신하지 않는다."] },
  { id: "critic", name: "미식 평론가", chapter: 4, weight: 1, hairStyle: 0, look: { skin: "#ecc8a8", hair: "#5a4a3a", shirt: "#2a2a3a", pants: "#2a2a3a", acc: "monocle" },
    lines: ["흥미롭군. 감자가 감자다.", "별 네 개. 다섯 개는 내 마음속에.", "식감이… 정직하다.", "다음 칼럼 제목이 정해졌다. '감자'."] },
  { id: "spy", name: "수상한 손님", chapter: 6, weight: 1, hairStyle: 0, look: { skin: "#e0bc98", hair: "#2a1a2a", shirt: "#8a7a5a", pants: "#3a2a4a", acc: "shades" },
    lines: ["…고구마보다 낫군. 아니, 아무 말도 안 했다.", "나는 평범한 손님이다. 보라색을 좋아하는.", "레시피를 적는 게 아니다. 일기다.", "회장님께는 비밀이다."] },
  { id: "chef", name: "다른 가게 셰프", chapter: 5, weight: 1, hairStyle: 1, look: { skin: "#ecc4a0", hair: "#1a1a1a", shirt: "#f4f4f0", pants: "#3a3a3a" },
    lines: ["염탐하러 온 건 아니다. 맛있어서 왔다.", "우리 가게도 감자 써 볼까.", "튀김 온도가 몇 도인가. 안 알려줄 거 안다.", "인정한다. 조금만."] },
  { id: "foreigner", name: "해외 손님", chapter: 9, weight: 2, hairStyle: 4, look: { skin: "#a87050", hair: "#1a1a1a", shirt: "#4aa07a", pants: "#2a3a4a" },
    lines: ["우리나라 감자보다 둥글다.", "이름이 길다. 맛은 짧고 강하다.", "Gamja. I remember.", "본국에 분점을 내 달라. 진심이다."] },
  { id: "astronaut", name: "우주인", chapter: 11, weight: 1, hairStyle: 3, look: { skin: "#f0d0b0", hair: "#f4f4f4", shirt: "#e8e8ec", pants: "#c8c8d0" },
    lines: ["화성에서 먹던 감자보다 낫다.", "무중력에서도 케첩이 필요하다.", "지구는 감자처럼 생겼다. 위에서 보면.", "…맛있다."] },
];
export const CUSTOMER: Record<string, CustomerDef> = Object.fromEntries(CUSTOMERS.map((c) => [c.id, c]));
