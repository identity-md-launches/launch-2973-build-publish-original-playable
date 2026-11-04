import { build } from "vite";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";

const executable = process.argv
  .find((a) => a.startsWith("--executable="))
  ?.slice(13);
const bundle = await build({
  configFile: false,
  logLevel: "error",
  build: {
    write: false,
    minify: true,
    lib: { entry: "src/share-art.ts", name: "BurrowShare", formats: ["iife"] },
  },
});
const browser = await chromium.launch({
  headless: true,
  ...(executable ? { executablePath: executable } : {}),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const dm = (await readFile("src/assets/dm-sans-latin.woff2")).toString(
    "base64",
  );
  const pixel = (
    await readFile("src/assets/pixelify-sans-latin.woff2")
  ).toString("base64");
  await page.setContent(
    `<style>@font-face{font-family:'DM Sans';font-weight:400 700;src:url(data:font/woff2;base64,${dm})}@font-face{font-family:'Pixelify Sans';font-weight:700;src:url(data:font/woff2;base64,${pixel})}body{margin:0}canvas{display:block}</style><canvas></canvas>`,
  );
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('700 80px "Pixelify Sans"'),
      document.fonts.load('400 23px "DM Sans"'),
      document.fonts.load('700 20px "DM Sans"'),
    ]);
  });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  await page.addScriptTag({ content: output.output[0].code });
  await page.evaluate(() =>
    window.BurrowShare.drawShare(document.querySelector("canvas")),
  );
  await page.screenshot({ path: "public/share.png" });
  console.log(
    "Generated public/share.png (1200 × 630) from original game art.",
  );
} finally {
  await browser.close();
}
