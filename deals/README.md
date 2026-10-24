# HOWTRAVLE 便宜票雷達（新版）

只呈現「台灣出發 → 日本・韓國・泰國・越南」的**預估低價機票**和**精選便宜酒店**。
不提供搜尋。頁面上每一個連結都是 Trip.com 聯盟連結（Allianceid `7106961`／SID `261258404`）。

舊版 `cheap-flights/` 保留不動。

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 網頁本體 |
| `worker.js` | 每天自動抓低價機票的程式，部署在 Cloudflare |
| `picks.json` | 「Adam 今日精選」：HOWTRAVLE 每日 Top 2，已在 Trip.com 核對過價格 |
| `hotels.json` | 精選酒店（評分 8.0 以上才會顯示） |
| `check-links.mjs` | 上線前檢查：確認每個連結都帶聯盟編號 |

## 機票資料怎麼來

- 價格來自 Travelpayouts 的低價快取，是**預估最低價**，網頁上有標明。
- 主要來源：Cloudflare Worker `howtravle-deals`（https://howtravle-deals.a8225012.workers.dev/，程式碼就是 `worker.js`），
  每 3 小時更新一次，依出發地 × 月份抓。
- 備援：舊版 Worker `cold-union-5668`。舊版網頁 `cheap-flights/` 還在用它，不要刪。
- 改了 `worker.js` 之後，要把新內容貼回 Cloudflare 的 `howtravle-deals` 再按 Deploy 才會生效。

## 分辨哪篇貼文帶來訂單

分享網址後面加 `?src=名稱`，例如：

```
…/deals/?src=ig_day9
```

Trip.com 後台的 `trip_sub1` 就會顯示 `howtravle_ig_day9`。只能用英文、數字、`_`、`-`。

## 每日精選格式（picks.json）

```json
{
  "updated_at": "2026-10-24T09:00:00+08:00",
  "items": [
    { "origin": "TPE", "destination": "OSA", "departDate": "2026-11-13", "returnDate": "2026-11-17",
      "price": 5980, "direct": true, "checkedAt": "2026-10-24T09:00:00+08:00", "note": "大阪直飛不到六千" }
  ]
}
```

已出發的會自動隱藏。

## 酒店格式（hotels.json）

```json
{
  "updated_at": "2026-10-24T09:00:00+08:00",
  "items": [
    { "city": "東京", "country": "JP", "name": "酒店名稱", "area": "淺草站步行 3 分鐘", "rating": 8.6,
      "pricePerNight": 2450, "checkin": "2026-11-03", "checkout": "2026-11-07",
      "url": "從 Trip.com 複製的酒店網址" }
  ]
}
```

- `country`：`JP` 日本、`KR` 韓國、`TH` 泰國、`VN` 越南
- `url` 必須是 trip.com 的網址，聯盟參數會自動補上；其他網站的網址會被擋掉不顯示。

## 上線前檢查

```
node deals/check-links.mjs
```

看到 ✅ 才上線。這支檢查程式用模擬價格測試，模擬價格不會出現在正式網頁上。

## 連假日期

在 `index.html` 的 `HOLIDAYS`，依人事行政總處公告填寫，目前填到 2027 年清明連假。每年公告新日曆後要補上。
