const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require(path.join(process.env.TEMP, 'carousel-render', 'node_modules', 'sharp'));

const repoRoot = path.resolve(__dirname, '..');
const backgroundPath = path.join(
  repoRoot,
  'references',
  'carousel-visuals',
  'style6-generated-gpt-productivity-bg.png'
);

function page(n, role = 'content') {
  return `## Page ${n}
role: ${role}
headline: 測試標題${n}
body: 這是第 ${n} 頁的測試內容，確認文字與版面可以被穩定渲染。`;
}

function makeMarkdown() {
  return `---
title: "Style 6 test"
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

留言「GPT」我傳送相關資訊給你

## Sources

- No external sources.
`;
}

async function imageInfo(filePath) {
  return sharp(filePath).metadata();
}

async function orangeCtaPixels(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let count = 0;
  for (let y = 1050; y < 1150; y += 1) {
    for (let x = 72; x < 710; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      if (r > 190 && g > 70 && g < 160 && b < 90) {
        count += 1;
      }
    }
  }
  return count;
}

async function main() {
  assert(fs.existsSync(backgroundPath), `missing background: ${backgroundPath}`);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'carousel-style6-test-'));
  const contentPath = path.join(tempDir, 'content.md');
  const outputDir = path.join(tempDir, 'output');
  fs.writeFileSync(contentPath, makeMarkdown(), 'utf8');

  childProcess.execFileSync(
    process.execPath,
    ['scripts/render-carousel-style6.js', contentPath, outputDir, backgroundPath],
    { cwd: repoRoot, stdio: 'pipe' }
  );

  const files = fs.readdirSync(outputDir).filter((name) => /^slide-\d\d\.png$/.test(name)).sort();
  assert.deepStrictEqual(files, [
    'slide-01.png',
    'slide-02.png',
    'slide-03.png',
    'slide-04.png',
    'slide-05.png',
    'slide-06.png',
    'slide-07.png'
  ]);

  for (const file of files) {
    const meta = await imageInfo(path.join(outputDir, file));
    assert.strictEqual(meta.width, 1254, `${file} width`);
    assert.strictEqual(meta.height, 1254, `${file} height`);
  }

  assert(
    (await orangeCtaPixels(path.join(outputDir, 'slide-06.png'))) < 1000,
    'slide-06 should not contain CTA button'
  );
  assert(
    (await orangeCtaPixels(path.join(outputDir, 'slide-07.png'))) > 25000,
    'slide-07 should contain CTA button'
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
