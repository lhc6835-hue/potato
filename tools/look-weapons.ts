import { sheet, painterFor } from "./shot";
import { WEAPONS } from "../src/data/weapons";
import { drawWeapon } from "../src/art/weapons";
const cols = 8, cw = 60, ch = 40;
sheet("weapons", cols * cw, Math.ceil(WEAPONS.length / cols) * ch, 3, (f) => {
  WEAPONS.forEach((w, i) => {
    const p = painterFor(f);
    const long = w.mode === "timing" || w.mode === "charge";
    p.place((i % cols) * cw + (long ? 8 : 18), Math.floor(i / cols) * ch + 20, false, long ? -0.5 : w.mode === "tap" || w.mode === "throw" || w.mode === "bow" ? 0 : -0.6);
    drawWeapon(p, w, 0.3);
  });
});
