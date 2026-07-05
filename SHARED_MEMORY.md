# 🧠 共享記憶聯絡簿（SHARED MEMORY）

> 這是 Codex、本機 Claude、雲端 Claude（Claude Code on the web）三邊**共用的同一本筆記本**。
> 因為它放在 GitHub repo 裡，所以三邊都讀得到。
> 每次新對話開始，請先讀這份檔案，再開始工作。

---

## 📌 這本聯絡簿的規矩

1. **新對話開始** → 先讀這份 `SHARED_MEMORY.md`。
2. **有新的重要決定 / 偏好** → 寫進這份檔案（下方對應區塊）。
3. **做完事情** → `git add . && git commit -m "更新共享記憶" && git push`，這樣另外兩邊 `pull` 後就看得到。
4. 這裡只記「**重要重點**」，不是「全部聊天原文」。

---

## 👤 使用者背景

- 使用者：Adam（IG `adam_ai_plus`，主題「AI 挑戰100天」）
- 同時經營兩件事：
  1. **內容創作**：IG 帳號 `adam_ai_plus`
  2. **保險工作**：永達保險經紀人，個人銷售強，主要時間花在「文書處理」
- Email：a8225012@gmail.com

## 🎯 優先順序（痛點）

1. **保險文書處理（最耗時）**：協助把案件描述「草擬」成理賠申請書文字段落，使用者再自行複製貼上。
   - ⚠️ 永達保單健診系統無對外 API，AI 不直接登入操作，不用 RPA（個資風險）。
2. **IG 內容團隊**（`adam_ai_plus`）：選題、腳本、視覺、排程。
3. **招募夥伴 SOP**：把銷售經驗整理成結構化訓練文件。

## 🔐 安全紅線（重要）

- **保險客戶個資（姓名、身分證、保單號、帳密）絕對不要放上 GitHub。**
- 跟 AI 互動時只丟「去識別化」的案情描述。

## 🤝 Codex / Claude 連接方式

- 本機（Windows）那邊：Codex 與本機 Claude 透過本機共享記憶檔互通：
  - Codex：`C:\Users\USER\.codex\shared-memory\SHARED_MEMORY.md`
  - 本機 Claude：`C:\Users\USER\.claude\cowork-memory\SHARED_MEMORY.md`
- **雲端 Claude（Claude Code on the web）讀不到 C 槽檔案**，所以改用**這份放在 GitHub 的 `SHARED_MEMORY.md`** 當共同來源。
- 三邊真正的共用橋樑 = **GitHub repo `RameZedfate/Cyber-Miner-Tycoon`**。
- 規矩：一次讓一個助手做事，做完 `push`，另一個 `pull` 接手，避免衝突。

## 📝 工作進度 / 重要決定（最新在最上面）

- 2026-07-05（搬家）：**護照頁已搬到獨立公開 repo `RameZedfate/passport`**（網址將是 ramezedfate.github.io/passport/），本 repo 的 passport/ 已移除。
  - 新 repo 版已移除個人 Email（Google 登入白名單留空，啟用時再填）。
  - 「便宜機票雷達」也要搬到獨立 repo `cheap-flights`（賺錢工具、要繼續用；搬完後本 repo 才轉私人）。
  - 待使用者完成：新 repo 開 GitHub Pages、cheap-flights repo 建立、本 repo 轉 Private。

- 2026-07-05（決策）：護照頁**先免費**自用＋公開；等使用者變多再評估付費方案（屆時需後端帳號+金流，現行匯出 JSON 格式可直接沿用為資料庫格式）。
  - ⚠️ 提醒：本 repo 為**公開**，這份共享記憶任何人都看得到——只記可公開的重點，敏感內容不要寫這裡。
  - 待辦（下次處理）：OG 分享預覽標籤、換真實旅程資料、使用者提供背景照片與 AI 勳章圖後套用。

- 2026-07-05（v4）：護照頁版面升級（同分支）：
  - PAGE 03 勳章改「⭕⭕⭕ 更多」：上排展示自選勳章（≤3，`featuredBadges` 或登入後按「📌 展示」），其餘收「更多」展開；**勳章只計 ✓ 已核驗旅程**（未核驗照記錄但不算成就）。
  - 勳章圖案支援 AI 繪圖替換：`CONFIG.achievementArt = { 勳章代號: "images/xxx.png" }`。
  - PAGE 05 改兩欄卡片牆＋📌 釘選區（≤2 張，`pinned:true` 或登入後按卡片 📌）。
  - Hero 加 IG / FB / Threads 圓形社群圖示（`profile.socials`，留空不顯示；FB 待使用者填）。
  - 整頁背景圖：`CONFIG.backgroundImage`（半透明紙紋 `--veil` 保可讀性）；使用者之後會提供釜山膠囊列車照片。
- 2026-07-05（v3）：護照頁再升級（同分支 `claude/passport-travel-tracker-a3tx4w`）：
  - **一鍵登入/直接註冊**（2026-07-05 更新）：依使用者指示移除 Apple 與 IG 按鈕，改為
    Google 一鍵登入（填 `CONFIG.auth.googleClientId` 即啟用，`ownerEmails` 已預填 a8225012@gmail.com）
    ＋「直接註冊」（設暱稱＋通行碼≥4碼，存本機 `pp_account`，之後用它登入）＋ CONFIG 通行碼備用。
    背景：Apple 登入需付費開發者帳號；IG 個人登入 API 已被 Meta 關閉（2024 底）。
  - **頁面直接新增卡片**（＋新增）：選國家自動帶國旗/座標/洲別，統計/印章/地圖/成就即時重算。
  - **每張卡片獨立 ✓ 核驗**：有證明書就打勾、沒有也照樣記錄；計數徽章顯示「已核驗 X/N 趟」。
  - **懶人匯入**：貼上移民署「入出國日期證明書」文字 → 自動配對出國/回國日期（支援民國年）生成已打勾卡片，目的地後補。
  - **卡片內頁**：點卡片開內頁，作者登入可寫長文（journal），訪客可讀不可編。
  - 所有頁面編輯存 localStorage，「匯出」→ JSON 貼回 CONFIG.trips 公開。
- 2026-07-04（v2）：護照頁大升級（同分支）：
  - **LOGIN**：右上角登入（通行碼在 `CONFIG.ownerPass`，預設 2026，請使用者自改）；登入後可換卡套、標核驗、匯出資料。
  - **卡套**：每趟 3 格，照片或影片（.mp4/.webm/.mov 自動當影片）都可以，點了放大播放；登入後點 ✎ 直接換。
  - **🌍 世界地圖**：在「護照使用次數」上方、點選才展開；點陣風地圖 + 國旗插旗（含次數角標）、願望清單灰旗、★HOME。
  - **成就系統**：10 個成就、唯一/稀有/一般三階，未解鎖有進度條（自動計算）。
  - **團員 TAG**：`CONFIG.crew` 名冊 + 旅程 `crew:[...]`，卡片顯示可點的 @團員。
  - ⚠️ **外交部驗證結論**：政府無個人出入境紀錄 API，無法自動同步（同永達系統的限制）。改為官方文件流程：移民署「入出國日期證明書」→ 本人核對 → 頁面標記「✓ 已核驗」徽章。
  - ⚠️ 靜態頁無後端：登入後的編輯只存本機 localStorage，公開需按「匯出資料」貼回 CONFIG 再 push。
- 2026-07-04：新增「護照旅行紀錄」單檔網頁 `passport/index.html`（+ `README.md`），分支 `claude/passport-travel-tracker-a3tx4w`。
  - 用途：放 IG 個人簡介連結，展示「護照使用次數」＋出國紀錄（成就感/蒐集癖）。
  - 手機捲動順序：大頭貼+簡介 → 護照使用次數（大數字動畫+統計） → 入境章收藏牆（可點跳轉、含未解鎖願望清單） → 依年份分組的旅程卡片（日期+一句話+最多 3 張精選照片、可放大）。
  - 風格：中性「數位護照」設計（安全紋紙、綠/藍/紅油墨章、MRZ 機讀區頁尾），輕盈乾淨、支援深色模式，無外部相依（單檔即開）。
  - 維護方式：所有資料集中在 `index.html` 最上方 `CONFIG`（profile / wishlist / trips），統計數字全自動計算；照片放 `passport/images/` 或用網址，留空會顯示佔位框。
  - 目前內容為**示範資料**，待使用者換成真實出國紀錄；上線走 GitHub Pages（同 cheap-flights），網址 `.../Cyber-Miner-Tycoon/passport/`。
- 2026-06-15：新增「便宜機票雷達」單檔網頁 `cheap-flights/index.html`（+ `README.md`）。
  - 用途：放 IG / HOWTRAVLE 分享便宜機票，讀者自選、按鈕一鍵導到 **Trip.com 聯盟連結**（使用者目前只有 Trip.com 聯盟）。
  - 規格：從台灣全部機場出發、近三個月、低於市場均價；含/不含託運、傳統/廉航都列。
  - 封面為純 CSS/SVG 富士山（無外部圖片相依）。
  - 資料層可抽換：`custom`(**預設，讀同資料夾 `deals.json`**)/`demo`(示範)/`travelpayouts`(需 token + proxy)。
  - 已建立 `cheap-flights/deals.json`(28 筆,5 個機場,皆低於均價)；日後更新便宜票=改這個 JSON 再 push，網頁即更新(同網域免 CORS/免金鑰)。
  - ⚠️ 唯一待辦(只有使用者能做)：把 `AFFILIATE.allianceId / sid` 換成自己的 Trip.com 後台數值。
  - 注意：Skyscanner / Google Flights 無免費公開 API，故卡片只放它們的「比價連結」，價格來源走 Travelpayouts 或自訂 JSON。
- 2026-06-15：建立這份 GitHub 版共享記憶，讓雲端 Claude 也能與 Codex / 本機 Claude 共用記憶。

---

> 💡 之後若要叫 AI 記東西，就說「把這次重要內容寫進共享記憶」，它會更新這份檔案並 push。
