const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require(path.join(process.env.TEMP, 'carousel-render', 'node_modules', 'sharp'));

const repoRoot = path.resolve(__dirname, '..');

function page(n, role = 'content') {
  return `## Page ${n}
role: ${role}
headline: Page ${n}
body: This is body text for page ${n}.`;
}

function makeMarkdown() {
  return `---
title: "CTA test"
pillar: ai
structure: how_to
page_count: 7
created_at: "2026-07-09"
status: draft
---

# Carousel

${page(1, 'cover')}

${page(2)}

${page(3)}

${page(4)}

${page(5)}

${page(6)}

${page(7, 'closing')}

## Instagram Caption

Caption text.

## CTA

Final CTA text

## Sources

- No external sources.
`;
}

async function orangePixelCount(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let count = 0;
  for (let y = 1040; y < 1136; y += 1) {
    for (let x = 118; x < 728; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      if (r > 220 && g > 100 && g < 190 && b < 140) {
        count += 1;
      }
    }
  }
  return count;
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'carousel-render-test-'));
  const contentPath = path.join(tempDir, 'content.md');
  const outputDir = path.join(tempDir, 'output');
  fs.writeFileSync(contentPath, makeMarkdown(), 'utf8');

  childProcess.execFileSync(
    process.execPath,
    ['scripts/render-carousel-draft.js', contentPath, outputDir],
    { cwd: repoRoot, stdio: 'pipe' }
  );

  const slide06Orange = await orangePixelCount(path.join(outputDir, 'slide-06.png'));
  const slide07Orange = await orangePixelCount(path.join(outputDir, 'slide-07.png'));

  assert(
    slide06Orange < 1000,
    `expected slide-06 to have no CTA button, found ${slide06Orange} orange pixels`
  );
  assert(
    slide07Orange > 30000,
    `expected slide-07 to have CTA button, found ${slide07Orange} orange pixels`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
