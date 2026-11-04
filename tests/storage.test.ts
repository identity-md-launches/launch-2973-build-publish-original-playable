import test from "node:test";
import assert from "node:assert/strict";
import {
  readScores,
  saveScore,
  hasSeenTutorial,
  markTutorialSeen,
  SCORES_KEY,
  type Score,
} from "../src/storage";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
const score = (name = "Keeper", wave = 4): Score => ({
  name,
  wave,
  block: "8430",
  kills: 20,
  practice: false,
  endless: false,
  won: false,
  date: "2026-11-04T15:00:00Z",
});
test("scores validate stored data, keep at most ten runs and limit names to 20 characters", () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  assert.deepEqual(readScores(), []);
  storage.setItem(SCORES_KEY, "<not JSON>");
  assert.deepEqual(readScores(), []);
  storage.setItem(
    SCORES_KEY,
    JSON.stringify([
      { ...score(), wave: -1 },
      { ...score(), block: "<script>" },
    ]),
  );
  assert.deepEqual(readScores(), []);
  storage.setItem(SCORES_KEY, "[]");
  for (let i = 0; i < 12; i++)
    assert.equal(saveScore(score("A".repeat(30), i)), true);
  const scores = readScores();
  assert.equal(scores.length, 10);
  assert.equal(scores[0].wave, 11);
  assert.equal(scores[0].name.length, 20);
  assert.equal(saveScore(score("  <img src=x> keeper  ", 30)), true);
  assert.equal(readScores()[0].name, "<img src=x> keeper");
  assert.equal(hasSeenTutorial(), false);
  markTutorialSeen();
  assert.equal(hasSeenTutorial(), true);
});
test("blocked or full browser storage never prevents play or silently claims a saved score", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("Storage blocked");
    },
  });
  assert.deepEqual(readScores(), []);
  assert.equal(saveScore(score()), false);
  assert.equal(hasSeenTutorial(), false);
  assert.doesNotThrow(markTutorialSeen);
});
