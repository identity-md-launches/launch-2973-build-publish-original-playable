import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, dirname, extname } from "node:path";
import assert from "node:assert/strict";

const root = resolve("dist");
const html = await readFile(resolve(root, "index.html"), "utf8");
for (const marker of [
  "<title>",
  'name="description"',
  'property="og:title"',
  'property="og:image"',
  'rel="icon"',
])
  assert.ok(html.includes(marker), `Missing ${marker}`);
async function checkAsset(base, value) {
  if (/^(data:|https:|#)/.test(value)) return;
  assert.ok(!value.startsWith("/"), `Absolute asset URL: ${value}`);
  const target = resolve(base, value.split("?")[0]);
  assert.ok(target.startsWith(root + "/"), `Asset escapes export: ${value}`);
  assert.ok((await stat(target)).isFile(), `Missing asset: ${value}`);
}
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g))
  await checkAsset(root, match[1]);
for (const entry of await readdir(resolve(root, "assets")))
  if (entry.endsWith(".css")) {
    const css = await readFile(resolve(root, "assets", entry), "utf8");
    for (const match of css.matchAll(/url\((?:["']?)([^)"']+)(?:["']?)\)/g))
      await checkAsset(resolve(root, "assets"), match[1]);
  }
const png = await readFile(resolve(root, "share.png"));
assert.equal(png.subarray(1, 4).toString(), "PNG");
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
const omitted = new Set([
  ".git",
  ".github",
  ".imd",
  "node_modules",
  ".cache",
  ".npm",
  ".vite",
  "coverage",
  "playwright-report",
  "test-results",
]);
const files = [];
async function walk(path = ".") {
  for (const e of await readdir(path, { withFileTypes: true })) {
    if (
      omitted.has(e.name) ||
      e.name === ".env" ||
      e.name.startsWith(".env.") ||
      (path === "./test" && e.name === "scratch")
    )
      continue;
    const relative = `${path}/${e.name}`;
    assert.ok(!e.isSymbolicLink(), `Deliverable symlink: ${relative}`);
    assert.notEqual(e.name, ".gitmodules", "Git submodules are not permitted");
    if (e.isDirectory()) await walk(relative);
    else if (e.isFile()) {
      assert.ok(
        ![".tgz", ".zip"].includes(extname(e.name)),
        `Unnecessary archive: ${relative}`,
      );
      files.push({ path: relative, bytes: (await stat(relative)).size });
    }
  }
}
await walk();
const total = files.reduce((s, f) => s + f.bytes, 0);
assert.ok(total <= 8_388_608, `Deliverables exceed 8 MiB: ${total}`);
const groups = {};
for (const f of files) {
  const group = f.path.split("/")[1];
  groups[group] = (groups[group] || 0) + f.bytes;
}
console.log(
  JSON.stringify(
    {
      passed: true,
      checks:
        "Relative local asset URLs, share PNG, metadata, no deliverable symlinks/submodules/dependency archives, byte budget",
      files: files.length,
      bytes: total,
      budget: 8_388_608,
      groups,
    },
    null,
    2,
  ),
);
