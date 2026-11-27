// 게임 → UI 알림. UI는 대부분 주기적으로 다시 그리고, 즉시 반응할 것만 구독한다.
type Fn = (e: string) => void;
const subs = new Set<Fn>();
export function emit(e: string) { for (const f of subs) f(e); }
export function on(f: Fn) { subs.add(f); return () => { subs.delete(f); }; }
