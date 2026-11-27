// 화면 UI: 위 HUD(재화·스테이지·체력·피버), 장면 아래 무기 칩, 탭 패널(무기·동료·시설·환생·상점·도감·설정).
import { useEffect, useState, useRef } from "preact/hooks";
import type { JSX } from "preact";
import { G } from "../game/world";
import * as St from "../game/state";
import { S } from "../game/state";
import * as A from "../game/actions";
import { WEAPONS, WEAPON, RARITY, WeaponDef } from "../data/weapons";
import { MODES, MODE_ORDER, Mode } from "../data/modes";
import { ELEM } from "../data/elements";
import { CREW, FACILITIES, TALENTS, ACHIEVEMENTS } from "../data/crew";
import { BAGS, REGIONS } from "../data/bags";
import { fmt, dur } from "../engine/num";
import { audio, applyVolumes, sfx, unlockAudio } from "../engine/audio";
import { weaponIcon, bagIcon, crewIcon, pix } from "./icons";
import { on } from "./bus";

type Tab = "arm" | "crew" | "fac" | "asc" | "shop" | "dex" | "opt";
const TABS: [Tab, string, string][] = [
  ["arm", "무기", "star"], ["crew", "동료", "soul"], ["fac", "시설", "coin"], ["asc", "환생", "soul"], ["shop", "상점", "gem"], ["dex", "도감", "chest"], ["opt", "설정", "stone"],
];

function useTick(ms: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((x) => x + 1), ms);
    const off = on((e) => { if (e === "ui" || e === "equip" || e === "stage" || e === "region") set((x) => x + 1); });
    return () => { clearInterval(id); off(); };
  }, [ms]);
}

const Icon = ({ src, size = 16, cls = "" }: { src: string; size?: number; cls?: string }) => <img class={"px " + cls} src={src} width={size} height={size} draggable={false} />;

function Btn(p: { onClick: () => void; disabled?: boolean; kind?: string; children: unknown }) {
  return (
    <button class={"btn " + (p.kind ?? "")} disabled={p.disabled} onClick={(e) => { e.stopPropagation(); unlockAudio(); p.onClick(); }}>
      {p.children as JSX.Element}
    </button>
  );
}
const Cost = ({ v, icon = "coin" }: { v: number; icon?: string }) => (
  <span class="cost"><Icon src={pix(icon)} size={12} />{fmt(v)}</span>
);

// ------------------------------------------------------------------ HUD
let dpsHist: number[] = [];
let lastDmg = 0;
function Hud() {
  useTick(100);
  const b = G.bag;
  const r = REGIONS[St.regionOf(S.stage)];
  const inRegion = ((S.stage - 1) % 50) + 1;
  const hp = b ? b.frac : 1;
  const ref = useRef<HTMLSpanElement>(null);
  const gref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const id = setInterval(() => {
      const d = S.stats.dmg - lastDmg;
      lastDmg = S.stats.dmg;
      dpsHist.push(d);
      if (dpsHist.length > 3) dpsHist = dpsHist.slice(-3);
      // 코인이 날아갈 목표: HUD 아이콘 위치
      const cv = document.querySelector("canvas.scene") as HTMLCanvasElement | null;
      if (cv && ref.current) {
        const cr = cv.getBoundingClientRect(), ir = ref.current.getBoundingClientRect();
        G.coinTarget = [((ir.left + ir.width / 2 - cr.left) / cr.width) * G.W, ((ir.top + ir.height / 2 - cr.top) / cr.height) * G.H];
        if (gref.current) { const gr = gref.current.getBoundingClientRect(); G.gemTarget = [((gr.left + gr.width / 2 - cr.left) / cr.width) * G.W, ((gr.top + gr.height / 2 - cr.top) / cr.height) * G.H]; }
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const dps = dpsHist.length ? dpsHist.reduce((a, c) => a + c, 0) / dpsHist.length : 0;
  const boss = G.bossMax > 0 && G.bossT > 0;
  const fever = G.fever > 0;
  return (
    <div class="hud">
      <div class="res">
        <span class="chip gold" ref={ref}><Icon src={pix("coin")} size={16} />{fmt(S.gold)}</span>
        <span class="chip gem" ref={gref}><Icon src={pix("gem")} size={14} />{fmt(S.gems)}</span>
        <span class="chip stone"><Icon src={pix("stone")} size={14} />{S.stones}</span>
        {S.soulsTotal > 0 && <span class="chip soul"><Icon src={pix("soul")} size={14} />{fmt(S.souls)}</span>}
        {S.boost > Date.now() && <span class="chip boost">골드 2배 {dur((S.boost - Date.now()) / 1000)}</span>}
      </div>
      <div class="stage">
        <div class="stage-top">
          <span class="region" style={{ color: r.accent }}>{r.name}</span>
          <span class="stg">{S.stage >= 351 ? `심연 ${S.stage - 350}층` : `${inRegion} / 50`}</span>
          <span class="dps">초당 {fmt(dps + St.totalCrewDps() * 0)}</span>
        </div>
        <div class={"hpbar" + (b?.boss ? " boss" : b?.elite ? " elite" : b?.golden ? " golden" : "")}>
          <div class="hpfill" style={{ width: `${hp * 100}%` }} />
          <span class="hptext">{b ? `${b.golden ? "황금 " : b.elite ? "정예 " : ""}${b.def.name}  ${fmt(Math.max(0, b.hp))}` : ""}</span>
        </div>
        {boss && <div class="timer"><div class="tfill" style={{ width: `${(G.bossT / G.bossMax) * 100}%` }} /><span>{G.bossT.toFixed(1)}초</span></div>}
        <div class={"fever" + (fever ? " on" : "")}>
          <div class="ffill" style={{ width: `${G.feverT}%` }} />
          <span>{fever ? `피버! 피해 x3 · 골드 x2  ${G.fever.toFixed(1)}` : "피버"}</span>
        </div>
        {S.bossFail && <button class="btn retry" onClick={() => { unlockAudio(); G.retryBoss(); }}>보스 재도전</button>}
      </div>
    </div>
  );
}

function WeaponBar({ openArm }: { openArm: () => void }) {
  useTick(80);
  const w = St.equipped();
  const h = G.ctl?.hud?.();
  const recents = A.recent.filter((id) => S.weapons[id] && id !== w.id).slice(0, 4);
  return (
    <div class="wbar">
      <div class="wcur" onClick={() => { unlockAudio(); openArm(); }}>
        <Icon src={weaponIcon(w)} size={34} />
        <div class="wtxt">
          <b style={{ color: RARITY[w.rarity].color }}>{w.name}{(S.weapons[w.id]?.enh ?? 0) > 0 ? ` +${S.weapons[w.id].enh}` : ""}</b>
          <small>{MODES[w.mode].name} · {MODES[w.mode].how}</small>
          {h && <div class={"gauge" + (h.warn ? " warn" : "")}><div style={{ width: `${h.v * 100}%` }} /><span>{h.label}</span></div>}
        </div>
      </div>
      <div class="quick">
        {recents.map((id) => (
          <button class="qslot" key={id} onClick={() => { unlockAudio(); A.equip(id); }} title={WEAPON[id].name}>
            <Icon src={weaponIcon(WEAPON[id])} size={26} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 탭
function MultBar() {
  return (
    <div class="mult">
      {([1, 10, 100, "max"] as A.Mult[]).map((m) => (
        <button class={"mbtn" + (A.mult === m ? " on" : "")} onClick={() => A.setMult(m)}>{m === "max" ? "최대" : `x${m}`}</button>
      ))}
    </div>
  );
}

function perHit(w: WeaponDef) { return St.weaponDmg(w) * St.dmgMul() * MODES[w.mode].k; }

function Armory() {
  const [mode, setMode] = useState<Mode | "all" | "own">("all");
  const list = WEAPONS.filter((w) => (mode === "all" ? true : mode === "own" ? !!S.weapons[w.id] : w.mode === mode));
  return (
    <div>
      <div class="filters">
        <button class={"fbtn" + (mode === "all" ? " on" : "")} onClick={() => setMode("all")}>전체</button>
        <button class={"fbtn" + (mode === "own" ? " on" : "")} onClick={() => setMode("own")}>보유</button>
        {MODE_ORDER.map((m) => <button class={"fbtn" + (mode === m ? " on" : "")} onClick={() => setMode(m)}>{MODES[m].name}</button>)}
      </div>
      <MultBar />
      <div class="cards">
        {list.map((w) => <WeaponCard w={w} key={w.id} />)}
      </div>
    </div>
  );
}

function WeaponCard({ w }: { w: WeaponDef }) {
  const st = S.weapons[w.id];
  const R = RARITY[w.rarity];
  const locked = !st;
  const reqOk = S.maxStage >= w.req;
  const equipped = S.equip === w.id;
  const E = ELEM[w.elem];
  if (locked && !reqOk)
    return (
      <div class="card dim" style={{ borderColor: R.glow }}>
        <div class="cicon sil"><Icon src={weaponIcon(w)} size={40} cls="silh" /></div>
        <div class="cbody">
          <b style={{ color: R.color }}>{R.name} · {MODES[w.mode].name}</b>
          <small>스테이지 {w.req} 도달 시 해금</small>
        </div>
      </div>
    );
  const bl = st ? A.bulk((lv) => St.weaponCost(w, lv), st.lv) : null;
  return (
    <div class={"card" + (equipped ? " eq" : "")} style={{ borderColor: equipped ? R.color : R.glow }}>
      <div class="cicon" style={{ boxShadow: `inset 0 0 12px ${R.glow}` }}><Icon src={weaponIcon(w)} size={40} /></div>
      <div class="cbody">
        <div class="ctitle">
          <b style={{ color: R.color }}>{w.name}</b>
          {st && st.enh > 0 && <span class="enh">+{st.enh}</span>}
          <span class="tag">{MODES[w.mode].name}</span>
          {w.elem !== "none" && <span class="tag" style={{ color: E.ui }}>{E.name}</span>}
        </div>
        <small class="desc">{w.desc}</small>
        <small class="stat">{st ? `Lv.${st.lv} · 한 방 ${fmt(perHit(w))}` : `한 방 ${fmt(St.weaponDmg(w, 1, 0) * St.dmgMul() * MODES[w.mode].k)}`}</small>
        <div class="cbtns">
          {locked ? (
            <Btn kind="buy" disabled={S.gold < St.unlockCost(w)} onClick={() => A.unlockWeapon(w.id)}>해금 <Cost v={St.unlockCost(w)} /></Btn>
          ) : (
            <>
              <Btn kind={equipped ? "on" : ""} disabled={equipped} onClick={() => A.equip(w.id)}>{equipped ? "장착 중" : "장착"}</Btn>
              <Btn kind="buy" disabled={!bl || S.gold < bl.cost} onClick={() => A.levelWeapon(w.id)}>Lv+{bl!.n} <Cost v={bl!.cost} /></Btn>
              {st.enh < St.ENH_MAX && (
                <Btn kind="enh" disabled={S.stones < St.enhanceCost(st.enh)} onClick={() => A.enhance(w.id)}>
                  강화 <Cost v={St.enhanceCost(st.enh)} icon="stone" /> <small>{Math.round(St.enhanceRate(st.enh) * 100)}%</small>
                </Btn>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CrewTab() {
  return (
    <div>
      <p class="note">동료는 자동으로 샌드백을 때리고, 자리를 비운 동안에도 골드를 벌어 옵니다. 현재 초당 <b>{fmt(St.totalCrewDps())}</b></p>
      <MultBar />
      <div class="cards">
        {CREW.map((c) => {
          const lv = S.crew[c.id] ?? 0, ok = S.maxStage >= c.req;
          if (!ok) return (
            <div class="card dim"><div class="cicon"><Icon src={crewIcon(c, true)} size={40} /></div><div class="cbody"><b>???</b><small>스테이지 {c.req} 도달 시 합류 가능</small></div></div>
          );
          const bl = A.bulk((l) => St.crewCost(c, l), lv);
          return (
            <div class="card">
              <div class="cicon"><Icon src={crewIcon(c)} size={40} /></div>
              <div class="cbody">
                <div class="ctitle"><b>{c.name}</b><span class="tag">{c.job}</span>{c.elem !== "none" && <span class="tag" style={{ color: ELEM[c.elem].ui }}>{ELEM[c.elem].name}</span>}</div>
                <small class="desc">{c.desc}</small>
                <small class="stat">{lv ? `Lv.${lv} · 초당 ${fmt(St.crewDps(c) * St.crewMul())}` : `초당 ${fmt(c.dps * St.crewMul())}`} {lv > 0 && `· 다음 2배까지 ${25 - (lv % 25)}`}</small>
                <div class="cbtns"><Btn kind="buy" disabled={S.gold < bl.cost} onClick={() => A.levelCrew(c.id)}>{lv ? `Lv+${bl.n}` : "고용"} <Cost v={bl.cost} /></Btn></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FacTab() {
  return (
    <div>
      <MultBar />
      <div class="cards">
        {FACILITIES.map((f) => {
          const lv = S.fac[f.id] ?? 0, max = lv >= f.max;
          const bl = A.bulk((l) => St.facCost(f, l), lv, f.max);
          const val = f.unit === "시간" ? `+${lv * f.per}시간` : f.unit === "%p" ? `+${(lv * f.per * 100).toFixed(0)}%p` : `+${Math.round(lv * f.per * 100)}%`;
          return (
            <div class="card">
              <div class="cicon"><Icon src={pix(["vault", "spring"].includes(f.id) ? "coin" : f.id === "storage" ? "chest" : f.id === "zen" || f.id === "drum" ? "star" : "stone")} size={30} /></div>
              <div class="cbody">
                <div class="ctitle"><b>{f.name}</b><span class="tag">Lv.{lv}/{f.max}</span></div>
                <small class="desc">{f.desc} {val}</small>
                <div class="cbtns">{max ? <span class="maxed">최대</span> : <Btn kind="buy" disabled={S.gold < bl.cost} onClick={() => A.levelFac(f.id)}>Lv+{bl.n} <Cost v={bl.cost} /></Btn>}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AscTab() {
  const [ask, setAsk] = useState(false);
  const gain = St.soulsFor(S.maxStage);
  return (
    <div>
      <div class="asc">
        <Icon src={pix("soul")} size={40} />
        <div>
          <b>환생</b>
          <p>스테이지 60부터 환생할 수 있습니다. 골드, 무기 레벨, 동료, 시설이 초기화되는 대신 영혼을 얻습니다. 영혼 하나당 모든 피해 +3% (평생 누적), 그리고 영혼 각인을 살 수 있습니다. 무기 소유·강화·보석·강화석은 유지됩니다.</p>
          <p>지금 환생하면 <b class="soulc">영혼 +{gain}</b> · 누적 영혼 {fmt(S.soulsTotal)} (피해 x{St.soulMul().toFixed(2)})</p>
          {!ask ? <Btn kind="asc" disabled={!St.canAscend() || gain <= 0} onClick={() => setAsk(true)}>{St.canAscend() ? "환생하기" : `스테이지 60 필요 (최고 ${S.maxStage})`}</Btn>
            : <div class="cbtns"><Btn kind="asc" onClick={() => { A.ascend(); setAsk(false); }}>정말 환생</Btn><Btn onClick={() => setAsk(false)}>취소</Btn></div>}
        </div>
      </div>
      <h4>영혼 각인 <small>보유 영혼 {fmt(S.souls)}</small></h4>
      <div class="cards">
        {TALENTS.map((t) => {
          const lv = S.tal[t.id] ?? 0, c = St.talCost(t, lv);
          return (
            <div class="card">
              <div class="cbody">
                <div class="ctitle"><b>{t.name}</b><span class="tag">Lv.{lv}/{t.max}</span></div>
                <small class="desc">{t.desc}</small>
                <div class="cbtns">{lv >= t.max ? <span class="maxed">최대</span> : <Btn kind="asc" disabled={S.souls < c} onClick={() => A.levelTalent(t.id)}>각인 <Cost v={c} icon="soul" /></Btn>}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShopTab() {
  const [got, setGot] = useState<string | null>(null);
  return (
    <div>
      <p class="note">보석은 보스 첫 처치, 보물 고블린, 보물 상자, 업적에서 얻습니다.</p>
      <div class="cards">
        {A.SHOP.map((s) => (
          <div class="card">
            <div class="cicon"><Icon src={pix(s.id === "chest" ? "chest" : s.id === "stones" ? "stone" : s.id === "boost" ? "boost" : "coin")} size={30} /></div>
            <div class="cbody">
              <b>{s.name}</b>
              <small class="desc">{s.desc}</small>
              <div class="cbtns"><Btn kind="gem" disabled={S.gems < s.gems} onClick={() => setGot(A.buyShop(s.id))}>구매 <Cost v={s.gems} icon="gem" /></Btn></div>
            </div>
          </div>
        ))}
      </div>
      {got && WEAPON[got] && (
        <div class="modal" onClick={() => setGot(null)}>
          <div class="mbox reveal">
            <small>상자에서 나온 무기</small>
            <Icon src={weaponIcon(WEAPON[got])} size={96} />
            <b style={{ color: RARITY[WEAPON[got].rarity].color }}>{RARITY[WEAPON[got].rarity].name} · {WEAPON[got].name}</b>
            <small>{WEAPON[got].desc}</small>
            <Btn kind="buy" onClick={() => { A.equip(got); setGot(null); }}>바로 장착</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function DexTab() {
  const [sub, setSub] = useState<"bag" | "ach">("bag");
  const cl = A.claimable();
  return (
    <div>
      <div class="filters">
        <button class={"fbtn" + (sub === "bag" ? " on" : "")} onClick={() => setSub("bag")}>샌드백 도감 {Object.keys(S.codex).length}/{BAGS.length}</button>
        <button class={"fbtn" + (sub === "ach" ? " on" : "")} onClick={() => setSub("ach")}>업적 {cl.length ? `(${cl.length})` : ""}</button>
      </div>
      {sub === "bag" ? (
        REGIONS.map((r) => (
          <div>
            <h4 style={{ color: r.accent }}>{r.name} <small>{r.sub}</small></h4>
            <div class="dex">
              {BAGS.filter((b) => b.region === r.id).map((b) => {
                const n = S.codex[b.id] ?? 0;
                return (
                  <div class={"dexc" + (b.boss ? " boss" : "")} title={n ? b.desc : "아직 만나지 못했다"}>
                    <Icon src={bagIcon(b, !n)} size={52} />
                    <small>{n ? b.name : "???"}</small>
                    {n > 0 && <small class="kills">{fmt(n)}개 파괴</small>}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <div class="cards">
          {ACHIEVEMENTS.map((a) => {
            const v = A.stat(a.stat), done = S.ach[a.id], ok = v >= a.goal;
            return (
              <div class={"card" + (done ? " dim" : "")}>
                <div class="cbody">
                  <div class="ctitle"><b>{a.name}</b>{done && <span class="tag">완료</span>}</div>
                  <small class="desc">{a.desc}</small>
                  <div class="prog"><div style={{ width: `${Math.min(100, (v / a.goal) * 100)}%` }} /><span>{fmt(Math.min(v, a.goal))} / {fmt(a.goal)}</span></div>
                  {!done && <div class="cbtns"><Btn kind="gem" disabled={!ok} onClick={() => A.claim(a.id)}>받기 <Cost v={a.gems} icon="gem" /></Btn></div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OptTab() {
  const [wipe, setWipe] = useState(false);
  const set = (f: () => void) => { f(); audio.sfx = S.opts.sfx; audio.music = S.opts.music; applyVolumes(); St.save(); };
  return (
    <div class="opts">
      <label>효과음 <input type="range" min="0" max="1" step="0.05" value={S.opts.sfx} onInput={(e) => set(() => (S.opts.sfx = +(e.target as HTMLInputElement).value))} /></label>
      <label>배경음 <input type="range" min="0" max="1" step="0.05" value={S.opts.music} onInput={(e) => set(() => (S.opts.music = +(e.target as HTMLInputElement).value))} /></label>
      <label>화면 흔들림 <input type="range" min="0" max="1.5" step="0.1" value={S.opts.shake} onInput={(e) => set(() => (S.opts.shake = +(e.target as HTMLInputElement).value))} /></label>
      <label><input type="checkbox" checked={S.opts.haptic} onChange={(e) => set(() => (S.opts.haptic = (e.target as HTMLInputElement).checked))} /> 진동</label>
      <label><input type="checkbox" checked={S.opts.dmgText} onChange={(e) => set(() => (S.opts.dmgText = (e.target as HTMLInputElement).checked))} /> 피해 숫자 표시</label>
      <div class="statgrid">
        <span>총 타격</span><b>{fmt(S.stats.hits)}</b>
        <span>부순 샌드백</span><b>{fmt(S.stats.breaks)}</b>
        <span>치명타</span><b>{fmt(S.stats.crits)}</b>
        <span>최고 스테이지</span><b>{S.best}</b>
        <span>누적 골드</span><b>{fmt(S.stats.gold)}</b>
        <span>환생</span><b>{S.stats.ascends}</b>
      </div>
      {!wipe ? <Btn kind="danger" onClick={() => setWipe(true)}>처음부터 다시 하기</Btn>
        : <div class="cbtns"><Btn kind="danger" onClick={() => { St.wipe(); location.reload(); }}>모든 진행을 지웁니다</Btn><Btn onClick={() => setWipe(false)}>취소</Btn></div>}
      <p class="credit">이펙트: patch-gg/pixelfx 코어(MIT)로 이 게임에서 새로 만든 효과 · 폰트: Galmuri (OFL) · 소리: WebAudio 합성</p>
    </div>
  );
}

function Panel({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  useTick(250);
  const badge: Partial<Record<Tab, boolean>> = {
    arm: WEAPONS.some((w) => !S.weapons[w.id] && S.maxStage >= w.req && S.gold >= St.unlockCost(w)),
    crew: CREW.some((c) => S.maxStage >= c.req && S.gold >= St.crewCost(c, S.crew[c.id] ?? 0)),
    asc: St.canAscend() && St.soulsFor(S.maxStage) > 0,
    dex: A.claimable().length > 0,
  };
  return (
    <div class="panel">
      <div class="tabs">
        {TABS.map(([id, name, ic]) => (
          <button class={"tab" + (tab === id ? " on" : "")} onClick={() => { unlockAudio(); sfx.click(); setTab(id); }}>
            <Icon src={pix(ic)} size={14} />{name}{badge[id] && <i class="dot" />}
          </button>
        ))}
      </div>
      <div class="pbody">
        {tab === "arm" && <Armory />}
        {tab === "crew" && <CrewTab />}
        {tab === "fac" && <FacTab />}
        {tab === "asc" && <AscTab />}
        {tab === "shop" && <ShopTab />}
        {tab === "dex" && <DexTab />}
        {tab === "opt" && <OptTab />}
      </div>
    </div>
  );
}

export function App({ offline, mount }: { offline: { secs: number; gold: number } | null; mount: (el: HTMLDivElement) => void }) {
  const [tab, setTab] = useState<Tab>("arm");
  const sref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (sref.current) mount(sref.current); }, []);
  const [off, setOff] = useState(offline);
  const [title, setTitle] = useState(S.stats.hits === 0);
  return (
    <div class="layout">
      <div class="scene-wrap" ref={sref}>
        <Hud />
        <WeaponBar openArm={() => setTab("arm")} />
      </div>
      <Panel tab={tab} setTab={setTab} />
      {off && (
        <div class="modal" onClick={() => { unlockAudio(); setOff(null); }}>
          <div class="mbox">
            <b>돌아오셨군요!</b>
            <small>{dur(off.secs)} 동안 동료들이 쉬지 않고 샌드백을 두드렸습니다.</small>
            <span class="big"><Icon src={pix("coin")} size={20} /> +{fmt(off.gold)}</span>
            <Btn kind="buy" onClick={() => setOff(null)}>받기</Btn>
          </div>
        </div>
      )}
      {title && (
        <div class="modal title" onClick={() => { unlockAudio(); setTitle(false); }}>
          <div class="mbox">
            <h1>샌드백<br />타이쿤</h1>
            <small>무기 61종 · 샌드백 37종 · 공격 방식 9가지</small>
            <small>샌드백을 두드려 골드를 벌고, 더 강한 무기로 더 깊은 곳까지!</small>
            <Btn kind="buy" onClick={() => setTitle(false)}>시작하기</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
