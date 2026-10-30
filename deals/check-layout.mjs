// 版面檢查：用各種比例的模擬照片與航空公司標誌，在多種螢幕寬度下量測有沒有沒對齊、跑版、超出畫面。
// 用法：node deals/check-layout.mjs [截圖資料夾]
// 模擬資料只在這支檢查程式裡使用，不會出現在正式網頁上。
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const DIR = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = process.argv[2] || null;

const today = new Date(Date.now() + 8 * 3600e3);
const day = (n) => { const d = new Date(today); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const row = (o, d, oa, da, dep, ret, price, tr, rtr, airline) => ({
  origin: o, destination: d, origin_airport: oa, destination_airport: da, price, airline,
  departure_at: dep + "T08:00:00+08:00", return_at: ret ? ret + "T18:00:00+09:00" : undefined,
  transfers: tr, return_transfers: ret ? rtr : undefined,
});
const MAIN = { updated_at: new Date().toISOString(), rows: [
  row("TPE","TYO","TPE","NRT",day(10),day(14),6890,0,0,"IT"),
  row("TPE","OSA","TPE","KIX",day(12),day(16),5980,0,0,"MM"),
  ...Array.from({ length: 24 }, (_, i) => row("TPE","OSA","TPE","KIX",day(13 + i),day(17 + i),6100 + i * 137,i % 3 ? 0 : 1,0,["MM","IT","JX","CI"][i % 4])),
  row("KHH","OKA","KHH","OKA",day(13),day(16),4590,0,0,"IT"),
  row("TPE","SEL","TPE","ICN",day(14),day(18),6100,0,0,"TW"),
  row("TPE","BKK","TPE","DMK",day(15),day(22),7350,1,1,"FD"),
  row("TPE","PQC","TPE","PQC",day(16),day(30),4551,0,0,"9G"),        // 標誌載不到 → 顯示代碼
  row("RMQ","DAD","RMQ","DAD",day(17),day(22),5200,0,0,"VJ"),
  row("TPE","SHA","TPE","PVG",day(18),day(21),3999,0,0,"MU"),
  row("TPE","HKG","TPE","HKG",day(19),day(22),3500,0,0,"UO"),
  row("TPE","CTU","TPE","TFU",day(20),day(25),8800,1,1,"3U"),
  row("TPE","CJU","TPE","CJU",day(21),day(26),4387,0,0,"7C"),
  row("TPE","VDO","TPE","VDO",day(22),day(27),9900,1,0,"QQ"),        // 不在名單的航空公司
  row("TPE","FUK","TPE","FUK",day(15),null,2399,0,0,"IT"),
  row("TPE","CJU","TPE","CJU","2027-02-04","2027-02-09",8900,0,0,"KE"),
  // 說走就走：不管今天星期幾，都放幾張近 3 週週五出發、週日回來的票
  ...[0, 1, 2].flatMap(w => [["FUK", 3999], ["OKA", 4299], ["HKG", 3199]].map(([d, p], i) => {
    const fri = day(((5 - today.getUTCDay() + 7) % 7 || 7) + 7 * w); const sun = new Date(fri); sun.setUTCDate(sun.getUTCDate() + 2);
    return row("TPE", d, "TPE", d, fri, sun.toISOString().slice(0, 10), p + w * 50 + i, 0, 0, "IT");
  })),
] };
const FSC = { updated_at: new Date().toISOString(), part: "fsc", rows: [
  row("TPE","HKG","TPE","HKG",day(18),day(21),5111,0,0,"CX"),
  row("TPE","SHA","TSA","SHA",day(25),day(29),6333,0,0,"CI"),
  row("TPE","BJS","TPE","PEK",day(26),day(30),7444,0,0,"CA"),
  row("TPE","TYO","TPE","NRT",day(27),day(31),8555,0,0,"JX"),
  row("TPE","SEL","TPE","ICN",day(28),day(32),7777,0,0,"KE"),
] };
const PICKS = { items: [{ origin:"TPE", destination:"OSA", departDate:day(12), returnDate:day(16), price:5980, direct:true,
  airline:"MM", checkedAt:new Date().toISOString(), note:"週末出發，大阪直飛不到六千" }] };
const HOTELS = { updated_at: new Date().toISOString(), items: [
  { city:"東京", country:"JP", name:"淺草站前一間名字很長很長很長的精品設計酒店（測試換行）", area:"淺草站步行 3 分鐘", rating:8.6,
    pricePerNight:2450, checkin:day(10), checkout:day(14), url:"https://tw.trip.com/hotels/detail/?hotelId=1" },
  { city:"曼谷", country:"TH", name:"測試酒店 B", area:"暹羅", rating:8.2, pricePerNight:1350, url:"https://tw.trip.com/hotels/detail/?hotelId=2" },
] };

// 模擬照片：各種比例輪流（直式、橫式、超寬、正方形），其中一個條目故意沒有照片
const SHAPES = [[600, 900], [1600, 900], [2000, 500], [800, 800], [1280, 853]];
const NO_PHOTO = "Mount Daisen";
function svg(w, h, label, bg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="${bg}"/><rect x="4" y="4" width="${w - 8}" height="${h - 8}" fill="none" stroke="#fff" stroke-width="8"/>
  <text x="50%" y="50%" font-size="${Math.min(w, h) / 8}" fill="#fff" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
}

const server = http.createServer((req, res) => {
  const p = path.join(DIR, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
  if (!p.startsWith(DIR) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": p.endsWith(".html") ? "text/html; charset=utf-8" : "application/json" });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;

// 網頁向維基百科要的照片寬度（只能是標準寬度，否則正式網站常常被拒絕）
const askedSizes = new Set();
const STD_SIZES = new Set(["500", "960", "1280", "1920"]);
let failedOnce = new Set();
async function setup(page) {
  await page.route("**/*workers.dev/**", r => r.fulfill({ contentType: "application/json",
    body: JSON.stringify(r.request().url().includes("part=fsc") ? FSC : MAIN) }));
  await page.route("**/picks.json", r => r.fulfill({ contentType: "application/json", body: JSON.stringify(PICKS) }));
  await page.route("**/hotels.json", r => r.fulfill({ contentType: "application/json", body: JSON.stringify(HOTELS) }));
  await page.route("https://fonts.googleapis.com/**", r => r.fulfill({ contentType: "text/css", body: "" }));
  await page.route("https://fonts.gstatic.com/**", r => r.abort());
  await page.route("https://en.wikipedia.org/w/api.php**", r => {
    const u = new URL(r.request().url());
    const titles = u.searchParams.get("titles").split("|");
    const size = u.searchParams.get("pithumbsize");
    askedSizes.add(size);
    const pages = titles.map((t, i) => {
      if (t === NO_PHOTO) return { title: t };
      const [w, h] = SHAPES[(t.length + i) % SHAPES.length];
      return { title: t, thumbnail: { source: `https://img.mock/${encodeURIComponent(t)}/${w}x${h}.svg?s=${size}`, width: w, height: h } };
    });
    r.fulfill({ contentType: "application/json", body: JSON.stringify({ query: { pages } }) });
  });
  await page.route("https://commons.wikimedia.org/wiki/Special:FilePath/**", r => {
    askedSizes.add(new URL(r.request().url()).searchParams.get("width"));
    r.fulfill({ contentType: "image/svg+xml", body: svg(2400, 900, "panorama", "#7c3aed") }); });
  await page.route("https://img.mock/**", r => {
    // 富士山（日本磚塊）的照片第一次故意失敗（像維基百科太忙），網頁要自己再試一次
    const u0 = r.request().url();
    if (u0.includes("Mount%20Fuji") && !u0.includes("r=1") && !failedOnce.has(u0)) { failedOnce.add(u0); return r.fulfill({ status: 429, body: "" }); }
    const m = r.request().url().match(/\/(\d+)x(\d+)\.svg/);
    r.fulfill({ contentType: "image/svg+xml", body: svg(+m[1], +m[2], `${m[1]}x${m[2]}`, "#3b6ea5") });
  });
  // 航空公司標誌：一般是寬版；9G 兩個來源都失敗 → 要顯示代碼；MM 是很高的直式標誌
  await page.route("https://pics.avs.io/**", r => {
    const code = r.request().url().match(/\/([A-Z0-9]{2,3})\.png/)[1];
    if (code === "9G" || code === "QQ") return r.fulfill({ status: 404, body: "" });
    const [w, h] = code === "MM" ? [60, 120] : [288, 96];
    r.fulfill({ contentType: "image/svg+xml", body: svg(w, h, code, "#e11d48") });
  });
  await page.route("https://img.wway.io/**", r => r.fulfill({ status: 404, body: "" }));
}

// 在頁面裡量測
async function measure(page) {
  return page.evaluate(() => {
    const out = [];
    const R = (el) => el.getBoundingClientRect();
    const vis = (el) => { const r = R(el); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; };
    const near = (a, b, t = 1.01) => Math.abs(a - b) <= t;
    const W = document.documentElement.clientWidth;

    if (/\$\{|undefined|NaN|\[object/.test(document.body.innerText)) out.push("畫面上出現程式碼殘字（${、undefined、NaN）");
    if (document.documentElement.scrollWidth > W + 1) out.push(`整頁出現橫向捲軸：內容寬 ${document.documentElement.scrollWidth} > 畫面 ${W}`);

    // 1. 照片要剛好填滿照片框
    for (const img of document.querySelectorAll(".ph img.bgimg.ok")) {
      if (!vis(img.parentElement)) continue;
      // 用未放大前的尺寸量（大圖有刻意的慢慢放大效果）
      const pe = img.parentElement;
      if (img.offsetLeft !== 0 || img.offsetTop !== 0 || Math.abs(img.offsetWidth - pe.clientWidth) > 1 || Math.abs(img.offsetHeight - pe.clientHeight) > 1)
        out.push(`照片沒填滿框：${img.alt}（照片 ${img.offsetWidth}x${img.offsetHeight}，框 ${pe.clientWidth}x${pe.clientHeight}）`);
      if (getComputedStyle(img).objectFit !== "cover") out.push(`照片不是 cover：${img.alt}`);
    }
    // 2. 卡片照片框比例一致（機票卡 3:2、酒店城市卡 1:1）
    for (const ph of document.querySelectorAll(".card .ph")) {
      if (!vis(ph)) continue;
      const r = R(ph), want = ph.closest(".card.hc") ? 1 : 1.5;
      if (Math.abs(r.width / r.height - want) > 0.02) out.push(`卡片照片比例不對：${(r.width / r.height).toFixed(2)}（應為 ${want.toFixed(2)}）`);
    }
    // 3. 航空公司標誌：框大小一致、圖在框內、跟文字垂直置中
    for (const lg of document.querySelectorAll(".card .logo")) {
      if (!vis(lg)) continue;
      const r = R(lg);
      if (r.width > 60.5 || !near(r.height, 20)) out.push(`標誌框大小不對：${r.width}x${r.height}`);
      const inner = lg.firstElementChild;
      if (inner) {
        const i = R(inner);
        if (i.left < r.left - 1 || i.right > r.right + 1 || i.top < r.top - 1 || i.bottom > r.bottom + 1)
          out.push(`標誌超出框：${inner.alt || inner.textContent}`);
      }
      const an = lg.parentElement.querySelector(".an");
      if (an) {
        const a = R(an);
        if (Math.abs((r.top + r.bottom) / 2 - (a.top + a.bottom) / 2) > 2) out.push(`標誌跟航空公司名稱沒有垂直置中：${an.textContent}`);
      }
    }
    // 4. 同一列卡片：上緣、高度、照片底部、價格要對齊
    for (const grid of document.querySelectorAll(".grid")) {
      const cards = [...grid.children].filter(c => c.classList.contains("card") && vis(c));
      const rows = {};
      for (const c of cards) (rows[Math.round(R(c).top)] ||= []).push(c);
      for (const [top, cs] of Object.entries(rows)) {
        if (cs.length < 2) continue;
        const hs = cs.map(c => R(c).height), bs = cs.map(c => R(c.querySelector(".cb")).top);
        const phs = cs.map(c => R(c.querySelector(".ph")).bottom);
        if (Math.max(...hs) - Math.min(...hs) > 1) out.push(`同一列卡片高度不一（top=${top}）：${hs.map(h => h.toFixed(0)).join("/")}`);
        if (Math.max(...bs) - Math.min(...bs) > 1) out.push(`同一列卡片文字區沒對齊（top=${top}）`);
        if (Math.max(...phs) - Math.min(...phs) > 1) out.push(`同一列照片底部沒對齊（top=${top}）`);
      }
      // 卡片左右邊界要貼齊格線
      const lefts = new Set(cards.map(c => Math.round(R(c).left)));
      const gridR = R(grid);
      for (const c of cards) { const r = R(c); if (r.right > gridR.right + 1 || r.left < gridR.left - 1) out.push("卡片超出格線"); }
      const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
      if (cards.length && lefts.size > cols) out.push(`卡片左邊界有 ${lefts.size} 種位置，但只有 ${cols} 欄（欄位沒對齊）`);
    }
    // 5. 精簡卡片：日期列、航空公司列在同一排卡片裡上緣對齊；收藏愛心在照片右上角、不壓到標籤
    for (const grid of document.querySelectorAll(".grid")) {
      const cards = [...grid.children].filter(c => c.classList.contains("card") && vis(c) && c.querySelector(".when"));
      const rows = {};
      for (const c of cards) (rows[Math.round(R(c).top)] ||= []).push(c);
      for (const cs of Object.values(rows)) {
        if (cs.length < 2) continue;
        for (const [sel, name] of [[".top-row", "城市價格列"], [".air", "航空公司列"], [".when", "日期列"]]) {
          const v = cs.map(c => R(c.querySelector(sel)).top);
          if (Math.max(...v) - Math.min(...v) > 1) out.push(`同一排卡片的${name}沒對齊`);
        }
      }
    }
    for (const fb of document.querySelectorAll(".card .fav-btn")) {
      if (!vis(fb)) continue;
      const card = fb.closest(".card"), ph = R(card.querySelector(".ph")), r = R(fb), bd = card.querySelector(".badges");
      if (r.top < ph.top || r.bottom > ph.bottom || r.right > ph.right || r.left < ph.left + ph.width / 2) out.push("收藏愛心不在照片右上角");
      if (bd && bd.children.length) { const b = R(bd.lastElementChild); if (b.right > r.left - 2 && b.bottom > r.top && b.top < r.bottom) out.push("照片上的標籤壓到收藏愛心"); }
    }
    // 點擊位置：點照片上的標籤要去訂票（整張卡片的連結）；點愛心、「N 組日期」要點到它們自己
    const sheetOpen = !document.querySelector("#sheet").classList.contains("hidden");
    const barBottom = document.querySelector(".tabbar").getBoundingClientRect().bottom;
    const hitIs = (el, sel) => { const r = R(el); const x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2;
      if (y < barBottom + 2 || y > innerHeight - 2) return true;               // 被上方分頁列擋住或在畫面外：不算
      if (sheetOpen !== !!el.closest("#sheet")) return true;                    // 面板打開時只看面板裡的
      const top = document.elementFromPoint(x, y); return !!(top && top.closest(sel)); };
    for (const b of document.querySelectorAll(".card .badge")) if (vis(b) && !hitIs(b, ".card-link")) out.push("點照片上的標籤不會去訂票");
    for (const b of document.querySelectorAll(".card .fav-btn")) if (vis(b) && !hitIs(b, ".fav-btn")) out.push("愛心被蓋住點不到");
    for (const b of document.querySelectorAll(".card .more-d")) if (vis(b) && !hitIs(b, ".more-d")) out.push("「N 組日期」被蓋住點不到");
    for (const b of document.querySelectorAll(".card .cty")) if (vis(b) && !hitIs(b, ".card-link")) out.push("點城市名稱不會去訂票");
    // 其他熱門航線（文字列）：高度一樣、文字不超出
    const rrows = [...document.querySelectorAll(".rrow")].filter(vis);
    if (rrows.length) { const hs = rrows.map(e => Math.round(R(e).height)); if (Math.max(...hs) - Math.min(...hs) > 1) out.push("熱門航線列高度不一"); }
    // 5b. 城市名稱和價格在同一行：不重疊、價格不超出卡片
    for (const t of document.querySelectorAll(".top-row")) {
      if (!vis(t)) continue;
      const c = t.querySelector(".cty"), p = t.querySelector(".price"), card = R(t.closest(".card"));
      if (c && p) { const a = R(c), b = R(p); if (a.right > b.left + 1) out.push(`城市名稱壓到價格：${c.textContent}`); if (b.right > card.right + 1) out.push("價格超出卡片"); }
    }
    // 6. 文字被截斷或撐破
    for (const sel of [".cap .city", ".air .an", ".cty", ".price", ".when b", ".when .dm", ".more-d", ".tile .t b", ".tile .t span", ".month .p", ".month .m", ".tabs button", ".hero h2", ".badge", ".mini .md", ".mini .mp strong", ".mini .mp span", ".hc .ref b", ".chip", ".clear-c", ".rrow .rr-c", ".rrow .rr-go"]) {
      for (const el of document.querySelectorAll(sel)) {
        if (!vis(el)) continue;
        if (el.scrollWidth > el.clientWidth + 1) out.push(`文字被截斷：${sel}「${el.textContent.trim().slice(0, 20)}」`);
        const p = el.closest(".card,.tile,.slide,.tabs,.month,.mini,.rrow");
        if (p) { const a = R(el), b = R(p); if (a.right > b.right + 1 || a.left < b.left - 1) out.push(`文字超出外框：${sel}「${el.textContent.trim().slice(0, 20)}」`); }
      }
    }
    // 7. 照片上的標籤要在照片裡；整張卡片可點的連結要蓋住整張卡
    for (const ph of document.querySelectorAll(".card .ph")) {
      if (!vis(ph)) continue;
      const b = ph.querySelector(".badges"), r = R(ph);
      if (b && b.children.length) { const br = R(b.lastElementChild); if (br.right > r.right || br.bottom > r.bottom) out.push("照片上的標籤超出照片"); }
    }
    for (const card of document.querySelectorAll(".card")) {
      if (!vis(card)) continue;
      const l = card.querySelector(":scope > .card-link");
      if (!l) { out.push("卡片沒有整張可點的連結"); continue; }
      const a = R(l), c = R(card);
      if (Math.abs(a.width - c.width) > 1 || Math.abs(a.height - c.height) > 1) out.push("整張可點的連結沒有蓋住整張卡片");
    }
    // 8. 大圖輪播：每張跟畫面同寬、內容不超出
    for (const s of document.querySelectorAll(".slide")) {
      const r = R(s);
      if (s.closest("section.hidden")) continue;
      const hr = R(s.closest(".hero"));
      if (!near(r.width, hr.width, 1.5)) out.push(`輪播圖寬度 ${r.width} ≠ 大圖框 ${hr.width}`);
      if (hr.left < 15 || hr.right > W - 15) out.push(`大圖框沒有留邊（${hr.left}–${hr.right} / ${W}）`);
      for (const el of s.querySelectorAll(".in > .wrap")) { const a = R(el); if (a.bottom > r.bottom + 1 || a.top < r.top - 1) out.push("輪播文字超出圖片"); }
      const cta = s.querySelector(".hero-cta"); if (cta) { const a = R(cta); if (a.right > r.right + 1 || a.left < r.left - 1) out.push("輪播按鈕超出圖片"); }
    }
    const dots = document.querySelector(".hero-dots"), heroCta = document.querySelector("#hero .slide .hero-cta");
    if (dots && heroCta && vis(heroCta)) { const a = R(dots), b = R(heroCta); if (!(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)) out.push("輪播圓點壓到按鈕"); }
    // 9. 地區磚塊、月份按鈕大小一致
    for (const [sel, name] of [["#tiles .tile", "地區磚塊"], ["#months .month", "月份按鈕"], ["#favList .mini", "收藏小卡"]]) {
      const els = [...document.querySelectorAll(sel)].filter(vis);
      const ws = els.map(e => Math.round(R(e).width)), hs = els.map(e => Math.round(R(e).height));
      if (els.length && (Math.max(...ws) - Math.min(...ws) > 1 || Math.max(...hs) - Math.min(...hs) > 1)) out.push(`${name}大小不一：${ws.join(",")} / ${hs.join(",")}`);
    }
    // 篩選面板：每排內容的左緣要對齊
    const ctl = [...document.querySelectorAll(".panel .pctl")].filter(vis).map(c => {
      const first = c.querySelector(".scroller > *, .row > *"); return first ? Math.round(R(first).left) : null; }).filter(v => v !== null);
    if (ctl.length && Math.max(...ctl) - Math.min(...ctl) > 1) out.push(`篩選面板各排左緣沒對齊：${ctl.join(",")}`);
    const panel = document.querySelector(".panel");
    if (panel && vis(panel)) for (const el of panel.querySelectorAll(".plbl:not(.sr-only)")) { const a = R(el), b = R(panel); if (a.left < b.left) out.push("篩選標籤超出面板"); }
    // 10. 分頁按鈕三顆等寬
    const tabs = [...document.querySelectorAll(".tabs button")].map(b => Math.round(R(b).width));
    if (Math.max(...tabs) - Math.min(...tabs) > 1) out.push(`分頁按鈕寬度不一：${tabs.join(",")}`);
    // 11. 篩選列每顆按鈕高度一致、垂直置中
    for (const sc of [...document.querySelectorAll(".scroller, .quick")].filter(e => getComputedStyle(e).display === "flex")) {
      const bs = [...sc.children].filter(vis);
      const tops = bs.map(b => Math.round(R(b).top)), hs = bs.map(b => Math.round(R(b).height));
      if (bs.length && (Math.max(...tops) - Math.min(...tops) > 1 || Math.max(...hs) - Math.min(...hs) > 1)) out.push(`#${sc.id} 按鈕沒對齊`);
    }
    return out;
  });
}

// 640、1000 是兩欄／三欄剛切換的寬度，最容易擠
const VIEWPORTS = [[360, 780], [390, 844], [640, 900], [768, 1024], [1000, 800], [1280, 900], [1440, 900]];
const all = [];
const browser = await chromium.launch();
try {
  for (const [w, h] of VIEWPORTS) {
    // 量版面時把動畫關掉（量到動畫中途的位置會誤判）；動畫另外在最後測
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w < 700 ? 2 : 1, reducedMotion: "reduce" });
    page.on("pageerror", e => all.push(`[${w}] 網頁錯誤：${e.message}`));
    await setup(page);
    await page.goto(base);
    await page.waitForSelector("#flightList .card");
    // 減少動態：連 ::after（品牌雷達點）都不能動
    const pingAnim = await page.$eval(".brand .ping", e => getComputedStyle(e, "::after").animationName);
    if (pingAnim !== "none") all.push(`[${w}] 減少動態時品牌雷達點還在動（${pingAnim}）`);
    // 先收藏兩條航線，讓「我收藏的航線」也一起量
    for (const b of (await page.$$("#flightList .card [data-fav]")).slice(0, 2)) await b.click();
    await page.waitForTimeout(200);
    for (const tab of ["flights", "fsc", "hotels"]) {
      await page.click(`.tabs button[data-tab="${tab}"]`);
      // 捲動整頁讓延遲載入的照片都載入
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } window.scrollTo(0, 0); });
      await page.waitForTimeout(700);
      const issues = await measure(page);
      issues.forEach(i => all.push(`[${w}px ${tab}] ${i}`));
      if (tab === "flights") {
        await page.waitForTimeout(1800); // 等第一次失敗後的重試
        // 只看畫面上看得到的（藏起來的分頁裡的照片要等打開才會載入）
        const tt = await page.$$eval('#tiles img.bgimg[alt="富士山"]', els => els.map(e => e.classList.contains("ok")));
        if (!tt.length || tt.some(x => !x)) all.push(`[${w}px] 富士山照片第一次失敗後沒有重試成功（${JSON.stringify(tt)}）`);
      }
      const ok = await page.$$eval(".bgimg.ok", els => els.filter(e => !e.closest("section.hidden")).length);
      const fb = await page.$$eval(".ph .fb", els => els.filter(e => !e.closest("section.hidden") && !e.parentElement.querySelector(".bgimg.ok")).length);
      const fbNames = await page.$$eval(".ph .fb", els => els.filter(e => !e.closest("section.hidden") && !e.parentElement.querySelector(".bgimg.ok")).map(e => e.textContent));
      console.log(`[${w}px ${tab}] 照片載入 ${ok} 張、使用漸層底 ${fb} 個${fb ? "（" + fbNames.join("、") + "）" : ""}、問題 ${issues.length} 個`);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `layout-${w}-${tab}.png`), fullPage: true });
    }
    // 便宜票雷達：標籤不重疊、不超出、點了要開價格日曆
    await page.click('.tabs button[data-tab="flights"]');
    const radar = await page.evaluate(() => {
      const out = [], svg = document.querySelector("#radar");
      if (!svg || document.querySelector("#radarSec").classList.contains("hidden")) return { out: ["雷達沒有顯示"], n: 0, labels: 0 };
      const sb = svg.getBoundingClientRect();
      const ts = [...svg.querySelectorAll(".pt text, .region, .home text, .ring-l")].map(t => ({ t: t.textContent, b: t.getBoundingClientRect() }));
      for (const { t, b } of ts) if (b.left < sb.left - 1 || b.right > sb.right + 1 || b.top < sb.top - 1 || b.bottom > sb.bottom + 1) out.push(`雷達標籤超出：${t}`);
      for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
        const a = ts[i].b, c = ts[j].b;
        if (a.left < c.right - 1 && a.right > c.left + 1 && a.top < c.bottom - 1 && a.bottom > c.top + 1) out.push(`雷達標籤重疊：${ts[i].t}／${ts[j].t}`);
      }
      // 每個點都要露出來（不能被標籤蓋住）
      const dots = [...svg.querySelectorAll(".pt .dot")].map(d => ({ d, b: d.getBoundingClientRect() }));
      for (const { d, b } of dots) for (const { t, b: tb } of ts)
        if (b.left < tb.right - 1 && b.right > tb.left + 1 && b.top < tb.bottom - 1 && b.bottom > tb.top + 1) out.push(`雷達的點被標籤蓋住：${d.parentElement.dataset.route}／${t}`);
      return { out, n: svg.querySelectorAll(".pt").length, labels: svg.querySelectorAll(".pt text").length };
    });
    radar.out.forEach(i => all.push(`[${w}px 雷達] ${i}`));
    console.log(`[${w}px] 雷達：${radar.n} 個城市，${radar.labels} 個有標籤`);
    if (SHOTS) await (await page.$("#radarSec")).screenshot({ path: path.join(SHOTS, `radar-${w}.png`) });
    await page.locator("#radar .pt").last().click(); // 最便宜的點畫在最上層
    if (!(await page.isVisible("#sheet"))) all.push(`[${w}px] 點雷達的點沒有打開價格日曆`);
    await page.keyboard.press("Escape");

    // 價格日曆面板
    let rb = await page.$("#flightList [data-route]");
    for (const m of await page.$$eval("#months button", bs => bs.map(b => b.dataset.v))) { if (rb) break; await page.click(`#months button[data-v="${m}"]`); rb = await page.$("#flightList [data-route]"); }
    if (!rb) all.push(`[${w}px] 找不到「看全部日期」`);
    else {
      await rb.click();
      await page.waitForSelector("#sheet:not(.hidden) .opt");
      await page.waitForTimeout(500);
      const sheetIssues = await page.evaluate(() => {
        const out = [], R = (e) => e.getBoundingClientRect();
        const panel = document.querySelector(".sheet-panel");
        if (panel.scrollWidth > panel.clientWidth + 1) out.push(`面板出現橫向捲動 ${panel.scrollWidth}>${panel.clientWidth}`);
        const pr = R(panel); if (pr.left < -1 || pr.right > document.documentElement.clientWidth + 1) out.push("面板超出畫面");
        for (const g of document.querySelectorAll(".cal-grid")) {
          const cells = [...g.children].filter(c => c.classList.contains("day"));
          const ws = new Set(cells.map(c => Math.round(R(c).width)));
          if (ws.size > 1) out.push(`日曆格子寬度不一：${[...ws].join(",")}`);
          const rows = {}; for (const c of cells) (rows[Math.round(R(c).top)] ||= []).push(Math.round(R(c).height));
          for (const hs of Object.values(rows)) if (Math.max(...hs) - Math.min(...hs) > 1) out.push("日曆同一列格子高度不一");
        }
        // 日曆每一天要在正確的星期欄（1 號對到那天的星期幾）
        for (const cal of document.querySelectorAll(".cal")) {
          const [y, m] = cal.querySelector("h4").textContent.match(/\d+/g).map(Number);
          const wds = [...cal.querySelectorAll(".wd")].map(w => Math.round(R(w).left));
          const days = [...cal.querySelectorAll(".day:not(.blank)")];
          for (const [i, d] of days.entries()) {
            const want = new Date(Date.UTC(y, m - 1, i + 1)).getUTCDay();
            if (Math.abs(Math.round(R(d).left) - wds[want]) > 1) { out.push(`日曆 ${m}/${i + 1} 不在星期${"日一二三四五六"[want]}那一欄`); break; }
          }
        }
        for (const el of document.querySelectorAll(".day .p, .day .n, .opt .d1, .opt .pp strong, .fact, .sh-head .city")) {
          if (el.scrollWidth > el.clientWidth + 1) out.push(`面板文字被截斷：「${el.textContent.trim().slice(0, 16)}」`);
          const p = el.closest(".day,.opt,.facts,.sh-head"); if (p) { const a = R(el), b = R(p); if (a.right > b.right + 1 || a.left < b.left - 1) out.push(`面板文字超出外框：「${el.textContent.trim().slice(0, 16)}」`); }
        }
        const opts = [...document.querySelectorAll(".opt")];
        const ls = new Set(opts.map(o => Math.round(R(o).left))), rs = new Set(opts.map(o => Math.round(R(o).right)));
        if (ls.size > 1 || rs.size > 1) out.push("日期選項左右邊沒對齊");
        const x = R(document.querySelector(".sheet-x")); if (x.right > pr.right || x.top < pr.top - 1) out.push("關閉按鈕超出面板");
        return out;
      });
      sheetIssues.forEach(i => all.push(`[${w}px 價格日曆] ${i}`));
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `sheet-${w}.png`) });
      await page.keyboard.press("Escape");
    }
    // 幫我選
    await page.click("#luckyBtn");
    await page.waitForSelector("#sheet:not(.hidden) .card", { timeout: 5000 });
    await page.waitForTimeout(400);
    (await measure(page)).forEach(i => all.push(`[${w}px 幫我選] ${i}`));
    if (SHOTS && w <= 390) await page.screenshot({ path: path.join(SHOTS, `lucky-${w}.png`) });
    await page.keyboard.press("Escape");

    // 篩選到國家後再量一次（版面最容易出問題的情境：只剩 1～2 張卡）
    await page.click('.tabs button[data-tab="flights"]');
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(() => [...document.querySelectorAll("#tiles img.bgimg")].every(i => i.classList.contains("ok")), null, { timeout: 5000 }).catch(() => {});
    await page.click('#tiles .tile[data-v="HK"]');
    // 點地區後重畫的磚塊：載入過的照片要馬上顯示（不能先變空白再淡入）
    const blank = await page.$$eval("#tiles img.bgimg", els => els.filter(i => !i.classList.contains("ok")).length);
    if (blank) all.push(`[${w}px] 點地區後有 ${blank} 張磚塊照片重新變空白（會閃）`);
    await page.waitForTimeout(300);
    (await measure(page)).forEach(i => all.push(`[${w}px 香港] ${i}`));
    await page.close();
  }
  // ---------- 動畫開著：不能有東西一直隱形、動畫結束後版面一樣要對齊 ----------
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
    page.on("pageerror", e => all.push(`[動畫 ${w}] 網頁錯誤：${e.message}`));
    await setup(page);
    await page.goto(base);
    await page.waitForSelector("#flightList .card");
    await page.waitForTimeout(1200);
    const hero = await page.evaluate(() => {
      const s = document.querySelector("#hero .slide"), h2 = s && s.querySelector("h2"), st = s && s.querySelector(".pricebig strong");
      return { act: s && s.classList.contains("act"), op: h2 ? getComputedStyle(h2).opacity : "0", fp: !!document.querySelector("#hero .fp"),
        price: st ? st.textContent : "", want: st ? "NT$" + Number(st.dataset.v).toLocaleString("en-US") : "" };
    });
    if (!hero.act || hero.op !== "1") all.push(`[動畫 ${w}] 大圖文字沒有出現（act=${hero.act} opacity=${hero.op}）`);
    if (!hero.fp) all.push(`[動畫 ${w}] 大圖沒有航線動畫`);
    // 航線圖的比例要跟畫面一樣（飛機不會被拉長）
    const asp = await page.$eval("#hero .fp", s => { const vb = s.viewBox.baseVal, r = s.getBoundingClientRect(); return [vb.width / vb.height, r.width / r.height]; });
    if (Math.abs(asp[0] / asp[1] - 1) > 0.06) all.push(`[動畫 ${w}] 大圖航線被拉長變形（${asp.map(x => x.toFixed(2)).join(" vs ")}）`);
    // 新資料進來但最便宜的 5 個城市沒變：大圖不能重畫（會閃、價格會重新跳）
    const kept = await page.evaluate(() => { const sl = document.querySelector("#hero .slide"); sl.__m = 1;
      mergeAndRender([{ origin: "TPE", destination: "SGN", origin_airport: "TPE", destination_airport: "SGN", price: 99999, airline: "VJ",
        departure_at: new Date(Date.now() + 40 * 864e5).toISOString().slice(0, 10) + "T08:00:00+08:00", transfers: 0 }]);
      return document.querySelector("#hero .slide").__m === 1; });
    if (!kept) all.push(`[動畫 ${w}] 新資料進來時大圖整個重畫（會閃一下、價格重跳）`);
    if (hero.price !== hero.want) all.push(`[動畫 ${w}] 大圖價格跳數字後不是正確價格：${hero.price} ≠ ${hero.want}`);
    // 慢慢捲到底：每個浮上來的元素都要真的出現
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 250) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } });
    await page.waitForTimeout(900);
    const stuck = await page.$$eval(".rv:not(.in)", els => els.filter(e => e.offsetParent && !e.closest(".hidden")).map(e => e.className + "｜" + e.textContent.trim().slice(0, 12)));
    if (stuck.length) all.push(`[動畫 ${w}] 捲過了還沒出現：${stuck.slice(0, 5).join("、")}（共 ${stuck.length}）`);
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(600);
    (await measure(page)).filter(x => !/輪播|照片沒填滿/.test(x)).forEach(i => all.push(`[動畫 ${w}] ${i}`));
    // 收藏愛心彈跳
    await page.click("#flightList .card [data-fav]");
    if (!(await page.$("#flightList .fav-btn.pop"))) all.push(`[動畫 ${w}] 收藏沒有愛心動畫`);
    // 幫我選：彩帶
    await page.click("#luckyBtn");
    await page.waitForSelector("#sheet:not(.hidden) .card", { timeout: 5000 });
    if (!(await page.$("#sheet .confetti i"))) all.push(`[動畫 ${w}] 幫我選沒有彩帶`);
    await page.waitForTimeout(1800);
    const sx = await page.$eval(".sheet-panel", p => p.scrollWidth - p.clientWidth);
    if (sx > 1) all.push(`[動畫 ${w}] 彩帶讓面板可以左右滑（多 ${sx}px）`);
    await page.keyboard.press("Escape");
    // 酒店頁：大圖文字要看得到
    await page.click('.tabs button[data-tab="hotels"]');
    await page.waitForTimeout(700);
    const hop = await page.$eval("#hotelHero h2", e => getComputedStyle(e).opacity);
    if (hop !== "1") all.push(`[動畫 ${w}] 酒店大圖文字看不到（opacity=${hop}）`);
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 250) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } });
    await page.waitForTimeout(900);
    const stuckH = await page.$$eval("#hotels .rv:not(.in)", els => els.filter(e => e.offsetParent).length);
    if (stuckH) all.push(`[動畫 ${w}] 酒店頁有 ${stuckH} 個捲過了還沒出現`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `motion-${w}-hotels.png`) });
    console.log(`[動畫 ${w}] 檢查完成`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
const bad = [...askedSizes].filter(x => !STD_SIZES.has(String(x)));
if (bad.length) all.push(`向維基百科要了非標準的照片寬度：${bad.join(",")}（只能用 500／960／1280／1920）`);
console.log(`照片寬度：${[...askedSizes].sort().join("、")}`);
if (all.length) { console.log("❌ 版面問題：\n" + [...new Set(all)].join("\n")); process.exit(1); }
console.log("✅ 版面檢查全部通過");
