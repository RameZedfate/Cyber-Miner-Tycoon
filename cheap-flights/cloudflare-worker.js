/**
 * Cloudflare Worker — 即時便宜機票 proxy
 * 作用：呼叫 Travelpayouts(Aviasales) 便宜票快取 API，把 token 藏在伺服器、補上 CORS，
 *       回傳給「即期／便宜 機票」網頁使用。訂票仍走你頁面上的 Trip.com 聯盟連結。
 *
 * 部署步驟見 README.md 的「4-3. 接即時真實價」。
 *   1) Cloudflare → Workers & Pages → Create Worker → 把這整份貼上 → Deploy
 *   2) Worker 的 Settings → Variables → 新增 Secret： TP_TOKEN = 你的 Travelpayouts API token
 *   3) 複製 Worker 網址（https://xxx.workers.dev）→ 貼到 index.html 的 CONFIG.proxyUrl
 */

const ORIGINS  = ["TPE", "TSA", "KHH", "RMQ", "TNN"]; // 台灣出發機場
const CURRENCY = "twd";
const LIMIT    = 30;       // 每個機場 / 每種行程抓幾筆
const CACHE_SECONDS = 900; // 結果快取 15 分鐘，省 API 額度

export default {
  async fetch(request, env, ctx) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    const token = env.TP_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: "缺少 TP_TOKEN，請到 Worker 的 Settings → Variables 設定" }),
        { status: 500, headers: cors });
    }

    // 先看 Cloudflare 邊緣快取，有就直接回（少打 API）
    const cache = caches.default;
    const cacheKey = new Request(new URL(request.url).origin + "/_cheapflights_cache");
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const data = [];
    for (const origin of ORIGINS) {
      for (const oneWay of ["true", "false"]) { // 單程 + 來回都抓
        const api = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates`
          + `?origin=${origin}&currency=${CURRENCY}&one_way=${oneWay}`
          + `&sorting=price&direct=false&limit=${LIMIT}&token=${token}`;
        try {
          const r = await fetch(api, { cf: { cacheTtl: CACHE_SECONDS } });
          const j = await r.json();
          if (j && Array.isArray(j.data)) data.push(...j.data);
        } catch (e) { /* 單一機場失敗就略過 */ }
      }
    }

    const body = JSON.stringify({ updated_at: new Date().toISOString(), count: data.length, data });
    const res = new Response(body, { headers: cors });
    ctx.waitUntil(cache.put(cacheKey, res.clone())); // 寫入邊緣快取
    return res;
  },
};
