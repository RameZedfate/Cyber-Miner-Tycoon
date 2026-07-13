const fs = require('fs');
const path = require('path');
const sharp = require(path.join(process.env.TEMP, 'carousel-render', 'node_modules', 'sharp'));

const W = 1254;
const H = 1254;
const CREAM = '#f5ead7';
const ORANGE = '#ef6f2e';
const BLUE = '#2f6df6';

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapCjk(text, maxChars) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return [clean];
  const lines = [];
  let current = '';
  for (const char of clean) {
    current += char;
    if (current.length >= maxChars) {
      lines.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

function textBlock(lines, x, y, opts = {}) {
  const size = opts.size || 64;
  const gap = opts.gap || Math.round(size * 1.18);
  const fill = opts.fill || CREAM;
  const weight = opts.weight || 900;
  const family = opts.family || 'Microsoft JhengHei UI, Microsoft JhengHei, Noto Sans CJK TC, sans-serif';
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="0">` +
    lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : gap}">${esc(line)}</tspan>`).join('') +
    '</text>';
}

function bodyBlock(text, x, y, maxChars = 15) {
  return textBlock(wrapCjk(text, maxChars), x, y, {
    size: 44,
    gap: 62,
    fill: 'rgba(245,234,215,0.92)',
    weight: 700
  });
}

function coverHeadline(headline) {
  if (headline.includes('別人的 GPT')) {
    return `
      ${textBlock(['別人的 GPT'], 66, 212, { size: 118, gap: 128 })}
      ${textBlock(['為什麼這麼'], 66, 350, { size: 112, gap: 124 })}
      <text x="66" y="494" font-family='"Microsoft JhengHei UI", "Microsoft JhengHei", "Noto Sans CJK TC", sans-serif' font-size="116" font-weight="900" letter-spacing="0">
        <tspan fill="${CREAM}">有</tspan><tspan fill="${ORANGE}">產值</tspan><tspan fill="${CREAM}">？</tspan>
      </text>`;
  }
  return textBlock(wrapCjk(headline, 7), 66, 222, { size: 112, gap: 126 });
}

function coverSvg(page) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#020814" stop-opacity="0.98"/>
        <stop offset="47%" stop-color="#020814" stop-opacity="0.78"/>
        <stop offset="72%" stop-color="#020814" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#020814" stop-opacity="0.04"/>
      </linearGradient>
      <radialGradient id="warm" cx="72%" cy="48%" r="48%">
        <stop offset="0%" stop-color="${ORANGE}" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="${ORANGE}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#shade)"/>
    <rect width="${W}" height="${H}" fill="url(#warm)"/>
    <path d="M66 638 H92" stroke="${ORANGE}" stroke-width="6" stroke-linecap="round"/>
    <path d="M66 682 H730" stroke="rgba(245,234,215,0.18)" stroke-width="2"/>
    ${coverHeadline(page.headline)}
    <text x="104" y="650" fill="rgba(245,234,215,0.88)" font-family='"Microsoft JhengHei UI", "Microsoft JhengHei", "Noto Sans CJK TC", sans-serif' font-size="34" font-weight="800" letter-spacing="0">${esc(page.body)}</text>
  </svg>`;
}

function contentSvg(page, index, cta) {
  const isLast = page.role === 'closing';
  const accent = index % 2 === 0 ? ORANGE : BLUE;
  const ctaBlock = isLast ? `
    <g>
      <rect x="72" y="1046" width="694" height="98" rx="18" fill="${ORANGE}"/>
      <text x="419" y="1108" fill="#07101c" text-anchor="middle" font-family='"Microsoft JhengHei UI", "Microsoft JhengHei", "Noto Sans CJK TC", sans-serif' font-size="34" font-weight="900" letter-spacing="0">${esc(cta)}</text>
    </g>` : '';
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#020814" stop-opacity="0.96"/>
        <stop offset="55%" stop-color="#020814" stop-opacity="0.82"/>
        <stop offset="100%" stop-color="#020814" stop-opacity="0.40"/>
      </linearGradient>
      <radialGradient id="accent" cx="18%" cy="18%" r="72%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.13"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#shade)"/>
    <rect width="${W}" height="${H}" fill="url(#accent)"/>
    <text x="70" y="102" fill="rgba(245,234,215,0.48)" font-family="Arial, sans-serif" font-size="24" font-weight="700">0${page.num}</text>
    <path d="M70 136 H180" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
    ${textBlock(wrapCjk(page.headline, 8), 70, 258, { size: isLast ? 82 : 84, gap: 94 })}
    ${bodyBlock(page.body, 70, isLast ? 434 : 430, 16)}
    <path d="M70 772 C168 712, 280 720, 390 668 C500 616, 590 638, 694 594" stroke="${accent}" stroke-opacity="0.52" stroke-width="3" fill="none"/>
    <circle cx="390" cy="668" r="7" fill="${accent}"/>
    <rect x="82" y="825" width="238" height="96" rx="18" fill="rgba(245,234,215,0.035)" stroke="rgba(245,234,215,0.16)" stroke-width="2"/>
    <circle cx="122" cy="873" r="17" fill="none" stroke="${accent}" stroke-width="3"/>
    <path d="M162 858 H280 M162 884 H250" stroke="rgba(245,234,215,0.28)" stroke-width="5" stroke-linecap="round"/>
    ${ctaBlock}
  </svg>`;
}

function parseMarkdown(md) {
  const fm = md.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) throw new Error('Frontmatter not found');
  const meta = {};
  for (const line of fm[1].split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (match) meta[match[1]] = match[2].replace(/^"|"$/g, '');
  }
  const pages = [...md.matchAll(/^## Page (\d+)\nrole:\s*(.+)\nheadline:\s*([^\n]+)\nbody:\s*([\s\S]*?)(?=\n## Page |\n## Instagram Caption)/gm)]
    .map((match) => ({
      num: Number(match[1]),
      role: match[2].trim(),
      headline: match[3].trim(),
      body: match[4].trim()
    }))
    .sort((a, b) => a.num - b.num);
  const cta = (md.match(/## CTA\n\n([\s\S]*?)\n\n## Sources/) || [])[1]?.trim() || '';
  return { meta, pages, cta };
}

async function renderSlide(backgroundPath, page, index, cta, outputPath) {
  const overlay = page.role === 'cover'
    ? coverSvg(page)
    : contentSvg(page, index, cta);

  const bg = sharp(backgroundPath)
    .resize(W, H, { fit: 'cover' })
    .modulate({ brightness: page.role === 'cover' ? 0.94 : 0.72, saturation: page.role === 'cover' ? 1 : 0.74 });

  await bg
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .png()
    .toFile(outputPath);
}

async function main() {
  const [, , contentPath, outputDirArg, backgroundPathArg] = process.argv;
  if (!contentPath || !outputDirArg || !backgroundPathArg) {
    throw new Error('Usage: node scripts/render-carousel-style6.js <contentPath> <outputDir> <backgroundPath>');
  }
  const md = fs.readFileSync(contentPath, 'utf8');
  const { pages, cta } = parseMarkdown(md);
  const outputDir = path.resolve(outputDirArg);
  const backgroundPath = path.resolve(backgroundPathArg);
  fs.mkdirSync(outputDir, { recursive: true });

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const outputPath = path.join(outputDir, `slide-${String(page.num).padStart(2, '0')}.png`);
    await renderSlide(backgroundPath, page, index, cta, outputPath);
    console.log(outputPath);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
