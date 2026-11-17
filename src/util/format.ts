// 큰 숫자를 한국식 단위로: 1.23만, 45.6억, 7.89조 ... 그 뒤는 aa, ab ...

const UNITS = ["", "만", "억", "조", "경", "해", "자", "양", "구", "간", "정", "재", "극"];

export function won(n: number, digits = 3): string {
  return fmt(n, digits) + "원";
}

export function fmt(n: number, digits = 3): string {
  if (!isFinite(n)) return "∞";
  if (n < 0) return "-" + fmt(-n, digits);
  if (n < 10000) return n < 100 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toLocaleString("ko-KR");
  const e = Math.floor(Math.log10(n) / 4);
  if (e < UNITS.length) {
    const v = n / Math.pow(10, e * 4);
    return trim(v, digits) + UNITS[e];
  }
  // 극 이후: 알파벳 두 글자 단위 (만 단위마다)
  const k = e - UNITS.length;
  const a = String.fromCharCode(97 + Math.floor(k / 26) % 26), b = String.fromCharCode(97 + (k % 26));
  return trim(n / Math.pow(10, e * 4), digits) + a + b;
}

function trim(v: number, digits: number) {
  const s = v >= 1000 ? Math.floor(v).toString() : v.toPrecision(digits);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/** 초당 표기 */
export const perSec = (n: number) => fmt(n) + "/초";

export function duration(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;

/** 개수 표기: 소수점 버림 */
export const cnt = (n: number) => fmt(Math.floor(n + 1e-9));
