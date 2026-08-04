# 搬到 Gemini Spark 的一整包

把「Claude 對 Adam 的了解」＋「整棵技能樹」轉成 Gemini Spark 吃得下的格式。

**關鍵前提**：Spark 的技能格式跟 Claude Code **幾乎一樣** —— 都是 `SKILL.md`（YAML frontmatter 的
`name` + `description`，底下寫指示），可以上傳 Markdown 或 ZIP。所以這不是「重寫一遍」，
是**格式轉換 + 補上 Spark 沒有的東西**。

需要 Google AI Pro 或 Ultra 訂閱才有 Spark。

---

## 這包有什麼

```
exports/gemini-spark/
├── 01-個人化脈絡.md      ← 貼進 Gemini 設定的短版（先做這個）
├── 02-完整背景檔.md      ← 上傳當參考檔的長版
├── 03-技能樹地圖.md      ← 哪些搬得動、哪些搬不動、Spark 多做得到什麼
├── build-zips.sh         ← 一鍵把 skills/ 打包成可上傳的 zip
└── skills/               ← 13 個 Spark 版技能
```

---

## 三步驟上傳

### 步驟 1：先讓它認識你（5 分鐘，效果最明顯）

1. 到 [gemini.google.com](https://gemini.google.com) → 設定 → **個人化脈絡／自訂指令**
2. 把 `01-個人化脈絡.md` 分隔線以下的內容整段貼上、儲存
3. 馬上測一句：**「幫我想三個明天可以發的題目」**
   - ✅ 對的反應：給你三個**痛點開頭**、不出現工具名的題目
   - ❌ 錯的反應：出現「顛覆」「必學」，或標題直接寫工具名 → 代表沒讀進去，回頭檢查有沒有存到

### 步驟 2：上傳技能

打包（在 repo 根目錄執行）：

```bash
bash exports/gemini-spark/build-zips.sh
```

會產出 `exports/gemini-spark/dist/*.zip`。

然後到 **gemini.google.com → 切換到 Spark → Skills → 新增技能 → 上傳檔案**。

> 單一技能也可以直接上傳它的 `SKILL.md`，不一定要打包成 zip。
> zip 的好處是之後技能加了 `scripts/` 可以一起帶上去。

**建議上傳順序**（不要一次全上）：

1. `adam-brand-context` ← **一定要先傳這個**，其他社群技能都會引用它
2. `reels-script-writer`、`content-calendar`、`caption-writer`
3. `daily-reels-ops` ← Spark 唯一不可取代的能力，優先驗證
4. 其他社群技能
5. 保險相關的**最後**，而且第一次用假資料測

### 步驟 3：設一個排程試試看

在 Spark 裡用口語講就好，不用寫程式：

> 「每個平日早上 8 點，用 daily-reels-ops 技能提醒我今天要發哪一支，腳本沒寫好就順便寫。」

這是 Spark 跟 Claude Code 最大的差別 —— **它會自己動**。

---

## ⚠️ 三件搬過去會變差的事

| 事情 | 狀況 |
| --- | --- |
| **理賠申請書產 PDF** | ❌ **做不到。** Spark 沒有空白表單也沒有填表引擎，只能給逐欄對照表讓你自己抄。要真的產出 PDF 回本機那套 |
| **自動發文** | ❌ 做不到。Spark 沒有 IG／Threads 發文連接器 |
| **品牌視覺生圖** | ⚠️ 不建議。Gemini 內建生圖套不上你那兩套模板，硬用會傷辨識度 |

細節與四件 **Spark 反而做得更好** 的事，見 `03-技能樹地圖.md`。

---

## 🔴 上傳前務必知道的隱私事項

- Spark 是**雲端代理**，而且會連你的 Gmail 與雲端硬碟。
- 這包裡的技能檔案**本身不含任何客戶個資**（只有規則），上傳沒有風險。
- 有風險的是**之後你丟進去的案件資料**。保險文書相關技能都加了明確的隱私提醒與
  「第一次先問要不要用真實個資」的關卡。
- 原本的文件歸檔用 **Windows 離線 OCR**，資料不出本機；Spark 版會讓客戶文件進 Google 雲端。
  **這是實質的取捨，不要因為方便就預設接受。**

---

## 之後要改技能怎麼辦

技能會有兩份（本機 `.claude/skills/` 與 Spark 上），**它們不會自動同步**。

建議：**規則的真相來源仍然是這個 repo。**
改規則先改 `.claude/skills/`，再跑 `build-zips.sh` 重新上傳到 Spark，
並把重要決定寫進 `SHARED_MEMORY.md`。

---

## 參考來源

- [Create & manage skills for Gemini Apps — Gemini Apps Help](https://support.google.com/gemini/answer/17094296)
- [隆重介紹 Gemini Spark：你全天候的個人 AI 代理 — Google Blog](https://blog.google/intl/zh-tw/products/devices-services/gemini-spark-ai/)
- [Gemini Spark 開放台灣 AI Pro 訂閱者 — INSIDE](https://www.inside.com.tw/article/41962-gemini-spark-taiwan-ai-pro-prompt-examples)
- [Google個人AI代理「Gemini Spark」登台 — 數位時代](https://www.bnext.com.tw/article/91668/gemini-spark-taiwan-launch-guide--google-gemini-spark-ai-agent-tutorial)
