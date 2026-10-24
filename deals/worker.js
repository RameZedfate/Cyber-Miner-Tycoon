/**
 * Cloudflare Worker：每天自動抓「台灣出發 → 日韓泰越」的預估低價機票
 *
 * 價格來源：Travelpayouts（Aviasales）低價快取。這是「預估最低價」，
 * 不是 Trip.com 即時價；網頁會標明，訂票按鈕一律導到 Trip.com 聯盟連結。
 *
 * 部署（只要做一次）：
 *   1) Cloudflare → Workers & Pages → Create → Worker → 把這整份貼上 → Deploy
 *   2) Settings → Variables and Secrets → 新增 Secret：TP_TOKEN = 你的 Travelpayouts token
 *      （跟舊版那支 Worker 用的是同一個 token）
 *   3) 複製 Worker 網址，貼到 deals/index.html 的 CONFIG.dataUrls 第一格
 *
 * 回傳：{ updated_at, rows: [ Travelpayouts prices_for_dates 的原始列 ] }
 */

const ORIGINS = ["TPE", "KHH", "RMQ"];   // 台北（含桃園、松山）、高雄、台中
const MONTHS_AHEAD = 4;                  // 本月 + 往後 3 個月
const CURRENCY = "twd";
const LIMIT = 1000;
const CACHE_SECONDS = 3 * 60 * 60;       // 3 小時更新一次就夠（快取資料本來就是每天更新）

// 只留這四國的城市（城市代碼）
const KEEP = new Set([
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

function months() {
  const out = [];
  const now = new Date(Date.now() + 8 * 3600 * 1000); // 台灣時間
  for (let i = 0; i < MONTHS_AHEAD; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
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

    const cache = caches.default;
    const cacheKey = new Request(new URL(request.url).origin + "/_deals_cache_v1");
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const base = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";
    const get = async (q) => {
      try {
        const r = await fetch(`${base}?${q}&currency=${CURRENCY}&sorting=price&limit=${LIMIT}&token=${token}`);
        const j = await r.json();
        return Array.isArray(j?.data) ? j.data : [];
      } catch { return []; }
    };

    // 每個出發地 × 每個月：來回（不限轉機＋只限直飛）、單程。共 3×4×3 = 36 次，低於免費方案 50 次上限。
    const jobs = [];
    for (const origin of ORIGINS) {
      for (const m of months()) {
        const q = `origin=${origin}&departure_at=${m}`;
        jobs.push(get(`${q}&one_way=false&direct=false`));
        jobs.push(get(`${q}&one_way=false&direct=true`));
        jobs.push(get(`${q}&one_way=true&direct=false`));
      }
    }
    const all = (await Promise.all(jobs)).flat();

    // 只留日韓泰越、去掉重複
    const seen = new Set();
    const rows = [];
    for (const r of all) {
      if (!KEEP.has(r.destination)) continue;
      const key = [r.origin, r.destination, r.departure_at, r.return_at || "", r.price, r.transfers].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      delete r.link; // 這是 Aviasales 的連結，不是你的聯盟連結，絕不外流
      rows.push(r);
    }

    const res = new Response(JSON.stringify({ updated_at: new Date().toISOString(), count: rows.length, rows }), { headers });
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  },
};
