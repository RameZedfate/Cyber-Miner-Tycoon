/**
 * Cloudflare Worker：自動抓「台灣出發」的預估低價機票
 *
 *   https://你的網址/            → 一般低價：日韓泰越＋中國大陸＋香港，所有航空公司
 *   https://你的網址/?part=fsc   → 傳統航空：台灣有飛的傳統航空，日韓泰越＋中國大陸＋香港
 *   https://你的網址/?part=m0～m3 → 熱門航線細抓：每條熱門航線各抓一個月（m0＝本月、m1＝下個月…），日期選擇更多
 *   https://你的網址/?part=g0～g3 → 熱門航線「每天最低價」：另一種查詢方式，補上 m 段沒有的日期
 *   https://你的網址/?part=all    → 累積資料庫（選用，需要設定 KV＋排程，見下方），一次拿到所有累積的票
 *
 *   https://你的網址/?part=probe&o=KHH&d=SEL → 測試頁：比較不同市場／不同查詢方式各抓得到幾張票（不快取）
 *
 * 為什麼要分段：Cloudflare 免費方案每次最多對外查 50 次，分成幾段各自有 50 次額度。
 *
 * 價格來源：Travelpayouts（Aviasales）低價快取。這是「預估最低價」，
 * 不是 Trip.com 即時價；網頁會標明，訂票按鈕一律導到 Trip.com 聯盟連結。
 *
 * 更新方式：Cloudflare → howtravle-deals → 編輯代碼 → 全選刪掉 → 貼上這整份 → 部署
 * 需要的 Secret：TP_TOKEN（Travelpayouts token）
 *
 * 累積資料庫（選用，設定後航線會越來越多）：
 *   1) KV：Workers & Pages → KV → 建立命名空間（名稱隨意）→ 回到 howtravle-deals → 設定 → 繫結 → 新增 KV，變數名稱填 DEALS
 *   2) 排程：howtravle-deals → 設定 → 觸發事件 → Cron 觸發器 → 新增「每 10 分鐘」（Cron 寫法見 deals/README.md）
 *   之後每 10 分鐘輪流抓一段，把看到的票存起來；票保留 3 天、出發日過了就刪。沒設定也照常運作。
 *
 * 回傳：{ updated_at, part, count, stats, rows: [ 機票列（只留網頁需要的欄位）] }
 */

const CURRENCY = "twd";
const LIMIT = 1000;
const ROUTE_LIMIT = 60;             // 熱門航線細抓：每條航線每個月留最便宜的 60 組日期
const CACHE_SECONDS = 3 * 60 * 60; // 3 小時更新一次

// ---------- 一般低價 ----------
const ORIGINS = ["TPE", "KHH", "RMQ"]; // 台北（含桃園、松山）、高雄、台中
const MONTHS_AHEAD = 4;                 // 本月 + 往後 3 個月
const CN_HK = [
  "HKG","SHA","BJS","CAN","SZX","CTU","CKG","XMN","HGH","NKG","TAO","WUH","XIY","KMG",
  "DLC","FOC","TSN","CSX","SYX","CGO","SHE","NGB",
];
const MAIN_KEEP = new Set([
  ...CN_HK, // 中國大陸＋香港
  // 日本
  "TYO","OSA","NGO","SPK","FUK","OKA","SDJ","HIJ","KMJ","KOJ","KIJ","TAK","OKJ","MYJ",
  "ISG","UKB","KMQ","HKD","AOJ","IBR","SHI","FSZ","TOY","AKJ","NGS","OIT","YGJ","HSG","KCZ",
  // 韓國
  "SEL","PUS","CJU","TAE","CJJ","MWX",
  // 泰國
  "BKK","CNX","HKT","USM","KBV","UTP","CEI",
  // 越南
  "SGN","HAN","DAD","CXR","PQC","HPH","DLI","VCA","HUI","VDO",
]);

// ---------- 傳統航空 ----------
// 要跟 index.html 的 FSC_AIRLINES 保持一致（網頁以 index.html 那份為準）
const FSC_AIRLINES = new Set([
  "CI","BR","JX","AE","B7",            // 台灣：華航、長榮、星宇、華信、立榮
  "JL","NH",                           // 日本：日航、全日空
  "KE","OZ",                           // 韓國：大韓、韓亞
  "CX","HX","NX",                      // 港澳：國泰、香港航空、澳門航空
  "TG","VN","9G","QH","SQ","MH","PR", // 東南亞：泰航、越南航空、富國太陽、越竹、新航、馬航、菲航
  "CA","MU","CZ","FM","MF","ZH","3U","HU","SC","HO", // 中國大陸
]);
// 指定航線抓來回（不指定航線時多半只剩廉航）。共 47 次查詢，低於免費方案 50 次上限。
const FSC_ROUTES = {
  TPE: ["TYO","OSA","NGO","FUK","OKA","SPK","SEL","PUS","BKK","CNX","SGN","HAN","DAD","PQC",
        "HKG","SHA","BJS","CAN","SZX","CTU","CKG","XMN","HGH","NKG","TAO",
        "WUH","XIY","KMG","DLC","FOC","TSN","CSX","NGB","SHE","CGO"],
  KHH: ["TYO","OSA","OKA","SEL","BKK","HKG","SHA","BJS","CAN","SZX","XMN"],
  RMQ: ["HKG"],
};

// ---------- 熱門航線細抓（每段 = 所有熱門航線 × 一個月）----------
// 每段查詢次數 = 這裡的航線總數，要保持在 48 以下
const HOT_ROUTES = {
  TPE: ["TYO","OSA","NGO","FUK","OKA","SPK","SEL","PUS","CJU","BKK","CNX","HKT","SGN","HAN","DAD","CXR","PQC",
        "HKG","SHA","BJS","CAN","SZX","XMN","CTU"],
  KHH: ["TYO","OSA","OKA","FUK","SEL","PUS","BKK","SGN","HAN","DAD","HKG","SHA"],
  RMQ: ["OSA","OKA","SEL","BKK","DAD","HKG","CJU","FUK"],
}; // 24 + 12 + 8 = 44 條

// 只留網頁用得到的欄位，傳輸量小一點
const FIELDS = ["origin","destination","origin_airport","destination_airport","price","airline","departure_at","return_at","transfers","return_transfers","duration_to"];
function slim(r) { const o = {}; for (const k of FIELDS) if (r[k] !== undefined) o[k] = r[k]; return o; }

// 測試頁：同一條航線用不同市場、不同查詢方式各查一次，看哪一種資料最多（共 18 次查詢）
async function probe(token, o, d) {
  const T = "https://api.travelpayouts.com";
  const m1 = months()[1];
  const pick = (r) => ({
    dep: String(r.departure_at || r.depart_date || "").slice(0, 10),
    ret: String(r.return_at || r.return_date || "").slice(0, 10),
    price: r.price ?? r.value, airline: r.airline || "",
  });
  const toRows = (j) => {
    const data = j?.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") {
      // v1 / grouped 格式：{ 目的地: { 0: {...}, 1: {...} } } 或 { 日期: {...} }
      return Object.values(data).flatMap(v => (v && typeof v === "object" && !("price" in v) && !("value" in v)) ? Object.values(v) : [v]);
    }
    return [];
  };
  const tests = [];
  for (const mk of ["", "ru", "us", "kr", "jp", "th", "hk", "sg", "tw", "vn", "cn", "au"]) {
    tests.push([`v3 prices_for_dates market=${mk || "(不指定)"}`,
      `${T}/aviasales/v3/prices_for_dates?origin=${o}&destination=${d}&one_way=false&sorting=price&limit=1000&currency=twd${mk ? "&market=" + mk : ""}`]);
  }
  tests.push(["v3 grouped_prices（下個月每天最低）", `${T}/aviasales/v3/grouped_prices?origin=${o}&destination=${d}&group_by=departure_at&departure_at=${m1}&currency=twd`]);
  tests.push(["v3 get_latest_prices（一年內）", `${T}/aviasales/v3/get_latest_prices?origin=${o}&destination=${d}&period_type=year&one_way=false&limit=1000&currency=twd`]);
  tests.push(["v2 prices/latest（一年內）", `${T}/v2/prices/latest?origin=${o}&destination=${d}&period_type=year&one_way=false&limit=1000&show_to_affiliates=true&currency=twd`]);
  tests.push(["v2 prices/month-matrix（下個月）", `${T}/v2/prices/month-matrix?origin=${o}&destination=${d}&month=${m1}-01&show_to_affiliates=true&currency=twd`]);
  tests.push(["v1 prices/cheap", `${T}/v1/prices/cheap?origin=${o}&destination=${d}&currency=twd`]);
  tests.push(["v1 prices/calendar（下個月）", `${T}/v1/prices/calendar?origin=${o}&destination=${d}&depart_date=${m1}&calendar_type=departure_date&currency=twd`]);
  const results = await Promise.all(tests.map(async ([name, u]) => {
    try {
      const r = await fetch(`${u}&token=${token}`);
      const j = await r.json();
      const rows = toRows(j).filter(x => x && (x.price || x.value));
      const prices = rows.map(x => Number(x.price ?? x.value)).filter(n => n > 0);
      return { name, http: r.status, count: rows.length, min: prices.length ? Math.min(...prices) : null,
        airlines: [...new Set(rows.map(x => x.airline).filter(Boolean))].join(","), sample: rows.slice(0, 3).map(pick),
        error: j?.error || j?.message || undefined };
    } catch (e) { return { name, error: String(e) }; }
  }));
  return { route: `${o}-${d}`, month_tested: m1, results };
}

function months() {
  const out = [];
  const now = new Date(Date.now() + 8 * 3600 * 1000); // 台灣時間
  for (let i = 0; i < MONTHS_AHEAD; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

// ---------- 抓一段資料（網頁請求和排程共用）----------
const PARTS = ["main", "fsc", "m0", "m1", "m2", "m3", "g0", "g1", "g2", "g3"];
const isFsc = (r) => FSC_AIRLINES.has(String(r.airline || "").toUpperCase());

async function buildPart(part, token) {
  const base = "https://api.travelpayouts.com/aviasales/v3";
  const get = async (path, q, limit = LIMIT) => {
    try {
      const r = await fetch(`${base}/${path}?${q}&currency=${CURRENCY}&sorting=price&limit=${limit}&token=${token}`);
      const j = await r.json();
      const d = j?.data;
      if (Array.isArray(d)) return d;
      if (d && typeof d === "object") return Object.values(d).filter(x => x && typeof x === "object"); // grouped_prices：{ 日期: 票 }
      return [];
    } catch { return []; }
  };
  const routes = (obj, fn) => { const jobs = []; for (const [o, ds] of Object.entries(obj)) for (const d of ds) jobs.push(fn(o, d)); return jobs; };

  let jobs = [];
  const stats = {};
  if (part === "main") {
    // 每個出發地 × 每個月：來回（不限轉機＋只限直飛）、單程。共 3×4×3 = 36 次。
    for (const origin of ORIGINS) for (const m of months()) {
      const q = `origin=${origin}&departure_at=${m}`;
      jobs.push(get("prices_for_dates", `${q}&one_way=false&direct=false`));
      jobs.push(get("prices_for_dates", `${q}&one_way=false&direct=true`));
      jobs.push(get("prices_for_dates", `${q}&one_way=true&direct=false`));
    }
  } else if (part === "fsc") {
    // 指定航線抓來回，才抓得到傳統航空（不指定航線時多半只剩廉航）
    jobs = routes(FSC_ROUTES, (o, d) => get("prices_for_dates", `origin=${o}&destination=${d}&one_way=false&direct=false`)
      .then(list => { for (const r of list) { const s = (stats[`${o}-${d}`] ||= { total: 0, fsc: 0 }); s.total++; if (isFsc(r)) s.fsc++; } return list; }));
  } else if (/^m[0-3]$/.test(part)) {
    const m = months()[Number(part[1])];
    jobs = routes(HOT_ROUTES, (o, d) => get("prices_for_dates", `origin=${o}&destination=${d}&departure_at=${m}&one_way=false&direct=false`, ROUTE_LIMIT));
  } else if (/^g[0-3]$/.test(part)) {
    const m = months()[Number(part[1])];
    jobs = routes(HOT_ROUTES, (o, d) => get("grouped_prices", `origin=${o}&destination=${d}&departure_at=${m}&group_by=departure_at`)
      .then(list => list.map(r => ({ origin: o, destination: d, ...r }))));
  }
  const all = (await Promise.all(jobs)).flat();
  const keep = (r) => part === "fsc" ? isFsc(r) : MAIN_KEEP.has(r.destination);
  const seen = new Set(), rows = [];
  for (const r of all) {
    if (!r || !r.price || !r.departure_at || !keep(r)) continue;
    const key = [r.origin, r.destination, r.departure_at, r.return_at || "", r.price, r.transfers, r.airline].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(slim(r)); // 只留需要的欄位（Aviasales 的連結不是你的聯盟連結，不會外流）
  }
  return { rows, stats };
}

// ---------- 累積資料庫（KV）----------
const POOL_KEY = "pool_v1", CURSOR_KEY = "cursor_v1";
const POOL_MAX_AGE = 3 * 24 * 3600 * 1000;   // 票最多保留 3 天
const POOL_PER_ROUTE_MONTH = 80;             // 每條航線每個月最多留 80 筆（最便宜的）
const rowKey = (r) => [r.origin, r.destination, String(r.departure_at).slice(0, 10), String(r.return_at || "").slice(0, 10), r.airline || "", r.transfers ?? ""].join("|");

function mergePool(pool, rows, now) {
  const map = new Map((pool?.rows || []).map(r => [rowKey(r), r]));
  for (const r of rows) map.set(rowKey(r), { ...r, seen: now }); // 同一組日期＋航空：用最新看到的價格
  const today = new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 10);
  const groups = new Map();
  for (const r of map.values()) {
    if (String(r.departure_at).slice(0, 10) <= today) continue;   // 已出發
    if (!r.seen || now - r.seen > POOL_MAX_AGE) continue;         // 太舊
    const g = `${r.origin}|${r.destination}|${String(r.departure_at).slice(0, 7)}|${r.return_at ? "rt" : "ow"}`;
    (groups.get(g) || groups.set(g, []).get(g)).push(r);
  }
  const out = [];
  for (const list of groups.values()) out.push(...list.sort((a, b) => a.price - b.price).slice(0, POOL_PER_ROUTE_MONTH));
  return { updated_at: new Date(now).toISOString(), count: out.length, rows: out };
}

async function refreshOnePart(env) {
  const i = Number(await env.DEALS.get(CURSOR_KEY)) || 0;
  const part = PARTS[i % PARTS.length];
  const { rows } = await buildPart(part, env.TP_TOKEN);
  const pool = await env.DEALS.get(POOL_KEY, "json");
  const next = mergePool(pool, rows, Date.now());
  next.last_part = part;
  await env.DEALS.put(POOL_KEY, JSON.stringify(next));
  await env.DEALS.put(CURSOR_KEY, String((i + 1) % PARTS.length));
  return next;
}

export default {
  async fetch(request, env, ctx) {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
    };
    if (request.method === "OPTIONS") return new Response(null, { headers });

    const token = env.TP_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: "缺少 TP_TOKEN" }), { status: 500, headers });
    }

    const url = new URL(request.url);
    const p = url.searchParams.get("part") || "";
    if (p === "probe") {
      const code = (k, dflt) => (url.searchParams.get(k) || dflt).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
      const out = await probe(token, code("o", "KHH"), code("d", "SEL"));
      return new Response(JSON.stringify(out, null, 1), { headers: { ...headers, "Cache-Control": "no-store" } });
    }
    if (p === "all") {
      // 累積資料庫：沒設定 KV 就回空的，網頁會自動改用分段抓法
      if (!env.DEALS) return new Response(JSON.stringify({ part: "all", count: 0, rows: [], note: "尚未設定 KV（DEALS）" }), { headers: { ...headers, "Cache-Control": "public, max-age=600" } });
      let pool = await env.DEALS.get(POOL_KEY, "json");
      if (!pool || !pool.count) pool = await refreshOnePart(env); // 第一次：先抓一段
      return new Response(JSON.stringify({ part: "all", ...pool }), { headers: { ...headers, "Cache-Control": "public, max-age=600" } });
    }
    const part = PARTS.includes(p) ? p : "main";

    const cache = caches.default;
    const cacheKey = new Request(`${url.origin}/_deals_cache_v6_${part}`);
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const { rows, stats } = await buildPart(part, token);
    const res = new Response(JSON.stringify({ updated_at: new Date().toISOString(), part, count: rows.length, stats, rows }), { headers });
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  },

  // 排程（Cron 觸發器）：每次輪流抓一段，存進累積資料庫
  async scheduled(event, env, ctx) {
    if (!env.DEALS || !env.TP_TOKEN) return;
    await refreshOnePart(env);
  },
};
