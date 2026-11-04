import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";

// A bounded, foreground check: this process owns and closes both server and browsers.
const out = resolve("test/scratch/browser-check");
await mkdir(out, { recursive: true });
const results = [],
  errors = [],
  resourceFailures = [],
  consoleErrors = [];
const record = (name, detail) => {
  results.push({ name, passed: true, detail });
  console.log(`PASS ${name}: ${detail}`);
};
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".txt": "text/plain",
};
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(
    new URL(req.url, "http://localhost").pathname,
  );
  const relative = path.startsWith("/preview/")
    ? path.slice("/preview/".length)
    : "";
  if (!path.startsWith("/preview/") || relative.includes("..")) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const body = await readFile(resolve("dist", relative || "index.html"));
    res.writeHead(200, {
      "Content-Type":
        mime[extname(relative || "index.html")] || "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
const executable = process.argv
  .find((a) => a.startsWith("--executable="))
  ?.slice(13);
const webkitExecutable = process.argv
  .find((a) => a.startsWith("--webkit="))
  ?.slice(9);
let browser;
const fixture = {
  status: "ACTIVE",
  rpm: 32000,
  freshness: "online",
  height: "8430",
  fail: false,
  fallback: false,
};
let apiCalls = [];
async function prepare(page, { skipTutorial = false } = {}) {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const location = message.location().url;
    const expectedApiFailure =
      location.startsWith("https://api.squeekchain.com/v1/status") &&
      message.text().includes("Failed to load resource");
    consoleErrors.push({
      message: message.text(),
      source: location.startsWith(url)
        ? location.replace(url, "/preview/")
        : location,
      expectedApiFailure,
    });
  });
  page.on("response", (r) => {
    if (r.url().startsWith(url) && r.status() >= 400)
      resourceFailures.push(`${r.status()} ${r.url()}`);
  });
  if (skipTutorial)
    await page.addInitScript(() =>
      localStorage.setItem("burrow-siege-tutorial-v1", "seen"),
    );
  await page.route("https://api.squeekchain.com/v1/status", async (route) => {
    apiCalls.push(Date.now());
    if (fixture.fail) {
      await route.abort("failed");
      return;
    }
    const now = await page.evaluate(() => new Date().toISOString());
    const block = { blockHeight: fixture.height, blockProgress: "478838171" };
    await route.fulfill({
      json: {
        measurement: {
          coreStatus: fixture.status,
          rpmMilli: fixture.rpm,
          freshness: fixture.freshness,
          observedAt: now,
          staleAfterSeconds: 120,
          distanceMm: 125000,
        },
        builder: { projected: fixture.fallback ? null : block, anchor: block },
      },
    });
  });
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await page.getByText("Live · Running", { exact: true }).waitFor();
}
const text = (locator) => locator.textContent();
async function audit(page, label) {
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  await writeFile(
    resolve(out, `axe-${label}.json`),
    JSON.stringify(
      {
        violations: audit.violations,
        incomplete: audit.incomplete.map((v) => ({
          id: v.id,
          description: v.description,
          nodes: v.nodes.length,
        })),
        passes: audit.passes.length,
      },
      null,
      2,
    ),
  );
  assert.deepEqual(
    audit.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    ),
    [],
    `Accessibility scan ${label}`,
  );
  record(
    `Axe ${label}`,
    `${audit.passes.length} rules passed; ${audit.incomplete.length} manual checks remain`,
  );
}
try {
  browser = await chromium.launch({
    headless: true,
    ...(executable ? { executablePath: executable } : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.clock.install();
  await prepare(page);
  await page.screenshot({ path: resolve(out, "390-first-visit.png") });
  const scene = await page.locator(".battlefield").boundingBox(),
    enter = await page
      .getByRole("button", { name: "Enter the burrow" })
      .boundingBox();
  assert.ok(scene.y < 844 && enter.y + enter.height <= 844);
  record(
    "First visit at 390",
    "Burrow scene and Enter the burrow action are on the first screen",
  );
  await audit(page, "tutorial");
  await page.getByRole("button", { name: "Enter the burrow" }).click();
  await page
    .getByRole("combobox", { name: "Quick tower selection" })
    .selectOption("honey");
  assert.equal(
    await page
      .getByRole("button", {
        name: "Plot 1: build Sticky Honey Trap",
        exact: true,
      })
      .count(),
    1,
  );
  await page
    .getByRole("combobox", { name: "Quick tower selection" })
    .selectOption("catapult");
  record(
    "Mobile quick build",
    "Native tower selector chooses a tower beside the battlefield without scrolling",
  );
  assert.ok(
    (await page.getByRole("button", { name: "Start wave 1" }).boundingBox()).y <
      844,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("burrow-siege-tutorial-v1")),
    "seen",
  );
  await page
    .getByRole("button", {
      name: "Seed Catapult, 55 seeds, no power needed",
      exact: true,
    })
    .tap();
  await page
    .getByRole("button", { name: "Plot 1: build Seed Catapult", exact: true })
    .tap();
  await page.getByText("Level 1/3", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Upgrade · 36 seeds", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Upgrade · 72 seeds", exact: true })
    .click();
  assert.equal(
    await page.getByRole("button", { name: "Max level" }).isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Sell · 114", exact: true }).click();
  assert.match(await text(page.locator(".game-message")), /sold for 114/);
  record(
    "Tap placement, upgrades and sell",
    "Built a catapult, upgraded to level 3, sold for 70% of its actual investment",
  );
  await page.keyboard.press("1");
  await page
    .getByRole("button", { name: "Plot 2: build Spark Coil", exact: true })
    .tap();
  assert.equal(
    await page
      .getByRole("button", {
        name: "Plot 2: Spark Coil, level 1. Select tower",
        exact: true,
      })
      .count(),
    1,
  );
  record("Tower hotkeys", "Hotkey 1 selects a working electric tower");
  await page.getByRole("button", { name: "Start wave 1" }).click();
  await page
    .getByRole("button", { name: "Game speed 1x. Switch to 2x" })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Game speed 2x. Switch to 1x" })
      .count(),
    1,
  );
  await page.clock.runFor(5000);
  await page.getByRole("button", { name: "Pause game", exact: true }).click();
  await page.clock.runFor(100);
  const frozenCanvas = await page
    .locator("canvas")
    .evaluate((c) => c.toDataURL());
  const watts = await page
    .getByRole("progressbar", { name: "Battery Watts" })
    .getAttribute("aria-valuenow");
  await page.clock.runFor(2000);
  assert.ok(
    (await page.locator("canvas").evaluate((c) => c.toDataURL())) ===
      frozenCanvas,
    "Pause also stops decorative canvas motion",
  );
  assert.equal(
    await page
      .getByRole("progressbar", { name: "Battery Watts" })
      .getAttribute("aria-valuenow"),
    watts,
  );
  await page.screenshot({ path: resolve(out, "390-paused.png") });
  await page
    .getByRole("button", { name: "Resume game", exact: true })
    .first()
    .click();
  record(
    "Wave, pause, and speed controls",
    "A wave spawns predators; 2x works; pause freezes battery and combat",
  );

  fixture.status = "IDLE";
  fixture.rpm = 0;
  await page.clock.runFor(5000);
  await page.getByText("Live · Napping", { exact: true }).waitFor();
  await page
    .getByRole("button", {
      name: "Seed Catapult, 39 seeds, no power needed",
      exact: true,
    })
    .waitFor();
  assert.match(await text(page.locator(".phase-banner")), /0.5×.*30% off/);
  record(
    "Live nap response",
    "IDLE changes the HUD, slows waves and discounts Seed Catapult from 55 to 39 seeds",
  );
  fixture.status = "ACTIVE";
  fixture.rpm = 50000;
  fixture.height = "8432";
  await page.clock.runFor(5000);
  await page
    .getByRole("dialog", { name: "A Block Crate has arrived" })
    .waitFor();
  assert.match(await text(page.locator(".crate-hero")), /8,431/);
  assert.equal(await page.locator(".upgrade-choices>button").count(), 3);
  await page.locator(".upgrade-choices>button").first().click();
  assert.match(await text(page.locator(".crate-hero")), /8,432/);
  await page.locator(".upgrade-choices>button").nth(1).click();
  await page
    .getByText("Overcharge! The burrow is buzzing", { exact: true })
    .waitFor();
  record(
    "Real block crates and rush",
    "Two height increments yielded two three-choice crates with the correct real block numbers; 50 RPM activates Overcharge",
  );

  fixture.fail = true;
  await page.clock.runFor(5000);
  await page.getByText("Wheel feed offline", { exact: true }).waitFor();
  assert.match(
    await text(page.locator(".simulation-label")),
    /Practice mode.*simulated/,
  );
  assert.match(await text(page.locator(".block-reading")), /Last real block/);
  await page.screenshot({ path: resolve(out, "390-offline.png") });
  fixture.fail = false;
  await page.getByRole("button", { name: "Retry live wheel feed" }).click();
  await page.getByText("Live · Running", { exact: true }).waitFor();
  fixture.freshness = "stale";
  await page.clock.runFor(5000);
  await page.getByText("Wheel feed offline", { exact: true }).waitFor();
  fixture.freshness = "online";
  fixture.status = "COUNTER_FAULT";
  await page.clock.runFor(5000);
  await page.getByText("Wheel feed offline", { exact: true }).waitFor();
  fixture.status = "ACTIVE";
  fixture.rpm = 32000;
  fixture.fallback = true;
  await page.getByRole("button", { name: "Retry live wheel feed" }).click();
  await page.getByText("Live · Running", { exact: true }).waitFor();
  assert.match(await text(page.locator(".block-reading")), /8,432/);
  record(
    "Offline, stale, fault and recovery",
    "All three failures show Wheel feed offline and explicit simulated Practice mode; Retry recovers, including anchor fallback",
  );

  await page.getByRole("button", { name: "Restart run", exact: true }).click();
  await page.getByRole("button", { name: "Keep playing", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", {
        name: "Plot 2: Spark Coil, level 1. Select tower",
        exact: true,
      })
      .count(),
    1,
  );
  await page.getByRole("button", { name: "Restart run", exact: true }).click();
  await page
    .getByRole("button", { name: "Restart run", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Start wave 1", exact: true })
    .waitFor();
  assert.equal(await page.locator(".plot.occupied").count(), 0);
  record(
    "Restart confirmation",
    "Cancel preserves the run; Restart clears towers, seeds, battery and wave",
  );
  await page.getByLabel("Run mode", { exact: true }).selectOption("endless");
  assert.match(await text(page.locator(".wave-stat")), /∞/);
  await page.getByLabel("Run mode", { exact: true }).selectOption("classic");
  await page.screenshot({
    path: resolve(out, "390-ready.png"),
    fullPage: true,
  });
  await audit(page, "game");
  for (const width of [320, 390, 768, 900, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
      `${width}px overflow`,
    );
    if (width === 1440)
      await page.screenshot({
        path: resolve(out, "1440-ready.png"),
        fullPage: true,
      });
  }
  record(
    "Responsive layout",
    "No horizontal overflow at 320, 390, 768, 900 and 1440 CSS px",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Start wave 1", exact: true }).click();
  await page
    .getByRole("button", { name: "Game speed 1x. Switch to 2x" })
    .click();
  await page.clock.runFor(50000);
  await page
    .getByRole("button", { name: "Send wave 2", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Send wave 2", exact: true }).click();
  await page.clock.runFor(55000);
  await page.getByRole("dialog", { name: "A brave little defense" }).waitFor();
  await page
    .getByLabel("Name for local high scores", { exact: false })
    .fill("<img src=x> keeper");
  await page.getByRole("button", { name: "Save score", exact: true }).click();
  await page
    .getByRole("button", { name: "Score saved", exact: true })
    .waitFor();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("burrow-siege-scores-v1")),
  );
  assert.equal(stored[0].name, "<img src=x> keeper");
  assert.equal(stored[0].block, "8432");
  assert.equal(stored[0].wave, 2);
  await page.screenshot({ path: resolve(out, "1440-result.png") });
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "High scores" }).click();
  assert.equal(
    await page.getByText("<img src=x> keeper", { exact: true }).count(),
    1,
  );
  assert.equal(await page.locator(".scores-list img").count(), 0);
  await page.reload();
  await page.getByRole("button", { name: "High scores" }).click();
  assert.equal(
    await page.getByText("<img src=x> keeper", { exact: true }).count(),
    1,
  );
  record(
    "Real defeat and local scores",
    "An undefended run loses on wave 2; real block 8432 persists; a markup-shaped player name is rendered as text and survives reload",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "How to play" }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .getByRole("button", { name: "How to play" })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.getByRole("button", { name: "How to play" }).focus();
  await page.screenshot({ path: resolve(out, "1440-keyboard-focus.png") });
  record(
    "Keyboard and focus return",
    "Enter opens help, Escape closes it, and focus returns to How to play",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".wheel-spokes")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  record(
    "Reduced motion",
    "Wheel CSS animation stops; game retains essential predator movement",
  );
  await context.close();
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    hasTouch: false,
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.clock.install();
  await prepare(desktopPage, { skipTutorial: true });
  await desktopPage.waitForFunction(
    () =>
      document
        .querySelector("canvas")
        .getContext("2d")
        .getImageData(210, 112, 1, 1).data[3] === 255,
  );
  const contrasts = await desktopPage.evaluate(() => {
    const rgb = (s) => s.match(/[\d.]+/g).map(Number);
    const luminance = (c) =>
      c
        .slice(0, 3)
        .map((v) => {
          v /= 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        })
        .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a, b) =>
      (Math.max(luminance(a), luminance(b)) + 0.05) /
      (Math.min(luminance(a), luminance(b)) + 0.05);
    const measure = (label, fore, back) => ({
      label,
      foreground: fore,
      background: back,
      ratio: Number(ratio(fore, back).toFixed(2)),
    });
    const root = getComputedStyle(document.documentElement),
      toolbar = getComputedStyle(document.querySelector(".scene-toolbar")),
      launch = getComputedStyle(document.querySelector(".toolbar-launch"));
    const pairs = [
      measure("Body on page", rgb(root.color), rgb(root.backgroundColor)),
      measure(
        "Muted header on page",
        rgb(getComputedStyle(document.querySelector(".brand p")).color),
        rgb(root.backgroundColor),
      ),
      measure("Primary action", rgb(launch.color), rgb(launch.backgroundColor)),
      measure(
        "Live status on feed",
        rgb(getComputedStyle(document.querySelector(".status-pill")).color),
        rgb(
          getComputedStyle(document.querySelector(".wheel-feed"))
            .backgroundColor,
        ),
      ),
      measure(
        "Toolbar text",
        rgb(getComputedStyle(document.querySelector(".burrow-name")).color),
        rgb(toolbar.backgroundColor),
      ),
    ];
    const canvas = document.querySelector("canvas"),
      ctx = canvas.getContext("2d");
    for (const [slot, x, y] of [
      [0, 210, 112],
      [8, 265, 352],
      [12, 265, 500],
    ]) {
      const plot = getComputedStyle(document.querySelectorAll(".plot")[slot]);
      const under = [...ctx.getImageData(x, y, 1, 1).data],
        tint = rgb(plot.backgroundColor),
        alpha = tint[3] ?? 1;
      const back = under
        .slice(0, 3)
        .map((v, i) => Math.round(tint[i] * alpha + v * (1 - alpha)));
      pairs.push(
        measure(
          `Plot ${slot + 1} marker over rendered canvas`,
          rgb(plot.color),
          back,
        ),
      );
    }
    return pairs;
  });
  await writeFile(
    resolve(out, "contrast.json"),
    JSON.stringify(contrasts, null, 2),
  );
  for (const pair of contrasts)
    assert.ok(pair.ratio >= 4.5, `${pair.label} contrast ${pair.ratio}`);
  record(
    "Rendered contrast samples",
    `${contrasts.length} measured pairs meet 4.5:1, including plot markers composited over actual canvas pixels`,
  );
  await desktopPage
    .getByRole("button", {
      name: "Spark Coil, 70 seeds, 9 Watts per shot",
      exact: true,
    })
    .click();
  await desktopPage
    .getByRole("button", { name: "Plot 1: build Spark Coil", exact: true })
    .click();
  await desktopPage.keyboard.press("4");
  await desktopPage
    .getByRole("button", { name: "Plot 3: build Seed Catapult", exact: true })
    .focus();
  await desktopPage.keyboard.press("Enter");
  assert.equal(await desktopPage.locator(".plot.occupied").count(), 2);
  const desktopStart = await desktopPage
    .getByRole("button", { name: "Start wave 1", exact: true })
    .boundingBox();
  assert.ok(
    desktopStart.y + desktopStart.height < 1000,
    "Desktop primary action is on the first screen",
  );
  await desktopPage.screenshot({
    path: resolve(out, "1440-desktop-ready.png"),
    fullPage: true,
  });
  await desktopPage
    .getByRole("button", { name: "Start wave 1", exact: true })
    .click();
  await desktopPage.clock.runFor(8000);
  await desktopPage.screenshot({
    path: resolve(out, "1440-desktop-active.png"),
    fullPage: true,
  });
  await desktopPage
    .getByRole("button", { name: "Pause game", exact: true })
    .click();
  await desktopPage.getByText("Burrow paused", { exact: true }).waitFor();
  record(
    "Desktop mouse and keyboard",
    "At 1440px without touch emulation: mouse builds Spark Coil, hotkey 4 plus Enter builds a catapult, and toolbar Start and Pause work",
  );
  await desktopContext.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(resourceFailures, []);
  assert.deepEqual(
    consoleErrors.filter((e) => !e.expectedApiFailure),
    [],
    "Unexpected browser console errors",
  );
  record(
    "Console and relative assets",
    "No unexpected console errors, page errors, or failed local assets under /preview/; deliberate API failure logs are retained separately",
  );
  await browser.close();
  browser = null;
  if (webkitExecutable || process.argv.includes("--with-webkit")) {
    browser = await webkit.launch({
      headless: true,
      ...(webkitExecutable ? { executablePath: webkitExecutable } : {}),
    });
    const safari = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
    const p = await safari.newPage();
    await prepare(p, { skipTutorial: true });
    await p
      .getByRole("button", {
        name: "Seed Catapult, 55 seeds, no power needed",
        exact: true,
      })
      .tap();
    await p
      .getByRole("button", { name: "Plot 1: build Seed Catapult", exact: true })
      .tap();
    await p.getByRole("button", { name: "Start wave 1" }).tap();
    await p.getByRole("button", { name: "Pause game", exact: true }).tap();
    await p.getByText("Burrow paused", { exact: true }).waitFor();
    await p.screenshot({ path: resolve(out, "webkit-390.png") });
    assert.ok(
      await p.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    );
    record(
      "WebKit touch flow",
      "At 390px: tower selection, tap placement, wave start and pause work without overflow",
    );
    await safari.close();
  }
} catch (error) {
  results.push({
    name: "Browser checks",
    passed: false,
    detail: error.message,
  });
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
  await writeFile(
    resolve(out, "results.json"),
    JSON.stringify(
      {
        results,
        pageErrors: errors,
        localResourceFailures: resourceFailures,
        consoleErrors,
        apiRequestsObserved: apiCalls.length,
      },
      null,
      2,
    ),
  );
}
