// 판타지 RPG 배경음 4곡을 작곡해 오디오로 렌더한다 (헤드리스 Chromium의 OfflineAudioContext).
// 악기는 전부 직접 합성: 하프(뜯는 소리), 플루트(부드러운 사인+비브라토), 현악 패드, 종, 금관풍 리드, 북, 콘트라베이스, 잔향.
// 끝의 잔향 꼬리를 앞에 겹쳐 이음매 없이 반복되게 만들고, mp3로 저장한다. 사용: node tools/compose.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const { execSync } = require("child_process");

const SONGS = {
  // 수련장·숲: 밝은 D장조, 하프와 플루트
  town: { bpm: 92, lead: "flute", drums: "soft", pad: 0.05,
    chords: ["D", "A", "Bm", "G", "D", "A", "G", "A", "Bm", "G", "D", "A", "G", "A", "D", "D"],
    mel: [[[74,0,1],[76,1,.5],[78,1.5,.5],[76,2,1],[74,3,1]],[[73,0,1.5],[71,1.5,.5],[69,2,2]],[[71,0,1],[74,1,1],[78,2,1],[76,3,1]],[[74,0,2],[71,2,1],[69,3,1]],
      [[74,0,1],[76,1,.5],[78,1.5,.5],[81,2,1],[78,3,1]],[[76,0,1.5],[73,1.5,.5],[69,2,2]],[[71,0,1],[74,1,1],[76,2,1],[74,3,1]],[[73,0,3]],
      [[78,0,1],[81,1,1],[83,2,1],[81,3,1]],[[79,0,1.5],[78,1.5,.5],[76,2,2]],[[78,0,1],[76,1,1],[74,2,1],[76,3,1]],[[73,0,2],[69,2,2]],
      [[71,0,1],[74,1,1],[79,2,1.5],[78,3.5,.5]],[[76,0,1],[73,1,1],[76,2,1],[79,3,1]],[[78,0,1.5],[76,1.5,.5],[74,2,1],[73,3,1]],[[74,0,3]]] },
  // 광산·화산: 용맹한 D단조, 현악 스타카토와 금관, 전투 북
  quest: { bpm: 108, lead: "brass", drums: "war", pad: 0.04, staccato: true,
    chords: ["Dm", "C", "Bb", "C", "Dm", "C", "Bb", "A", "Dm", "F", "C", "Gm", "Bb", "C", "A", "A"],
    mel: [[[69,0,1.5],[74,1.5,.5],[72,2,1],[70,3,.5],[69,3.5,.5]],[[67,0,1],[72,1,1],[76,2,2]],[[74,0,1.5],[72,1.5,.5],[70,2,1],[67,3,1]],[[69,0,3],[72,3,1]],
      [[74,0,1.5],[77,1.5,.5],[76,2,1],[74,3,1]],[[72,0,1],[76,1,1],[79,2,2]],[[77,0,1],[74,1,1],[70,2,1],[72,3,1]],[[73,0,4]],
      [[81,0,2],[79,2,1],[77,3,1]],[[76,0,1.5],[77,1.5,.5],[72,2,2]],[[74,0,1],[76,1,1],[79,2,1],[76,3,1]],[[74,0,2],[70,2,2]],
      [[77,0,1],[76,1,1],[74,2,1],[72,3,1]],[[76,0,1],[74,1,1],[72,2,1],[70,3,1]],[[69,0,1],[73,1,1],[76,2,1],[79,3,1]],[[81,0,2],[76,2,1],[73,3,1]]] },
  // 얼음 협곡·하늘섬: 몽환적인 E장조(리디안), 종과 패드
  sky: { bpm: 72, lead: "bell", drums: "none", pad: 0.09,
    chords: ["E", "A", "C#m", "A", "E", "F#", "A", "B", "E", "A", "C#m", "A", "E", "F#", "A", "B"],
    mel: [[[80,0,2],[83,2,2]],[[81,0,3],[78,3,1]],[[80,0,2],[76,2,2]],[[78,0,4]],[[76,0,1],[78,1,1],[80,2,2]],[[82,0,2],[80,2,2]],[[81,0,2],[78,2,2]],[[75,0,4]],
      [[83,0,2],[88,2,2]],[[85,0,3],[83,3,1]],[[80,0,2],[83,2,2]],[[81,0,4]],[[80,0,1],[81,1,1],[83,2,2]],[[82,0,2],[78,2,2]],[[81,0,2],[80,2,1],[78,3,1]],[[76,0,4]]] },
  // 마왕성·심연: 어두운 C단조(프리지안), 저음 현과 합창, 종소리
  dark: { bpm: 80, lead: "oboe", drums: "doom", pad: 0.07, staccato: true, choir: true,
    chords: ["Cm", "Ab", "Fm", "G", "Cm", "Ab", "Db", "G", "Cm", "Eb", "Ab", "G", "Fm", "Db", "G", "G"],
    mel: [[[72,0,2],[75,2,1],[74,3,1]],[[72,0,3],[68,3,1]],[[68,0,1],[72,1,1],[77,2,2]],[[75,0,2],[74,2,1],[71,3,1]],[[72,0,4]],[[75,0,2],[77,2,2]],[[79,0,2],[77,2,1],[73,3,1]],[[74,0,2],[71,2,2]],
      [[79,0,2],[80,2,1],[79,3,1]],[[75,0,2],[79,2,2]],[[80,0,1.5],[79,1.5,.5],[77,2,2]],[[74,0,4]],[[77,0,2],[80,2,2]],[[77,0,1],[73,1,1],[72,2,2]],[[71,0,2],[74,2,1],[77,3,1]],[[79,0,2],[74,2,1],[71,3,1]]] },
};

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  fs.mkdirSync("src/sfx", { recursive: true });
  for (const [name, song] of Object.entries(SONGS)) {
    const b64 = await page.evaluate(async (song) => {
      const SR = 44100, NOTE = { C: 0, "C#": 1, Db: 1, D: 2, Eb: 3, E: 4, F: 5, "F#": 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
      const beat = 60 / song.bpm, bar = beat * 4, loop = bar * song.chords.length, tail = 4;
      const ctx = new OfflineAudioContext(2, Math.ceil(SR * (loop + tail)), SR);
      const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
      // 잔향: 지수적으로 사라지는 노이즈 임펄스 (좌우 다르게)
      const rev = ctx.createConvolver(), L = SR * 2.8, ir = ctx.createBuffer(2, L, SR);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 3.2); }
      rev.buffer = ir;
      const master = ctx.createGain(); master.gain.value = 0.9;
      const dry = ctx.createGain(), wet = ctx.createGain();
      dry.gain.value = 0.8; wet.gain.value = song.lead === "bell" ? 0.5 : 0.32;
      dry.connect(master); wet.connect(rev); rev.connect(master); master.connect(ctx.destination);
      const out = (pan, sendRev = 1) => { const g = ctx.createGain(), p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(dry); const s = ctx.createGain(); s.gain.value = sendRev; p.connect(s); s.connect(wet); return g; };
      const noiseBuf = ctx.createBuffer(1, SR, SR); { const d = noiseBuf.getChannelData(0); for (let i = 0; i < SR; i++) d[i] = Math.random() * 2 - 1; }
      const chordNotes = (c) => { const m = c.match(/^([A-G][b#]?)(m?)$/); const r = NOTE[m[1]]; return [r, r + (m[2] ? 3 : 4), r + 7]; };
      const env = (g, t, a, peak, hold, rel) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel); };

      // 악기들
      const harp = (m, t, v, pan) => { // 뜯는 줄: 삼각파 + 배음, 빠른 감쇠, 저역 통과
        const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = "triangle"; o2.type = "sine"; o.frequency.value = hz(m); o2.frequency.value = hz(m) * 2;
        f.type = "lowpass"; f.frequency.setValueAtTime(4000, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.6);
        const g2 = ctx.createGain(); g2.gain.value = 0.3; o2.connect(g2); g2.connect(f);
        o.connect(f); f.connect(g); g.connect(out(pan, 1.2));
        env(g, t, 0.004, v, 0, 1.6); o.start(t); o2.start(t); o.stop(t + 1.8); o2.stop(t + 1.8);
      };
      const flute = (m, t, d, v) => {
        const o = ctx.createOscillator(), vib = ctx.createOscillator(), vg = ctx.createGain(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = "sine"; o.frequency.value = hz(m); vib.frequency.value = 5.2; vg.gain.value = hz(m) * 0.006;
        vib.connect(vg); vg.connect(o.frequency);
        const n = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain(); n.buffer = noiseBuf; nf.type = "bandpass"; nf.frequency.value = hz(m) * 2; nf.Q.value = 2; ng.gain.value = 0.04;
        n.connect(nf); nf.connect(ng); ng.connect(g);
        f.type = "lowpass"; f.frequency.value = 3000; o.connect(f); f.connect(g); g.connect(out(0.1, 1));
        env(g, t, 0.06, v, Math.max(0, d - 0.12), 0.25); for (const x of [o, vib, n]) { x.start(t); x.stop(t + d + 0.4); }
      };
      const brass = (m, t, d, v) => {
        const g = ctx.createGain(), f = ctx.createBiquadFilter();
        f.type = "lowpass"; f.Q.value = 1; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(2200, t + 0.08); f.frequency.linearRampToValueAtTime(1400, t + d);
        for (const det of [-6, 6]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz(m); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + d + 0.3); }
        f.connect(g); g.connect(out(-0.1, 0.9)); env(g, t, 0.04, v * 0.5, Math.max(0, d - 0.1), 0.2);
      };
      const oboe = (m, t, d, v) => {
        const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
        o.type = "square"; o.frequency.value = hz(m); vib.frequency.value = 4.6; vg.gain.value = hz(m) * 0.005; vib.connect(vg); vg.connect(o.frequency);
        f.type = "bandpass"; f.frequency.value = 1100; f.Q.value = 1.3; o.connect(f); f.connect(g); g.connect(out(0.15, 1));
        env(g, t, 0.07, v * 0.7, Math.max(0, d - 0.12), 0.3); o.start(t); vib.start(t); o.stop(t + d + 0.5); vib.stop(t + d + 0.5);
      };
      const bell = (m, t, v, pan = 0) => { // 종·첼레스타: 비화성 배음
        for (const [r, a, dec] of [[1, 1, 2.4], [2.76, 0.35, 1.2], [5.4, 0.12, 0.6], [2, 0.25, 1.8]]) {
          const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = hz(m) * r; o.connect(g); g.connect(out(pan, 1.4));
          env(g, t, 0.002, v * a, 0, dec); o.start(t); o.stop(t + dec + 0.1);
        }
      };
      const pad = (notes, t, d, v, choir) => { // 현악·합창 패드: 느린 시작, 살짝 어긋난 톱니파
        const g = ctx.createGain(), f = ctx.createBiquadFilter();
        f.type = choir ? "bandpass" : "lowpass"; f.frequency.value = choir ? 750 : 1300; f.Q.value = choir ? 1.5 : 0.7;
        for (const m of notes) for (const det of [-9, 9]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz(m); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + d + 1.2); }
        f.connect(g); g.connect(out(0, 1.3)); env(g, t, d * 0.35, v, d * 0.4, d * 0.5);
      };
      const bass = (m, t, d, v) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = "triangle"; o.frequency.value = hz(m);
        f.type = "lowpass"; f.frequency.value = 600; o.connect(f); f.connect(g); g.connect(out(0, 0.3)); env(g, t, 0.02, v, d * 0.6, d * 0.5); o.start(t); o.stop(t + d + 0.6);
      };
      const stacc = (m, t, v) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = "sawtooth"; o.frequency.value = hz(m);
        f.type = "lowpass"; f.frequency.value = 1600; o.connect(f); f.connect(g); g.connect(out(-0.2, 0.8)); env(g, t, 0.01, v, 0.06, 0.12); o.start(t); o.stop(t + 0.3);
      };
      const drum = (t, v, pitch = 90, dec = 0.35) => { // 프레임 드럼·팀파니
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(pitch * 1.6, t); o.frequency.exponentialRampToValueAtTime(pitch, t + 0.08);
        o.connect(g); g.connect(out(0, 0.6)); env(g, t, 0.003, v, 0, dec); o.start(t); o.stop(t + dec + 0.1);
        const n = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain(); n.buffer = noiseBuf; nf.type = "lowpass"; nf.frequency.value = 900;
        n.connect(nf); nf.connect(ng); ng.connect(out(0, 0.6)); env(ng, t, 0.002, v * 0.25, 0, 0.08); n.start(t); n.stop(t + 0.2);
      };
      const shaker = (t, v) => { const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); n.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = 6000; n.connect(f); f.connect(g); g.connect(out(0.3, 0.5)); env(g, t, 0.005, v, 0, 0.06); n.start(t, Math.random() * 0.5); n.stop(t + 0.1); };

      song.chords.forEach((c, bi) => {
        const t0 = bi * bar, [r, third, fifth] = chordNotes(c);
        const root = 48 + r, lo = r >= 7 ? root - 12 : root;
        // 패드
        pad([lo + 12, lo + 12 + (third - r), lo + 12 + (fifth - r)], t0, bar, song.pad, song.choir);
        // 베이스
        bass(lo - 12, t0, beat * 2, 0.2); bass(lo - 12 + 7, t0 + beat * 2, beat * 2, 0.16);
        // 반주
        const arp = [0, 7, 12, 12 + (third - r), 24, 12 + (third - r), 12, 7];
        if (song.staccato) for (let k = 0; k < 8; k++) stacc(lo + (k % 4 === 3 ? 7 : 0) + (song.lead === "oboe" ? -12 : 0), t0 + k * beat / 2, song.lead === "oboe" ? 0.09 : 0.08);
        if (song.lead !== "brass") for (let k = 0; k < 8; k++) harp(lo + arp[k], t0 + k * beat / 2 + (song.lead === "bell" ? 0 : 0), song.lead === "bell" ? 0.1 : 0.13, (k % 2 ? 0.35 : -0.35));
        // 멜로디
        for (const [m, b, d] of song.mel[bi]) {
          const t = t0 + b * beat, dd = d * beat;
          if (song.lead === "flute") flute(m, t, dd, 0.2);
          else if (song.lead === "brass") brass(m - 12, t, dd, 0.22);
          else if (song.lead === "oboe") oboe(m - 12, t, dd, 0.2);
          else bell(m, t, 0.16, (b % 2 ? 0.25 : -0.25));
        }
        // 타악
        if (song.drums === "soft") { drum(t0, 0.24, 110); drum(t0 + beat * 2.5, 0.15, 120); for (let k = 0; k < 8; k++) shaker(t0 + k * beat / 2, k % 2 ? 0.03 : 0.05); }
        if (song.drums === "war") { for (const [b, v] of [[0, 0.36], [1.5, 0.2], [2, 0.3], [3, 0.2], [3.5, 0.24]]) drum(t0 + b * beat, v, 70, 0.5); for (let k = 0; k < 8; k++) shaker(t0 + k * beat / 2, 0.04); }
        if (song.drums === "doom") { drum(t0, 0.4, 55, 0.9); if (bi % 2 === 1) drum(t0 + beat * 2, 0.28, 50, 0.9); if (bi % 2 === 0) bell(36 + r, t0, 0.12); }
        if (song.lead === "bell" && bi % 4 === 0) bell(64 + r - 12, t0, 0.07);
      });
      const buf = await ctx.startRendering();
      // 꼬리를 앞쪽에 겹쳐 이음매 없는 루프로
      const N = Math.round(loop * SR), pcm = new Int16Array(N * 2);
      const chs = [buf.getChannelData(0), buf.getChannelData(1)];
      let peak = 0;
      for (const c of chs) { for (let i = 0; i < buf.length - N; i++) c[i] += c[N + i]; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(c[i])); }
      const k = 0.89 / peak;
      for (let i = 0; i < N; i++) for (let ch = 0; ch < 2; ch++) pcm[i * 2 + ch] = Math.max(-32767, Math.min(32767, chs[ch][i] * k * 32767));
      let s = ""; const u8 = new Uint8Array(pcm.buffer);
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(s);
    }, song);
    const pcm = Buffer.from(b64, "base64"), hdr = Buffer.alloc(44);
    hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write("WAVEfmt ", 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
    hdr.writeUInt32LE(44100, 24); hdr.writeUInt32LE(44100 * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write("data", 36); hdr.writeUInt32LE(pcm.length, 40);
    const wav = `records/bgm-${name}.wav`;
    fs.mkdirSync("records", { recursive: true });
    fs.writeFileSync(wav, Buffer.concat([hdr, pcm]));
    execSync(`ffmpeg -loglevel error -y -i ${wav} -b:a 96k src/sfx/bgm_${name}.mp3`);
    console.log(name, (pcm.length / 4 / 44100).toFixed(1) + "s", fs.statSync(`src/sfx/bgm_${name}.mp3`).size);
  }
  await browser.close();
}
main();
