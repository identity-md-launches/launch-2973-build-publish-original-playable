import test from "node:test";
import assert from "node:assert/strict";
import {
  DEF,
  PATH_LENGTH,
  SLOTS,
  buildCost,
  chooseUpgrade,
  levelTower,
  newGame,
  phaseOf,
  placeTower,
  pointAt,
  receiveBlocks,
  rollCrate,
  sellTower,
  sellValue,
  startWave,
  tick,
  upgradeCost,
  type Game,
  type Enemy,
} from "../src/engine";
import { parseStatus, practiceWheel, isExpired, type Wheel } from "../src/feed";

const active: Wheel = { status: "ACTIVE", rpm: 30, simulated: false };
const nap: Wheel = { status: "IDLE", rpm: 0, simulated: false };
const rush: Wheel = { status: "ACTIVE", rpm: 50, simulated: false };
function enemy(progress = 100, hp = 100): Enemy {
  return {
    id: 500,
    kind: "beetle",
    progress,
    hp,
    maxHp: hp,
    speed: 50,
    slow: 0,
    reward: 9,
    harm: 1,
  };
}
function advance(
  g: Game,
  seconds: number,
  wheel = active,
  block: string | null = "8430",
) {
  for (let i = 0; i < seconds * 20; i++) tick(g, 0.05, wheel, block);
}
const NOW = Date.parse("2026-11-04T15:00:00.000Z");
function status(overrides: Record<string, unknown> = {}) {
  return {
    measurement: {
      coreStatus: "ACTIVE",
      freshness: "online",
      rpmMilli: 42850,
      observedAt: new Date(NOW - 1000).toISOString(),
      staleAfterSeconds: 120,
      distanceMm: 124000,
      ...overrides,
    },
    builder: {
      projected: { blockHeight: "8430", blockProgress: "478838171" },
      anchor: { blockHeight: "8429", blockProgress: "500000000" },
    },
  };
}

test("live API mapping retains measured precision and converts block progress", () => {
  const f = parseStatus(status(), NOW);
  assert.equal(f.online, true);
  assert.equal(f.wheel.rpm, 42.85);
  assert.equal(f.distanceMm, 124000);
  assert.equal(f.blockHeight, "8430");
  assert.equal(f.blockProgress, 0.478838171);
});
test("anchor fallback uses a complete height/progress pair", () => {
  const raw = status();
  raw.builder.projected = { blockHeight: "invalid", blockProgress: "10" };
  const f = parseStatus(raw, NOW);
  assert.equal(f.blockHeight, "8429");
  assert.equal(f.blockProgress, 0.5);
});
test("stale, unavailable freshness, counter faults, and old observations cannot appear live", () => {
  for (const values of [
    { freshness: "stale" },
    { coreStatus: "COUNTER_FAULT" },
    { observedAt: new Date(NOW - 121_000).toISOString() },
  ]) {
    assert.equal(parseStatus(status(values), NOW).online, false);
  }
  assert.throws(() => parseStatus(status({ rpmMilli: -2 }), NOW));
  assert.throws(() => parseStatus({}, NOW));
  assert.equal(isExpired(parseStatus(status(), NOW), NOW + 15_001), true);
});
test("practice wheel explicitly simulates active, overcharge and nap phases", () => {
  assert.deepEqual(
    [0, 30, 60].map((s) => phaseOf(practiceWheel(s))),
    ["steady", "rush", "nap"],
  );
  assert.equal(practiceWheel(0).simulated, true);
});
test("power is RPM × 2 per second, only while active, and capped at 500", () => {
  const g = newGame();
  g.battery = 0;
  advance(g, 2);
  assert.ok(Math.abs(g.battery - 120) < 0.001);
  advance(g, 20);
  assert.equal(g.battery, 500);
  advance(g, 3, nap);
  assert.equal(g.battery, 500);
});
test("nap gives 30% build and upgrade discounts; occupied and locked plots reject placement", () => {
  const g = newGame();
  assert.equal(buildCost("spark", nap), 49);
  assert.equal(buildCost("spark", active), 70);
  assert.equal(placeTower(g, "spark", 0, nap), true);
  assert.equal(g.seeds, 161);
  assert.equal(placeTower(g, "catapult", 0, active), false);
  assert.equal(placeTower(g, "fence", 1, active), false);
  assert.equal(upgradeCost(g.towers[0], nap), Math.ceil(70 * 0.65 * 0.7));
});
test("tower upgrades stop at level 3 and selling refunds 70% of actual investment", () => {
  const g = newGame();
  g.seeds = 1000;
  placeTower(g, "spark", 0, nap);
  const tower = g.towers[0];
  assert.equal(levelTower(g, tower.id, nap), true);
  assert.equal(levelTower(g, tower.id, nap), true);
  assert.equal(tower.level, 3);
  assert.equal(levelTower(g, tower.id, nap), false);
  const before = g.seeds,
    refund = sellValue(tower);
  assert.equal(sellTower(g, tower.id), true);
  assert.equal(g.seeds, before + refund);
  assert.equal(refund, Math.floor(tower.invested * 0.7));
  assert.equal(g.towers.length, 0);
});
test("an empty battery stops electric firing; mechanical towers still kill and earn seeds", () => {
  const g = newGame();
  g.seeds = 1000;
  placeTower(g, "spark", 0, active);
  placeTower(g, "catapult", 1, active);
  startWave(g);
  g.spawnLeft = 100;
  g.spawnTimer = 100;
  g.battery = 0;
  const progress = 123 + SLOTS[0][0] - 55;
  g.enemies = [enemy(progress, 5)];
  tick(g, 0.05, nap, "8430");
  assert.equal(g.towers[0].shots, 0);
  g.enemies = [enemy(123 + SLOTS[1][0] - 55, 5)];
  const seeds = g.seeds;
  tick(g, 0.05, nap, "8430");
  assert.equal(g.towers[1].shots, 1);
  assert.equal(g.kills, 1);
  assert.equal(g.seeds, seeds + 9);
});
test("overcharge gives 50% electric damage", () => {
  function damage(w: Wheel) {
    const g = newGame();
    placeTower(g, "spark", 0, active);
    startWave(g);
    g.spawnLeft = 10;
    g.spawnTimer = 100;
    g.enemies = [enemy(123 + SLOTS[0][0] - 55)];
    tick(g, 0.05, w, "8430");
    return 100 - g.enemies[0].hp;
  }
  assert.equal(damage(active), DEF.spark.damage);
  assert.equal(damage(rush), DEF.spark.damage * 1.5);
});
test("nap halves predator movement; rush multiplies it by 1.3", () => {
  function moved(w: Wheel) {
    const g = newGame();
    startWave(g);
    g.spawnLeft = 10;
    g.spawnTimer = 100;
    g.enemies = [enemy(100)];
    tick(g, 0.1, w, null);
    return g.enemies[0].progress - 100;
  }
  assert.equal(moved(nap), 2.5);
  assert.equal(moved(active), 5);
  assert.equal(moved(rush), 6.5);
});
test("pause freezes the simulation and 2x doubles game time", () => {
  const g = newGame();
  g.paused = true;
  advance(g, 2);
  assert.equal(g.elapsed, 0);
  assert.equal(g.battery, 100);
  g.paused = false;
  g.speed = 2;
  advance(g, 2);
  assert.ok(Math.abs(g.elapsed - 4) < 0.001);
});
test("real height increments give one crate for each real block and no crates on regressions", () => {
  const g = newGame();
  receiveBlocks(g, "8430", "8433");
  assert.deepEqual(
    g.crates.map((c) => c.block),
    ["8431", "8432", "8433"],
  );
  receiveBlocks(g, "8433", "8432");
  assert.equal(g.crates.length, 3);
  const elapsed = g.elapsed;
  advance(g, 1);
  assert.equal(g.elapsed, elapsed);
  for (let i = 0; i < 3; i++) {
    assert.equal(g.crates[0].choices.length, 3);
    assert.equal(chooseUpgrade(g, 0), true);
  }
  assert.equal(g.crates.length, 0);
});
test("crate upgrades change gameplay values and unlock real buildable towers", () => {
  const g = newGame();
  g.crates.push({
    block: "8431",
    choices: [{ id: "battery", name: "", description: "" }],
  });
  chooseUpgrade(g, 0);
  assert.equal(g.batteryCap, 650);
  assert.equal(g.battery, 200);
  g.crates.push({
    block: "8432",
    choices: [{ id: "unlock", tower: "fence", name: "", description: "" }],
  });
  chooseUpgrade(g, 0);
  assert.ok(g.unlocked.includes("fence"));
  assert.equal(placeTower(g, "fence", 0, active), true);
  rollCrate(g, null, () => 0.1);
  assert.equal(g.crates[0].block, null);
});
test("vault loss captures the actual end block; offline end block remains unknown", () => {
  for (const block of ["8430", null]) {
    const g = newGame();
    startWave(g);
    g.hearts = 1;
    g.enemies = [enemy(PATH_LENGTH - 0.1)];
    tick(g, 0.1, active, block);
    assert.equal(g.phase, "lost");
    assert.equal(g.hearts, 0);
    assert.equal(g.endBlock, block);
  }
});
test("all 20 waves complete, towers unlock, and endless goes beyond 20", () => {
  const g = newGame();
  for (let wave = 1; wave <= 20; wave++) {
    assert.equal(startWave(g), true);
    assert.equal(g.wave, wave);
    g.spawnLeft = 0;
    g.enemies = [];
    tick(g, 0.05, active, "8430");
  }
  assert.equal(g.phase, "won");
  assert.equal(g.endBlock, "8430");
  assert.equal(g.unlocked.length, 6);
  g.endless = true;
  g.phase = "between";
  assert.equal(startWave(g), true);
  assert.equal(g.wave, 21);
  g.spawnLeft = 0;
  g.enemies = [];
  tick(g, 0.05, active, "8430");
  assert.equal(g.phase, "between");
});
test("every predator type appears, including diving owls and the weasel boss", () => {
  const g = newGame();
  g.wave = 4;
  startWave(g);
  const kinds = new Set<string>();
  for (let i = 0; i < 400; i++) {
    tick(g, 0.05, active, "8430");
    for (const e of g.enemies) kinds.add(e.kind);
  }
  assert.deepEqual([...kinds].sort(), ["beetle", "owl", "snake", "weasel"]);
});
test("path traverses surface, all tunnels and the vault", () => {
  assert.deepEqual(pointAt(0), { x: 55, y: 34, facing: 1 });
  assert.equal(pointAt(124).y, 157);
  assert.deepEqual(pointAt(PATH_LENGTH + 1), { x: 824, y: 479, facing: 1 });
});
