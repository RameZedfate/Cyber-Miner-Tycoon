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
const row = (o, d, oa, da, dep, ret, price, tr = 0, rtr = 0) => ({
  origin: o, destination: d, origin_airport: oa, destination_airport: da, price,
  departure_at: dep + "T08:00:00+08:00", return_at: ret ? ret + "T18:00:00+09:00" : undefined,
  transfers: tr, return_transfers: ret ? rtr : undefined, link: "/search/TPE0101TYO1", airline: "IT",
});
const MOCK = {
  updated_at: new Date().toISOString(),
  rows: [
    row("TPE", "TYO", "TPE", "NRT", day(10), day(14), 6890),
    row("TPE", "TYO", "TPE", "HND", day(12), day(16), 7420, 1, 1),
    row("TPE", "OSA", "TPE", "KIX", day(20), day(24), 5980),
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

const browser = await chromium.launch();
try {
  for (const src of [null, "ig_day9"]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    page.on("pageerror", e => problems.push("網頁錯誤：" + e.message));
    await page.route("**/*workers.dev/**", r => r.fulfill({ contentType: "application/json", body: JSON.stringify(MOCK) }));
    await page.route("**/picks.json", r => r.fulfill({ contentType: "application/json", body: JSON.stringify(PICKS) }));
    await page.route("**/hotels.json", r => r.fulfill({ contentType: "application/json", body: JSON.stringify(HOTELS) }));
    const sub1 = src ? `howtravle_${src}` : "howtravle";
    await page.goto(base + (src ? `?src=${src}` : ""));
    await page.waitForSelector("#flightList .card");

    const text = await page.textContent("body");
    for (const bad of ["洛杉磯", "LAX", "MNL", "馬尼拉"]) if (text.includes(bad)) problems.push(`出現不該有的航線：${bad}`);
    if (!text.includes("Adam 精選")) problems.push("精選區沒顯示");
    if (SHOTS && !src) await page.screenshot({ path: path.join(SHOTS, "flights.png"), fullPage: true });

    // 點遍所有組合
    for (const type of ["rt", "ow"]) {
      await page.click(`#tripType button[data-v="${type}"]`);
      for (const f of ["cheap", "direct", "weekend", "holiday"]) {
        await page.click(`#filters button[data-v="${f}"]`);
        const months = await page.$$eval("#months button", bs => bs.map(b => b.dataset.v));
        for (const m of months) {
          await page.click(`#months button[data-v="${m}"]`);
          await checkLinks(page, `${type}/${f}/${m}`, sub1);
        }
      }
    }
    // 春節連假應在 2 月出現（若 2 月在顯示範圍內）
    await page.click('#tripType button[data-v="rt"]');
    await page.click('#filters button[data-v="holiday"]');

    await page.click('.tabs button[data-tab="hotels"]');
    const htext = await page.textContent("#hotelList");
    if (htext.includes("外部網址酒店")) problems.push("非 Trip.com 的酒店沒被擋掉");
    if (!htext.includes("測試酒店 A")) problems.push("酒店沒顯示");
    await checkLinks(page, "hotels", sub1);
    if (SHOTS && !src) await page.screenshot({ path: path.join(SHOTS, "hotels.png"), fullPage: true });
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
