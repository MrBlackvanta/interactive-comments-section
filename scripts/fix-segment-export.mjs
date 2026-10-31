import { promises as fs } from "node:fs";
import path from "node:path";

const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: node scripts/fix-segment-export.mjs <out-dir>");
  process.exit(1);
}

let moved = 0;

async function flatten(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const child = path.join(dir, entry.name);
    if (entry.name.startsWith("__next.")) {
      await flattenSegmentDir(dir, child, entry.name);
    } else {
      await flatten(child);
    }
  }
}

async function flattenSegmentDir(destDir, dir, prefix) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await flattenSegmentDir(destDir, child, `${prefix}.${entry.name}`);
    } else {
      await fs.rename(child, path.join(destDir, `${prefix}.${entry.name}`));
      moved += 1;
    }
  }
  await fs.rmdir(dir);
}

await flatten(outDir);
console.log(
  moved === 0
    ? `${outDir}: segment files already flat`
    : `${outDir}: flattened ${moved} segment file${moved === 1 ? "" : "s"}`,
);
