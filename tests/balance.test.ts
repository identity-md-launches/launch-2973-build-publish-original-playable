import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseUpgrade,
  levelTower,
  newGame,
  placeTower,
  receiveBlocks,
  startWave,
  tick,
  type TowerId,
} from "../src/engine";
import { practiceWheel } from "../src/feed";

test("an affordable mixed defense survives all 20 waves through active, rush and nap cycles", (t) => {
  let randomSeed = 4703;
  t.mock.method(
    Math,
    "random",
    () =>
      (randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0) /
      2 ** 32,
  );
  const g = newGame();
  const plan: [TowerId, number][] = [
    ["catapult", 0],
    ["catapult", 2],
    ["honey", 5],
    ["catapult", 7],
    ["spark", 1],
    ["catapult", 8],
    ["spark", 6],
    ["lamp", 3],
    ["honey", 10],
    ["catapult", 11],
    ["blower", 9],
    ["spark", 4],
    ["catapult", 13],
    ["fence", 14],
    ["blower", 12],
    ["lamp", 15],
  ];
  let cursor = 0,
    lastBlock = 8430,
    steps = 0;
  while (!["lost", "won"].includes(g.phase) && steps++ < 180_000) {
    const wheel = practiceWheel(g.elapsed);
    if (g.crates.length) {
      const choices = g.crates[0].choices;
      const selected = choices.findIndex((u) => u.id === "rate");
      chooseUpgrade(g, selected >= 0 ? selected : 0);
    }
    if (g.phase === "ready" || g.phase === "between") {
      // These purchases use earned seeds, normal prices, and ordinary unlocks.
      while (
        cursor < plan.length &&
        placeTower(g, plan[cursor][0], plan[cursor][1], wheel)
      )
        cursor++;
      for (const tower of g.towers) {
        if (tower.type === "catapult" || cursor > 8)
          while (levelTower(g, tower.id, wheel)) {
            /* Buy affordable upgrades. */
          }
      }
      startWave(g);
    }
    const nextBlock = 8430 + Math.floor(g.elapsed / 55);
    if (nextBlock > lastBlock) {
      receiveBlocks(g, String(lastBlock), String(nextBlock));
      lastBlock = nextBlock;
    }
    tick(g, 0.05, wheel, String(lastBlock));
  }
  assert.equal(
    g.phase,
    "won",
    `Ended ${g.phase} on wave ${g.wave}, ${g.hearts} hearts, ${g.kills} kills`,
  );
  assert.equal(g.wave, 20);
  assert.ok(g.hearts > 0);
  assert.ok(g.kills > 400);
  assert.ok(g.towers.some((t) => ["spark", "lamp", "fence"].includes(t.type)));
  assert.ok(
    g.towers.some((t) => ["catapult", "honey", "blower"].includes(t.type)),
  );
  console.log(
    `Balanced run: ${g.hearts}/20 hearts, ${g.kills} predators stopped, ${g.towers.length} towers, ${Math.round(g.elapsed)} simulated seconds.`,
  );
});
