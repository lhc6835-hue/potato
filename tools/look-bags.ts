import { sheet, painterFor } from "./shot";
import { BAGS } from "../src/data/bags";
import { Bag } from "../src/game/bag";

const cols = 10, cw = 64, ch = 110;
const rows = Math.ceil(BAGS.length / cols);
const hurt = process.argv.includes("--hurt");
sheet(hurt ? "bags-hurt" : "bags", cols * cw, rows * ch, 2, (f) => {
  BAGS.forEach((d, i) => {
    const b = new Bag(d, 100, { boss: d.boss, seed: i + 3 });
    b.ax = (i % cols) * cw + cw / 2;
    b.ay = Math.floor(i / cols) * ch + 4;
    b.L = 14;
    b.entering = false;
    b.drop = 0;
    b.t = 0.7;
    if (hurt) { b.hp = 10; b.hurt = 0.2; }
    const p = painterFor(f);
    b.draw(p, () => {});
  });
});
