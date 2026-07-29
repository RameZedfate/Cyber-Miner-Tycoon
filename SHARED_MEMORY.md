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

- 使用者：Adam（IG `fang__0914`，主題「AI 挑戰100天」）
- 同時經營兩件事：
  1. **內容創作**：IG 帳號 `fang__0914`
  2. **保險工作**：永達保險經紀人，個人銷售強，主要時間花在「文書處理」
- Email：a8225012@gmail.com

## 🎯 優先順序（痛點）

1. **保險文書處理（最耗時）**：協助把案件描述「草擬」成理賠申請書文字段落，使用者再自行複製貼上。
   - ⚠️ 永達保單健診系統無對外 API，AI 不直接登入操作，不用 RPA（個資風險）。
2. **IG 內容團隊**（`fang__0914`）：選題、腳本、視覺、排程。
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

- 2026-07-29：**同步第二個技能 `insurance-claim-form-automation`（理賠申請書草稿）。**
  - 上游同一個 repo，commit `041e80d`。**這個才是填申請書的**，支援全球人壽／台灣人壽一般醫療理賠。
  - 已跑過它自帶的 5 個測試，全過。
  - ❗ **最重要的限制：現在還不能真的產出 PDF。** repo 裡**沒有空白表單、沒有填表引擎、沒有座標對照**，
    只有「規則書 + 一支結構驗證器」。SKILL.md 第 15 行自己有寫「工作流不可用時要停下來明講限制」。
    ➜ 要能實際跑，缺的是：**空白表單 PDF（使用者提供）** + 填表程式。
  - ⚠️ `validate_claim_output.py` 只檢查「是單頁、沒加密、檔數對」，**不檢查填得對不對**。
    綠燈 ≠ 表格正確，該留空的欄位有沒有留空還是要人眼看。
  - ⚠️ 疾病敘述只支援「入院＋手術＋出院」四要素齊全的案子。**門診手術、純住院無手術、慢性病回診會直接停住。**
    這是目前最該擴充的地方（要使用者提供去識別化的實際案例來教）。
  - ⚠️ 它的隱私測試只掃 `insurance-claim-form-automation/` 一個資料夾，
    **掃不到歸檔那支腳本**，所以前面記的 `鵔→駿` 洩漏測試不會抓到。

- 2026-07-29：**同步 Codex 寫的 `insurance-drive-filing` 技能進 `.claude/skills/`。**
  - 上游：`RameZedfate/insurance-drive-filing-skill`（public，MIT 未標示，2 commits）。
  - ❗ **正名：這是「理賠文件歸檔」，不是「理賠申請書填寫」。** repo 裡**完全沒有**
    全球人壽／台灣人壽或任何保險公司的表單邏輯（已全文搜尋確認）。
    它做的是：OCR 讀照片 → 分類 → 找出是哪位客戶 → 出 CSV → 核准後搬檔到 Google Drive。
  - **仍然缺的（最高優先）：把案情描述轉成申請書制式段落**（事故經過／理賠原因）。這個要另外做。
  - ⚠️ **兩個已知風險（用之前一定要知道）：**
    1. `Get-DestinationGuess` 找不到完全相符的名字時，會退而用**姓名最後兩個字**比對
       （`drive-filing-assistant.ps1` 約 300-309 行）。「陳志明／林志明」這種會**配到錯的客戶**，
       等於 A 客戶的診斷書被歸進 B 客戶資料夾 —— **這是個資外洩**。
       ➜ 所以 CSV 一定要逐列看過，不可以整欄填 `Y`。特別注意 `Confidence` 是 `low` / `review` 的列。
    2. `Normalize-Text` 裡有一行寫死的 OCR 錯字修正 `"鵔" → "駿"`，這其實**已經洩漏了某位客戶名字的用字**，
       違反該 skill 自己寫的 privacy boundary。建議移到本機設定、不要留在公開 repo。
  - ⚠️ 用 Windows 內建 OCR（離線、不上傳，隱私設計正確），但**只能在本機 Windows 跑**，雲端 Claude 執行不了。

- 2026-07-29：**把技能包與 IG 內容方向合併進 `main`（重要修正）。**
  - 問題：`.claude/skills/` 和 `context/`、`outputs/scripts/` 之前只 push 到分支
    `claude/add-skill-system-o2c553`，**從來沒合併到 `main`、也沒開 PR**。
    雲端 Claude 每個新 session 都是從 `main` 開分支，所以 skills 永遠載入不到 ——
    使用者問「我的技能樹有什麼」時，那 10 個 skill 完全不會出現。
  - ✅ **規矩（以後照做）：任何要讓三邊長期共用的東西，一定要合併回 `main`，
    留在功能分支上等於沒做。**
  - 已整條合併（commit `b2c8eaf`），`main` 現在含：10 個 skill、`context/brand-style.md`、
    `context/content-calendar.md`、Day 1-9 腳本、第一週批次拍攝總表，以及帳號更正 `fang__0914`。
  - ⚠️ skill 是**對話開場時載入**的，合併後要**開新對話**才吃得到，當下那個 session 不會生效。

- 2026-07-27：**確立 IG 內容方向 —— 每日 Reels 連載「AI 挑戰100天」，不出鏡、螢幕錄影為主。**
  - **核心原則（最重要）：痛點是主題，工具是答案。** 標題／前 3 秒**絕不出現工具名**。
    ❌「今天介紹 XX skill」 ✅「我每天早上花 40 分鐘想今天發什麼」
  - **Day 8 轉折：** 前 7 天講社群技能，第 8 天起改成「今天我用 AI 做掉一件麻煩事」，
    否則第 20 天必定沒梗（值得講的 skill 沒有 100 個）。
  - **不出鏡執行：** 螢幕錄影 + 自己口白。⚠️ Terminal 字級錄影前放大 2.5 倍（手機看不清是這類內容最常見死因）。
  - **批次生產：** 週日一次錄 7 支，分 7 天發。斷更幾乎都發生在「每天現做」的帳號。
  - **踩坑內容要固定佔 20%** —— 連續 100 天全是成功案例，觀眾會覺得假。
  - ⚠️ **Day 8 之後的安全紅線：** 保險相關內容一律用**虛構案例**，不錄永達內部系統畫面，
    不提客戶姓名／保單號。只講「表單文書處理」這個通用痛點，不用點名是保險業。
  - 產出檔案：`context/brand-style.md`（品牌調性）、
    `context/content-calendar.md`（Day 1-14 選題）、`outputs/scripts/day-01-ai-tone.md`（完整腳本示範）。

- 2026-07-27：**依實際帳號截圖校正 `brand-style.md`（三項重要更正）。**
  - ❗ **帳號名稱更正：`adam_ai_plus` → `fang__0914`**（IG／Threads 同名）。舊資料全部有誤，已全域修正。
  - **現況：82 貼文／517 粉絲／505 追蹤（比值 1.02，成長主要靠互追，不是內容擴散）。**
  - **AI 內容目前是「圖文輪播」，Reels 全給了旅遊。** 所以這次是「把 AI 內容搬進 Reels」的形式遷移，
    不是從零學做 Reels（旅遊 Reels 他已經很熟）。
  - **視覺辨識度已建立，不要重做**：兩套模板 —— A 米色底＋插畫＋紅字強調（`#F2EBE0`／`#C8102E`）、
    B 深藍底＋本人照＋黃字（`#0E2A47`／`#FFC72C`）。標題極大字＋下方一句補刀。
  - ⚠️ **不出鏡會動到模板 B**（那張臉是現在的視覺錨點）。建議折衷：**Reels 內容不出鏡，但封面繼續用有臉的模板 B**。
  - **旅遊佔 50%，不砍掉，改成支柱「AI × 旅遊」** —— 用 AI 解決旅遊麻煩事。
    現成素材就是 repo 裡的 `cheap-flights/` 便宜機票雷達（已排進 Day 9，是合併兩群觀眾的關鍵一支）。
  - 變現：**目前無規劃**（本人確認）。但 bio 已隱含在賣 AI 代操與保險，只是沒 CTA，之後再設計。

- 2026-07-27：加入社群技能包 `.claude/skills/`（來源 `stevenflanagan1/social-ai-team`，commit `3d140a1`，10 個 skill）。
  - **決定：技能裝在 repo 的 `.claude/skills/`，不是 `~/.claude/skills/`。**
    理由：雲端 Claude 的容器是暫時的，裝在家目錄下次就沒了；放進 repo 才能三邊（Codex／本機 Claude／雲端 Claude）共用。
  - 可直接用：`/social-media-manager`（入口）、`/brand-onboarding`、`/content-calendar`、
    `/caption-writer`、`/threads-writer`、`/x-writer`、`/linkedin-writer`、`/social-performance-review`。
  - ⚠️ 不可用（缺 MCP）：`/social-creative-designer`（需 Nano Banana）、`/publisher`（需 Blotato）。
  - 下一步建議：先跑一次 `/brand-onboarding` 建立 `context/brand-style.md`，讓 AI 記住 `fang__0914` 的調性，
    之後每月跑 `/content-calendar` 排選題。
  - 細節與更新方式見 `.claude/skills/README.md`。
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
