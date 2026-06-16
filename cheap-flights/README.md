# 便宜機票雷達 ✈️ Cheap Flight Radar

一頁式 HTML，呈現「**從台灣全部機場出發、近三個月內、低於市場平均價**」的即期／便宜機票。
封面是**富士山＋忠靈塔實景照**，所有「訂票」按鈕都帶上你的 **Trip.com 聯盟行銷參數**。

> 用途：放在 IG 連結 / HOWTRAVLE 機票分享。讀者自己挑想要的票，按一下就去 Trip.com 訂，你賺聯盟回饋。

**版面重點：**
- 封面正中央：標題「即期 ／ 便宜」＋兩顆按鈕「🛫 單趟機票 / 🔁 來回機票」。
  點按鈕會直接跳到對應排行，並自動展開該排的「查看更多」。
- 機票分成 **單程機票** 與 **來回機票** 兩排，各自**橫向捲動**、**價格由低到高**排行。
  每排先顯示最便宜的 **前 10 名**，滑到最後點 **[查看更多]** 展開到 **前 30 名**（可再「收合」）。
- 單程／來回是依資料**自動分類**：有 `returnDate` 就是來回、沒有就是單程，所以標籤不會標錯。
- 篩選選項（出發機場、託運、航空類型、搜尋目的地、只看低於均價、重新整理）都收在**右上角「≡」選單**裡。

---

## 0. 這個資料夾有什麼

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 主程式（封面 + ≡ 篩選選單 + 卡片 + Trip.com 訂票按鈕） |
| `deals.json` | 手動維護的機票清單（**還沒接即時價時**就用這個） |
| `cloudflare-worker.js` | 接「即時真實價」用的中介程式（見 4-3，部署一次即可） |
| `images/cover.jpg` | **封面照片（放這裡會自動使用）**；沒放就用線上富士山照備援 |
| `README.md` | 本說明 |

> 預設 `index.html` 會讀同資料夾的 `deals.json`。上線到 GitHub Pages 後，**你只要編輯 `deals.json` 並推上去，網頁就會更新**（同網域、免 CORS、免 API 金鑰）。
> ⚠️ 若你在本機用滑鼠雙擊 `index.html`（file:// 開啟），瀏覽器會擋住讀取本機 JSON，這時會**自動退回內建示範資料**——這是正常的，上線後就會讀 `deals.json`。

---

## 1. 聯盟參數（已幫你填好）

`index.html` 最上方 `<script>` 設定區，已填入你的 Trip.com 聯盟參數：

```js
const AFFILIATE = {
  allianceId: "7106961",      // Trip.com Allianceid
  sid:        "261258404",    // Trip.com SID
  sub:        "howtravle",    // trip_sub1：自訂追蹤標籤
  sub3:       "D17991192"     // trip_sub3：來自你的官方推廣連結
};
```

訂票連結網域用 `tw.trip.com`（台灣站）。日後若要換帳號或追蹤標籤，改這裡即可。

### 聯盟連結與 cookie 是怎麼運作的？（你問的重點）
**一次點擊就同時完成兩件事，不需要分兩個連結。**
- 程式產生的訂票連結長這樣（每張卡片都帶）：
  `https://www.trip.com/flights/showfarefirst?...&Allianceid=你的ID&SID=你的SID&trip_sub1=howtravle`
- 客人點下去時：①直接到 Trip.com 的該機票頁面；②網址裡的 `Allianceid`＋`SID` 會讓 Trip.com **自動種下你的聯盟 cookie**，把這次造訪與後續下單**歸給你**。
- 也就是說：**訂票連結本身就是你的聯盟連結**，導頁與記 cookie 是同一個動作，客人只點一下。
- `trip_sub1` 是你的自訂子標籤（例如 `ig`、`howtravle`），用來在後台分辨流量來自哪裡，可自由命名。
- 想確認有沒有生效：用無痕視窗點自己頁面上的訂票按鈕 → 看到達的 Trip.com 網址仍保留 `Allianceid/SID` → 再到聯盟後台看「點擊數」有沒有 +1。
- 注意：cookie 有歸戶效期（依 Trip.com 方案，常見為點擊後一段時間內下單都算你的）。實際分潤比例與效期以 Trip.com 後台規則為準。

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

## 4. 價格來源

資料來源**優先序**（程式會由上往下試，前面拿不到才用後面）：

| 順序 | 設定 | 說明 |
| --- | --- | --- |
| 1（即時真實價） | `CONFIG.proxyUrl` | 你的 Cloudflare Worker 網址；抓 Travelpayouts 真實便宜票快取。**填了就用這個**。見 4-3 |
| 2（手動） | `CONFIG.customJsonUrl`（預設 `deals.json`） | 你自己維護的便宜票清單。**還沒部署 Worker 時就用這個** |
| 3（後備） | 內建 demo | 本機 `file://` 開、或上面都失敗時，顯示示範資料 |

> 卡片價格與「省 X%」：即時模式下 `price` 是 Travelpayouts 抓到的**真實最低快取價**，`marketAvg`（市場均價）用程式內建的參考值估算，所以「省 X%」是約略值。**最終票價一律以點進 Trip.com 結帳頁為準**（頁尾已標註）。

### 4-1. 手動維護：直接改 `deals.json`（還沒接即時價時用）
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

### 4-3. 接「即時真實價」（推薦）— 一次性設定，之後全自動
價格資料來自 **Travelpayouts(Aviasales) 免費 API**；因為 token 不能放前端、且要處理 CORS，
所以用一支免費的 **Cloudflare Worker** 當中介。**訂票按鈕仍然是你的 Trip.com 聯盟連結**，這裡只借它的「價格」。

**步驟：**
1. **拿 Travelpayouts token**：到 <https://www.travelpayouts.com> 免費註冊 → 後台 API token 區，複製你的 **API token**。
2. **建 Cloudflare Worker**（免費）：
   - 到 <https://dash.cloudflare.com> 註冊/登入 → 左側 **Workers & Pages** → **Create** → **Create Worker** → 命名後 **Deploy**。
   - 點 **Edit code**，把本資料夾的 **`cloudflare-worker.js`** 整份貼上去 → **Deploy**。
3. **設定 token（重要，別寫進程式）**：Worker 的 **Settings → Variables and Secrets** → 新增
   名稱 `TP_TOKEN`、值＝你的 Travelpayouts token（類型選 **Secret**）→ 存檔 / 重新部署。
4. **複製 Worker 網址**（長得像 `https://你的worker.你的帳號.workers.dev`），用瀏覽器打開應該會看到一包 JSON。
5. **接到網頁**：把那個網址貼到 `index.html` 的 `CONFIG.proxyUrl`，例如：
   ```js
   proxyUrl: "https://你的worker.你的帳號.workers.dev",
   ```
6. `git push`。完成後網頁就改用**即時真實價**，每 5 分鐘自動更新；Worker 端也有 15 分鐘快取省額度。

**小提醒：**
- Travelpayouts 是「市場快取價」，數字會非常接近、但不一定與 Trip.com 完全相同（不同資料來源）；客人點進 Trip.com 看到的才是當下成交價。
- 即時資料**不含行李資訊**，所以卡片會顯示「託運看航司」；「含/不含託運」篩選主要對手動的 `deals.json` 有效。
- 想改抓哪些出發機場 / 抓幾筆，改 `cloudflare-worker.js` 最上面的 `ORIGINS` / `LIMIT`。
- 想擴充目的地中文名／配色：在 `index.html` 的 `DESTS` 加一筆即可（沒列到的目的地會直接顯示機場代碼）。

---

## 5. 其他可調

`index.html` → `CONFIG`：
- `monthsAhead`：近 N 個月（預設 3）
- `refreshMinutes`：自動更新間隔（預設 5 分鐘）
- `currency` / `locale`：顯示幣別與 Trip.com 語系
- `TW_AIRPORTS`：要列出的台灣出發機場
- `DESTS`：要掃描的目的地與市場均價
- `topN` / `maxN`：每排先顯示前幾名、按「查看更多」展開到第幾名（預設 10 → 30）
- `autoRotate` / `rotateSeconds`：旋轉輪播是否自動換頁、間隔幾秒（不想自動換就把 `autoRotate` 改成 `false`，仍可用 ‹ › 或手滑）

> 💡 **價格提醒**：`deals.json` 裡「來回」票的 `price`/`marketAvg` 要填**來回的金額**（例如 KHH↔胡志明來回約 9,000–12,000），不要填單程價，否則會像之前那樣看起來怪怪的。單程票（沒有 `returnDate`）才填單程價。

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
