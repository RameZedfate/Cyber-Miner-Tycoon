const fs = require('fs');
const path = require('path');
const sharp = require(path.join(process.env.TEMP, 'carousel-render', 'node_modules', 'sharp'));

const W = 1254;
const H = 1254;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(text, maxChars) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return [clean];
  const lines = [];
  let current = '';
  for (const ch of clean) {
    current += ch;
    if (current.length >= maxChars) {
      lines.push(current);
      current = '';
    }
  }
  if (current) lines.push(current);
  if (lines.length > 1 && /^[。！？；、,，\.]$/.test(lines[lines.length - 1])) {
    lines[lines.length - 2] += lines.pop();
  }
  return lines;
}

function textLines(lines, x, y, opts = {}) {
  const size = opts.size || 48;
  const weight = opts.weight || 700;
  const fill = opts.fill || '#fff';
  const gap = opts.gap || Math.round(size * 1.28);
  const letter = opts.letter || '0px';
  const family = opts.family || 'Microsoft JhengHei UI, Microsoft JhengHei, Noto Sans CJK TC, PingFang TC, sans-serif';
  const anchors = opts.anchor || 'start';
  let out = `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${letter}" text-anchor="${anchors}">`;
  lines.forEach((line, i) => {
    out += `<tspan x="${x}" dy="${i === 0 ? 0 : gap}">${esc(line)}</tspan>`;
  });
  out += `</text>`;
  return out;
}

function iconArt(kind, accent) {
  const stroke = accent;
  const fill = `${accent}1A`;
  if (kind === 'suitcase') {
    return `
      <g opacity="0.95">
        <rect x="834" y="278" width="236" height="308" rx="28" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
        <rect x="901" y="240" width="102" height="42" rx="18" fill="none" stroke="${stroke}" stroke-width="6"/>
        <rect x="884" y="320" width="22" height="194" rx="11" fill="${stroke}" opacity="0.22"/>
        <rect x="972" y="320" width="22" height="194" rx="11" fill="${stroke}" opacity="0.22"/>
        <path d="M814 668 C900 610, 982 600, 1128 636" stroke="${stroke}" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="10 10" opacity="0.75"/>
        <circle cx="1130" cy="636" r="10" fill="${stroke}"/>
        <rect x="866" y="622" width="188" height="102" rx="18" fill="${accent}14" stroke="${stroke}" stroke-width="3"/>
        <line x1="892" y1="650" x2="1028" y2="650" stroke="#fff" stroke-opacity="0.28" stroke-width="3"/>
        <line x1="892" y1="680" x2="982" y2="680" stroke="#fff" stroke-opacity="0.2" stroke-width="3"/>
      </g>`;
  }
  if (kind === 'map') {
    return `
      <g opacity="0.92">
        <circle cx="983" cy="430" r="166" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
        <path d="M983 315 C1030 348, 1042 448, 983 548 C923 447, 936 350, 983 315 Z" fill="${accent}26" stroke="${stroke}" stroke-width="4"/>
        <circle cx="983" cy="430" r="41" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="5"/>
        <path d="M902 602 C915 560, 960 536, 1006 548 C1049 558, 1080 589, 1092 634" stroke="${stroke}" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="12 10"/>
        <rect x="848" y="658" width="250" height="116" rx="24" fill="${accent}16" stroke="${stroke}" stroke-width="3"/>
        <path d="M878 708 H1066" stroke="#fff" stroke-opacity="0.22" stroke-width="4"/>
        <path d="M878 740 H1014" stroke="#fff" stroke-opacity="0.16" stroke-width="4"/>
      </g>`;
  }
  if (kind === 'passport') {
    return `
      <g opacity="0.92">
        <rect x="850" y="266" width="226" height="312" rx="24" fill="${fill}" stroke="${stroke}" stroke-width="4" transform="rotate(-8 850 266)"/>
        <rect x="902" y="288" width="226" height="312" rx="24" fill="${accent}18" stroke="${stroke}" stroke-width="4" transform="rotate(8 902 288)"/>
        <circle cx="1006" cy="430" r="68" fill="none" stroke="${stroke}" stroke-width="7" opacity="0.9"/>
        <path d="M980 430 H1032" stroke="#fff" stroke-opacity="0.3" stroke-width="5"/>
        <path d="M1006 404 V456" stroke="#fff" stroke-opacity="0.3" stroke-width="5"/>
        <path d="M826 660 C916 610, 980 600, 1114 648" stroke="${stroke}" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.78"/>
        <circle cx="1114" cy="648" r="9" fill="${stroke}"/>
      </g>`;
  }
  if (kind === 'phone') {
    return `
      <g opacity="0.92">
        <rect x="896" y="238" width="188" height="384" rx="34" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
        <rect x="928" y="278" width="124" height="20" rx="10" fill="${stroke}" opacity="0.28"/>
        <rect x="928" y="320" width="124" height="128" rx="20" fill="${accent}18" stroke="${stroke}" stroke-width="3"/>
        <line x1="952" y1="358" x2="1028" y2="358" stroke="#fff" stroke-opacity="0.28" stroke-width="4"/>
        <line x1="952" y1="388" x2="1000" y2="388" stroke="#fff" stroke-opacity="0.18" stroke-width="4"/>
        <circle cx="990" cy="510" r="28" fill="none" stroke="${stroke}" stroke-width="5"/>
        <path d="M866 666 C940 622, 1014 606, 1118 634" stroke="${stroke}" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="10 10" opacity="0.78"/>
      </g>`;
  }
  if (kind === 'cloud') {
    return `
      <g opacity="0.92">
        <path d="M876 482 C876 436, 912 400, 960 400 C979 357, 1024 330, 1071 344 C1107 353, 1134 380, 1143 416 C1174 423, 1199 451, 1199 488 C1199 532, 1163 568, 1118 568 H932 C899 568, 876 545, 876 514 Z" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
        <rect x="874" y="610" width="184" height="110" rx="18" fill="${accent}16" stroke="${stroke}" stroke-width="3"/>
        <rect x="960" y="642" width="184" height="110" rx="18" fill="${accent}10" stroke="${stroke}" stroke-width="3" opacity="0.9"/>
        <path d="M898 668 H1028" stroke="#fff" stroke-opacity="0.28" stroke-width="4"/>
        <path d="M898 700 H980" stroke="#fff" stroke-opacity="0.18" stroke-width="4"/>
        <path d="M842 590 C918 562, 1000 560, 1132 610" stroke="${stroke}" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.78"/>
      </g>`;
  }
  return `
    <g opacity="0.92">
      <rect x="848" y="252" width="262" height="404" rx="24" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
      <rect x="878" y="286" width="202" height="112" rx="16" fill="${accent}16" stroke="${stroke}" stroke-width="3"/>
      <line x1="910" y1="334" x2="1048" y2="334" stroke="#fff" stroke-opacity="0.28" stroke-width="4"/>
      <line x1="910" y1="366" x2="1000" y2="366" stroke="#fff" stroke-opacity="0.18" stroke-width="4"/>
      <circle cx="1120" cy="450" r="64" fill="none" stroke="${stroke}" stroke-width="6" opacity="0.72"/>
      <path d="M846 660 C946 618, 1038 606, 1142 634" stroke="${stroke}" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="12 10" opacity="0.75"/>
    </g>`;
}

function makeSvg(slide, index) {
  const [bg1, bg2] = slide.bg;
  const accent = slide.accent;
  const soft = slide.soft;
  const titleLines = index === 0 ? slide.title : slide.title;
  const bodyLines = slide.body;
  const titleY = index === 0 ? 238 : 228;
  const bodyY = index === 0 ? 415 : 390;
  const titleSize = index === 0 ? 82 : 72;
  const bodySize = index === 0 ? 54 : 38;
  const leftX = 118;
  const panelX = 72;
  const panelY = 68;
  const panelW = 710;
  const panelH = 1118;
  const ctaBlock = slide.cta ? `
    <g>
      <rect x="118" y="1040" width="610" height="96" rx="30" fill="${accent}" opacity="0.95"/>
      <text x="423" y="1099" text-anchor="middle" font-family="Microsoft JhengHei UI, Microsoft JhengHei, Noto Sans CJK TC, PingFang TC, sans-serif" font-size="34" font-weight="800" fill="#0b0f15">${esc(slide.cta)}</text>
    </g>` : '';

  const title = textLines(titleLines, leftX, titleY, {
    size: titleSize,
    weight: 900,
    fill: '#f7f8fb',
    gap: Math.round(titleSize * 1.06)
  });
  const body = textLines(bodyLines, leftX, bodyY, {
    size: bodySize,
    weight: 500,
    fill: 'rgba(247,248,251,0.95)',
    gap: Math.round(bodySize * 1.35)
  });

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
      <radialGradient id="glowA" cx="35%" cy="15%" r="70%">
        <stop offset="0%" stop-color="${soft}" stop-opacity="0.34"/>
        <stop offset="55%" stop-color="${soft}" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="${soft}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="glowB" cx="80%" cy="20%" r="65%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>
        <stop offset="60%" stop-color="${accent}" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
      <filter id="blur48"><feGaussianBlur stdDeviation="48"/></filter>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.05"/>
        </feComponentTransfer>
      </filter>
      <clipPath id="panelClip"><rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" rx="54"/></clipPath>
    </defs>

    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#glowA)"/>
    <rect width="${W}" height="${H}" fill="url(#glowB)"/>

    <g filter="url(#blur48)" opacity="0.9">
      <circle cx="988" cy="232" r="144" fill="${accent}" opacity="0.28"/>
      <circle cx="1124" cy="980" r="190" fill="#ffffff" opacity="0.045"/>
      <circle cx="262" cy="1054" r="200" fill="${soft}" opacity="0.08"/>
    </g>

    <g opacity="0.92">
      <path d="M810 188 C924 150, 1048 182, 1158 100" stroke="${accent}" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="10 12" opacity="0.45"/>
      <circle cx="1158" cy="100" r="10" fill="${accent}" opacity="0.78"/>
      <circle cx="810" cy="188" r="7" fill="#fff" opacity="0.18"/>
    </g>

    <g opacity="0.22">
      <path d="M792 310 h288" stroke="#fff" stroke-width="2"/>
      <path d="M792 348 h228" stroke="#fff" stroke-width="2"/>
      <path d="M792 386 h260" stroke="#fff" stroke-width="2"/>
    </g>

    ${iconArt(slide.art, accent)}

    <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" rx="54" fill="rgba(6,8,12,0.50)" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
    <rect x="${panelX + 18}" y="${panelY + 18}" width="${panelW - 36}" height="${panelH - 36}" rx="46" fill="rgba(255,255,255,0.02)"/>

    <g clip-path="url(#panelClip)">
      <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" fill="url(#grain)" opacity="0.23"/>
    </g>

    ${title}
    ${body}

    <line x1="${leftX}" y1="${index === 0 ? 330 : 316}" x2="${leftX + 160}" y2="${index === 0 ? 330 : 316}" stroke="${accent}" stroke-width="6" stroke-linecap="round" opacity="0.96"/>

    ${ctaBlock}
  </svg>`;
}

function parseMarkdown(md) {
  const fm = md.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) throw new Error('Frontmatter not found');
  const meta = {};
  for (const line of fm[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].replace(/^"|"$/g, '');
  }

  const pages = [...md.matchAll(/^## Page (\d+)\nrole:\s*(.+)\nheadline:\s*([^\n]+)\nbody:\s*([\s\S]*?)(?=\n## Page |\n## Instagram Caption)/gm)]
    .map((m) => ({
      num: Number(m[1]),
      role: m[2].trim(),
      headline: m[3].trim(),
      body: m[4].trim()
    }))
    .sort((a, b) => a.num - b.num);

  const caption = (md.match(/## Instagram Caption\n\n([\s\S]*?)\n\n## CTA/) || [])[1]?.trim() || '';
  const cta = (md.match(/## CTA\n\n([\s\S]*?)\n\n## Sources/) || [])[1]?.trim() || '';
  return { meta, pages, caption, cta };
}

async function main() {
  const [, , contentPath, outputDirArg] = process.argv;
  if (!contentPath || !outputDirArg) {
    throw new Error('Usage: node scripts/render-carousel-draft.js <contentPath> <outputDir>');
  }

  const md = fs.readFileSync(contentPath, 'utf8');
  const { meta, pages, cta } = parseMarkdown(md);
  const outputDir = path.resolve(outputDirArg);
  fs.mkdirSync(outputDir, { recursive: true });

  const slideDefs = pages.map((page, idx) => {
    const slideThemes = [
      { bg: ['#101623', '#0c0f14'], accent: '#f4a261', soft: '#ffd166', art: 'suitcase' },
      { bg: ['#10131d', '#081b24'], accent: '#4dd0e1', soft: '#b8f3ff', art: 'map' },
      { bg: ['#17111f', '#0d0f16'], accent: '#ffb86b', soft: '#ffe4b5', art: 'passport' },
      { bg: ['#101725', '#08111d'], accent: '#f6c65b', soft: '#fff1bf', art: 'phone' },
      { bg: ['#10241f', '#081419'], accent: '#8bd3c7', soft: '#d8fff6', art: 'cloud' },
      { bg: ['#111827', '#0b0f15'], accent: '#ff9f66', soft: '#ffe1bd', art: 'gate' }
    ];
    const theme = slideThemes[Math.min(idx, slideThemes.length - 1)];
    const title = wrapText(page.headline, idx === 0 ? 10 : 12);
    const body = idx === 0 ? [page.body] : wrapText(page.body, 14);
    return {
      ...theme,
      file: `slide-${String(page.num).padStart(2, '0')}.png`,
      title,
      body,
      cta: idx === pages.length - 1 ? cta : ''
    };
  });

  for (let i = 0; i < slideDefs.length; i++) {
    const slide = slideDefs[i];
    const svg = makeSvg(slide, i);
    const out = path.join(outputDir, slide.file);
    await sharp(Buffer.from(svg)).png().toFile(out);
    console.log(out);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
