
#!/usr/bin/env node
/**
 * Downloads tldraw static assets from the CDN and places them in public/tldraw/
 * so the app can serve them locally without hitting cdn.tldraw.com (CSP constraint).
 *
 * Run once: node scripts/download-tldraw-assets.mjs
 */

import { createWriteStream, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { get } from "https";
import { pipeline } from "stream/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public", "tldraw");
const VERSION = "5.3.2";
const CDN = `https://cdn.tldraw.com/${VERSION}`;

const ASSETS = [
  // Icon sprite — single SVG containing all 163 icon symbols
  `icons/icon/0_merged.svg`,
  // English translation (the app's default locale)
  `translations/en.json`,
  // Fonts used by tldraw's built-in text tool
  `fonts/IBMPlexMono-Medium.woff2`,
  `fonts/IBMPlexMono-MediumItalic.woff2`,
  `fonts/IBMPlexMono-Bold.woff2`,
  `fonts/IBMPlexMono-BoldItalic.woff2`,
  `fonts/IBMPlexSerif-Medium.woff2`,
  `fonts/IBMPlexSerif-MediumItalic.woff2`,
  `fonts/IBMPlexSerif-Bold.woff2`,
  `fonts/IBMPlexSerif-BoldItalic.woff2`,
  `fonts/IBMPlexSans-Medium.woff2`,
  `fonts/IBMPlexSans-MediumItalic.woff2`,
  `fonts/IBMPlexSans-Bold.woff2`,
  `fonts/IBMPlexSans-BoldItalic.woff2`,
  `fonts/Shantell_Sans-Informal_Regular.woff2`,
  `fonts/Shantell_Sans-Informal_Regular_Italic.woff2`,
  `fonts/Shantell_Sans-Informal_Bold.woff2`,
  `fonts/Shantell_Sans-Informal_Bold_Italic.woff2`,
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    mkdirSync(dirname(dest), { recursive: true });
    const file = createWriteStream(dest);
    get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      pipeline(res, file).then(resolve).catch(reject);
    }).on("error", reject);
  });
}

let ok = 0;
let fail = 0;

for (const asset of ASSETS) {
  const url = `${CDN}/${asset}`;
  const dest = join(PUBLIC, asset);
  process.stdout.write(`  ${asset} … `);
  try {
    await download(url, dest);
    console.log("✓");
    ok++;
  } catch (e) {
    console.log(`✗ (${e.message})`);
    fail++;
  }
}

console.log(`\nDone: ${ok} downloaded, ${fail} failed.`);
if (fail > 0) process.exit(1);
