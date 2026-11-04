import {
  DEF,
  PATH,
  SLOTS,
  enemyPoint,
  towerRange,
  type Game,
  type TowerId,
  type EnemyKind,
} from "./engine";
import type { Wheel } from "./feed";

export const W = 900,
  H = 570;
type Ctx = CanvasRenderingContext2D;
const C = {
  ink: "#39281f",
  soil: "#956943",
  dirt: "#a7774b",
  light: "#d29c60",
  dark: "#734d33",
  tunnel: "#543b2c",
  gold: "#f1ba50",
  cream: "#ffedc2",
  green: "#718b4f",
};
const rect = (
  c: Ctx,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};
const line = (
  c: Ctx,
  color: string,
  x: number,
  y: number,
  xx: number,
  yy: number,
  width = 3,
) => {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(xx, yy);
  c.stroke();
};
function sprite(
  c: Ctx,
  rows: string[],
  palette: Record<string, string>,
  x: number,
  y: number,
  s = 3,
  flip = false,
) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  if (flip) c.scale(-1, 1);
  rows.forEach((row, j) =>
    [...row].forEach((v, i) => {
      if (palette[v])
        rect(
          c,
          palette[v],
          (i - row.length / 2) * s,
          (j - rows.length / 2) * s,
          s,
          s,
        );
    }),
  );
  c.restore();
}
const HAMSTER = [
  "..bb......bb..",
  "..bcc....ccb..",
  "..bbboooobbb..",
  ".booooooooob..",
  "boooooccoooob.",
  "boobooocoobob.",
  "boobooocoobob.",
  "boocccccccoob.",
  ".bcccppcccb..",
  "..bccppccb...",
  "...bbbbbb....",
  "..bb....bb...",
];
export function drawHamster(c: Ctx, x: number, y: number, size = 3) {
  sprite(
    c,
    HAMSTER,
    { b: "#69402b", o: "#d8984b", c: "#fff0c9", p: "#b86759" },
    x,
    y,
    size,
  );
}
export function drawTower(
  c: Ctx,
  type: TowerId,
  x: number,
  y: number,
  scale = 1,
  level = 1,
  off = false,
) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(scale, scale);
  const electric = DEF[type].family === "Electric";
  rect(c, "#382b24", -21, 14, 42, 10);
  rect(c, "#c69a68", -24, 12, 48, 6);
  if (type === "spark") {
    rect(c, "#526f65", -12, -17, 24, 31);
    rect(c, "#344e48", -7, -22, 14, 37);
    for (let i = 0; i < 4; i++) {
      rect(c, "#d8a75c", -16, -14 + i * 7, 32, 4);
      rect(c, "#fff0b5", -16, -14 + i * 7, 7, 3);
    }
    rect(c, off ? "#a6a28b" : "#ffe09b", -8, -27, 16, 7);
    rect(c, "#6c4d35", -2, -34, 4, 8);
  } else if (type === "lamp") {
    rect(c, "#6b583b", -4, -26, 8, 41);
    rect(c, "#e8b35c", -16, -26, 32, 26);
    rect(c, off ? "#b3a27d" : "#fff1b3", -11, -22, 22, 17);
    rect(c, "#5b6243", -20, -30, 40, 5);
    rect(c, "#604b31", -3, -32, 6, 31);
    rect(c, "#d19647", -13, -1, 26, 5);
  } else if (type === "fence") {
    for (const xx of [-18, 18]) {
      rect(c, "#6f8d7b", xx - 4, -24, 8, 38);
      rect(c, "#f1ce75", xx - 6, -28, 12, 7);
    }
    for (const yy of [-16, -4, 7]) {
      rect(c, off ? "#ac9b76" : "#ffe09b", -16, yy, 32, 3);
    }
  } else if (type === "catapult") {
    rect(c, "#6f492e", -17, -1, 11, 18);
    rect(c, "#caa06a", 6, -18, 7, 33);
    c.save();
    c.rotate(-0.55);
    rect(c, "#e2b77a", -5, -27, 6, 45);
    rect(c, "#69442c", -10, -29, 18, 8);
    rect(c, "#e7c561", -6, -36, 10, 9);
    c.restore();
    rect(c, "#755130", -21, 5, 40, 7);
    for (const xx of [-15, 12]) {
      rect(c, "#39281f", xx - 5, 11, 12, 12);
      rect(c, "#bc8951", xx - 2, 14, 6, 6);
    }
  } else if (type === "honey") {
    rect(c, "#a5692e", -16, -12, 32, 26);
    rect(c, "#e0a440", -20, -7, 40, 18);
    rect(c, "#f4c85b", -20, -7, 40, 6);
    rect(c, "#fff0a7", -14, -5, 13, 3);
    rect(c, "#795139", -14, -18, 28, 7);
    rect(c, "#eac17b", -10, -21, 20, 4);
    rect(c, "#f3c751", 12, 1, 7, 16);
    rect(c, "#f3c751", -23, 16, 47, 5);
  } else {
    rect(c, "#6c7b5e", -15, -10, 29, 25);
    rect(c, "#a8b68a", -10, -5, 19, 15);
    rect(c, "#c0ac7d", 6, -25, 10, 28);
    rect(c, "#6a523a", 4, -29, 18, 8);
    rect(c, "#c6a169", -22, -5, 10, 8);
    rect(c, "#e9ce92", -27, -8, 8, 14);
    rect(c, "#39281f", -5, 1, 7, 8);
  }
  for (let i = 0; i < level; i++)
    rect(
      c,
      electric ? "#ffe2a0" : "#d6e2a9",
      -8 + i * 7 - (level - 1) * 3,
      26,
      4,
      4,
    );
  c.restore();
}
const ENEMIES: Record<EnemyKind, string[]> = {
  beetle: [
    "....aa....",
    "..abbbba..",
    ".abbbbbba.",
    "aabbcbbbaa",
    "..bbcbbb..",
    "aabbbbbbaa",
    ".abbbbbba.",
    "..abbbba..",
    ".a.a..a.a.",
  ],
  snake: [
    "...........ggg..",
    "..........ggcgg.",
    ".ggg.....ggggag.",
    "ggcgg...gg..ggg.",
    "gg.gg..gg.......",
    ".gg.gggg........",
    "..ggggg.........",
  ],
  owl: [
    "a.........a",
    "aab.....baa",
    ".abb...bba.",
    "..bbbbbbb..",
    "..bcabacb..",
    "..bcabacb..",
    "...bbgbb...",
    "...bbbbb...",
    "....a.a....",
  ],
  weasel: [
    ".........a..a..",
    "........abbaab.",
    "..aaaaaaaaaaaa.",
    ".abbbbbbbbbbcaa",
    "abbbbbbbbbbbbaa",
    "aabbbccccccaaa.",
    "...aaccaaa.....",
    "...aa...aa.....",
  ],
};
function drawEnemy(
  c: Ctx,
  kind: EnemyKind,
  x: number,
  y: number,
  facing: number,
  time: number,
  slow: boolean,
) {
  const bob = Math.floor(Math.sin(time * 13 + x) * 2);
  rect(c, "#3e302744", x - 17, y + 12, 34, 5);
  sprite(
    c,
    ENEMIES[kind],
    kind === "beetle"
      ? { a: "#412e29", b: "#b85b43", c: "#e8a768" }
      : kind === "snake"
        ? { g: "#8caa63", c: "#c4d78c", a: "#332d24" }
        : kind === "owl"
          ? { a: "#3c2e29", b: "#b58b62", c: "#ffedbc", g: "#e1b24f" }
          : { a: "#483126", b: "#cf9c6b", c: "#fff0cc" },
    x,
    y - 2 + bob,
    kind === "weasel" ? 3.4 : 3,
    facing < 0,
  );
  if (slow) rect(c, "#edbb54", x - 14, y + 16, 28, 3);
}
function mushroom(c: Ctx, x: number, y: number, color = "#dba864") {
  rect(c, "#e8cda0", x - 2, y - 9, 5, 10);
  rect(c, color, x - 10, y - 13, 21, 5);
  rect(c, color, x - 6, y - 18, 13, 6);
  rect(c, "#fbe6b9", x - 5, y - 14, 4, 3);
  rect(c, "#fbe6b9", x + 5, y - 11, 3, 2);
}
function lantern(c: Ctx, x: number, y: number) {
  rect(c, "#e9b85918", x - 24, y - 20, 48, 50);
  rect(c, "#e9b85916", x - 15, y - 12, 30, 34);
  line(c, "#492f24", x, y - 22, x, y - 8, 3);
  rect(c, "#493525", x - 7, y - 10, 14, 4);
  rect(c, "#ebad4b", x - 6, y - 6, 12, 14);
  rect(c, "#ffe5a0", x - 3, y - 4, 6, 10);
  rect(c, "#493525", x - 7, y + 8, 14, 3);
}
function drawLandscape(c: Ctx) {
  rect(c, "#e8dbb5", 0, 0, W, H);
  // Surface: quiet morning sky, stepped hills, wildflowers, and a tiny entrance sign.
  rect(c, "#d3c99f", 0, 68, W, 24);
  rect(c, "#bbc090", 590, 56, 310, 35);
  rect(c, "#bbc090", 640, 40, 160, 45);
  rect(c, "#f4cc76", 744, 19, 35, 35);
  rect(c, "#f4cc76", 737, 26, 49, 21);
  rect(c, "#f7efd7", 335, 28, 72, 10);
  rect(c, "#f7efd7", 352, 20, 28, 10);
  rect(c, "#f7efd7", 515, 43, 70, 8);
  rect(c, "#f7efd7", 529, 35, 28, 10);
  rect(c, C.soil, 0, 89, W, H - 89);
  rect(c, "#a7784b", 0, 89, W, 150);
  rect(c, "#966940", 0, 239, W, 158);
  rect(c, "#825b3b", 0, 397, W, 173);
  rect(c, "#6d8550", 0, 81, W, 11);
  rect(c, "#9caa64", 0, 78, W, 5);
  rect(c, "#c5c181", 0, 78, W, 2);
  for (let i = 0; i < 85; i++) {
    const x = (i * 73 + 11) % 900;
    rect(
      c,
      i % 3 ? "#708749" : "#a3ad68",
      x,
      72 - (i % 4) * 2,
      3,
      9 + (i % 4) * 2,
    );
    if (i % 9 === 0) {
      rect(c, "#ead291", x - 2, 68 - (i % 4) * 2, 7, 5);
      rect(c, "#b98841", x, 69 - (i % 4) * 2, 3, 3);
    }
  }
  for (let i = 0; i < 950; i++) {
    const x = (i * 97 + 17) % 900,
      y = 96 + ((i * 53 + 19) % 472);
    rect(
      c,
      i % 5 === 0 ? "#d2a17033" : i % 3 ? "#5a3d2a22" : "#e5b57533",
      x,
      y,
      (i % 4) + 2,
      (i % 3) + 1,
    );
  }
  // Roots and little strata make this a side-on burrow rather than a flat maze.
  for (const [x, len] of [
    [130, 40],
    [300, 24],
    [610, 35],
    [840, 73],
  ]) {
    line(c, "#694a32", x, 92, x - 9, 92 + len, 4);
    line(c, "#694a32", x - 5, 106, x + 14, 120, 3);
  }
  const path = (color: string, width: number, offset = 0) => {
    c.lineWidth = width;
    c.strokeStyle = color;
    c.lineCap = "square";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(PATH[0][0], PATH[0][1] + offset);
    for (const [x, y] of PATH.slice(1)) c.lineTo(x, y + offset);
    c.stroke();
  };
  path("#c1955e", 67, 4);
  path("#63442e", 63);
  path("#3f2d24", 51);
  path("#59402d", 43, 2);
  // A far surface shaft for diving owls.
  rect(c, "#6b4b33", 767, 78, 46, 43);
  rect(c, "#493326", 774, 78, 31, 45);
  for (let y = 115; y < 292; y += 16) {
    rect(c, "#9b784d", 806, y, 4, 9);
    rect(c, "#9b784d", 771, y, 4, 9);
    rect(c, "#b68d56", 771, y + 6, 39, 3);
  }
  for (let y = 316; y < 437; y += 16) {
    rect(c, "#9b784d", 138, y, 4, 9);
    rect(c, "#9b784d", 173, y, 4, 9);
    rect(c, "#b68d56", 138, y + 6, 39, 3);
  }
  for (let x = 100; x < 760; x += 62) {
    rect(c, "#ae7c47", x, 179, 21, 3);
    rect(c, "#be9056", x + 5, 180, 5, 2);
    rect(c, "#ae7c47", x, 325, 21, 3);
    rect(c, "#ae7c47", x, 472, 21, 3);
  }
  // Wood braces support each horizontal tunnel.
  for (const [x, y] of [
    [130, 157],
    [620, 157],
    [725, 303],
    [240, 303],
    [220, 450],
    [660, 450],
  ]) {
    rect(c, "#8c6038", x - 20, y - 25, 7, 49);
    rect(c, "#b3844e", x - 19, y - 25, 3, 49);
    rect(c, "#8c6038", x + 14, y - 25, 7, 49);
    rect(c, "#b3844e", x + 15, y - 25, 3, 49);
    rect(c, "#b58850", x - 23, y - 29, 47, 8);
    rect(c, "#d4a767", x - 23, y - 29, 47, 2);
  }
  lantern(c, 301, 151);
  lantern(c, 657, 297);
  lantern(c, 362, 444);
  // Copper cable from the generator through the soil.
  line(c, "#5b4930", 76, 406, 76, 251, 7);
  line(c, "#5b4930", 76, 251, 868, 251, 7);
  line(c, "#c5a061", 76, 406, 76, 251, 3);
  line(c, "#c5a061", 76, 251, 868, 251, 3);
  for (const x of [310, 590, 860]) {
    rect(c, "#56452e", x, 244, 13, 14);
    rect(c, "#9c9e71", x + 3, 247, 7, 8);
  }
  // Generator's dug-out room.
  rect(c, "#61452f", 13, 382, 113, 147);
  rect(c, "#d0a56d", 19, 389, 101, 134);
  rect(c, "#dfbb7e", 23, 394, 93, 118);
  rect(c, "#8c633f", 22, 513, 96, 8);
  rect(c, "#b1834b", 25, 395, 89, 7);
  // Seed vault, wood door, brass lock, piled seeds.
  rect(c, "#634a32", 795, 395, 92, 135);
  rect(c, "#d1a05a", 800, 400, 82, 124);
  rect(c, "#b17b3d", 807, 408, 69, 108);
  for (let x = 812; x < 875; x += 13) rect(c, "#c68d46", x, 413, 8, 96);
  rect(c, "#684e32", 805, 422, 72, 7);
  rect(c, "#684e32", 805, 492, 72, 7);
  rect(c, "#f5d078", 837, 449, 16, 22);
  rect(c, "#6d4b2d", 843, 457, 4, 8);
  for (let i = 0; i < 19; i++) {
    const x = 808 + ((i * 17) % 67),
      y = 518 - (i % 3) * 4;
    rect(c, "#e8c778", x, y, 7, 5);
    rect(c, "#fbe2a0", x, y, 3, 2);
  }
  mushroom(c, 39, 339);
  mushroom(c, 57, 342, "#b87655");
  mushroom(c, 853, 214);
  mushroom(c, 875, 217, "#9aaf7d");
  mushroom(c, 479, 552, "#bd7c57");
  mushroom(c, 498, 554, "#e1b56d");
  mushroom(c, 841, 357, "#a6b380");
  // Little fossils and stones.
  for (const [x, y] of [
    [95, 285],
    [350, 398],
    [657, 552],
    [865, 290],
    [50, 551],
  ]) {
    rect(c, "#d0a77a", x, y, 16, 5);
    rect(c, "#d0a77a", x + 4, y - 5, 8, 15);
    rect(c, "#956b48", x + 6, y - 2, 4, 8);
  }
  for (const [x, y] of SLOTS) {
    rect(c, "#785636", x - 29, y + 17, 58, 8);
    rect(c, "#dfb779", x - 28, y + 14, 56, 5);
    rect(c, "#b98d54", x - 24, y + 21, 9, 4);
    rect(c, "#b98d54", x + 15, y + 21, 9, 4);
  }
  // A tiny surface sign, the path's entrance.
  rect(c, "#795b3a", 116, 48, 5, 33);
  rect(c, "#a98450", 95, 40, 49, 23);
  rect(c, "#f0d9a1", 100, 45, 35, 12);
  rect(c, "#674d31", 112, 48, 17, 4);
  rect(c, "#674d31", 124, 45, 5, 10);
}
let landscape: HTMLCanvasElement | null = null;
export function render(
  c: Ctx,
  g: Game,
  wheel: Wheel,
  angle: number,
  selectedSlot: number | null,
  preview: TowerId | null,
  reduced: boolean,
) {
  if (!landscape) {
    landscape = document.createElement("canvas");
    landscape.width = W;
    landscape.height = H;
    drawLandscape(landscape.getContext("2d")!);
  }
  c.clearRect(0, 0, W, H);
  c.drawImage(landscape, 0, 0);
  c.imageSmoothingEnabled = false;
  const selectedTower = g.towers.find((t) => t.slot === selectedSlot);
  if (selectedTower || (preview && selectedSlot !== null)) {
    const slot = selectedTower?.slot ?? selectedSlot!;
    const range = selectedTower
      ? towerRange(g, selectedTower)
      : DEF[preview!].range * (1 + g.rangeBonus);
    c.fillStyle = "#ffdc8b16";
    c.strokeStyle = "#ffdf9c88";
    c.lineWidth = 2;
    c.setLineDash([6, 6]);
    c.beginPath();
    c.arc(SLOTS[slot][0], SLOTS[slot][1], range, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.setLineDash([]);
  }
  for (const t of g.towers)
    drawTower(
      c,
      t.type,
      SLOTS[t.slot][0],
      SLOTS[t.slot][1] - 3,
      1,
      t.level,
      DEF[t.type].watts > g.battery,
    );
  for (const enemy of g.enemies) {
    const p = enemyPoint(enemy);
    // Owl's first movement is a visibly vertical dive through the far shaft.
    drawEnemy(
      c,
      enemy.kind,
      p.x,
      p.y,
      p.facing,
      reduced ? 0 : g.elapsed,
      enemy.slow > 0,
    );
    if (enemy.hp < enemy.maxHp) {
      rect(c, "#39281f", p.x - 18, p.y - 28, 36, 4);
      rect(
        c,
        "#d5c47e",
        p.x - 18,
        p.y - 28,
        Math.max(0, (36 * enemy.hp) / enemy.maxHp),
        4,
      );
    }
  }
  for (const e of g.effects) {
    const k = e.life / e.total;
    c.globalAlpha = Math.min(1, k * 2);
    if (e.type === "spark" || e.type === "fence" || e.type === "lamp") {
      c.beginPath();
      c.moveTo(e.x, e.y - 20);
      c.lineTo((e.x + e.tx) / 2 + 8, (e.y + e.ty) / 2 - 6);
      c.lineTo((e.x + e.tx) / 2 - 6, (e.y + e.ty) / 2 + 8);
      c.lineTo(e.tx, e.ty);
      c.strokeStyle = "#fff1b8";
      c.lineWidth = e.type === "lamp" ? 5 : 3;
      c.stroke();
      rect(c, "#fff2bf", e.tx - 4, e.ty - 4, 8, 8);
    } else if (e.type === "breach") {
      c.fillStyle = "#bd604a66";
      c.fillRect(795, 400, 90, 127);
    } else {
      const t = 1 - k,
        x = e.x + (e.tx - e.x) * t,
        y = e.y + (e.ty - e.y) * t - Math.sin(t * Math.PI) * 35;
      rect(
        c,
        e.type === "honey"
          ? "#edbb54"
          : e.type === "blower"
            ? "#e4c99b"
            : "#efcf84",
        x - 4,
        y - 4,
        e.type === "blower" ? 13 : 7,
        7,
      );
    }
    c.globalAlpha = 1;
  }
  // The actual power plant. Angle is based on wall time and measured RPM, independent of game speed.
  const x = 70,
    y = 456;
  rect(c, "#705538", 40, 492, 62, 7);
  rect(c, "#9b794c", 65, 456, 8, 38);
  c.save();
  c.translate(x, y);
  c.rotate(reduced ? 0 : angle);
  c.strokeStyle = "#805b36";
  c.lineWidth = 6;
  c.beginPath();
  c.arc(0, 0, 36, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = "#f3da9e";
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, 32, 0, Math.PI * 2);
  c.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    line(c, "#ab834a", 0, 0, Math.cos(a) * 34, Math.sin(a) * 34, 3);
  }
  c.restore();
  drawHamster(c, x, y + (wheel.status === "IDLE" ? 7 : 3), 2.2);
  rect(c, "#c3944e", 66, 452, 8, 8);
  if (wheel.status === "IDLE") {
    c.fillStyle = "#65482e";
    c.font = '700 16px "DM Sans", sans-serif';
    c.fillText("z", 97, 431);
    c.fillText("z", 105, 420);
  }
  rect(c, "#58715d", 29, 507, 13, 9);
  rect(c, wheel.status === "ACTIVE" ? "#f8d679" : "#9aa47f", 32, 509, 7, 5);
  c.font = '700 14px "DM Sans", sans-serif';
  c.fillStyle = "#61442b";
  c.textAlign = "center";
  c.fillText("Generator", 70, 410);
  c.fillStyle = "#ffebc3";
  c.fillText("Seed vault", 840, 389);
  c.textAlign = "left";
}
