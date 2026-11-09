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
// 選條件都在「設定」面板裡：沒打開就先打開，點完關掉（關掉才點得到後面的卡片）
async function setClick(page, sel) {
  if (!(await page.isVisible("#setSheet"))) { await page.click("#openSet"); await page.waitForSelector("#setSheet:not(.hidden)"); }
  await page.click(sel);
  await page.keyboard.press("Escape");
  await page.waitForSelector("#setSheet", { state: "hidden" }).catch(() => {});
}
async function checkLinks(page, where, sub1 = "howtravle") {
  const hrefs = await page.$$eval("a[href]", as => as.map(a => a.href));
  for (const h of hrefs) {
    seenLinks.add(h);
    const u = new URL(h);
    const ok = (u.hostname === "trip.com" || u.hostname.endsWith(".trip.com")) &&
      u.searchParams.get("Allianceid") === ALLIANCE && u.searchParams.get("SID") === SID &&
      new RegExp(`^${sub1}(_[a-z]+)?$`).test(u.searchParams.get("trip_sub1") || "");
    if (!ok) problems.push(`${where}: 連結沒帶聯盟編號或不是 Trip.com → ${h}`);
  }
}

// 點遍所有月份／篩選，收集畫面文字並檢查每個連結
async function collect(page) {
  let text = "";
  for (const type of ["rt", "ow"]) {
    await setClick(page, `#tripType button[data-v="${type}"]`);
    // 額外條件可複選：每次開一個條件，看完再關掉（"" ＝不加條件）
    for (const f of ["", "direct", "weekend", ...(type === "rt" ? ["five"] : [])]) {
      if (f) await setClick(page, `#filters button[data-v="${f}"]`);
      const months = await page.$$eval("#months button", bs => bs.map(b => b.dataset.v));
      for (const m of months) {
        await setClick(page, `#months button[data-v="${m}"]`);
        while (await page.isVisible("#moreBtn")) await page.click("#moreBtn"); // 展開全部
        text += await page.textContent("#flightList");
        await checkLinks(page, `${type}/${f || "全部"}/${m || "全部月份"}`, CURRENT_SUB1);
      }
      if (f) await setClick(page, `#filters button[data-v="${f}"]`);
    }
  }
  await setClick(page, '#tripType button[data-v="rt"]');
  await setClick(page, '#months button[data-v=""]');
  return text;
}
let CURRENT_SUB1 = "howtravle";

const browser = await chromium.launch();
// 動畫關掉再測（點擊位置、數量才穩定）；動畫另外在 check-layout.mjs 測
{ const np = browser.newPage.bind(browser), nc = browser.newContext.bind(browser);
  browser.newPage = (o = {}) => np({ reducedMotion: "reduce", ...o });
  browser.newContext = (o = {}) => nc({ reducedMotion: "reduce", ...o }); }
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

    // 已經沒有「傳統航空」分頁：只剩便宜機票、便宜酒店
    if (await page.$('.tabs button[data-tab="fsc"]')) problems.push("不該再有「傳統航空」分頁");
    if ((await page.$$(".tabs button[data-tab]")).length !== 2) problems.push("分頁應該只有「便宜機票」「便宜酒店」兩個");
    // 額外條件「僅看傳統」＝原本的傳統航空
    await setClick(page, '#tripType button[data-v="rt"]');
    await setClick(page, '#filters button[data-v="fsc"]');
    if ((await page.evaluate(() => state.mode)) !== "fsc") problems.push("勾「僅看傳統」後應只看傳統航空");
    if ((await page.textContent("#picks")).includes("Adam 精選") && await page.isVisible("#picks")) problems.push("僅看傳統時不該顯示 Adam 手動精選");
    if (SHOTS && !src) await page.screenshot({ path: path.join(SHOTS, "fsc.png"), fullPage: true });
    const fscText = await collect(page);
    for (const want of ["國泰航空", "中華航空", "星宇航空", "大韓航空", "南方航空", "廈門航空", "富國太陽航空", "香港", "上海", "北京", "廣州", "廈門"]) if (!fscText.includes(want)) problems.push(`僅看傳統缺少：${want}`);
    for (const bad of ["NT$1,234", "NT$2,345", "NT$6,890"]) if (fscText.includes(bad)) problems.push(`僅看傳統出現不該有的票：${bad}`);
    // 「僅看廉航」：傳統航空的票都不能出現
    await setClick(page, '#filters button[data-v="fsc"]');
    await setClick(page, '#filters button[data-v="lcc"]');
    const lccAir = await page.evaluate(() => [...new Set(cheapestPerRoute(baseFiltered()).map(f => f.airline))].filter(a => FSC_AIRLINES[a]));
    if (lccAir.length) problems.push(`僅看廉航還出現傳統航空：${lccAir.join(",")}`);
    // 兩個都勾＝全部航空
    await setClick(page, '#filters button[data-v="fsc"]');
    if ((await page.evaluate(() => state.mode)) !== "all") problems.push("「僅看廉航」「僅看傳統」都勾時應該看全部航空");
    await setClick(page, '#filters button[data-v="fsc"]'); await setClick(page, '#filters button[data-v="lcc"]');
    if (!(await page.isVisible("#picks")) || !(await page.textContent("#picks")).includes("Adam 精選")) problems.push("取消條件後精選不見了");

    // 互動功能：價格日曆、幫我選、預算
    await page.click('.tabs button[data-tab="flights"]');
    // 找到有「看全部日期」的月份
    // 優先挑有酒店城市代碼的目的地（才測得到「順便看酒店」）；哪張卡排第一會隨日期變
    const pickRoute = () => page.evaluateHandle(() => {
      const bs = [...document.querySelectorAll("#flightList [data-route]")];
      return bs.find(b => HOTEL_CITY[canon(b.dataset.route.split("-")[1])]) || bs[0] || null; }).then(h => h.asElement());
    let routeBtn = await pickRoute();
    for (const m of await page.$$eval("#months button", bs => bs.map(b => b.dataset.v))) {
      if (routeBtn) break;
      await setClick(page, `#months button[data-v="${m}"]`);
      routeBtn = await pickRoute();
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
      // 手機按「返回」：要關面板、留在網站上
      const before = page.url();
      await routeBtn.click();
      await page.waitForSelector("#sheet:not(.hidden) .opt");
      await page.goBack();
      await page.waitForTimeout(300);
      if (await page.isVisible("#sheet")) problems.push("按返回沒有關閉面板");
      if (page.url() !== before || !(await page.$("#flightList"))) problems.push(`按返回離開了網站：${page.url()}`);
      // 關掉面板後再按返回不應該又出現面板
      await routeBtn.click();
      await page.waitForSelector("#sheet:not(.hidden) .opt");
      await page.click("#sheet .sheet-x");
      await page.waitForTimeout(300);
      if (await page.isVisible("#sheet")) problems.push("按 X 沒有關閉面板（返回鍵版本）");
    }
    // 出發地按鈕：點「高雄」只剩高雄出發的票，點回「全部出發地」恢復
    await setClick(page, '#origin button[data-v="KHH"]');
    const froms = await page.$$eval("#flightList .card .an", els => els.map(e => e.textContent));
    if (!froms.length || froms.some(t => !t.includes("高雄出發"))) problems.push(`點「高雄」後出現非高雄出發的票：${froms.join("／")}`);
    await checkLinks(page, "高雄出發", sub1);
    await setClick(page, '#origin button[data-v=""]');
    if ((await page.evaluate(() => state.origins.size)) !== 0) problems.push("點「全部出發地」沒有恢復");
    // 讓幫我選一定抽到有多組日期的城市（才測得到「全部日期」和返回鍵）
    const pickable = await page.evaluate(() => { const pool = cheapestPerCity(modeFiltered()).filter(f => flightUrl(f)).slice(0, 15);
      const i = pool.findIndex(f => routeFlights(f.o, f.d).length > 1); if (i < 0) return false;
      Math.random = () => (i + 0.5) / pool.length; return true; });
    if (!pickable) problems.push("測試資料裡沒有多組日期的城市可以抽");
    await page.click("#luckyBtn");
    await page.waitForSelector("#sheet:not(.hidden) .win .pass", { timeout: 5000 }).catch(() => problems.push("幫我選沒有抽出結果"));
    await checkLinks(page, "幫我選", sub1);
    const boba = await page.textContent("#sheet .boba").catch(() => "");
    const bp = await page.evaluate(() => { const t = document.querySelector("#sheet .pass strong[data-v]"); return t ? Number(t.dataset.v) : 0; });
    if (!boba.includes(`${Math.max(1, Math.round(bp / 60))} 杯珍奶`)) problems.push(`幫我選的珍奶換算不對：${boba}（票價 ${bp}）`);
    if (!(await page.$("#sheet .trip"))) problems.push("幫我選的結果沒有整趟旅費");
    await page.click("#again").catch(() => problems.push("沒有「再抽一次」"));
    await page.waitForSelector("#sheet:not(.hidden) .win .pass", { timeout: 5000 }).catch(() => {});
    // 幫我選結果上的「收藏」：按了變「已收藏」，關掉後上面出現收藏區；再按一次取消
    const lf = await page.$("#sheet .btn2.fav-btn");
    if (!lf) problems.push("幫我選的結果沒有收藏按鈕");
    else {
      const key = await lf.getAttribute("data-fav");
      const wasOn = (await lf.getAttribute("aria-pressed")) === "true";
      if (wasOn) await lf.click(); // 先變成沒收藏，從頭測
      await page.click("#sheet .btn2.fav-btn");
      const now = await page.$eval("#sheet .btn2.fav-btn", b => [b.getAttribute("aria-pressed"), b.textContent.trim(), b.classList.contains("btn2")]);
      if (now[0] !== "true" || !now[1].includes("已收藏") || !now[2]) problems.push(`幫我選的收藏按鈕沒有正確切換：${JSON.stringify(now)}`);
      // 返回鍵：幫我選 → 全部日期 → 返回要回到抽中的結果（收藏狀態還在），再返回才關掉
      const allDates = await page.$("#sheet .sh-actions [data-route]");
      if (!allDates) problems.push("幫我選的結果沒有「全部日期」");
      else {
        await allDates.click();
        await page.waitForSelector("#sheet:not(.hidden) .opt", { timeout: 3000 }).catch(() => problems.push("幫我選的「全部日期」沒有打開價格日曆"));
        await page.goBack(); await page.waitForTimeout(300);
        if (!(await page.$("#sheet:not(.hidden) .win .pass"))) problems.push("價格日曆按返回沒有回到幫我選的結果");
        else if ((await page.$eval("#sheet .btn2.fav-btn", b => b.getAttribute("aria-pressed"))) !== "true") problems.push("回到幫我選的結果後收藏狀態不見了");
      }
      if (!(await page.isVisible("#sheet"))) problems.push("幫我選的結果不見了");
      // 關掉面板後上面出現收藏區
      if (await page.isVisible("#sheet")) await page.click("#sheet .sheet-x");
      await page.waitForTimeout(300);
      if (!(await page.isVisible("#favSec"))) problems.push("幫我選收藏後，關掉面板沒有出現收藏區");
      if (!wasOn) await page.evaluate(k => { const [o, d] = k.split("-"); toggleFav(o, d); }, key); // 恢復原狀
    }
    if (await page.isVisible("#sheet")) problems.push("按 X 沒有關閉面板");
    // 疊兩層（幫我選 → 全部日期）後按 X：要全部關掉、還在網站上
    const here = page.url();
    await page.click("#luckyBtn");
    await page.waitForSelector("#sheet:not(.hidden) .win .pass", { timeout: 5000 }).catch(() => {});
    if (await page.$("#sheet .sh-actions [data-route]")) {
      await page.click("#sheet .sh-actions [data-route]");
      await page.waitForSelector("#sheet:not(.hidden) .opt", { timeout: 3000 }).catch(() => {});
    }
    await page.click("#sheet .sheet-x"); await page.waitForTimeout(400);
    if (await page.isVisible("#sheet") || page.url() !== here) problems.push(`疊兩層後按 X 沒有乾淨關掉：${page.url()}`);
    await page.click('.tabs button[data-tab="hotels"]');
    const nCity = await page.$$eval("#hotelCities .card", e => e.length);
    if (nCity < 10) problems.push(`熱門城市酒店只有 ${nCity} 個`);
    // 參考價由便宜到貴
    const refs = await page.$$eval("#hotelCities .pbadge strong", els => els.map(e => Number(e.textContent.replace(/–.*/, "").replace(/[^0-9]/g, ""))));
    if (refs.some((v, i) => i && v < refs[i - 1])) problems.push(`熱門城市酒店沒有由便宜到貴：${refs.join(",")}`);
    // 入住日期選項：換日期後連結的入住日要跟著換
    const ci = async () => new URL(await page.$eval("#hotelCities .card-link", a => a.href)).searchParams.get("checkin");
    const ci0 = await ci();
    const nDates = await page.$$eval("#hDates button", b => b.length);
    if (nDates < 2) problems.push("酒店入住日期選項不足");
    else { await page.click('#hDates button[data-v="1"]'); if ((await ci()) === ci0) problems.push("換入住日期後酒店連結沒跟著換"); await page.click('#hDates button[data-v="0"]'); }
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

  // 收藏：點愛心 → 出現「我收藏的航線」；重新整理後還在；取消後消失
  {
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx2.newPage();
    await page.route("**/*workers.dev/**", r => r.fulfill({ contentType: "application/json",
      body: JSON.stringify(r.request().url().includes("part=fsc") ? FSC : MOCK) }));
    await page.goto(base);
    await page.waitForSelector("#flightList .card [data-fav]");
    if (await page.isVisible("#favSec")) problems.push("還沒收藏就出現收藏區");
    const key = await page.$eval("#flightList .card [data-fav]", b => b.dataset.fav);
    await page.click("#flightList .card [data-fav]");
    if (!(await page.isVisible("#favSec"))) problems.push("收藏後沒有出現「我收藏的航線」");
    if ((await page.$eval(`#flightList [data-fav="${key}"]`, b => b.getAttribute("aria-pressed"))) !== "true") problems.push("收藏後愛心沒有變成已收藏");
    await checkLinks(page, "收藏區");
    await page.reload();
    await page.waitForSelector("#flightList .card");
    if (!(await page.isVisible("#favSec"))) problems.push("重新整理後收藏不見了");
    await page.click(`#flightList [data-fav="${key}"]`);
    if (await page.isVisible("#favSec")) problems.push("取消收藏後收藏區沒有消失");
    await ctx2.close();
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

  // 季節特效（要開動畫才看得到）：日本 11 月飄楓葉、首爾 1 月下雪、香港 11 月（秋高氣爽）不飄東西
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" });
    await page.route("**/*workers.dev/**", r => r.fulfill({ contentType: "application/json",
      body: JSON.stringify(r.request().url().includes("part=fsc") ? FSC : MOCK) }));
    await page.goto(base);
    await page.waitForSelector("#flightList .card");
    const fx = await page.evaluate(() => [seasonFX("NRT", 11), seasonFX("SEL", 1), seasonFX("HKG", 11), seasonFX("OKA", 2), seasonFX("HKG", 12), seasonFX("NRT", 11)]);
    if (!fx[0].includes("fx-leaf")) problems.push("東京 11 月應該飄楓葉");
    if (!fx[1].includes("fx-snow")) problems.push("首爾 1 月應該下雪");
    if (fx[2] !== "") problems.push("香港 11 月不該有飄落特效");
    if (!fx[3].includes("fx-petal")) problems.push("沖繩 2 月應該飄櫻花瓣");
    if (!fx[4].includes("fx-spark")) problems.push("香港 12 月應該有聖誕閃光");
    if (fx[0] !== fx[5]) problems.push("同一個城市的飄落位置每次不一樣（重畫會跳）");
    // 額外條件選起來時放花火，取消時不放；一下就消失
    await setClick(page, '#filters button[data-v="direct"]');
    if (!(await page.$(".fw i"))) problems.push("額外條件選起來時沒有花火");
    await page.waitForTimeout(1400);
    if (await page.$(".fw")) problems.push("花火沒有自己消失");
    await setClick(page, '#filters button[data-v="direct"]');
    if (await page.$(".fw")) problems.push("取消條件時不該放花火");
    // 大圖 3D 卡片輪播：第一張正面不轉，隔壁那張往後轉；點隔壁那張是轉過來，不是直接去訂票
    await page.waitForSelector("#hero.cf .slide:nth-child(2)", { timeout: 5000 }).catch(() => problems.push("大圖不是 3D 卡片輪播"));
    const tf = await page.$$eval("#hero .slide .s3d", els => els.slice(0, 2).map(e => e.style.transform));
    if (tf[0]) problems.push(`大圖第一張不該有 3D 角度：${tf[0]}`);
    if (!/rotateY\(-?\d/.test(tf[1] || "")) problems.push(`大圖第二張沒有 3D 角度：${tf[1]}`);
    const pops = [];
    page.on("popup", p => pops.push(p));
    await page.$eval("#hero .slide:nth-child(2) .pass", a => a.click());
    await page.waitForTimeout(900);
    if (pops.length) problems.push("點旁邊的輪播卡片直接打開了訂票頁（應該先轉到中間）");
    if (await page.$(".takeoff")) problems.push("點旁邊的輪播卡片（沒打開連結）不該放起飛小飛機");
    const mid = await page.$eval("#hero .slide:nth-child(2) .s3d", e => e.style.transform);
    if (mid) problems.push(`點旁邊的輪播卡片後沒有轉到中間：${mid}`);
    // 點擊感：手指按下卡片時縮一下，放開後恢復；按鈕有水波
    const card = await page.$("#flightList .card");
    await card.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    const cb = await card.boundingBox();
    await page.mouse.move(cb.x + cb.width / 2, cb.y + 40);
    await page.mouse.down();
    if (!(await card.evaluate(e => e.classList.contains("press")))) problems.push("按下機票卡時沒有縮一下的點擊感");
    await page.mouse.up();
    await page.waitForTimeout(200);
    if (await card.evaluate(e => e.classList.contains("press"))) problems.push("放開機票卡後沒有彈回來");
    for (const pp of pops.splice(0)) await pp.close().catch(() => {});
    const more = await page.$("#moreBtn:not(.hidden), #routesMore:not(.hidden)");
    if (more) {
      await more.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
      const mb = await more.boundingBox();
      await page.mouse.move(mb.x + 20, mb.y + 10); await page.mouse.down();
      if (!(await more.$(".rip"))) problems.push("按鈕按下去沒有水波");
      await page.mouse.up();
    }
    // 第 3 輪特效
    // 分頁的白色滑塊：點「便宜酒店」後滑到那顆上面
    await page.evaluate(() => scrollTo(0, 0));
    await page.click('.tabs button[data-tab="hotels"]'); await page.waitForTimeout(600);
    const th = await page.evaluate(() => { const t = document.querySelector(".tabs .thumb"), b = document.querySelector('.tabs button[data-tab="hotels"]');
      return t ? { w: parseFloat(t.style.width), x: Number((t.style.transform.match(/-?[\d.]+/) || [NaN])[0]), bw: b.offsetWidth, bx: b.offsetLeft } : null; });
    if (!th || Math.abs(th.w - th.bw) > 1 || Math.abs(th.x - th.bx) > 1) problems.push(`分頁滑塊沒有滑到選的那顆：${JSON.stringify(th)}`);
    await page.click('.tabs button[data-tab="flights"]'); await page.waitForTimeout(300);
    // 樹狀選單：選「高雄」時「全部」那排不再整排變藍；回到全部又整排變藍
    await setClick(page, '#origin button[data-v="KHH"]'); await page.waitForTimeout(200);
    if (await page.$("#origin.all")) problems.push("選了高雄，出發地那排還是「全部」的樣子");
    await setClick(page, '#origin button[data-v=""]'); await page.waitForTimeout(200);
    if (!(await page.$("#origin.all"))) problems.push("回到全部出發地，那排沒有整排變藍");
    // 進度條：往下捲會變長；卡片照片有景深位移
    await page.evaluate(() => scrollTo(0, 1200)); await page.waitForTimeout(400);
    const pr = await page.$eval(".progress", p => Number(p.dataset.p));
    if (!(pr > 0.05)) problems.push(`往下捲後進度條沒有變長：${pr}`);
    if (!(await page.evaluate(() => [...document.querySelectorAll(".card .ph")].some(e => e.dataset.py && e.querySelector(".bgimg") && e.querySelector(".bgimg").style.translate))))
      problems.push("機票卡照片沒有捲動景深");
    // 點訂票連結：小飛機起飛，一下就消失
    const cl = await page.$("#flightList .card .card-link"); await cl.scrollIntoViewIfNeeded();
    const clb = await cl.boundingBox();
    const popP = page.waitForEvent("popup", { timeout: 3000 }).catch(() => null);
    // 點卡片正中間（卡片可能剛好捲到最上面、被固定的分頁列蓋住上緣）
    await page.mouse.click(clb.x + clb.width / 2, clb.y + clb.height / 2);
    if ((await page.$$(".takeoff")).length !== 1) problems.push("點訂票連結沒有小飛機起飛");
    await page.waitForTimeout(1100);
    if ((await page.$$(".takeoff")).length) problems.push("起飛的小飛機沒有自己消失");
    const pp = await popP; if (pp) await pp.close();
    // 大圖圓點像限時動態一樣填滿；頂部張數跳完要是正確數字；訂票按鈕有光掃過
    // 先把滑鼠移到左上角（品牌列）再捲回頂端，不然滑鼠停在大圖上，大圖會暫停（圓點不填）
    await page.mouse.move(5, 5); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
    if (await page.$("#hero.hold")) await page.waitForTimeout(4300);
    const dotAnim = await page.$eval('#heroDots button[aria-current="true"]', b => getComputedStyle(b, "::after").animationName);
    if (dotAnim !== "fill") problems.push(`大圖圓點沒有限時動態的填滿動畫：${dotAnim}`);
    const want = await page.evaluate(() => { const t = todayTW(); return state.flights.filter(f => f.dep > t).length.toLocaleString("en-US"); });
    const got = await page.textContent("#brandTag b").catch(() => "");
    if (got !== want) problems.push(`頂部低價票張數跳完不對：${got}（應為 ${want}）`);
    await page.evaluate(() => openRoute("TPE", "OSA")); await page.waitForTimeout(400);
    const ctaAnim = await page.$eval("#sheet .sh-sticky .cta", a => getComputedStyle(a, "::after").animationName).catch(() => "none");
    if (ctaAnim !== "ctashine") problems.push(`訂票按鈕沒有光掃過：${ctaAnim}`);
    // 價格日曆：最便宜的那天（只有那幾天）有呼吸光圈
    const best = await page.evaluate(() => { const ds = [...document.querySelectorAll("#sheet .day[data-day]")];
      const p = (d) => Number(d.querySelector(".p").textContent.replace(/,/g, "")), min = Math.min(...ds.map(p));
      return { wrong: ds.filter(d => d.classList.contains("best") !== (p(d) === min)).length, n: ds.filter(d => d.classList.contains("best")).length,
        anim: (document.querySelector("#sheet .day.best") ? getComputedStyle(document.querySelector("#sheet .day.best"), "::after").animationName : "none") }; });
    if (best.wrong || !best.n) problems.push(`價格日曆最便宜那天的光圈標錯：${JSON.stringify(best)}`);
    if (best.anim !== "breathe") problems.push(`最便宜那天沒有呼吸光圈：${best.anim}`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    // 幫我選：機場翻牌看板，每個字一塊牌，停下來的字跟抽中的城市一樣
    await page.click("#luckyBtn");
    await page.waitForSelector("#sheet .slot .flap", { timeout: 3000 }).catch(() => problems.push("幫我選沒有翻牌看板"));
    const flapOk = await page.$$eval("#slotName .flap", fs => fs.length > 0 && fs.every(f => [...f.textContent].length === 1));
    if (!flapOk) problems.push("翻牌看板每塊牌應該只有一個字");
    await page.waitForSelector("#sheet .win h3", { timeout: 5000 }).catch(() => problems.push("翻牌後沒有出現抽中的結果"));
    // 收藏：愛心噴出 8 顆小愛心，一下就消失
    const wf = await page.$('#sheet .btn2.fav-btn[aria-pressed="false"]');
    if (wf) {
      await wf.click(); await page.waitForTimeout(120);
      if ((await page.$$(".hburst i")).length !== 8) problems.push("收藏時沒有噴出小愛心");
      await page.waitForTimeout(1100);
      if (await page.$(".hburst")) problems.push("噴出的小愛心沒有自己消失");
      await page.click('#sheet .btn2.fav-btn'); // 取消，回到原本狀態
    }
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    // 雷達夜空有星星；從卡片點「N 組日期」也能正常打開價格日曆（有轉場時）
    if ((await page.$$("#radarSec > .stars i")).length < 10) problems.push("雷達區塊沒有星星");
    const wt = await page.$("#flightList .when.tap"); await wt.scrollIntoViewIfNeeded();
    await wt.click();
    await page.waitForSelector("#sheet:not(.hidden) .sh-head", { timeout: 3000 }).catch(() => problems.push("從卡片打開價格日曆失敗（轉場）"));
    await page.waitForTimeout(600);
    if (await page.evaluate(() => [...document.querySelectorAll("*")].some(e => e.style && e.style.viewTransitionName))) problems.push("轉場結束後還留著 view-transition-name");
    await page.keyboard.press("Escape");
    // 香港照片：維港夜景（一般比例的精選照片，不是會糊的超寬全景圖）
    if (!(await page.evaluate(() => LANDMARKS.HKG[0] === "File:13-08-09-peak-by-RalfR-04.jpg" && COUNTRY_PHOTO.HK[0] === LANDMARKS.HKG[0])))
      problems.push("香港照片沒換成維港夜景");
    await page.close();
  }

  // 頁尾累積瀏覽人數：第一次來帶 new=1，之後只讀；後台沒設定（回 null）就不顯示
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const asks = [];
    let visits = 123;
    await ctx.route("**/*workers.dev/**", r => { const u = r.request().url();
      if (u.includes("part=visit")) { asks.push(u.includes("new=1")); return r.fulfill({ contentType: "application/json", body: JSON.stringify({ visits: visits === null ? null : visits + (u.includes("new=1") ? 1 : 0) }) }); }
      r.fulfill({ contentType: "application/json", body: JSON.stringify(u.includes("part=fsc") ? FSC : MOCK) }); });
    const p1 = await ctx.newPage(); await p1.goto(base);
    await p1.waitForSelector("#visits:not(.hidden)", { timeout: 5000 }).catch(() => problems.push("頁尾沒有顯示累積瀏覽人數"));
    if (!(await p1.textContent("#visits")).includes("124")) problems.push(`累積瀏覽人數顯示不對：${await p1.textContent("#visits")}`);
    await p1.close();
    const p2 = await ctx.newPage(); await p2.goto(base); await p2.waitForSelector("#visits:not(.hidden)", { timeout: 5000 }).catch(() => {});
    if (asks.join() !== "true,false") problems.push(`同一個瀏覽器第二次來不該再加 1：${asks.join()}`);
    await p2.close();
    visits = null;
    const p3 = await (await browser.newContext()).newPage();
    await p3.route("**/*workers.dev/**", r => { const u = r.request().url();
      r.fulfill({ contentType: "application/json", body: JSON.stringify(u.includes("part=visit") ? { visits: null } : u.includes("part=fsc") ? FSC : MOCK) }); });
    await p3.goto(base); await p3.waitForTimeout(2000);
    if (await p3.isVisible("#visits")) problems.push("後台還沒設定 KV 時不該顯示瀏覽人數");
    await p3.close(); await ctx.close();
  }

  // 點出去的位置：點的當下 trip_sub1 變成「howtravle(_src)_位置」，後台能分開看
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route("**/*workers.dev/**", r => r.fulfill({ contentType: "application/json",
      body: JSON.stringify(r.request().url().includes("part=fsc") ? FSC : MOCK) }));
    // trip.com 回一個空白頁，新分頁才有真正打開的網址可以讀
    await page.context().route(/trip\.com/, r => r.fulfill({ contentType: "text/html", body: "<html></html>" }));
    await page.goto(base + "?src=ig_test"); await page.waitForSelector("#flightList .card");
    const sub1Of = async (clickFn) => {
      const pop = page.waitForEvent("popup", { timeout: 4000 }).catch(() => null);
      await clickFn();
      const p = await pop; if (!p) return null;
      await p.waitForURL(/trip\.com/, { timeout: 4000 }).catch(() => {});
      const u = p.url(); await p.close();
      try { return new URL(u).searchParams.get("trip_sub1"); } catch(e) { return u; }
    };
    const cases = [
      ["hero", () => page.click("#hero .slide:first-child .pass")],
      ["card", async () => { const c = await page.$("#flightList .card .card-link"); await c.scrollIntoViewIfNeeded(); const b = await c.boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }],
    ];
    for (const [want, fn] of cases) {
      const got = await sub1Of(fn);
      if (got !== `howtravle_ig_test_${want}`) problems.push(`點「${want}」出去的 trip_sub1 應為 howtravle_ig_test_${want}：${got}`);
    }
    // 價格日曆底部的訂票按鈕
    await page.evaluate(() => openRoute("TPE", "OSA")); await page.waitForSelector("#sheet .sh-sticky .cta");
    const cb = await sub1Of(() => page.click("#sheet .sh-sticky .cta"));
    if (cb !== "howtravle_ig_test_calbook") problems.push(`價格日曆訂票按鈕的 trip_sub1 不對：${cb}`);
    const co = await sub1Of(() => page.click("#sheet .opt"));
    if (co !== "howtravle_ig_test_calopt") problems.push(`價格日曆日期選項的 trip_sub1 不對：${co}`);
    await page.keyboard.press("Escape");
    // 酒店城市卡
    await page.click('.tabs button[data-tab="hotels"]');
    const hc = await sub1Of(async () => { const c = await page.$("#hotelCities .card .card-link"); await c.scrollIntoViewIfNeeded(); const b = await c.boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.3); });
    if (hc !== "howtravle_ig_test_hotelcity") problems.push(`酒店城市卡的 trip_sub1 不對：${hc}`);
    // 聯盟編號不能被動到
    const href = await page.$eval("#hotelCities .card .card-link", a => a.href);
    const u = new URL(href);
    if (u.searchParams.get("Allianceid") !== ALLIANCE || u.searchParams.get("SID") !== SID) problems.push("標位置時聯盟編號被改掉了");
    await page.close();
  }

  // 再次打開秒開：第一次存下資料；第二次網路很慢時先用存的畫出卡片，新資料到了整個換掉（舊價格不留）
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p1 = await ctx.newPage();
    await p1.route("**/*workers.dev/**", r => r.fulfill({ contentType: "application/json",
      body: JSON.stringify(r.request().url().includes("part=fsc") ? FSC : MOCK) }));
    await p1.goto(base); await p1.waitForSelector("#flightList .card");
    const saved = await p1.evaluate(() => { try { return JSON.parse(localStorage.getItem("howtravle_data_v1")).rows.length; } catch(e) { return 0; } });
    if (!saved) problems.push("第一次打開沒有存下資料（再次打開不會秒開）");
    await p1.close();
    // 新資料：富國島那條航線沒了（傳統航空資料也沒有富國島）、大阪變便宜
    const FRESH = { updated_at: new Date().toISOString(), rows: MOCK.rows.filter(r => r.destination !== "PQC").map(r => r.destination === "OSA" ? { ...r, price: r.price - 1000 } : r) };
    let release; const gate = new Promise(r => { release = r; });
    const p2 = await ctx.newPage();
    await p2.route("**/*workers.dev/**", async r => { await gate; r.fulfill({ contentType: "application/json",
      body: JSON.stringify(r.request().url().includes("part=fsc") ? FSC : FRESH) }); });
    await p2.goto(base);
    await p2.waitForSelector("#flightList .card", { timeout: 1500 }).catch(() => problems.push("再次打開時網路慢，沒有先用存的資料畫出卡片"));
    if (!(await p2.textContent("#updated")).includes("正在更新")) problems.push("用存的資料時沒有標示「正在更新」");
    if (!(await p2.evaluate(() => state.flights.some(f => canon(f.d) === "PQC")))) problems.push("存的資料裡應該還有富國島");
    release();
    await p2.waitForFunction(() => !document.querySelector("#updated").textContent.includes("正在更新"), null, { timeout: 5000 }).catch(() => problems.push("新資料到了沒有換掉「正在更新」"));
    const after = await p2.evaluate(() => ({ sel: state.flights.some(f => canon(f.d) === "PQC"),
      osa: Math.min(...state.flights.filter(f => canon(f.d) === "OSA").map(f => f.price)) }));
    if (after.sel) problems.push("新資料到了，已經沒有的航線（富國島）還留在畫面資料裡");
    if (after.osa !== 4980) problems.push(`新資料到了，大阪價格沒有更新：${after.osa}`);
    // 超過 6 小時的舊資料不用
    await p2.evaluate(() => { const c = JSON.parse(localStorage.getItem("howtravle_data_v1")); c.t = Date.now() - 7 * 3600e3; localStorage.setItem("howtravle_data_v1", JSON.stringify(c)); });
    const p3 = await ctx.newPage();
    await p3.route("**/*workers.dev/**", r => new Promise(() => {})); // 永遠不回
    await p3.goto(base); await p3.waitForTimeout(1200);
    if (await p3.$("#flightList .card")) problems.push("超過 6 小時的舊資料不該拿來顯示");
    await ctx.close();
  }

  // 酒店城市卡：順便看機票（就算機票分頁選了別的出發地，也找全部出發地最便宜的來回）；回到最上面的小飛機
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route("**/*workers.dev/**", r => r.fulfill({ contentType: "application/json",
      body: JSON.stringify(r.request().url().includes("part=fsc") ? FSC : MOCK) }));
    await page.goto(base); await page.waitForSelector("#flightList .card");
    await setClick(page, '#origin button[data-v="KHH"]');
    await page.click('.tabs button[data-tab="hotels"]');
    const fly = await page.$('#hotelCities .hc-fly[data-hroute$="-OSA"]');
    if (!fly) problems.push("大阪酒店卡沒有「來回機票」");
    else {
      if (!(await fly.textContent()).includes("5,980")) problems.push(`大阪酒店卡的機票價格不對：${await fly.textContent()}`);
      await fly.click();
      await page.waitForSelector("#sheet:not(.hidden) .opt", { timeout: 3000 }).catch(() => problems.push("點酒店卡的機票沒有打開價格日曆"));
      const head = await page.textContent("#sheet .sh-head .city").catch(() => "");
      if (!head.includes("大阪")) problems.push(`酒店卡打開的價格日曆不是大阪：${head}`);
      const pops = []; page.on("popup", p => pops.push(p)); await page.waitForTimeout(200);
      if (pops.length) problems.push("點酒店卡的機票不該直接打開 Trip.com 酒店頁");
      await page.keyboard.press("Escape");
    }
    if ((await page.evaluate(() => [...state.origins].join())) !== "KHH") problems.push("看酒店卡機票價格後，機票分頁原本選的出發地被改掉");
    // 回到最上面
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(300);
    if (!(await page.isVisible("#toTop.show"))) problems.push("捲到很下面沒有出現「回到最上面」");
    await page.click("#toTop"); await page.waitForTimeout(400);
    if ((await page.evaluate(() => scrollY)) > 5) problems.push("按「回到最上面」沒有回到頂端");
    await page.waitForTimeout(300);
    if (await page.isVisible("#toTop.show")) problems.push("回到頂端後「回到最上面」應該收起來");
    await page.close();
  }

  // 電腦滑鼠：機票卡照片跟著滑鼠傾斜、有光；滑鼠離開恢復
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "no-preference" });
    await page.route("**/*workers.dev/**", r => r.fulfill({ contentType: "application/json",
      body: JSON.stringify(r.request().url().includes("part=fsc") ? FSC : MOCK) }));
    await page.goto(base);
    await page.waitForSelector("#flightList .card .ph");
    const ph = await page.$("#flightList .card .ph"); await ph.scrollIntoViewIfNeeded(); await page.waitForTimeout(700);
    const b = await ph.boundingBox();
    await page.mouse.move(b.x + b.width * 0.9, b.y + b.height * 0.1); await page.mouse.move(b.x + b.width * 0.85, b.y + b.height * 0.15);
    const t = await ph.evaluate(e => ({ tilt: e.closest(".card").classList.contains("tilt"), ry: parseFloat(e.style.getPropertyValue("--ry")) }));
    if (!t.tilt || !(t.ry > 1)) problems.push(`電腦滑鼠移到機票卡照片上沒有傾斜：${JSON.stringify(t)}`);
    await page.mouse.move(2, 2); await page.mouse.move(3, 3);
    if (await ph.evaluate(e => e.closest(".card").classList.contains("tilt"))) problems.push("滑鼠離開機票卡後沒有恢復");
    await page.close();
  }

  // 精簡版：沒有手動精選就不顯示精選區；清除地區、沒票時的按鈕、連假日期、分享失敗時的連結框
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route("**/*workers.dev/**", r => r.fulfill({ contentType: "application/json",
      body: JSON.stringify(r.request().url().includes("part=fsc") ? FSC : MOCK) }));
    await page.route("**/picks.json", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [] }) }));
    await page.goto(base);
    await page.waitForSelector("#flightList .card");
    if (await page.isVisible("#picks")) problems.push("沒有手動精選時不該顯示精選區");
    for (const gone of ["#intro", "#quick", "#countdown", "#weekendSec", "#radarRank", "#toFilter", "#shareSite", "#budget"])
      if (await page.$(gone)) problems.push(`精簡版不該再有：${gone}`);
    // 讓人想出國的小資訊：季節對到對的城市、平均氣溫、當地時間、城市一句話
    const seasonCases = await page.evaluate(() => [
      ["TYO", 11, "賞楓季"], ["OKA", 11, "暖冬避寒"], ["OKA", 2, "緋寒櫻季"], ["CJU", 1, null], ["SEL", 1, "滑雪季"],
      ["BKK", 4, "潑水節"], ["SPK", 2, "雪祭"], ["HKG", 12, "聖誕燈飾"], ["DAD", 5, "海灘季"], ["TYO", 6, null],
    ].map(([c, m, want]) => { const got = (seasonOf(c, m) || {}).t || null; return got === want ? "" : `${c} ${m}月 應為 ${want}，實際 ${got}`; }).filter(Boolean));
    if (seasonCases.length) problems.push("季節標籤對錯城市：" + seasonCases.join("；"));
    if ((await page.evaluate(() => tempOf("NRT", 1))) !== 5) problems.push("機場代碼查不到城市的平均氣溫");
    if (!/^\d\d:\d\d$/.test(await page.evaluate(() => localTime("BKK")))) problems.push("當地時間格式不對");
    // 整趟旅費：機票＋平價酒店每晚參考價 × 晚數（東京 4 晚 × 2,000）
    const tc = await page.evaluate(() => tripCost({ d: "NRT", price: 6890, dep: "2026-11-14", ret: "2026-11-18" }));
    if (!tc || tc.nights !== 4 || tc.hotel !== 8000 || tc.total !== 14890 || tc.pair !== 10890) problems.push(`整趟旅費算錯：${JSON.stringify(tc)}`);
    const tcOw = await page.evaluate(() => tripCost({ d: "BKK", price: 3000, dep: "2026-11-14" }));
    if (!tcOw || tcOw.nights !== 3) problems.push(`單程的整趟旅費應以 3 晚估：${JSON.stringify(tcOw)}`);
    if (await page.evaluate(() => tripCost({ d: "VDO", price: 3000, dep: "2026-11-14" })) !== null) problems.push("沒有酒店參考價的城市不該顯示整趟旅費");
    // 系統設定「減少動態」時，照片上不能有飄落的楓葉／雪
    if (await page.$(".fx")) problems.push("減少動態時還有季節飄落特效");
    // 減少動態時：分段滑塊照樣對準（只是不滑），點連結不放小飛機、卡片價格不跳數字
    await page.click("#openSet"); await page.waitForSelector("#setSheet:not(.hidden)"); await page.waitForTimeout(200);
    const thr = await page.evaluate(() => { const t = document.querySelector("#tripType .thumb"), b = document.querySelector('#tripType button[aria-pressed="true"]');
      return t && b ? Math.abs(parseFloat(t.style.width) - b.offsetWidth) : -1; });
    await page.keyboard.press("Escape"); await page.waitForSelector("#setSheet", { state: "hidden" }).catch(() => {});
    if (!(thr >= 0 && thr <= 1)) problems.push(`減少動態時來回／單程的滑塊沒對準：${thr}`);
    // 雷達預算：拉到某個價錢，超過的城市變淡，文字說能飛幾個城市
    if (await page.isVisible("#rbud")) {
      const bud = await page.evaluate(() => {
        const inp = document.querySelector("#rbudIn"); inp.value = "1"; inp.dispatchEvent(new Event("input", { bubbles: true }));
        const b = budgetSteps[1], pts = [...document.querySelectorAll("#radar .pt")];
        const wrong = pts.filter(g => g.classList.contains("over") !== (Number(g.dataset.p) > b)).length;
        return { b, wrong, out: document.querySelector("#rbudOut").textContent, n: radarAll.filter(f => f.price <= b).length, st: state.radarBudget };
      });
      if (bud.wrong) problems.push(`雷達預算：${bud.wrong} 個城市變淡不對（預算 ${bud.b}）`);
      if (!bud.out.includes(`可以飛 ${bud.n} 個城市`)) problems.push(`雷達預算文字不對：${bud.out}（應為 ${bud.n} 個）`);
      if (bud.st !== bud.b) problems.push("雷達預算沒有記住");
      // 換分頁再回來（雷達重畫）要保留預算
      await page.click('.tabs button[data-tab="hotels"]');
      await page.click('.tabs button[data-tab="flights"]');
      const kept = await page.evaluate(() => state.radarBudget);
      if (kept !== bud.b) problems.push(`換分頁後雷達預算不見了：${kept}`);
      await page.evaluate(() => { const inp = document.querySelector("#rbudIn"); inp.value = inp.max; inp.dispatchEvent(new Event("input", { bubbles: true })); });
      if ((await page.textContent("#rbudV")) !== "不限" || await page.$("#radar .pt.over")) problems.push("雷達預算拉到底沒有回到「不限」");
    } else problems.push("沒有雷達預算拉桿");
    // 精簡：大圖和機票卡只留重點（不放天氣、季節、城市一句話；這些在價格日曆裡看）
    if (await page.$("#flightList .card .mood, #hero .mood, #hero .mood-e")) problems.push("大圖或機票卡上不該再有天氣小標");
    if (await page.$("#hero .slide .vibe")) problems.push("大圖不該再有城市一句話");
    if ((await page.$$("#hero .slide:first-child .eyebrow")).length !== 1) problems.push("大圖上方應該只有一個小標");
    await page.click("#flightList .when.tap");
    await page.waitForSelector("#sheet:not(.hidden) .facts", { timeout: 3000 }).catch(() => {});
    const facts = await page.textContent("#sheet .facts").catch(() => "");
    for (const w of ["當地現在", "月平均"]) if (!facts.includes(w)) problems.push(`價格日曆缺少「${w}」`);
    const trip = await page.textContent("#sheet .trip").catch(() => "");
    if (!trip.includes("整趟約")) problems.push("價格日曆沒有整趟旅費");
    await page.keyboard.press("Escape");
    await setClick(page, '#filters button[data-v="direct"]');
    if ((await page.$eval('#filters button[data-v="direct"]', b => b.getAttribute("aria-pressed"))) !== "true") problems.push("額外條件按了沒有變成選取");
    await setClick(page, '#filters button[data-v="direct"]');
    if (await page.evaluate(() => state.conds.size)) problems.push("額外條件再按一次應該取消");
    // 設定裡選國家 → 清單上方出現「✕ 國家」可以清掉
    await setClick(page, '#countries button[data-v="VN"]');
    if (!(await page.isVisible("#clearC"))) problems.push("選了國家後沒有出現清除按鈕");
    const emptyM = await page.evaluate(() => monthKeys().find(k => !baseFiltered().some(f => f.dep.startsWith(k))));
    if (emptyM) {
      await setClick(page, `#months button[data-v="${emptyM}"]`);
      if (!(await page.$("#flightList [data-clear]"))) problems.push("篩選到沒票時沒有「看全部最便宜的票」");
      else {
        await page.click("#flightList [data-clear]");
        if (!(await page.$("#flightList .card"))) problems.push("按「看全部最便宜的票」後沒有恢復");
        if ((await page.evaluate(() => state.months.size)) !== 0) problems.push("按「看全部最便宜的票」後月份應回到「全部」");
      }
    }
    // 飛哪裡？可複選：日本＋韓國時，清單和限時動態都只有這兩國；點「全部」回到全部
    await setClick(page, '#countries button[data-v="JP"]'); await setClick(page, '#countries button[data-v="KR"]');
    const jk = await page.evaluate(() => ({ list: [...new Set(cheapestPerRoute(baseFiltered()).map(f => f.country))], stories: [...document.querySelectorAll("#tiles .story")].map(b => countryOf(canon(b.dataset.route.split("-")[1]))) }));
    if (jk.list.some(c => c !== "JP" && c !== "KR") || !jk.list.length) problems.push(`選日本＋韓國，清單出現別的國家：${jk.list}`);
    if (jk.stories.some(c => c !== "JP" && c !== "KR") || !jk.stories.length) problems.push(`選日本＋韓國，限時動態出現別的國家：${jk.stories}`);
    await setClick(page, '#countries button[data-v=""]');
    if (await page.evaluate(() => state.countries.size)) problems.push("點「全部」國家沒有回到全部");
    if ((await page.$eval('#countries button[data-v=""]', b => b.getAttribute("aria-pressed"))) !== "true") problems.push("「全部」國家沒有標成選取");
    await setClick(page, '#countries button[data-v="JP"]');
    await page.click("#clearC");
    if (await page.evaluate(() => state.countries.size)) problems.push("按清除後國家沒有清掉");
    // 限時動態：綠框（極力推薦）／紅框（普通偏便宜），只有兩種；點了打開那條航線的詳細（價格日曆）
    const rings = await page.$$eval("#tiles .story .ring", rs => rs.map(r => r.classList.contains("go") ? "go" : r.classList.contains("ok") ? "ok" : "?"));
    if (!rings.length || rings.includes("?")) problems.push(`限時動態外框只能是綠或紅：${rings}`);
    if (!rings.includes("go")) problems.push("限時動態沒有任何綠框（極力推薦）");
    const st0 = await page.$eval("#tiles .story", b => b.dataset.route);
    await page.click("#tiles .story");
    await page.waitForSelector("#sheet:not(.hidden) .sh-head", { timeout: 3000 }).catch(() => problems.push("點限時動態沒有打開機票詳細"));
    const stCity = await page.textContent("#sheet .sh-head .city").catch(() => "");
    if (!stCity.includes(await page.evaluate((r) => cityName(r.split("-")[1]), st0))) problems.push(`點限時動態打開的不是那個城市：${stCity}`);
    await page.keyboard.press("Escape");
    // 最左邊是「設定」：打開設定面板
    if (!(await page.$("#tiles .tile:first-child#openSet"))) problems.push("限時動態最左邊應該是「設定」");
    await page.click("#openSet");
    if (!(await page.isVisible("#setSheet .tree"))) problems.push("點「設定」沒有打開樹狀圖");
    await page.keyboard.press("Escape");
    if (await page.isVisible("#setSheet")) problems.push("設定面板按 Esc 沒有關掉");
    if (!(await page.isVisible("#moreRoutes"))) problems.push("沒有顯示熱門航線");
    // 勾「週末」時，熱門航線帶入週五去、週日回的日期
    await setClick(page, '#filters button[data-v="weekend"]');
    const wk = await page.$eval("#routeList a", a => { const u = new URL(a.href); return [u.searchParams.get("ddate"), u.searchParams.get("rdate")]; }).catch(() => null);
    const dow = (d) => new Date(d + "T00:00:00Z").getUTCDay();
    if (!wk || dow(wk[0]) !== 5 || dow(wk[1]) !== 0) problems.push(`勾「週末」時熱門航線不是週五去週日回：${wk}`);
    await setClick(page, '#filters button[data-v="weekend"]');
    // 樹狀選單：預設「全部月份」，價格是所有月份的最低價；點某個月再點「全部」可以回來
    if ((await page.evaluate(() => state.months.size)) !== 0) problems.push("月份預設應該是「全部」");
    const allP = await page.evaluate(() => { const b = document.querySelector('#months .t-all small'); const ps = cheapestPerRoute(baseFiltered()).map(f => f.price); return [b ? b.textContent : "", ps.length ? Math.min(...ps) : null]; });
    if (allP[1] && !allP[0].replace(/,/g, "").includes(String(Math.round(allP[1])))) problems.push(`「全部」月份的最低價不對：${allP[0]}（應為 ${allP[1]}）`);
    const km = await page.$$eval("#months .t-kid", bs => bs.map(b => b.dataset.v));
    if (km.length !== 4) problems.push(`「幾月飛」下面應該有 4 個月份：${km.length}`);
    await setClick(page, `#months button[data-v="${km[0]}"]`);
    if (await page.$("#months.all")) problems.push("選了某個月，月份那排還是「全部」的樣子");
    if (!(await page.textContent("#fSub")).includes(`${Number(km[0].slice(5))}月出發`)) problems.push("選了月份後副標沒寫那個月");
    await setClick(page, '#months button[data-v=""]');
    if ((await page.evaluate(() => state.months.size)) !== 0 || !(await page.$("#months.all"))) problems.push("點「全部」月份沒有回到全部");
    // 幾月飛？可複選：選兩個月，清單只有這兩個月的票
    await setClick(page, `#months button[data-v="${km[0]}"]`); await setClick(page, `#months button[data-v="${km[1]}"]`);
    const twoM = await page.evaluate((ks) => cheapestPerRoute(baseFiltered().filter(f => okMonth(f.dep))).every(f => ks.includes(f.dep.slice(0, 7))), [km[0], km[1]]);
    if (!twoM || (await page.evaluate(() => state.months.size)) !== 2) problems.push("選兩個月時清單出現別的月份");
    await setClick(page, '#months button[data-v=""]');
    // 克萊茵藍的線連起選到的（可複選會分岔）：每排選到的按鈕正中間都要有線接到
    const pathOK = async () => {
      await page.click("#openSet"); await page.waitForSelector("#setSheet:not(.hidden)"); await page.waitForTimeout(150);
      const r = await page.evaluate(() => { const t = document.querySelector("#setSheet .tree"), T = t.getBoundingClientRect(), pts = JSON.parse(t.querySelector(".t-path").dataset.pts);
        const want = ["#tripType", "#origin", "#countries", "#months"].map(q => [...t.querySelectorAll(`${q} button[aria-pressed="true"]`)].map(b => { const r = b.getBoundingClientRect(); return Math.round(r.left - T.left + r.width / 2); }));
        return { pts, want }; });
      await page.keyboard.press("Escape"); await page.waitForSelector("#setSheet", { state: "hidden" }).catch(() => {});
      return r.want.every((row, i) => row.length === (r.pts[i] || []).length && row.every((x, k) => Math.abs(x - r.pts[i][k]) <= 2)) ? null : JSON.stringify(r);
    };
    await setClick(page, '#origin button[data-v="KHH"]'); await setClick(page, `#months button[data-v="${km[1]}"]`);
    let bad = await pathOK(); if (bad) problems.push(`選高雄＋${km[1]}，線沒有連到選到的按鈕：${bad}`);
    // 複選：高雄＋台北、日本＋泰國
    await setClick(page, '#origin button[data-v="TPE"]'); await setClick(page, '#countries button[data-v="JP"]'); await setClick(page, '#countries button[data-v="TH"]');
    bad = await pathOK(); if (bad) problems.push(`複選時線沒有分岔連到每個選到的：${bad}`);
    if ((await page.evaluate(() => [...state.origins].sort().join()))!== "KHH,TPE") problems.push("哪裡飛？沒辦法複選");
    await setClick(page, '#origin button[data-v=""]'); await setClick(page, '#countries button[data-v=""]'); await setClick(page, '#months button[data-v=""]');
    bad = await pathOK(); if (bad) problems.push(`選全部時，線沒有連到「全部」：${bad}`);
    // 出發地有台南；免費資料沒有台南的預估價時，老實說並給「看高雄出發」「去 Trip.com 查台南出發」
    await setClick(page, '#origin button[data-v="TNN"]');
    if (!(await page.textContent("#flightList")).includes("台南出發的國際線比較少")) problems.push("選台南時沒有說明台南出發的國際線比較少");
    const tnnHref = await page.$eval('#flightList .empty a', a => a.href).catch(() => "");
    if (!/dcity=tnn/.test(tnnHref) || !/Allianceid=7106961/.test(tnnHref)) problems.push(`台南的「去 Trip.com 查」連結不對：${tnnHref}`);
    await page.click('#flightList [data-origin="KHH"]');
    if ((await page.evaluate(() => [...state.origins].join())) !== "KHH") problems.push("按「看高雄出發」沒有換成高雄");
    await setClick(page, '#origin button[data-v=""]');
    // 選到的是克萊茵藍
    const kb = await page.$eval('#months .t-all', b => getComputedStyle(b).color);
    if (kb !== "rgb(0, 47, 167)") problems.push(`選到的按鈕不是克萊茵藍：${kb}`);
    // 單程時不顯示「五天前後」
    await setClick(page, '#tripType button[data-v="ow"]');
    if (await page.$('#filters button[data-v="five"]')) problems.push("單程時不該有「五天前後」");
    await setClick(page, '#tripType button[data-v="rt"]');
    // 五天前後：只留 4～6 天的來回
    await setClick(page, '#filters button[data-v="five"]');
    const badLen = await page.evaluate(() => cheapestPerRoute(baseFiltered()).filter(f => { const n = diffDays(f.dep, f.ret) + 1; return n < 4 || n > 6; }).length);
    if (badLen) problems.push(`勾「五天前後」還有 ${badLen} 張不是 4～6 天的票`);
    await setClick(page, '#filters button[data-v="five"]');
    // 點卡片日期 → 價格日曆；在日曆裡分享：沒有系統分享、也不能複製時，要跳出連結
    const when = await page.$("#flightList .when.tap");
    if (!when) problems.push("卡片的日期不能點");
    else {
      await when.click();
      await page.waitForSelector("#sheet:not(.hidden) .opt", { timeout: 3000 }).catch(() => problems.push("點卡片日期沒有打開價格日曆"));
      await page.evaluate(() => { try { delete Navigator.prototype.share; } catch(e) {} Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("no")) }, configurable: true }); });
      await page.click("#sheet [data-share]");
      const shareUrl = await page.$eval(".share-url", i => i.value).catch(() => null);
      if (!shareUrl || !/route=[A-Z]{3}-[A-Z]{3}&src=share/.test(shareUrl)) problems.push(`分享失敗時沒有跳出連結：${shareUrl}`);
      if (!(await page.textContent("#sheet .sub").catch(() => "")).includes("杯珍奶")) problems.push("分享文字沒有珍奶換算");
      await page.keyboard.press("Escape");
    }
    await page.close();
  }

  // 傳統航空＋單程的分享連結：朋友打開要在傳統航空分頁、單程，並打開那條航線
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const ow = { updated_at: new Date().toISOString(), part: "fsc", rows: [...FSC.rows, row("TPE", "HKG", "TPE", "HKG", day(20), null, 3210, 0, 0, "CX")] };
    await page.route("**/*workers.dev/**", r => r.fulfill({ contentType: "application/json",
      body: JSON.stringify(r.request().url().includes("part=fsc") ? ow : MOCK) }));
    await page.goto(base + "?route=TPE-HKG&m=fsc&t=ow&src=share");
    await page.waitForSelector("#sheet:not(.hidden) .opt", { timeout: 5000 }).catch(() => problems.push("傳統航空單程的分享連結沒有打開航線面板"));
    const st = await page.evaluate(() => ({ mode: state.mode, type: state.type, tab: document.querySelector('.tabs [aria-selected="true"]').dataset.tab,
      chip: document.querySelector('#filters button[data-v="fsc"]').getAttribute("aria-pressed") }));
    if (st.mode !== "fsc" || st.type !== "ow" || st.tab !== "flights" || st.chip !== "true") problems.push(`分享連結的「僅看傳統」／單程沒套用：${JSON.stringify(st)}`);
    const price = await page.textContent("#sheet .opt .pp strong").catch(() => "");
    if (!price.includes("3,210")) problems.push(`傳統航空單程分享連結的價格不對：${price}`);
    await checkLinks(page, "傳統航空單程分享", "howtravle_share");
    await page.close();
  }

  // 收藏降價提醒：上次看到 9,999，這次比較便宜 → 顯示；同樣價格再打開 → 不顯示
  {
    const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx3.addInitScript(() => {
      if (sessionStorage.getItem("seeded")) return; sessionStorage.setItem("seeded", "1");
      localStorage.setItem("howtravle_fav_v1", JSON.stringify(["TPE-OSA"]));
      localStorage.setItem("howtravle_favprice_v1", JSON.stringify({ "TPE-OSA|all|rt": { p: 9999, t: 1 } }));
    });
    const page = await ctx3.newPage();
    await page.route("**/*workers.dev/**", r => r.fulfill({ contentType: "application/json",
      body: JSON.stringify(r.request().url().includes("part=fsc") ? FSC : MOCK) }));
    await page.goto(base);
    await page.waitForSelector("#flightList .card");
    await page.waitForFunction(() => dataSettled, null, { timeout: 12000 }).catch(() => problems.push("資料一直沒有齊全"));
    if (!(await page.textContent("#favList").catch(() => "")).includes("比你上次看便宜")) problems.push("收藏的航線降價了卻沒有顯示「比你上次看便宜」");
    // 收藏不受出發地按鈕影響：收藏的是台北出發，點「高雄」後收藏區還要在
    await setClick(page, '#origin button[data-v="KHH"]');
    if (!(await page.isVisible("#favSec")) || !(await page.textContent("#favList")).includes("大阪")) problems.push("選了別的出發地，收藏的航線就不見了");
    // 選了月份後換出發地：那個月還有票就留在那個月
    await setClick(page, '#origin button[data-v=""]');
    const m2 = await page.evaluate(() => { const ks = monthKeys(); return ks.find(k => baseFiltered().some(f => f.dep.startsWith(k) && f.o === "TPE")); });
    if (m2) {
      await setClick(page, `#months button[data-v="${m2}"]`);
      await setClick(page, '#origin button[data-v="TPE"]');
      if ((await page.evaluate(() => [...state.months].join())) !== m2) problems.push("換出發地後，原本選的月份（還有票）被換掉了");
      await setClick(page, `#months button[data-v="${m2}"]`);
      await setClick(page, '#origin button[data-v=""]');
    }
    await page.reload(); await page.waitForSelector("#flightList .card");
    await page.waitForFunction(() => dataSettled, null, { timeout: 12000 }).catch(() => {});
    if ((await page.textContent("#favList").catch(() => "")).includes("比你上次看便宜")) problems.push("同樣價格重新打開，還顯示降價");
    await ctx3.close();
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
