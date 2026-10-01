import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// PGLite opens `pglite.data` next to its bundled wasm (`/var/task/_libs`).
// Nitro traces the JS/wasm but not this file, so sign-in dies with ENOENT.
const from = join(process.cwd(), "node_modules/@electric-sql/pglite/dist/pglite.data");
const root = join(process.cwd(), ".vercel/output");

if (!existsSync(from) || !existsSync(root)) {
  console.log("[pglite] nothing to copy");
  process.exit(0);
}

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let isDir = false;
    try {
      isDir = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;
    if (name === "_libs") {
      const to = join(full, "pglite.data");
      if (!existsSync(to)) {
        copyFileSync(from, to);
        console.log("[pglite] copied data file to", to);
      }
    }
    walk(full);
  }
}

walk(root);
