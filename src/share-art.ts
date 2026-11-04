import { render } from "./art";
import { newGame, placeTower, type TowerId } from "./engine";

/** Reuses the game's original artwork for the locally bundled social card. */
export function drawShare(canvas: HTMLCanvasElement) {
  const c = canvas.getContext("2d")!;
  canvas.width = 1200;
  canvas.height = 630;
  c.fillStyle = "#f7f1e4";
  c.fillRect(0, 0, 1200, 630);
  c.fillStyle = "#e5a73b";
  c.fillRect(54, 66, 44, 6);
  c.fillStyle = "#39281f";
  c.font = '700 82px "Pixelify Sans"';
  c.fillText("Burrow", 52, 181);
  c.fillText("Siege.", 52, 260);
  c.font = '400 23px "DM Sans"';
  c.fillStyle = "#73614c";
  c.fillText("A tower defense powered", 56, 320);
  c.fillText("by a real hamster.", 56, 352);
  c.fillStyle = "#e5a73b";
  c.fillRect(56, 403, 286, 58);
  c.fillStyle = "#39281f";
  c.font = '700 20px "DM Sans"';
  c.fillText("Keep the seeds safe.", 80, 440);
  c.fillStyle = "#73614c";
  c.font = '400 15px "DM Sans"';
  c.fillText("An unofficial Squeekchain fan game", 56, 564);
  const scene = document.createElement("canvas");
  scene.width = 900;
  scene.height = 570;
  const g = newGame();
  g.seeds = 10000;
  g.unlocked = ["spark", "catapult", "lamp", "honey", "blower", "fence"];
  const towers: [TowerId, number][] = [
    ["spark", 0],
    ["catapult", 2],
    ["honey", 5],
    ["lamp", 7],
    ["catapult", 8],
    ["blower", 10],
    ["fence", 14],
  ];
  for (const [type, slot] of towers)
    placeTower(g, type, slot, { status: "ACTIVE", rpm: 32, simulated: true });
  g.enemies = [
    {
      id: 30,
      kind: "beetle",
      progress: 310,
      hp: 30,
      maxHp: 30,
      speed: 50,
      slow: 0,
      reward: 9,
      harm: 1,
    },
    {
      id: 31,
      kind: "snake",
      progress: 620,
      hp: 40,
      maxHp: 40,
      speed: 50,
      slow: 0,
      reward: 12,
      harm: 2,
    },
    {
      id: 32,
      kind: "owl",
      progress: 900,
      hp: 28,
      maxHp: 28,
      speed: 50,
      slow: 0,
      reward: 14,
      harm: 2,
    },
    {
      id: 33,
      kind: "weasel",
      progress: 1350,
      hp: 260,
      maxHp: 260,
      speed: 43,
      slow: 0,
      reward: 80,
      harm: 5,
    },
  ];
  render(
    scene.getContext("2d")!,
    g,
    { status: "ACTIVE", rpm: 32, simulated: true },
    1,
    null,
    null,
    true,
  );
  c.imageSmoothingEnabled = false;
  c.fillStyle = "#39281f";
  c.fillRect(425, 64, 726, 498);
  c.drawImage(scene, 431, 96, 714, 452);
  c.fillStyle = "#f3e3c3";
  c.font = '600 14px "DM Sans"';
  c.fillText("Sunflower Hollow", 446, 86);
}
