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
| `check-layout.mjs` | 上線前檢查：5 種螢幕寬度下量測照片、標誌、卡片有沒有沒對齊或跑版 |

## 機票資料怎麼來

- 價格來自 Travelpayouts 的低價快取，是**預估最低價**，網頁上有標明。
- 主要來源：Cloudflare Worker `howtravle-deals`（https://howtravle-deals.a8225012.workers.dev/，程式碼就是 `worker.js`），
  每 3 小時更新一次，分成幾段（Cloudflare 免費方案每段最多對外查 50 次）：
  - `/`：依出發地 × 月份，抓日韓泰越＋大陸港所有低價
  - `/?part=fsc`：47 條航線指定抓，只留傳統航空
  - `/?part=m0`～`m3`：44 條熱門航線 × 每個月（m0＝本月），每條每月留最便宜 60 組日期，讓選擇更多。
    網頁先顯示前兩段，這四段到了再自動補進去。熱門航線清單在 `worker.js` 的 `HOT_ROUTES`（總數要在 48 以下）
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

- `country`：`JP` 日本、`KR` 韓國、`TH` 泰國、`VN` 越南、`CN` 中國大陸、`HK` 香港
- `image`（選填）：酒店照片網址（https 開頭）；不填就用該城市的地標照片
- `url` 必須是 trip.com 的網址，聯盟參數會自動補上；其他網站的網址會被擋掉不顯示。

## 連假日期

在 `index.html` 的 `HOLIDAYS`，依人事行政總處公告填寫，目前填到 2027 年清明連假。每年公告新日曆後要補上。

## 照片與航空公司標誌

- **城市照片**：在 `index.html` 的 `LANDMARKS`，每個城市一個代表地標（例如東京＝東京鐵塔），
  照片在粉絲的瀏覽器裡從英文維基百科即時抓取（Wikimedia Commons，各作者依原授權），抓過的會記 7 天。
  想換照片：把該城市的英文維基條目名稱換掉即可。抓不到照片時會顯示該國的漸層底，版面不會壞。
- **地區磚塊照片**：`COUNTRY_PHOTO`。
- **航空公司標誌**：Travelpayouts 的 `pics.avs.io`，失敗改用 `img.wway.io`，都失敗就顯示航空代碼。
- **大圖輪播**：自動挑目前分頁最便宜的 5 個城市（`CONFIG.heroSlides`），每 5.5 秒換一張。

## 上線前檢查

```
node deals/check-links.mjs
node deals/check-layout.mjs
```

兩個都看到 ✅ 才上線。檢查程式用模擬價格與模擬照片測試，不會出現在正式網頁上。
