// 개발용 저장 데이터: node tools/mksave.cjs <장착 무기> [스테이지]
const ids = require("fs").readFileSync("src/data/weapons.ts", "utf8").match(/id: "([a-z0-9]+)"/g).map((s) => s.slice(5, -1));
const [, , eq = "fist0", stage = "12"] = process.argv;
const weapons = Object.fromEntries(ids.map((i) => [i, { lv: 10, enh: 0 }]));
const seen = {};
console.log(JSON.stringify({ v: 1, gold: 1e6, gems: 200, souls: 0, soulsTotal: 0, stones: 10, stage: +stage, maxStage: +stage, best: +stage, bossFail: false, weapons, equip: eq, crew: { squire: 5, archer: 3 }, fac: {}, tal: {}, stats: { hits: 5 }, ach: {}, codex: {}, boost: 0, last: Date.now(), opts: { sfx: 0, music: 0, haptic: false, shake: 1, dmgText: true }, seen }));
