// 上線前檢查：用「模擬價格」打開網頁，點遍所有月份／篩選／分頁，
// 確認頁面上每一個連結都是 Trip.com 而且帶著你的聯盟編號。
// 用法：node deals/check-links.mjs [截圖資料夾]
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
const ALLIANCE = "7106961", SID = "261258404";

const today = new Date(Date.now() + 8 * 3600e3);
const day = (n) => { const d = new Date(today); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const row = (o, d, oa, da, dep, ret, price, tr = 0, rtr = 0, airline = "IT") => ({
  origin: o, destination: d, origin_airport: oa, destination_airport: da, price,
  departure_at: dep + "T08:00:00+08:00", return_at: ret ? ret + "T18:00:00+09:00" : undefined,
  transfers: tr, return_transfers: ret ? rtr : undefined, link: "/search/TPE0101TYO1", airline,
});
const MOCK = {
  updated_at: new Date().toISOString(),
  rows: [
    row("TPE", "TYO", "TPE", "NRT", day(10), day(14), 6890),
    row("TPE", "TYO", "TPE", "HND", day(12), day(16), 7420, 1, 1),
    row("TPE", "OSA", "TPE", "KIX", day(20), day(24), 5980),
    row("TPE", "OSA", "TPE", "KIX", day(21), day(25), 6480),          // 同航線多組日期 → 價格日曆
    row("TPE", "OSA", "TPE", "KIX", day(23), day(27), 7180),
    row("TPE", "OSA", "TPE", "ITM", day(26), day(29), 8880, 1, 1, "MM"),
    row("KHH", "OKA", "KHH", "OKA", day(30), day(33), 4590),
    row("TPE", "SEL", "TPE", "ICN", day(40), day(44), 6100),
    row("TPE", "BKK", "TPE", "BKK", day(45), day(52), 7350),
    row("TPE", "PQC", "TPE", "PQC", day(22), day(36), 4551),
    row("RMQ", "DAD", "RMQ", "DAD", day(60), day(65), 5200),
    row("TPE", "FUK", "TPE", "FUK", day(15), null, 2399),
    row("TPE", "LAX", "TPE", "LAX", day(15), day(25), 9999),        // 非日韓泰越 → 不應出現
    row("TPE", "MNL", "TPE", "MNL", day(15), day(18), 2999),        // 馬尼拉 → 不應出現
    row("TPE", "TYO", "TPE", "NRT", day(-3), day(2), 3000),         // 已出發 → 不應出現
    row("TPE", "CJU", "TPE", "CJU", "2027-02-04", "2027-02-09", 8900), // 春節連假
  ],
};
const FSC = {
  updated_at: new Date().toISOString(), part: "fsc",
  rows: [
    row("TPE", "HKG", "TPE", "HKG", day(18), day(21), 5111, 0, 0, "CX"),
    row("TPE", "HKG", "TPE", "HKG", day(19), day(22), 5222, 0, 0, "BR"),
    row("TPE", "SHA", "TSA", "SHA", day(25), day(29), 6333, 0, 0, "CI"),
    row("TPE", "BJS", "TPE", "PEK", day(26), day(30), 7444, 0, 0, "CI"),
    row("TPE", "TYO", "TPE", "NRT", day(27), day(31), 8555, 0, 0, "JX"),
    row("KHH", "BKK", "KHH", "BKK", day(35), day(40), 6666, 1, 1, "CX"),
    row("TPE", "SEL", "TPE", "ICN", day(28), day(32), 7777, 0, 0, "KE"),
    row("TPE", "CAN", "TPE", "CAN", day(29), day(33), 6100, 0, 0, "CZ"),
  ],
};
MOCK.rows.push(row("TPE", "SHA", "TPE", "PVG", day(25), day(28), 1234)); // 廉航飛上海 → 只在便宜機票出現
MOCK.rows.push(row("TPE", "HKG", "TPE", "HKG", day(25), day(28), 2345)); // 廉航飛香港 → 只在便宜機票出現
MOCK.rows.push(row("TPE", "XMN", "TPE", "XMN", day(31), day(34), 5555, 0, 0, "MF")); // 傳統航空飛大陸 → 兩邊都出現
MOCK.rows.push(row("TPE", "PQC", "TPE", "PQC", day(33), day(38), 8888, 0, 0, "9G")); // 富國太陽航空 → 傳統航空要出現
// 熱門航線細抓（?part=m0～m3）：只出現在這裡的名古屋航線，要能顯示在網頁上
const EXTRA = { part: "m1", rows: [ row("TPE", "NGO", "TPE", "NGO", day(24), day(28), 3333, 0, 0, "IT") ] };
const PICKS = { updated_at: new Date().toISOString(), items: [
  { origin: "TPE", destination: "OSA", departDate: day(20), returnDate: day(24), price: 5980, direct: true,
    checkedAt: new Date().toISOString(), note: "週末出發，大阪直飛不到六千" },
] };
const HOTELS = { updated_at: new Date().toISOString(), items: [
  { city: "東京", country: "JP", name: "測試酒店 A", area: "淺草站步行 3 分鐘", rating: 8.6, pricePerNight: 2450,
    checkin: day(10), checkout: day(14), url: "https://tw.trip.com/hotels/detail/?hotelId=123" },
  { city: "東京", country: "JP", name: "外部網址酒店（應被擋掉）", rating: 9, pricePerNight: 1000, url: "https://www.booking.com/x" },
] };

const server = http.createServer((req, res) => {
  const p = path.join(DIR, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
  if (!p.startsWith(DIR) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": p.endsWith(".html") ? "text/html; charset=utf-8" : "application/json" });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;

const problems = [];
const seenLinks = new Set();
async function checkLinks(page, where, sub1 = "howtravle") {
  const hrefs = await page.$$eval("a[href]", as => as.map(a => a.href));
  for (const h of hrefs) {
    seenLinks.add(h);
    const u = new URL(h);
    const ok = (u.hostname === "trip.com" || u.hostname.endsWith(".trip.com")) &&
      u.searchParams.get("Allianceid") === ALLIANCE && u.searchParams.get("SID") === SID &&
      u.searchParams.get("trip_sub1") === sub1;
    if (!ok) problems.push(`${where}: 連結沒帶聯盟編號或不是 Trip.com → ${h}`);
  }
}

// 點遍所有月份／篩選，收集畫面文字並檢查每個連結
async function collect(page) {
  let text = "";
  for (const type of ["rt", "ow"]) {
    await page.click(`#tripType button[data-v="${type}"]`);
    for (const f of ["cheap", "direct", "weekend", "holiday"]) {
      await page.click(`#filters button[data-v="${f}"]`);
      const months = await page.$$eval("#months button", bs => bs.map(b => b.dataset.v));
      for (const m of months) {
        await page.click(`#months button[data-v="${m}"]`);
        text += await page.textContent("#flightList");
        await checkLinks(page, `${type}/${f}/${m}`, CURRENT_SUB1);
      }
    }
  }
  await page.click('#tripType button[data-v="rt"]');
  await page.click('#filters button[data-v="cheap"]');
  return text;
}
let CURRENT_SUB1 = "howtravle";

const browser = await chromium.launch();
try {
  for (const src of [null, "ig_day9"]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    page.on("pageerror", e => problems.push("網頁錯誤：" + e.message));
    await page.route("**/*workers.dev/**", r => r.fulfill({ contentType: "application/json",
      body: JSON.stringify(r.request().url().includes("part=fsc") ? FSC : /part=m\d/.test(r.request().url()) ? EXTRA : MOCK) }));
    await page.route("**/picks.json", r => r.fulfill({ contentType: "application/json", body: JSON.stringify(PICKS) }));
    await page.route("**/hotels.json", r => r.fulfill({ contentType: "application/json", body: JSON.stringify(HOTELS) }));
    const sub1 = src ? `howtravle_${src}` : "howtravle";
    CURRENT_SUB1 = sub1;
    await page.goto(base + (src ? `?src=${src}` : ""));
    await page.waitForSelector("#flightList .card");

    const text = await page.textContent("body");
    for (const bad of ["洛杉磯", "LAX", "MNL", "馬尼拉"]) if (text.includes(bad)) problems.push(`出現不該有的航線：${bad}`);
    if (!text.includes("Adam 精選")) problems.push("精選區沒顯示");
    if (SHOTS && !src) await page.screenshot({ path: path.join(SHOTS, "flights.png"), fullPage: true });

    // 便宜機票：要有大陸、香港
    const allText = await collect(page);
    for (const want of ["上海", "香港", "廈門", "名古屋", "NT$1,234", "NT$2,345"]) if (!allText.includes(want)) problems.push(`便宜機票缺少：${want}`);
    if (!allText.includes("台灣虎航")) problems.push("便宜機票卡片沒顯示航空公司名稱");
    for (const bad of ["洛杉磯", "馬尼拉"]) if (allText.includes(bad)) problems.push(`便宜機票出現不該有的：${bad}`);

    // 傳統航空
    await page.click('.tabs button[data-tab="fsc"]');
    await page.click('#filters button[data-v="cheap"]');
    await page.click('#tripType button[data-v="rt"]');
    if (await page.isVisible("#picks")) problems.push("傳統航空分頁不該顯示精選");
    if (SHOTS && !src) await page.screenshot({ path: path.join(SHOTS, "fsc.png"), fullPage: true });
    const fscText = await collect(page);
    for (const want of ["國泰航空", "中華航空", "星宇航空", "大韓航空", "南方航空", "廈門航空", "富國太陽航空", "香港", "上海", "北京", "廣州", "廈門"]) if (!fscText.includes(want)) problems.push(`傳統航空缺少：${want}`);
    for (const bad of ["NT$1,234", "NT$2,345", "NT$6,890"]) if (fscText.includes(bad)) problems.push(`傳統航空出現不該有的票：${bad}`);
    await page.click('.tabs button[data-tab="flights"]');
    if (!(await page.isVisible("#picks"))) problems.push("回到便宜機票後精選不見了");
    // 春節連假應在 2 月出現（若 2 月在顯示範圍內）
    await page.click('#tripType button[data-v="rt"]');
    await page.click('#filters button[data-v="holiday"]');

    // 互動功能：價格日曆、幫我選、連假倒數、預算
    await page.click('.tabs button[data-tab="flights"]');
    await page.click('#filters button[data-v="cheap"]');
    // 找到有「看全部日期」的月份
    let routeBtn = await page.$("#flightList [data-route]");
    for (const m of await page.$$eval("#months button", bs => bs.map(b => b.dataset.v))) {
      if (routeBtn) break;
      await page.click(`#months button[data-v="${m}"]`);
      routeBtn = await page.$("#flightList [data-route]");
    }
    if (!routeBtn) problems.push("卡片沒有「看全部日期」按鈕：" + JSON.stringify(await page.evaluate(() => ({ mode: state.mode, type: state.type, tab: state.tab, budget: state.budget, origin: state.origin, country: state.country, filter: state.filter, n: state.flights.length, osa: routeFlights("TPE", "OSA").length, cards: document.querySelectorAll("#flightList .card").length }))));
    else {
      await routeBtn.click();
      await page.waitForSelector("#sheet:not(.hidden) .opt");
      const nOpt = await page.$$eval("#sheet .opt", els => els.length);
      if (nOpt < 2) problems.push(`價格日曆只有 ${nOpt} 組日期`);
      if (!(await page.$("#sheet .day[data-day]"))) problems.push("價格日曆沒有可點的日期");
      await page.click("#sheet .day[data-day]");
      if (!(await page.$("#sheet .opt.hi"))) problems.push("點日曆日期沒有標出對應的選項");
      await checkLinks(page, "價格日曆", sub1);
      const hx = await page.$eval("#sheet .hotel-x", a => a.href).catch(() => null);
      if (!hx) problems.push("價格日曆沒有「順便看酒店」");
      else {
        const u = new URL(hx);
        if (!u.pathname.startsWith("/hotels/list") || !/^\d+$/.test(u.searchParams.get("city") || "")) problems.push(`順便看酒店的網址不對：${hx}`);
        if (!u.searchParams.get("checkin")) problems.push("順便看酒店沒有入住日期");
      }
      await page.keyboard.press("Escape");
      if (await page.isVisible("#sheet")) problems.push("按 Esc 沒有關閉面板");
    }
    await page.click("#luckyBtn");
    await page.waitForSelector("#sheet:not(.hidden) .card", { timeout: 5000 }).catch(() => problems.push("幫我選沒有抽出結果"));
    await checkLinks(page, "幫我選", sub1);
    await page.click("#again").catch(() => problems.push("沒有「再抽一次」"));
    await page.waitForSelector("#sheet:not(.hidden) .card", { timeout: 5000 }).catch(() => {});
    await page.click("#sheet .sheet-x");
    if (await page.isVisible("#sheet")) problems.push("按 X 沒有關閉面板");
    if (await page.isVisible("#countdown")) {
      await page.click("#countdown");
      const f = await page.$eval('#filters button[aria-pressed="true"]', b => b.dataset.v);
      if (f !== "holiday") problems.push("點連假倒數沒有切到連假篩選");
      await page.click('#filters button[data-v="cheap"]');
    } else problems.push("沒有顯示連假倒數");
    for (const v of await page.$$eval("#budget button", bs => bs.map(b => b.dataset.v))) {
      await page.click(`#budget button[data-v="${v}"]`);
      const over = await page.$$eval("#flightList .card .pr strong", (els, lim) => els.map(e => Number(e.textContent.replace(/[^0-9]/g, ""))).filter(p => lim > 0 && p > lim), Number(v));
      if (over.length) problems.push(`預算 ${v} 內卻出現 ${over.join(",")}`);
      await checkLinks(page, `預算${v}`, sub1);
    }
    await page.click('#budget button[data-v="0"]');

    await page.click('.tabs button[data-tab="hotels"]');
    const nCity = await page.$$eval("#hotelCities .card", e => e.length);
    if (nCity < 10) problems.push(`熱門城市酒店只有 ${nCity} 個`);
    const htext = await page.textContent("#hotelList");
    if (htext.includes("外部網址酒店")) problems.push("非 Trip.com 的酒店沒被擋掉");
    if (!htext.includes("測試酒店 A")) problems.push("酒店沒顯示");
    await checkLinks(page, "hotels", sub1);
    if (SHOTS && !src) await page.screenshot({ path: path.join(SHOTS, "hotels.png"), fullPage: true });
    await page.close();
  }

  // 細抓的資料一直沒回應：網頁仍要在等待上限後顯示主要資料
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route("**/*workers.dev/**", r => /part=m\d/.test(r.request().url())
      ? new Promise(() => {}) // 永遠不回應
      : r.fulfill({ contentType: "application/json", body: JSON.stringify(r.request().url().includes("part=fsc") ? FSC : MOCK) }));
    const t0 = Date.now();
    await page.goto(base);
    await page.waitForSelector("#flightList .card", { timeout: 15000 }).catch(() => problems.push("細抓資料沒回應時，網頁沒有顯示機票"));
    const waited = Date.now() - t0;
    if (waited > 12000) problems.push(`細抓資料沒回應時等太久：${waited}ms`);
    console.log(`細抓資料沒回應：${(waited / 1000).toFixed(1)} 秒後顯示主要資料`);
    await page.close();
  }

  // 累積資料庫有 300 筆以上：直接用，不再分段抓
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    // 精簡格式（cols＋data），跟正式抓價程式一樣；長崎只出現在這裡
    const cols = ["origin","destination","origin_airport","destination_airport","price","airline","departure_at","return_at","transfers","return_transfers","duration_to","seen"];
    const big = { part: "all", count: 320, cols, data: Array.from({ length: 320 }, (_, i) => {
      const d = ["TYO","OSA","SEL","BKK","NGS"][i % 5];
      return ["TPE", d, "TPE", d, 3000 + i, "IT", day(5 + (i % 90)), day(9 + (i % 90)), 0, 0, 180, Date.now()];
    }) };
    let partCalls = 0;
    await page.route("**/*workers.dev/**", r => {
      const u = r.request().url();
      if (/part=(m|g)\d/.test(u)) partCalls++;
      r.fulfill({ contentType: "application/json", body: JSON.stringify(u.includes("part=all") ? big : u.includes("part=fsc") ? FSC : MOCK) });
    });
    await page.goto(base);
    await page.waitForSelector("#flightList .card");
    await page.waitForTimeout(800);
    if (partCalls) problems.push(`資料庫已有 320 筆，網頁仍分段抓了 ${partCalls} 次`);
    const ngs = await page.evaluate(() => state.flights.filter(f => f.d === "NGS").length);
    if (ngs !== 64) problems.push(`精簡格式的資料庫沒有正確還原（長崎應有 64 筆，實際 ${ngs}）`);
    console.log(`資料庫 320 筆時分段抓的次數：${partCalls}`);
    await page.close();
  }

  // 分享連結 ?route=TPE-OSA：要直接打開那條航線的價格日曆
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route("**/*workers.dev/**", r => r.fulfill({ contentType: "application/json",
      body: JSON.stringify(r.request().url().includes("part=fsc") ? FSC : MOCK) }));
    await page.goto(base + "?route=TPE-TYO&src=share");
    await page.waitForSelector("#sheet:not(.hidden) .opt", { timeout: 5000 }).catch(() => problems.push("分享連結沒有打開航線面板"));
    await checkLinks(page, "分享連結", "howtravle_share");
    await page.close();
  }

  // 資料抓不到時：不可以顯示假價格
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route("**/*workers.dev/**", r => r.fulfill({ status: 500, body: "" }));
  await page.goto(base);
  await page.waitForSelector("#flightList .empty");
  if (await page.$("#flightList .card")) problems.push("資料抓不到時仍出現機票卡片");
  await checkLinks(page, "無資料");
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "nodata.png") });
} finally {
  await browser.close();
  server.close();
}

console.log(`檢查了 ${seenLinks.size} 個不同的連結`);
if (problems.length) { console.log("❌ 有問題：\n" + [...new Set(problems)].join("\n")); process.exit(1); }
console.log("✅ 全部連結都是 Trip.com 且帶聯盟編號 7106961 / 261258404");
