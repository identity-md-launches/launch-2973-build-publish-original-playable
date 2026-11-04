import type { Wheel } from "./feed";

export type TowerId =
  | "spark"
  | "lamp"
  | "fence"
  | "catapult"
  | "honey"
  | "blower";
export type EnemyKind = "beetle" | "snake" | "owl" | "weasel";
export type TowerDef = {
  id: TowerId;
  name: string;
  family: "Electric" | "Mechanical";
  cost: number;
  damage: number;
  range: number;
  interval: number;
  watts: number;
  unlock: number;
  description: string;
  key: string;
};
export const TOWERS: TowerDef[] = [
  {
    id: "spark",
    name: "Spark Coil",
    family: "Electric",
    cost: 70,
    damage: 24,
    range: 145,
    interval: 0.8,
    watts: 9,
    unlock: 0,
    key: "1",
    description: "Quick bolts. One very crispy beetle.",
  },
  {
    id: "lamp",
    name: "Zap Lamp",
    family: "Electric",
    cost: 110,
    damage: 42,
    range: 155,
    interval: 1.4,
    watts: 16,
    unlock: 3,
    key: "2",
    description: "A bright burst that hits a small crowd.",
  },
  {
    id: "fence",
    name: "Static Fence",
    family: "Electric",
    cost: 135,
    damage: 32,
    range: 125,
    interval: 1.15,
    watts: 20,
    unlock: 7,
    key: "3",
    description: "Chains a shock through three predators.",
  },
  {
    id: "catapult",
    name: "Seed Catapult",
    family: "Mechanical",
    cost: 55,
    damage: 13,
    range: 150,
    interval: 1.2,
    watts: 0,
    unlock: 0,
    key: "4",
    description: "Steady seed shots without power.",
  },
  {
    id: "honey",
    name: "Sticky Honey Trap",
    family: "Mechanical",
    cost: 40,
    damage: 4,
    range: 110,
    interval: 0.85,
    watts: 0,
    unlock: 0,
    key: "5",
    description: "Slows a predator by 55% for 2 seconds.",
  },
  {
    id: "blower",
    name: "Sawdust Blower",
    family: "Mechanical",
    cost: 90,
    damage: 10,
    range: 135,
    interval: 0.9,
    watts: 0,
    unlock: 5,
    key: "6",
    description: "A dusty puff that damages a small crowd.",
  },
];
export const DEF = Object.fromEntries(TOWERS.map((t) => [t.id, t])) as Record<
  TowerId,
  TowerDef
>;
export const PATH: [number, number][] = [
  [55, 34],
  [55, 157],
  [790, 157],
  [790, 303],
  [155, 303],
  [155, 450],
  [790, 450],
  [824, 479],
];
export const SLOTS = [
  [210, 112],
  [370, 112],
  [530, 112],
  [690, 112],
  [210, 208],
  [370, 208],
  [530, 208],
  [690, 208],
  [265, 352],
  [425, 352],
  [585, 352],
  [745, 352],
  [265, 500],
  [425, 500],
  [585, 500],
  [745, 500],
] as const;
const SEGMENTS = PATH.slice(1).map((p, i) =>
  Math.hypot(p[0] - PATH[i][0], p[1] - PATH[i][1]),
);
export const PATH_LENGTH = SEGMENTS.reduce((s, v) => s + v, 0);
export function pointAt(distance: number): {
  x: number;
  y: number;
  facing: number;
} {
  let d = Math.max(0, distance);
  for (let i = 0; i < SEGMENTS.length; i++) {
    if (d <= SEGMENTS[i]) {
      const t = d / SEGMENTS[i];
      return {
        x: PATH[i][0] + (PATH[i + 1][0] - PATH[i][0]) * t,
        y: PATH[i][1] + (PATH[i + 1][1] - PATH[i][1]) * t,
        facing: PATH[i + 1][0] < PATH[i][0] ? -1 : 1,
      };
    }
    d -= SEGMENTS[i];
  }
  return { x: 824, y: 479, facing: 1 };
}
export type Tower = {
  id: number;
  slot: number;
  type: TowerId;
  level: number;
  invested: number;
  cooldown: number;
  shots: number;
};
export type Enemy = {
  id: number;
  kind: EnemyKind;
  progress: number;
  hp: number;
  maxHp: number;
  speed: number;
  slow: number;
  reward: number;
  harm: number;
  dive?: number;
};
export function enemyPoint(e: Enemy) {
  return e.kind === "owl" && (e.dive ?? 0) > 0
    ? { x: 790, y: 157 - e.dive! * 80, facing: 1 }
    : pointAt(e.progress);
}
export type Effect = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  life: number;
  total: number;
  type: TowerId | "seed" | "breach";
};
export type Upgrade = {
  id: "range" | "rate" | "battery" | "unlock";
  name: string;
  description: string;
  tower?: TowerId;
};
export type Crate = { block: string | null; choices: Upgrade[] };
export type Game = {
  phase: "ready" | "running" | "between" | "won" | "lost";
  paused: boolean;
  speed: 1 | 2;
  endless: boolean;
  wave: number;
  seeds: number;
  hearts: number;
  battery: number;
  batteryCap: number;
  elapsed: number;
  towers: Tower[];
  enemies: Enemy[];
  effects: Effect[];
  spawnLeft: number;
  spawnTimer: number;
  spawned: number;
  kills: number;
  rangeBonus: number;
  rateBonus: number;
  unlocked: TowerId[];
  crates: Crate[];
  message: string;
  nextId: number;
  usedPractice: boolean;
  endBlock: string | null;
};
export function newGame(): Game {
  return {
    phase: "ready",
    paused: false,
    speed: 1,
    endless: false,
    wave: 0,
    seeds: 210,
    hearts: 20,
    battery: 100,
    batteryCap: 500,
    elapsed: 0,
    towers: [],
    enemies: [],
    effects: [],
    spawnLeft: 0,
    spawnTimer: 0,
    spawned: 0,
    kills: 0,
    rangeBonus: 0,
    rateBonus: 0,
    unlocked: ["spark", "catapult", "honey"],
    crates: [],
    message: "Pick a tower, then choose a marked plot.",
    nextId: 1,
    usedPractice: false,
    endBlock: null,
  };
}
export function phaseOf(w: Wheel): "nap" | "rush" | "steady" {
  return w.status === "IDLE"
    ? "nap"
    : w.status === "ACTIVE" && w.rpm > 40
      ? "rush"
      : "steady";
}
export const buildCost = (type: TowerId, w: Wheel) =>
  Math.ceil(DEF[type].cost * (phaseOf(w) === "nap" ? 0.7 : 1));
export const upgradeCost = (t: Tower, w: Wheel) =>
  Math.ceil(
    DEF[t.type].cost * 0.65 * t.level * (phaseOf(w) === "nap" ? 0.7 : 1),
  );
export const sellValue = (t: Tower) => Math.floor(t.invested * 0.7);
export const towerRange = (g: Game, t: Tower) =>
  DEF[t.type].range * (1 + g.rangeBonus + (t.level - 1) * 0.1);
export function placeTower(
  g: Game,
  type: TowerId,
  slot: number,
  w: Wheel,
): boolean {
  if (
    !SLOTS[slot] ||
    g.towers.some((t) => t.slot === slot) ||
    !g.unlocked.includes(type) ||
    ["lost", "won"].includes(g.phase)
  )
    return false;
  const cost = buildCost(type, w);
  if (g.seeds < cost) {
    g.message = `Need ${cost - g.seeds} more seeds to build ${DEF[type].name}.`;
    return false;
  }
  g.seeds -= cost;
  g.towers.push({
    id: g.nextId++,
    slot,
    type,
    level: 1,
    invested: cost,
    cooldown: 0,
    shots: 0,
  });
  g.message = `${DEF[type].name} built. Select it to upgrade or sell.`;
  return true;
}
export function levelTower(g: Game, id: number, w: Wheel): boolean {
  const t = g.towers.find((t) => t.id === id);
  if (!t || t.level >= 3 || ["lost", "won"].includes(g.phase)) return false;
  const cost = upgradeCost(t, w);
  if (g.seeds < cost) {
    g.message = `Need ${cost - g.seeds} more seeds to upgrade.`;
    return false;
  }
  g.seeds -= cost;
  t.invested += cost;
  t.level++;
  g.message = `${DEF[t.type].name} upgraded to level ${t.level}.`;
  return true;
}
export function sellTower(g: Game, id: number): boolean {
  const t = g.towers.find((t) => t.id === id);
  if (!t || ["lost", "won"].includes(g.phase)) return false;
  const refund = sellValue(t);
  g.seeds += refund;
  g.towers = g.towers.filter((t) => t.id !== id);
  g.message = `Tower sold for ${refund} seeds (70% refund).`;
  return true;
}
export function startWave(g: Game): boolean {
  if (!["ready", "between"].includes(g.phase) || g.paused || g.crates.length)
    return false;
  g.wave++;
  g.phase = "running";
  g.spawned = 0;
  g.spawnLeft = 6 + g.wave * 2;
  g.spawnTimer = 0.5;
  for (const def of TOWERS)
    if (g.wave >= def.unlock && !g.unlocked.includes(def.id)) {
      g.unlocked.push(def.id);
      g.message = `${def.name} unlocked.`;
    }
  g.message =
    g.wave % 5 === 0
      ? `Wave ${g.wave}: a weasel is coming. Protect the vault!`
      : `Wave ${g.wave}: keep the seeds safe.`;
  return true;
}
function spawn(g: Game) {
  const boss = g.wave % 5 === 0 && g.spawned === 0;
  const kind: EnemyKind = boss
    ? "weasel"
    : g.wave >= 4 && g.spawned % 5 === 3
      ? "owl"
      : g.wave >= 2 && g.spawned % 3 === 1
        ? "snake"
        : "beetle";
  const scale = Math.pow(1.125, g.wave - 1);
  const hp =
    (kind === "weasel"
      ? 260
      : kind === "snake"
        ? 40
        : kind === "owl"
          ? 28
          : 30) * scale;
  // Owls enter by diving into the far surface shaft; other predators follow the full tunnel.
  const progress = kind === "owl" ? 123 + 735 : 0;
  g.enemies.push({
    id: g.nextId++,
    kind,
    progress,
    dive: kind === "owl" ? 1.5 : 0,
    hp,
    maxHp: hp,
    speed:
      (kind === "owl"
        ? 76
        : kind === "snake"
          ? 66
          : kind === "weasel"
            ? 43
            : 54) +
      g.wave * 0.7,
    slow: 0,
    reward:
      kind === "weasel" ? 80 : kind === "owl" ? 14 : kind === "snake" ? 12 : 9,
    harm: kind === "weasel" ? 5 : kind === "beetle" ? 1 : 2,
  });
  g.spawned++;
  g.spawnLeft--;
}
export function rollCrate(
  g: Game,
  block: string | null,
  random = Math.random,
): void {
  if (g.phase === "won" || g.phase === "lost") return;
  const pool: Upgrade[] = [
    {
      id: "range",
      name: "Longer reach",
      description: "+15% range for every tower.",
    },
    {
      id: "rate",
      name: "Quick paws",
      description: "+15% fire rate for every tower.",
    },
    {
      id: "battery",
      name: "Bigger battery",
      description: "+150 battery capacity. Adds 100 Watts.",
    },
  ];
  const locked = TOWERS.filter((t) => !g.unlocked.includes(t.id));
  if (locked.length) {
    const t = locked[Math.floor(random() * locked.length)];
    pool.push({
      id: "unlock",
      name: `Unlock ${t.name}`,
      description: "Build it early. Also receive 45 seeds.",
      tower: t.id,
    });
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  g.crates.push({ block, choices: pool.slice(0, 3) });
  g.message = block
    ? `Block Crate! Squeek block #${block}. Choose an upgrade.`
    : "Practice Crate! Choose a simulated reward.";
}
export function chooseUpgrade(g: Game, index: number): boolean {
  const u = g.crates[0]?.choices[index];
  if (!u) return false;
  if (u.id === "range") g.rangeBonus += 0.15;
  if (u.id === "rate") g.rateBonus += 0.15;
  if (u.id === "battery") {
    g.batteryCap += 150;
    g.battery = Math.min(g.batteryCap, g.battery + 100);
  }
  if (u.id === "unlock" && u.tower) {
    if (!g.unlocked.includes(u.tower)) g.unlocked.push(u.tower);
    g.seeds += 45;
  }
  g.crates.shift();
  g.message = `${u.name} applied.`;
  return true;
}
export function receiveBlocks(
  g: Game,
  previous: string,
  current: string,
): void {
  const from = BigInt(previous),
    to = BigInt(current);
  if (to <= from) return;
  for (let h = from + 1n; h <= to; h++) rollCrate(g, h.toString());
}
export function tick(
  g: Game,
  dt: number,
  w: Wheel,
  block: string | null,
): void {
  if (g.paused || g.crates.length || g.phase === "lost" || g.phase === "won")
    return;
  const delta = Math.max(0, Math.min(dt, 0.1)) * g.speed;
  g.elapsed += delta;
  if (w.simulated) g.usedPractice = true;
  if (w.status === "ACTIVE")
    g.battery = Math.min(g.batteryCap, g.battery + w.rpm * 2 * delta);
  for (const e of g.effects) e.life -= delta;
  g.effects = g.effects.filter((e) => e.life > 0);
  if (g.phase !== "running") return;
  const phase = phaseOf(w);
  const tempo = phase === "nap" ? 0.5 : phase === "rush" ? 1.3 : 1;
  g.spawnTimer -= delta * tempo;
  if (g.spawnLeft > 0 && g.spawnTimer <= 0) {
    spawn(g);
    g.spawnTimer = Math.max(0.35, 1.25 - g.wave * 0.025);
  }
  for (const enemy of g.enemies) {
    enemy.slow = Math.max(0, enemy.slow - delta);
    if ((enemy.dive ?? 0) > 0)
      enemy.dive = Math.max(0, enemy.dive! - delta * tempo);
    else
      enemy.progress +=
        enemy.speed * delta * tempo * (enemy.slow > 0 ? 0.45 : 1);
  }
  for (const t of g.towers) {
    const def = DEF[t.type];
    t.cooldown -= delta;
    if (t.cooldown > 0 || g.battery < def.watts) continue;
    const [x, y] = SLOTS[t.slot],
      range = towerRange(g, t);
    const targets = g.enemies
      .filter((e) => {
        const p = enemyPoint(e);
        return (
          e.hp > 0 &&
          e.progress < PATH_LENGTH &&
          Math.hypot(p.x - x, p.y - y) <= range
        );
      })
      .sort((a, b) => b.progress - a.progress);
    if (!targets.length) continue;
    const target = targets[0],
      p = enemyPoint(target);
    const hit =
      t.type === "fence"
        ? targets.slice(0, 3)
        : t.type === "lamp" || t.type === "blower"
          ? g.enemies.filter((e) => {
              const q = enemyPoint(e);
              return e.hp > 0 && Math.hypot(q.x - p.x, q.y - p.y) < 65;
            })
          : [target];
    const damage =
      def.damage *
      Math.pow(1.45, t.level - 1) *
      (def.watts && phase === "rush" ? 1.5 : 1);
    for (const e of hit) {
      e.hp -= damage;
      if (t.type === "honey") e.slow = 2;
    }
    g.battery = Math.max(0, g.battery - def.watts);
    t.shots++;
    t.cooldown =
      def.interval / ((1 + g.rateBonus) * Math.pow(1.18, t.level - 1));
    g.effects.push({
      x,
      y,
      tx: p.x,
      ty: p.y,
      life: 0.24,
      total: 0.24,
      type: t.type,
    });
  }
  for (const e of g.enemies) {
    if (e.hp <= 0) {
      g.seeds += e.reward;
      g.kills++;
    } else if (e.progress >= PATH_LENGTH) {
      g.hearts = Math.max(0, g.hearts - e.harm);
      g.message = `The vault took ${e.harm} damage. ${g.hearts} hearts left.`;
      g.effects.push({
        x: 824,
        y: 479,
        tx: 824,
        ty: 479,
        life: 0.5,
        total: 0.5,
        type: "breach",
      });
    }
  }
  g.enemies = g.enemies.filter((e) => e.hp > 0 && e.progress < PATH_LENGTH);
  if (g.hearts <= 0) {
    g.phase = "lost";
    g.endBlock = block;
    g.message = "The vault fell. The burrow will rise again.";
    return;
  }
  if (!g.spawnLeft && !g.enemies.length) {
    g.seeds += 35 + g.wave * 5;
    g.phase = g.wave >= 20 && !g.endless ? "won" : "between";
    g.message = `Wave ${g.wave} cleared. +${35 + g.wave * 5} seeds. Time to build.`;
    if (g.phase === "won") {
      g.endBlock = block;
      g.message = "All 20 waves survived. The seeds are safe!";
    } else if (w.simulated && g.wave % 2 === 0) rollCrate(g, null);
  }
}
