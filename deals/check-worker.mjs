// 抓價程式檢查：用模擬的 Travelpayouts 與模擬的 KV，跑每一段與排程，確認查詢次數、資料格式、累積與清除規則。
// 用法：node deals/check-worker.mjs
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const mod = await import(pathToFileURL(path.join(DIR, "worker.js")).href + "?" + Date.now());
const worker = mod.default;
const problems = [];
const ok = (cond, msg) => { if (!cond) problems.push(msg); };

globalThis.caches = { default: { match: async () => null, put: async () => {} } };
const tw = (n) => new Date(Date.now() + 8 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
let calls = 0, paths = new Set(), priceBump = 0;
globalThis.fetch = async (u) => {
  calls++;
  const url = new URL(u);
  paths.add(url.pathname.split("/").pop());
  const o = url.searchParams.get("origin"), d = url.searchParams.get("destination") || "TYO";
  const m = url.searchParams.get("departure_at") || tw(20).slice(0, 7);
  const t = (day, price, airline) => ({ origin: o, destination: d, origin_airport: o, destination_airport: d, price: price + priceBump, airline,
    departure_at: `${m}-${String(day).padStart(2, "0")}T08:00:00+08:00`, return_at: `${m}-${String(day + 3).padStart(2, "0")}T10:00:00+09:00`,
    transfers: 0, return_transfers: 0, duration_to: 180, link: "/search/x", gate: "g" });
  if (url.pathname.endsWith("grouped_prices")) {
    // grouped_prices：{ 日期: 票 }，票裡不一定有 origin/destination
    const a = t(10, 4000, "IT"), b = t(12, 4100, "MM");
    delete a.origin; delete a.destination; delete b.origin; delete b.destination;
    return { json: async () => ({ success: true, data: { [`${m}-10`]: a, [`${m}-12`]: b } }) };
  }
  const data = url.searchParams.get("destination")
    ? [t(5, 5000, "IT"), t(6, 9000, "CI"), t(7, 5200, "TW")]
    : [t(5, 3000, "IT"), { ...t(6, 8000, "BR"), destination: "LAX" }];
  return { json: async () => ({ success: true, data }) };
};
const ctx = { waitUntil(p) { return p; } };
const call = async (q, env) => (await worker.fetch(new Request("https://x.dev/" + q), env, ctx)).json();

// 1. 每一段
for (const part of ["main", "fsc", "m0", "m1", "m2", "m3", "g0", "g1", "g2", "g3", "n0", "n1", "n2", "n3", "bogus"]) {
  calls = 0; paths = new Set();
  const j = await call(`?part=${part}`, { TP_TOKEN: "t" });
  const expect = part === "bogus" ? "main" : part;
  ok(j.part === expect, `${part}：回報的段落是 ${j.part}`);
  ok(calls <= 48, `${part}：查詢 ${calls} 次，超過 48`);
  ok(j.rows.every(r => !("link" in r) && !("gate" in r)), `${part}：有多餘欄位或 Aviasales 連結`);
  ok(j.rows.every(r => r.origin && r.destination && r.price && r.departure_at), `${part}：有缺欄位的票`);
  ok(!j.rows.some(r => r.destination === "LAX"), `${part}：出現不在範圍內的目的地`);
  if (part === "fsc") ok(j.rows.every(r => ["CI","BR"].includes(r.airline) || r.airline === "CI"), "fsc：出現非傳統航空");
  if (part.startsWith("g")) {
    ok([...paths].every(p => p === "grouped_prices"), `${part}：沒用 grouped_prices`);
    ok(j.rows.length > 0 && j.rows.every(r => r.origin && r.destination), `${part}：每天最低價的票沒補上出發地／目的地`);
  }
  console.log(`${part.padEnd(5)} 查詢 ${String(calls).padStart(2)} 次，${j.rows.length} 筆`);
}

// 2. 沒設定 KV：?part=all 回空的
{
  const j = await call("?part=all", { TP_TOKEN: "t" });
  ok(j.count === 0 && Array.isArray(j.rows), "沒有 KV 時 ?part=all 應回傳空資料");
}

// 3. 有 KV：排程輪流抓、累積、清除（資料庫是精簡格式：cols＋data）
{
  const store = new Map();
  let kvReads = 0;
  const KV = { get: async (k, t) => { kvReads++; const v = store.get(k); return v == null ? null : t === "json" ? JSON.parse(v) : v; },
               put: async (k, v) => { store.set(k, v); } };
  const env = { TP_TOKEN: "t", DEALS: KV };
  const first = await call("?part=all", env);
  ok(first.count > 0 && Array.isArray(first.cols) && Array.isArray(first.data), "有 KV 但資料庫是空的時，?part=all 應先抓一段，回傳 cols＋data");
  const P = () => JSON.parse(store.get("pool_v2"));
  for (let i = 0; i < 14; i++) await worker.scheduled({}, env, ctx);
  const pool = P(), C = Object.fromEntries(pool.cols.map((k, i) => [k, i]));
  console.log(`排程 14 次後資料庫：${pool.count} 筆，最後一段 ${pool.last_part}，下一段索引 ${store.get("cursor_v1")}，大小 ${(store.get("pool_v2").length / 1024).toFixed(0)} KB`);
  ok(pool.count >= first.count, "資料庫沒有累積");
  ok(new Set(pool.data.map(t => t[C.destination])).size > 1, "資料庫只有一個目的地");
  ok(pool.data.every(t => /^\d{4}-\d{2}-\d{2}$/.test(t[C.departure_at]) && t[C.price] > 0 && t[C.seen] > 0), "資料庫有格式不對的列");
  // 價格變動：同一組日期要更新成新價格，不能變成兩筆
  priceBump = 100;
  for (let i = 0; i < 14; i++) await worker.scheduled({}, env, ctx);
  const pool2 = P();
  const keys = pool2.data.map(t => [t[C.origin], t[C.destination], t[C.departure_at], t[C.return_at], t[C.airline], t[C.transfers]].join("|"));
  ok(new Set(keys).size === keys.length, "同一組日期＋航空出現重複");
  // 加入一筆已出發、一筆太舊的票，下一次排程要清掉
  const mk = (dest, price, dep, seen) => { const t = new Array(pool2.cols.length).fill(null); t[C.origin] = "TPE"; t[C.destination] = dest; t[C.price] = price; t[C.airline] = "IT"; t[C.departure_at] = dep; t[C.return_at] = ""; t[C.seen] = seen; return t; };
  pool2.data.push(mk("TYO", 1, tw(-1), Date.now()), mk("OSA", 2, tw(30), Date.now() - 4 * 864e5));
  store.set("pool_v2", JSON.stringify(pool2));
  await worker.scheduled({}, env, ctx);
  const pool3 = P();
  ok(!pool3.data.some(t => t[C.price] === 1), "已出發的票沒有被清掉");
  ok(!pool3.data.some(t => t[C.price] === 2), "超過 3 天的票沒有被清掉");
  const all = await call("?part=all", env);
  ok(all.count === pool3.count, "?part=all 回傳的筆數跟資料庫不一致");
  ok(store.get("pool_v2").length < 2 * 1024 * 1024, "資料庫超過 2 MB");
  // 資料庫上限：塞 6000 筆（各自不同航線月份），排程後要剩 4000 筆以內，而且留下的是最便宜的
  const big = P();
  big.data = Array.from({ length: 6000 }, (_, i) => { const t = mk(["TYO","OSA","SEL","BKK","HKG","FUK"][i % 6], 1000 + i, tw(5 + (i % 100)), Date.now()); t[C.origin] = ["TPE","KHH","RMQ"][Math.floor(i / 6) % 3]; t[C.return_at] = tw(9 + (i % 100)); t[C.airline] = "A" + (i % 97); return t; });
  store.set("pool_v2", JSON.stringify(big));
  await worker.scheduled({}, env, ctx);
  const capped = P();
  ok(capped.count <= 4000, `資料庫上限沒生效：${capped.count} 筆`);
  ok(capped.data.some(t => t[C.price] === 1000), "上限裁切把最便宜的票裁掉了");
  console.log(`塞 6000 筆後排程：剩 ${capped.count} 筆`);
}

if (problems.length) { console.log("❌ 抓價程式問題：\n" + problems.join("\n")); process.exit(1); }
console.log("✅ 抓價程式檢查全部通過");
