# 便宜機票雷達 ✈️ Cheap Flight Radar

一頁式 HTML，呈現「**從台灣全部機場出發、近三個月內、低於市場平均價**」的便宜機票。
封面是純 CSS/SVG 的**富士山**（不依賴外部圖片，永遠顯示得出來），
所有「訂票」按鈕都帶上你的 **Trip.com 聯盟行銷參數**。

> 用途：放在 IG 連結 / HOWTRAVLE 機票分享。讀者自己挑想要的票，按一下就去 Trip.com 訂，你賺聯盟回饋。

---

## 1. 先改這 3 個地方（檔案：`index.html` 最上方 `<script>` 設定區）

```js
const AFFILIATE = {
  allianceId: "YOUR_ALLIANCE_ID",   // ← 換成你的 Trip.com Allianceid
  sid:        "YOUR_SID",           // ← 換成你的 Trip.com SID
  sub:        "howtravle"           // 追蹤標籤，可自訂（ig / howtravle / story…）
};
```

`Allianceid` 與 `SID` 可在 **Trip.com 聯盟後台**找到。改完存檔即可。

---

## 2. 馬上預覽

直接用瀏覽器打開 `index.html` 就能看（預設用內建示範資料，價格會模擬即時跳動）。

---

## 3. 上線（讓 IG / HOWTRAVLE 點得到）

最簡單：**GitHub Pages**
1. 把這個資料夾推上 GitHub（你已經在做了）。
2. repo → Settings → Pages → Source 選你的分支、資料夾選 `/cheap-flights`（或把 `index.html` 放 repo 根目錄）。
3. 得到一個網址，例如 `https://你的帳號.github.io/cyber-miner-tycoon/cheap-flights/`。
4. 把這個網址放 IG 簡介 / HOWTRAVLE 貼文即可。

其他免費選擇：Netlify Drop（把檔案拖進去就有網址）、Cloudflare Pages、Vercel。

---

## 4. 換成「真實、會即時更新」的價格（之後再做）

目前資料來源（`CONFIG.dataSource`）有三種：

| 模式 | 說明 | 適合誰 |
| --- | --- | --- |
| `"demo"`（預設） | 內建示範資料，馬上能看、能分享，價格會模擬跳動 | 先上線、先測版面 |
| `"custom"` | 讀**你自己的 JSON 網址**（最推薦給非工程師長期維護） | 你想自己掌控要推哪些特價 |
| `"travelpayouts"` | 串 Travelpayouts(Aviasales) 真實便宜票快取 | 想全自動抓便宜票 |

### 4-1. `custom`：用 Google Sheet 當資料庫（最省事）
1. 開一張 Google Sheet，每列一筆票，欄位：
   `depIata, destIata, destZh, region, airlineZh, airlineType, baggage, baggageKg, stops, departDate, returnDate, price, marketAvg`
   - `region`：`jp / kr / sea / hk`（決定卡片配色）
   - `airlineType`：`full`（傳統）或 `lcc`（廉航）
   - `baggage`：`true`（含託運）或 `false`
   - `price` < `marketAvg` 才會被當成「便宜票」
2. 用任一服務把這張表發佈成 JSON（例如 Opensheet、SheetDB、或 Apps Script）。
3. 在 `CONFIG` 設定：
   ```js
   dataSource: "custom",
   customJsonUrl: "你的 JSON 網址",
   ```
這樣你只要改 Google Sheet，網頁就會即時更新（重新整理或每 5 分鐘自動更新）。

### 4-2. `travelpayouts`：自動抓便宜票快取
- 到 <https://www.travelpayouts.com> 免費註冊，取得 **API token**。
- ⚠️ 重點：這個 API 通常**沒有 CORS 標頭**，前端網頁直接打會被瀏覽器擋；
  而且 token 放在前端會外洩。**正確做法是架一層輕量 proxy**（Cloudflare Worker / Vercel Function），
  由 proxy 去打 Travelpayouts，再把結果回給網頁，token 藏在 proxy。
- 把 `index.html` 裡 `fetchTravelpayouts()` 的網址改成你的 proxy 網址即可。
- 監理錢的還是 Trip.com：價格資料來自 Travelpayouts，但「訂票按鈕」依舊導到你的 Trip.com 聯盟連結。

---

## 5. 其他可調

`index.html` → `CONFIG`：
- `monthsAhead`：近 N 個月（預設 3）
- `refreshMinutes`：自動更新間隔（預設 5 分鐘）
- `currency` / `locale`：顯示幣別與 Trip.com 語系
- `TW_AIRPORTS`：要列出的台灣出發機場
- `DESTS`：要掃描的目的地與市場均價
- 想換成真實富士山照片當封面？把 OG `og:image` 補上圖片網址即可（版面背景仍是 SVG，分享預覽圖才會吃 `og:image`）。

---

## 6. 合規提醒（重要）

- 頁尾已內建**聯盟行銷揭露**與**價格僅供參考、以 Trip.com 結帳為準**的說明 —— 請保留，符合多數平台規範。
- 「便宜」的定義為**低於市場平均價**（`price < marketAvg`），卡片會標出大約省幾 %。
- 比價連結（Skyscanner / Google Flights）為一般連結、非聯盟，只是方便讀者查證。

---

製作：`@adam_ai_plus` ｜ 分享於 HOWTRAVLE
