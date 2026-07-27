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

- 2026-07-27：建立**數字人 Reels 製作流程** `reels/REELS_PIPELINE.md`（全部單價/規格皆已實測）。
  - 需求：用 Adam 的照片做數字人（70-80% 像）、用 Adam 的聲音唸文稿、畫面配合文稿、Reels 風格音效。
  - 技術路線（已驗證）：
    - 對嘴數字人 = `wan2_7`（首幀圖 + 配音檔 → 嘴型同步），**1.5 點/秒**，單段上限 15 秒。
    - 聲音 = `create_voice` 克隆 → `seed_audio` 中文 TTS，**0.2 點/段**（中文實測通過）。
    - 數字分身 = Soul 訓練（5-20 張照片，~10 分鐘），出圖 `soul_2` **0.12 點/張**。
    - B-roll = `seedream_v4_5` 1 點/張、`veo3_1_lite` 1 點/秒。
    - 字幕 = faster-whisper，**繁體逐字時間軸實測正常**（可做卡拉OK字幕）。
    - 合成 = Higgsfield 雲端沙盒 `sandbox_exec`（有 ffmpeg），響度標準化 -14 LUFS。
  - 換算基準：中文 **約 3.5-4 字/秒**（45 秒 ≈ 165 字）。
  - ⚠️ 限制一：平台**不能生成音樂/音效**，只能生成語音 → 音樂走 IG 原生音樂庫、音效走 CapCut 音效庫，AI 只負責在分鏡表標音效點。
  - ⚠️ 限制二：本 session 網路政策擋掉素材 CDN，**本機不能下載素材**，合成一律在 Higgsfield 沙盒做。
  - ⚠️ 限制三：**餘額 106.2 點（Plus）≈ 只夠 2-3 支成品**，要日更需加值。
  - 待辦（只有使用者能做）：① 上傳 5-20 張照片 ② 錄 30-60 秒聲音樣本 ③ 給文稿。
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
