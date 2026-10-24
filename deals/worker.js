/**
 * Cloudflare Worker：自動抓「台灣出發」的預估低價機票
 *
 *   https://你的網址/            → 一般低價：日韓泰越，所有航空公司
 *   https://你的網址/?part=fsc   → 傳統航空：台灣有飛的傳統航空，日韓泰越＋中國大陸＋香港
 *
 * 價格來源：Travelpayouts（Aviasales）低價快取。這是「預估最低價」，
 * 不是 Trip.com 即時價；網頁會標明，訂票按鈕一律導到 Trip.com 聯盟連結。
 *
 * 更新方式：Cloudflare → howtravle-deals → 編輯代碼 → 全選刪掉 → 貼上這整份 → 部署
 * 需要的 Secret：TP_TOKEN（Travelpayouts token）
 *
 * 回傳：{ updated_at, part, count, rows: [ Travelpayouts prices_for_dates 的原始列 ] }
 */

const CURRENCY = "twd";
const LIMIT = 1000;
const CACHE_SECONDS = 3 * 60 * 60; // 3 小時更新一次

// ---------- 一般低價 ----------
const ORIGINS = ["TPE", "KHH", "RMQ"]; // 台北（含桃園、松山）、高雄、台中
const MONTHS_AHEAD = 4;                 // 本月 + 往後 3 個月
const MAIN_KEEP = new Set([
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
  "TG","VN","SQ","MH","PR",            // 東南亞：泰航、越南航空、新航、馬航、菲航
  "CA","MU","CZ","FM","MF","ZH","3U","HU","SC","HO", // 中國大陸
]);
const CN_HK = new Set([
  "HKG","SHA","BJS","CAN","SZX","CTU","CKG","XMN","HGH","NKG","TAO","WUH","XIY","KMG",
  "DLC","FOC","TSN","CSX","SYX","CGO","SHE","NGB",
]);
// 指定航線抓來回（不指定航線時多半只剩廉航）。共 46 次查詢，低於免費方案 50 次上限。
const FSC_ROUTES = {
  TPE: ["TYO","OSA","NGO","FUK","OKA","SPK","SEL","PUS","BKK","CNX","SGN","HAN","DAD",
        "HKG","SHA","BJS","CAN","SZX","CTU","CKG","XMN","HGH","NKG","TAO",
        "WUH","XIY","KMG","DLC","FOC","TSN","CSX","NGB","SHE","CGO"],
  KHH: ["TYO","OSA","OKA","SEL","BKK","HKG","SHA","BJS","CAN","SZX","XMN"],
  RMQ: ["HKG"],
};

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

    const url = new URL(request.url);
    const part = url.searchParams.get("part") === "fsc" ? "fsc" : "main";

    const cache = caches.default;
    const cacheKey = new Request(`${url.origin}/_deals_cache_v3_${part}`);
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

    const jobs = [];
    if (part === "main") {
      // 每個出發地 × 每個月：來回（不限轉機＋只限直飛）、單程。共 3×4×3 = 36 次。
      for (const origin of ORIGINS) {
        for (const m of months()) {
          const q = `origin=${origin}&departure_at=${m}`;
          jobs.push(get(`${q}&one_way=false&direct=false`));
          jobs.push(get(`${q}&one_way=false&direct=true`));
          jobs.push(get(`${q}&one_way=true&direct=false`));
        }
      }
    } else {
      // 指定航線抓來回，才抓得到傳統航空（不指定航線時多半只剩廉航）
      for (const [origin, dests] of Object.entries(FSC_ROUTES)) {
        for (const dest of dests) {
          jobs.push(get(`origin=${origin}&destination=${dest}&one_way=false&direct=false`));
        }
      }
    }
    const all = (await Promise.all(jobs)).flat();

    const isFsc = (r) => FSC_AIRLINES.has(String(r.airline || "").toUpperCase());
    // 一般低價也順便留下「傳統航空飛大陸／香港」的票，讓傳統航空分頁每個月都更完整
    const keep = (r) => part === "main"
      ? (MAIN_KEEP.has(r.destination) || (CN_HK.has(r.destination) && isFsc(r)))
      : isFsc(r);

    const seen = new Set();
    const rows = [];
    for (const r of all) {
      if (!keep(r)) continue;
      const key = [r.origin, r.destination, r.departure_at, r.return_at || "", r.price, r.transfers, r.airline].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      delete r.link; // 這是 Aviasales 的連結，不是你的聯盟連結，絕不外流
      rows.push(r);
    }

    const res = new Response(JSON.stringify({ updated_at: new Date().toISOString(), part, count: rows.length, rows }), { headers });
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  },
};
