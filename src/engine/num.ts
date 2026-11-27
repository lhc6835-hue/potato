// 큰 수 표기. UI는 한국식 단위(만·억·조…), 화면 속 픽셀 숫자는 K·M·B·T·aa…
const KO = ["", "만", "억", "조", "경", "해", "자", "양", "구", "간", "정", "재", "극", "항하사", "아승기", "나유타", "불가사의", "무량대수"];

export function fmt(n: number): string {
  if (!isFinite(n)) return "∞";
  if (n < 0) return "-" + fmt(-n);
  if (n < 10000) return n < 100 && n % 1 ? n.toFixed(1).replace(/\.0$/, "") : Math.floor(n).toLocaleString("ko-KR");
  const e = Math.floor(Math.log10(n) / 4);
  if (e >= KO.length) return n.toExponential(2).replace("+", "");
  const v = n / Math.pow(10, e * 4);
  const head = v >= 1000 ? Math.floor(v).toString() : v >= 100 ? v.toFixed(1) : v.toFixed(2);
  return head.replace(/\.?0+$/, "") + KO[e];
}

const EN = ["", "K", "M", "B", "T"];
export function short(n: number): string {
  if (n < 1000) return Math.max(1, Math.round(n)).toString();
  const e = Math.floor(Math.log10(n) / 3);
  let suf: string;
  if (e < EN.length) suf = EN[e];
  else {
    const k = e - EN.length;
    if (k >= 26 * 26) return n.toExponential(1).replace("+", "");
    suf = String.fromCharCode(97 + Math.floor(k / 26)) + String.fromCharCode(97 + (k % 26));
  }
  const v = n / Math.pow(10, e * 3);
  return (v >= 100 ? Math.floor(v).toString() : v.toFixed(1).replace(/\.0$/, "")) + suf.toUpperCase();
}

export const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;

export function dur(sec: number): string {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}시간 ${m}분`;
  if (m) return `${m}분 ${s}초`;
  return `${s}초`;
}
