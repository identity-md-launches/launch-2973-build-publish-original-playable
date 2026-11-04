import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium, webkit } from "playwright";

// Exercises the review reports through the production UI; never edits game state.
const observe = process.argv.includes("--observe");
const engines = process.argv.includes("--with-webkit")
  ? [chromium, webkit]
  : [chromium];
const out = resolve("test/scratch/revision-check");
await mkdir(out, { recursive: true });
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(
    new URL(req.url, "http://localhost").pathname,
  );
  if (!path.startsWith("/preview/") || path.includes("..")) {
    res.writeHead(404).end();
    return;
  }
  const file = path.slice("/preview/".length) || "index.html";
  try {
    const body = await readFile(resolve("dist", file));
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "text/plain" });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
const results = [];
let browser;
try {
  for (const engine of engines) {
    browser = await engine.launch({ headless: true });
    const errors = [];
    const context = await browser.newContext({
      viewport: { width: 461, height: 844 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().startsWith(url) && r.status() >= 400)
        errors.push(`${r.status()} ${r.url()}`);
    });
    await page.route("https://api.squeekchain.com/v1/status", (route) =>
      route.abort("failed"),
    );
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: "Enter the burrow" }).click();
    await page.getByText("Wheel feed offline", { exact: true }).waitFor();
    for (const width of [
      320, 350, 390, 460, 461, 480, 500, 520, 600, 700, 701, 768, 900, 901,
      1120, 1440,
    ]) {
      await page.setViewportSize({ width, height: 844 });
      const layout = await page.locator(".wheel-feed").evaluate((feed) => {
        const box = (r) => ({
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
        });
        const overlap = (a, b) =>
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 &&
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1;
        const texts = [];
        const walker = document.createTreeWalker(feed, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.textContent.trim() || !node.parentElement.checkVisibility())
            continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const r of range.getClientRects()) {
            if (r.width > 1 && r.height > 1)
              texts.push({ text: node.textContent.trim(), ...box(r) });
          }
        }
        const collisions = [];
        for (let i = 0; i < texts.length; i++)
          for (let j = i + 1; j < texts.length; j++)
            if (overlap(texts[i], texts[j]))
              collisions.push([texts[i], texts[j]]);
        const track = box(
          feed.querySelector(".block-progress").getBoundingClientRect(),
        );
        const trackCollisions = texts.filter((t) => overlap(t, track));
        const groups = [
          ".wheel-reading",
          ".block-reading",
          ".retry-button",
        ].map((selector) => ({
          selector,
          ...box(feed.querySelector(selector).getBoundingClientRect()),
        }));
        const groupCollisions = [];
        for (let i = 0; i < groups.length; i++)
          for (let j = i + 1; j < groups.length; j++)
            if (overlap(groups[i], groups[j]))
              groupCollisions.push([groups[i], groups[j]]);
        return {
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          display: getComputedStyle(feed).display,
          collisions,
          trackCollisions,
          groupCollisions,
          groups,
        };
      });
      const passed =
        layout.collisions.length === 0 &&
        layout.trackCollisions.length === 0 &&
        layout.groupCollisions.length === 0 &&
        layout.scrollWidth <= width;
      results.push({
        name: `${engine.name()} offline ${width}px`,
        passed,
        ...layout,
      });
      console.log(
        `${passed ? "PASS" : "FAIL"} ${engine.name()} offline ${width}px: ${layout.collisions.length} text collisions, ${layout.trackCollisions.length} text/bar collisions`,
      );
      if ([390, 461, 480, 520, 768, 900, 1440].includes(width))
        await page.screenshot({
          path: resolve(out, `${engine.name()}-offline-${width}.png`),
        });
    }
    await context.close();

    const soundContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const soundPage = await soundContext.newPage();
    soundPage.on("pageerror", (e) => errors.push(e.message));
    await soundPage.clock.install();
    await soundPage.addInitScript(() => {
      window.defeatNotes = [];
      const start = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function (...args) {
        window.defeatNotes.push(this.frequency.value);
        return start.apply(this, args);
      };
    });
    await soundPage.route(
      "https://api.squeekchain.com/v1/status",
      async (route) => {
        const block = { blockHeight: "8430", blockProgress: "478838171" };
        await route.fulfill({
          json: {
            measurement: {
              coreStatus: "ACTIVE",
              rpmMilli: 32000,
              freshness: "online",
              observedAt: await soundPage.evaluate(() =>
                new Date().toISOString(),
              ),
              staleAfterSeconds: 120,
              distanceMm: 125000,
            },
            builder: { projected: block, anchor: block },
          },
        });
      },
    );
    await soundPage.goto(url);
    await soundPage.getByRole("button", { name: "Enter the burrow" }).click();
    await soundPage.getByText("Live · Running", { exact: true }).waitFor();
    await soundPage.getByRole("button", { name: "Enable sound" }).click();
    const runs = [];
    for (let run = 1; run <= 2; run++) {
      await soundPage.keyboard.press("4");
      for (const slot of [1, 2, 3])
        await soundPage
          .getByRole("button", {
            name: `Plot ${slot}: build Seed Catapult`,
            exact: true,
          })
          .click();
      await soundPage
        .getByRole("button", { name: "Start wave 1", exact: true })
        .click();
      const first = await soundPage.evaluate(() => window.defeatNotes.length);
      // Advance the actual animation loop, combat and polling without waiting in real time.
      await soundPage.clock.runFor(60000);
      await soundPage
        .getByRole("button", { name: "Send wave 2", exact: true })
        .waitFor();
      const notes = await soundPage.evaluate(
        (first) => window.defeatNotes.slice(first),
        first,
      );
      assert.equal(
        await soundPage.getByRole("button", { name: "Mute sound" }).count(),
        1,
      );
      assert.match(await soundPage.locator(".heart-stat").textContent(), /20/);
      runs.push(notes);
      if (run === 1) {
        await soundPage
          .getByRole("button", { name: "Restart run", exact: true })
          .click();
        await soundPage
          .getByRole("dialog")
          .getByRole("button", { name: "Restart run", exact: true })
          .click();
        assert.equal(await soundPage.locator(".plot.occupied").count(), 0);
      }
    }
    const passed =
      runs.every((notes) => notes.length === 8) &&
      JSON.stringify(runs[0]) === JSON.stringify(runs[1]);
    results.push({ name: `${engine.name()} restart sound`, passed, runs });
    console.log(
      `${passed ? "PASS" : "FAIL"} ${engine.name()} restart sound: ${runs.map((n) => n.length).join(", ")} defeat beeps`,
    );
    assert.deepEqual(errors, [], "No page errors or failed local assets");
    await soundContext.close();
    await browser.close();
    browser = null;
  }
  await writeFile(
    resolve(out, "results.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
  if (!observe)
    assert.equal(
      results.filter((r) => !r.passed).length,
      0,
      "Review regressions",
    );
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
