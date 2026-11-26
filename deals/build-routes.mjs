// 各航線頁（給 Google 搜尋）：r/taipei-tokyo/ 這種網址，每條熱門航線一頁。
// 每一頁就是完整的便宜票雷達（打開直接跳出那條航線的價格日曆），只是標題、說明、下面的航線介紹不一樣，
// 有人在 Google 搜「台北飛東京便宜機票」才找得到。價格是頁面打開後即時填進去的。
//
// 用法：改完 index.html 或這支程式後跑一次
//   node deals/build-routes.mjs          → 重新產生 r/*/index.html、sitemap.xml，並更新 index.html 頁尾的熱門航線連結
//   node deals/build-routes.mjs --check  → 只檢查有沒有忘記重新產生（check-links.mjs 會跑）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SITE = "https://ramezedfate.github.io/Cyber-Miner-Tycoon/deals/";

const ORIGINS = {
  TPE: { name: "台北", slug: "taipei", ap: "桃園機場（TPE）" },
  KHH: { name: "高雄", slug: "kaohsiung", ap: "小港機場（KHH）" },
  RMQ: { name: "台中", slug: "taichung", ap: "清泉崗機場（RMQ）" },
};
// 目的地：名稱、網址用的英文、國家、機場、時差、貨幣、什麼時候去、玩什麼（都是一般旅遊常識，價格不寫死）
const DEST = {
  TYO: { name: "東京", slug: "tokyo", country: "日本", ap: "成田（NRT）、羽田（HND）", tz: "比台灣快 1 小時", cur: "日圓",
    when: "3 月底到 4 月初賞櫻、11 月下旬賞楓最熱門；1–2 月、6 月梅雨季比較冷門，機票也常比較便宜。",
    fun: "淺草、澀谷、新宿、迪士尼，近郊鎌倉、箱根、河口湖看富士山。" },
  OSA: { name: "大阪", slug: "osaka", country: "日本", ap: "關西機場（KIX）", tz: "比台灣快 1 小時", cur: "日圓",
    when: "春天賞櫻、秋天京都賞楓是旺季；1–2 月和 6 月比較好買到便宜票。",
    fun: "道頓堀、環球影城，搭電車半小時到京都、奈良。" },
  FUK: { name: "福岡", slug: "fukuoka", country: "日本", ap: "福岡機場（FUK）", tz: "比台灣快 1 小時", cur: "日圓",
    when: "四季都適合，機場離市區只要幾分鐘地鐵，很適合三天兩夜小旅行。",
    fun: "中洲屋台、博多拉麵、太宰府，還能順遊由布院、別府泡溫泉。" },
  OKA: { name: "沖繩", slug: "okinawa", country: "日本", ap: "那霸機場（OKA）", tz: "比台灣快 1 小時", cur: "日圓",
    when: "4–6 月、10–11 月天氣舒服；7–9 月是颱風季，便宜但要留意天氣。",
    fun: "國際通、美麗海水族館、古宇利島，自駕看海最舒服。" },
  SPK: { name: "札幌", slug: "sapporo", country: "日本", ap: "新千歲機場（CTS）", tz: "比台灣快 1 小時", cur: "日圓",
    when: "2 月雪祭、冬天滑雪最熱門；7 月富良野薰衣草季也很搶手。",
    fun: "小樽運河、富良野、旭山動物園，冬天玩雪、夏天避暑。" },
  SEL: { name: "首爾", slug: "seoul", country: "韓國", ap: "仁川（ICN）、金浦（GMP）", tz: "比台灣快 1 小時", cur: "韓元",
    when: "4 月櫻花、10–11 月楓葉最美；12–2 月很冷，但機票常有低價。",
    fun: "明洞、弘大、景福宮穿韓服、聖水洞咖啡廳。" },
  PUS: { name: "釜山", slug: "busan", country: "韓國", ap: "金海機場（PUS）", tz: "比台灣快 1 小時", cur: "韓元",
    when: "夏天海雲台海灘、10–11 月秋天最舒服，機票通常比首爾便宜一點。",
    fun: "甘川文化村、海雲台、廣安里海邊夜景、札嘎其市場。" },
  CJU: { name: "濟州島", slug: "jeju", country: "韓國", ap: "濟州機場（CJU）", tz: "比台灣快 1 小時", cur: "韓元",
    when: "3–4 月油菜花、10 月芒草季；冬天風大但機票常常很便宜。",
    fun: "城山日出峰、牛島、偶來小路，自駕或包車最方便。" },
  BKK: { name: "曼谷", slug: "bangkok", country: "泰國", ap: "蘇凡納布（BKK）、廊曼（DMK）", tz: "比台灣慢 1 小時", cur: "泰銖",
    when: "11–2 月涼季最舒服；4 月潑水節很熱鬧，5–10 月雨季機票比較便宜。",
    fun: "大皇宮、鄭王廟、恰圖恰週末市集、按摩和夜市。" },
  DAD: { name: "峴港", slug: "da-nang", country: "越南", ap: "峴港機場（DAD）", tz: "比台灣慢 1 小時", cur: "越南盾",
    when: "2–8 月乾季最適合玩水；9–12 月雨季比較便宜，但要留意颱風。",
    fun: "美溪沙灘、巴拿山黃金橋、會安古鎮。" },
  SGN: { name: "胡志明市", slug: "ho-chi-minh", country: "越南", ap: "新山一機場（SGN）", tz: "比台灣慢 1 小時", cur: "越南盾",
    when: "12–4 月乾季最舒服，5–11 月雨季多半是午後雷陣雨。",
    fun: "范五老街、濱城市場、古芝地道、湄公河一日遊。" },
  HKG: { name: "香港", slug: "hong-kong", country: "香港", ap: "香港國際機場（HKG）", tz: "跟台灣一樣", cur: "港幣",
    when: "10–12 月秋高氣爽最舒服；夏天熱又有颱風，但常有廉航特價。",
    fun: "維港夜景、太平山、茶餐廳、迪士尼，假日一日來回也可以。" },
  SHA: { name: "上海", slug: "shanghai", country: "中國大陸", ap: "浦東（PVG）、虹橋（SHA）", tz: "跟台灣一樣", cur: "人民幣",
    when: "3–5 月、9–11 月氣候最舒服；夏天濕熱、冬天濕冷。",
    fun: "外灘夜景、豫園、武康路，順遊蘇州、杭州。" },
};
// 直飛大約多久（以常見班表估）
const FLY = {
  "TPE-TYO": "約 3 小時 10 分", "TPE-OSA": "約 2 小時 40 分", "TPE-FUK": "約 2 小時 15 分", "TPE-OKA": "約 1 小時 30 分",
  "TPE-SPK": "約 4 小時", "TPE-SEL": "約 2 小時 30 分", "TPE-PUS": "約 2 小時 15 分", "TPE-CJU": "約 2 小時",
  "TPE-BKK": "約 3 小時 50 分", "TPE-DAD": "約 2 小時 50 分", "TPE-SGN": "約 3 小時 30 分", "TPE-HKG": "約 1 小時 50 分",
  "TPE-SHA": "約 1 小時 50 分",
  "KHH-TYO": "約 3 小時 40 分", "KHH-OSA": "約 3 小時", "KHH-OKA": "約 1 小時 40 分", "KHH-SEL": "約 3 小時",
  "KHH-BKK": "約 3 小時 30 分", "KHH-HKG": "約 1 小時 30 分",
  "RMQ-OKA": "約 1 小時 40 分", "RMQ-SEL": "約 2 小時 50 分", "RMQ-DAD": "約 3 小時",
};
export const ROUTES = Object.keys(FLY).map(k => { const [o, d] = k.split("-"); return { o, d, slug: `${ORIGINS[o].slug}-${DEST[d].slug}` }; });

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function routeLinks(cur){
  return `<!--ROUTES--><nav class="ft-routes" aria-label="熱門航線"><b>熱門航線便宜機票</b><ul>${ROUTES.map(r =>
    `<li><a href="r/${r.slug}/"${cur && cur.slug === r.slug ? ' aria-current="page"' : ""}>${ORIGINS[r.o].name}飛${DEST[r.d].name}</a></li>`).join("")}</ul></nav><!--/ROUTES-->`;
}
function seoSection(r){
  const O = ORIGINS[r.o], D = DEST[r.d], t = `${O.name}飛${D.name}`;
  const others = ROUTES.filter(x => x !== r && (x.d === r.d || x.o === r.o)).slice(0, 8);
  return `<section class="wrap" id="seoRoute"><div class="seo-route">
  <h1>${t}便宜機票｜來回最低價、價格日曆、廉航 vs 傳統航空（每天更新）</h1>
  <p>HOWTRAVLE 便宜票雷達每天自動整理${O.name}出發飛${D.name}（${D.country}）的低價機票。打開這頁會直接跳出價格日曆，哪一天出發最便宜、各月份最低價、廉航和傳統航空差多少，一眼就看得到。</p>
  <div id="seoLive"><p class="seo-now">價格每天自動更新，載入中…（看不到的話，點上面的價格日曆或往上看機票卡）</p></div>
  <h2>${t}基本資訊</h2>
  <dl>
    <dt>出發機場</dt><dd>${esc(O.ap)}</dd>
    <dt>抵達機場</dt><dd>${esc(D.ap)}</dd>
    <dt>直飛時間</dt><dd>${esc(FLY[`${r.o}-${r.d}`])}（以實際班表為準）</dd>
    <dt>時差</dt><dd>${esc(D.tz)}</dd>
    <dt>貨幣</dt><dd>${esc(D.cur)}（價格日曆裡有今天的匯率）</dd>
  </dl>
  <h2>什麼時候去${D.name}最划算？</h2>
  <p>${esc(D.when)}</p>
  <p>想買到便宜票：盡量平日出發、避開連假和寒暑假，提早 1–3 個月買；價格日曆上綠色的日子就是比較便宜的。</p>
  <h2>${D.name}玩什麼</h2>
  <p>${esc(D.fun)}</p>
  <h2>廉航和傳統航空怎麼選？（託運行李）</h2>
  <ul>
    <li><b>廉航</b>：票價通常不含託運行李、餐點和選位，只能帶 7–10 公斤手提。要託運的話，來回 1 件 20 公斤加購大約 NT$1,200–2,000，網路預購比機場現場買便宜很多。</li>
    <li><b>傳統航空</b>：經濟艙多數含 1 件 20–23 公斤託運和餐點（少數輕省票不含，以訂票頁為準）。</li>
    <li>兩邊差價比行李費還少的話，選傳統航空反而划算；只帶小行李、短天數，選廉航最省。</li>
  </ul>
  <h2>常見問題</h2>
  <h3>這裡的價格是即時的嗎？</h3>
  <p>是每天自動查到的預估最低價（頁面會寫查到的時間），機票隨時會變，點進 Trip.com 會看到即時價格與剩餘座位。</p>
  <h3>在這裡訂票會比較貴嗎？</h3>
  <p>不會。訂票是在 Trip.com 完成，價格跟你自己去 Trip.com 查一樣；本站是 Trip.com 聯盟網站，你訂票我會獲得少量回饋。</p>
  ${others.length ? `<h2>其他熱門航線</h2><ul>${others.map(x => `<li><a href="r/${x.slug}/">${ORIGINS[x.o].name}飛${DEST[x.d].name}便宜機票</a></li>`).join("")}</ul>` : ""}
</div></section>
`;
}
function routePage(index, r){
  const O = ORIGINS[r.o], D = DEST[r.d], t = `${O.name}飛${D.name}`, url = `${SITE}r/${r.slug}/`;
  const title = `${t}便宜機票｜來回最低價、價格日曆、廉航比較（每天更新）｜HOWTRAVLE`;
  const desc = `${t}（${D.country}）便宜機票每天自動更新：來回最低價、每月最低價日曆、廉航 vs 傳統航空差價與託運行李說明，一鍵到 Trip.com 訂。`;
  const sub = (str, a, b) => { if (!str.includes(a)) throw new Error("index.html 找不到：" + a.slice(0, 60)); return str.replace(a, b); };
  let h = index;
  h = sub(h, '<meta charset="utf-8" />', `<meta charset="utf-8" />\n<base href="../../" />`);
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  h = h.replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(desc)}" />`);
  h = h.replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(title)}" />`);
  h = h.replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(desc)}" />`);
  h = h.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`);
  h = h.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`);
  h = sub(h, "\n<script>\n", `\n<script>window.SEO_ROUTE = "${r.o}-${r.d}"; window.SEO_SRC = "seo_${(r.o + r.d).toLowerCase()}";</script>\n<script>\n`);
  h = sub(h, '<footer class="wrap">', seoSection(r) + '<footer class="wrap">');
  h = h.replace(/<!--ROUTES-->[\s\S]*?<!--\/ROUTES-->/, routeLinks(r));
  return `<!-- 這一頁由 build-routes.mjs 自動產生，不要直接改；改 index.html 後重跑 node deals/build-routes.mjs -->\n` + h;
}
function sitemap(){
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
${ROUTES.map(r => `  <url><loc>${SITE}r/${r.slug}/</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`).join("\n")}
</urlset>
`;
}

export function build(){
  const idxPath = path.join(DIR, "index.html");
  const index = fs.readFileSync(idxPath, "utf8").replace(/<!--ROUTES-->[\s\S]*?<!--\/ROUTES-->/, routeLinks(null));
  const out = new Map([[idxPath, index], [path.join(DIR, "sitemap.xml"), sitemap()]]);
  for (const r of ROUTES) out.set(path.join(DIR, "r", r.slug, "index.html"), routePage(index, r));
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const out = build(), check = process.argv.includes("--check");
  const stale = [...out].filter(([f, c]) => !fs.existsSync(f) || fs.readFileSync(f, "utf8") !== c).map(([f]) => path.relative(DIR, f));
  // 已經不在清單上的舊航線頁
  const rDir = path.join(DIR, "r"), keep = new Set(ROUTES.map(r => r.slug));
  const extra = fs.existsSync(rDir) ? fs.readdirSync(rDir).filter(n => !keep.has(n)) : [];
  if (check) {
    if (stale.length || extra.length) { console.log("❌ 航線頁沒有重新產生，請跑 node deals/build-routes.mjs：" + [...stale, ...extra.map(n => "r/" + n + "（多的）")].join("、")); process.exit(1); }
    console.log(`✅ ${ROUTES.length} 條航線頁都是最新的`);
  } else {
    for (const [f, c] of out) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); }
    for (const n of extra) fs.rmSync(path.join(rDir, n), { recursive: true, force: true });
    console.log(`已產生 ${ROUTES.length} 條航線頁＋sitemap.xml（更新 ${stale.length} 個檔案${extra.length ? `，刪除 ${extra.length} 個舊航線頁` : ""}）`);
  }
}
