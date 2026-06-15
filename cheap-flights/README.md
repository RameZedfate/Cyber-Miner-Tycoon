# 便宜機票雷達 ✈️ Cheap Flight Radar

一頁式 HTML，呈現「**從台灣全部機場出發、近三個月內、低於市場平均價**」的即期／便宜機票。
封面是**富士山＋忠靈塔實景照**，所有「訂票」按鈕都帶上你的 **Trip.com 聯盟行銷參數**。

> 用途：放在 IG 連結 / HOWTRAVLE 機票分享。讀者自己挑想要的票，按一下就去 Trip.com 訂，你賺聯盟回饋。

**版面重點：**
- 封面正中央：標題「即期／便宜 機票」＋「單趟機票／來回機票」切換。
- 篩選選項（出發機場、託運、航空類型、排序、搜尋目的地、只看低於均價、重新整理）都收在**右上角「≡」選單**裡，點開即可。

---

## 0. 這個資料夾有什麼

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 主程式（封面 + ≡ 篩選選單 + 卡片 + Trip.com 訂票按鈕） |
| `deals.json` | **你的機票資料檔 — 平常就改這個來更新便宜票**（預設資料來源） |
| `images/cover.jpg` | **封面照片（放這裡會自動使用）**；沒放就用線上富士山照備援 |
| `README.md` | 本說明 |

> 預設 `index.html` 會讀同資料夾的 `deals.json`。上線到 GitHub Pages 後，**你只要編輯 `deals.json` 並推上去，網頁就會更新**（同網域、免 CORS、免 API 金鑰）。
> ⚠️ 若你在本機用滑鼠雙擊 `index.html`（file:// 開啟），瀏覽器會擋住讀取本機 JSON，這時會**自動退回內建示範資料**——這是正常的，上線後就會讀 `deals.json`。

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
| `"custom"`（**預設**，讀 `deals.json`） | 讀同資料夾或你指定網址的 JSON，**你自己掌控要推哪些特價** | 你（最推薦） |
| `"demo"` | 內建示範資料，價格會模擬跳動 | 只想先測版面 |
| `"travelpayouts"` | 串 Travelpayouts(Aviasales) 真實便宜票快取 | 想全自動抓便宜票 |

### 4-1. 日常維護：直接改 `deals.json`（預設、最省事）
`deals.json` 是一個陣列，每筆一張票，欄位如下：

```json
{
  "depIata":"TPE", "depZh":"台北桃園",
  "destIata":"NRT", "destZh":"東京", "destEn":"Tokyo",
  "region":"jp", "emoji":"🗼",
  "airlineZh":"樂桃航空", "airlineType":"lcc",
  "baggage":false, "baggageKg":0, "stops":0,
  "departDate":"2026-07-08", "returnDate":"2026-07-13",
  "price":8200, "marketAvg":13500, "currency":"TWD"
}
```

- `region`：`jp / kr / sea / hk`（決定卡片配色；其他填 `other`）
- `airlineType`：`full`（傳統）或 `lcc`（廉航）
- `baggage`：`true`（含託運，記得填 `baggageKg`）或 `false`
- **`price` 一定要 < `marketAvg`**，才會被當成「便宜票」並算出省幾 %
- **單趟票**：把 `returnDate` 拿掉（或留空字串）就會被歸到「單趟機票」，訂票連結也會自動變單程；
  有 `returnDate` 就是「來回機票」。（封面的單趟／來回切換就是依這個分類）

改完 `git push`，GitHub Pages 上的網頁就更新了。

### 4-2.（進階）想用 Google Sheet 編輯而不是改 JSON
1. 開一張 Google Sheet，欄位同上。
2. 用 Opensheet / SheetDB / Apps Script 把它發佈成 JSON 網址。
3. 把 `CONFIG.customJsonUrl` 改成那個網址即可（其餘不用動）。

### 4-3. `travelpayouts`：自動抓便宜票快取
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

### 換封面照片（重要）
- **最簡單**：把你的照片命名為 `cover.jpg` 放進 `cheap-flights/images/`，網頁封面就會自動變那張。
- 封面讀取順序：`images/cover.jpg` → 線上富士山＋忠靈塔照片（備援）→ 漸層（最後備援）。
- 想換線上備援照／或社群分享預覽圖：改 `index.html` 裡 `.hero::before` 的圖片網址、以及 `<meta property="og:image">`。

---

## 6. 合規提醒（重要）

- 頁尾已內建**聯盟行銷揭露**與**價格僅供參考、以 Trip.com 結帳為準**的說明 —— 請保留，符合多數平台規範。
- 「便宜」的定義為**低於市場平均價**（`price < marketAvg`），卡片會標出大約省幾 %。
- 比價連結（Skyscanner / Google Flights）為一般連結、非聯盟，只是方便讀者查證。

---

製作：`@adam_ai_plus` ｜ 分享於 HOWTRAVLE
