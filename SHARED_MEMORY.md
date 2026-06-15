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

- 2026-06-15：建立這份 GitHub 版共享記憶，讓雲端 Claude 也能與 Codex / 本機 Claude 共用記憶。

---

> 💡 之後若要叫 AI 記東西，就說「把這次重要內容寫進共享記憶」，它會更新這份檔案並 push。
