// 시뮬레이션 → 연출/UI 로 가는 가벼운 이벤트 버스.

type Fn = (d: any) => void;
const subs: Record<string, Fn[]> = {};

export const bus = {
  on(ev: string, fn: Fn) {
    (subs[ev] ??= []).push(fn);
    return () => {
      subs[ev] = subs[ev].filter((f) => f !== fn);
    };
  },
  emit(ev: string, d?: any) {
    for (const f of subs[ev] ?? []) f(d);
  },
};
