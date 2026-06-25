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

- 2026-06-25：使用者盤點了保險業務完整自動化清單（A~J 共 10 項），整理優先順序與風險：
  - **已建置 3 個草擬子代理**（純文字草稿、不連線任何公司系統、輸出只在對話中、
    禁止把客戶個資寫進這個 git repo 的任何檔案）：
    - `claim-drafter`（C 理賠申請書，原本就有，這次把多餘的 Write 工具移除）
    - `policy-maintenance-drafter`（F 保全文件：地址/要保人/受益人變更、減額繳清）
    - `policy-review-drafter`（G 保單檢視報告：保障總覽/缺口分析/初步建議方向，
      資料須由使用者提供，不可杜撰保單數字）
  - **排定之後再做**：D 續保提醒+旅平險報價、E 建議書草擬、H 跨系統客戶資料整合
    （永達A/B/C業務、泛亞A/B業務分散各系統，部分整合在 INUSRES80）、
    I GoodNotes PDF 填表流程、J 行事曆與代辦事項整理
  - **A（招募）/ B（陌生開發客戶）的社群自動訊息——重要風險決定**：使用者目前
    只有個人帳號（FB/IG/LINE 個人版），**已決定不做**「自動大量私訊陌生人」的
    機器人（多數平台條款禁止、風險封號/被檢舉騷擾）。替代方案：AI 草擬訊息，
    使用者手動發送；若未來申請 LINE 官方帳號(OA)/Meta 粉專，才能做平台允許的
    自動回覆。
  - 永達/INUSRES80、泛亞系統都沒有對外 API，所有保險文書子代理都是「草擬文字
    給使用者自己貼上」模式，不會也不能直接操作公司系統。
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
