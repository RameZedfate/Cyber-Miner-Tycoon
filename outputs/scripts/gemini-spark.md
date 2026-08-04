# Gemini Spark — 「它有自己的電腦，你睡覺它在做事」

**支柱：** 痛點實測 ＋ 踩坑紀錄（結尾誠實說台灣用不到）
**長度：** 45 秒（另附 20 秒精簡版）
**形式：** Reels 9:16，**本人照當主持人**＋ AI 生成畫面卡 ＋ 自己口白
**這支要讓觀眾記住的一件事：** Spark 跟一般 AI 的差別不是比較聰明，是**你不在的時候它還在做事**。

---

## ⚠️ 事實查核（講之前先確認，講錯比不講傷）

依 2026-08-04 查到的公開資料：

| 事實 | 內容 |
|---|---|
| 發表時間 | Google I/O 2026（2026-05-19） |
| 是什麼 | agentic 個人助理，Gemini 基礎模型 ＋ Google Antigravity 的 agentic harness |
| 核心差異 | 跑在 Google Cloud **專屬虛擬機**上，24/7 運作，**手機鎖著也繼續做事** |
| 官方舉的例子 | 翻信用卡帳單找出忘記取消的訂閱費／監控小孩學校信件變成每日摘要 |
| Gmail | Spark 有**自己的 Gmail 地址**，你可以直接寄信給它派工 |
| Chrome（2026-07 更新） | 經你授權後，可用你**已登入的帳號與已存密碼**辦事：預約看房、查機票並啟動訂票流程 |
| 可用範圍 | **僅美國**，且只在 **Google AI Ultra（月費 US$100）** 方案 beta |

> ❗ 最後一列是這支影片的誠實點，**不要省掉**。省掉就變成在推銷一個觀眾根本點不到的東西。

---

## 逐字稿（45 秒版）

> 🎙️ 用平常講話的語氣念，不要念稿。可以有停頓，不用完美。
> 前 4 秒不出現「Gemini」「Spark」「AI」任何一個字。

| 時間 | 口白 | 畫面 | 字卡 |
|---|---|---|---|
| **0-4s** | 「我有三筆訂閱，扣了我一年多，我才發現。」 | **卡 1｜本人照**（深藍底，模板 B） | **扣了一年多才發現**<br>（「一年多」用黃 `#FFC72C`）|
| **4-8s** | 「不是我笨。是沒有人會每個月去翻信用卡帳單。」 | 卡 2｜帳單上一整排小額扣款 | — |
| **8-14s** | 「Google 五月發表了一個東西，就是專門在做這件事的——叫 Spark。」 | 卡 3｜Spark 概念視覺 | **Gemini Spark** |
| **14-23s** | 「它跟你平常用的 AI 差在哪？你問一句它答一句，那個叫聊天。Spark 有自己的一台電腦，跑在 Google 的雲端上。」 | 卡 4｜雲端機房，一台機器亮著 | **它有自己的電腦** |
| **23-30s** | 「你手機關掉、鎖起來、去睡覺，它還在做事。」 | 卡 5｜鎖屏手機，旁邊運算持續跑 | **你睡覺，它在做事** |
| **30-36s** | 「所以你可以叫它每個月翻一次帳單，把你忘記取消的訂閱抓出來，寄給你。」 | 卡 6｜清單被逐條圈起來 | — |
| **36-41s** | 「它甚至有自己的 Gmail 信箱。你寄信給它，它就去辦。」 | 卡 7｜信箱介面 | **寄信給它，它就去辦** |
| **41-45s** | 「但講結論——台灣還用不到。只有美國、月費一百美金的方案才有。我等它開放。」 | 卡 8｜誠實收尾 ＋ Day X／100 | **台灣還用不到**<br>**Day X／100** |

---

## 逐字稿（20 秒精簡版）

限動、Threads、或當第二支測不同鉤子用。

| 時間 | 口白 | 畫面 |
|---|---|---|
| **0-4s** | 「我有三筆訂閱，扣了一年多才發現。」 | 卡 1（本人照） |
| **4-11s** | 「Google 新出的 Spark，有自己的一台電腦。你手機鎖著，它還在幫你翻帳單。」 | 卡 4 → 卡 5 |
| **11-16s** | 「你寄一封信給它，它就去辦。」 | 卡 7 |
| **16-20s** | 「台灣還用不到。等它開放我第一個試。Day X／100。」 | 卡 8 |

---

## 8 張畫面卡 — 生成用 prompt

> 全部 **9:16**，模型 `nano_banana_pro`（中文字渲染最準）。
> 卡 1 與卡 8 要帶**本人照**當參考圖，其餘為純生成。
> 底色一律 `#0E2A47` 深藍、白字 `#FFFFFF`；**黃 `#FFC72C` 整支只准出現在卡 1 的「一年多」**。

| # | 用途 | prompt 重點 |
|---|---|---|
| 1 | 主持人開場 | 本人照去背置於右下，深藍底＋科技線條，左上超大白字「扣了一年多才發現」，「一年多」黃色 |
| 2 | 帳單 | 深藍底，一張信用卡帳單特寫，一整排小額訂閱扣款，無品牌名、無真實數字 |
| 3 | Spark 概念 | 深藍底，一顆發光的藍白色能量核心，四周細線向外連結，極簡，中央白字「Gemini Spark」 |
| 4 | 專屬主機 | 深藍底，資料中心機櫃陣列，其中**一台**亮著白光，其餘暗，白字「它有自己的電腦」 |
| 5 | 手機鎖著 | 深藍底，一支鎖屏手機平放，畫面暗，旁邊細光線持續流動，白字「你睡覺，它在做事」 |
| 6 | 抓訂閱 | 深藍底，一份清單，其中三行被白色圓圈標出來，其餘淡化 |
| 7 | Gmail 派工 | 深藍底，極簡信封圖示飛向能量核心，白字「寄信給它，它就去辦」 |
| 8 | 誠實收尾 | 本人照去背置中偏下，深藍底，上方白字「台灣還用不到」，左上角小字「Day X／100」 |

**動態化：** 卡 1、4、5、8 用 `kling3_0_turbo` 各做 5 秒輕動態（緩推鏡／光線流動／粒子），
其餘 4 張維持靜態，剪輯時用 0.3 秒硬切。理由：**每張都動 = 沒有重點，而且多花 30 credits。**

---

## 成本與產出方式

**這支不花 credits。** 字卡與影片都用 repo 內建的免費管線做：

```bash
python3 tools/reels-cards/render.py outputs/cards/gemini-spark/cards.json \
        -o outputs/cards/gemini-spark          # 8 張 1080x1920 PNG，約 20 秒
python3 tools/reels-cards/stitch.py outputs/cards/gemini-spark/cards.json \
        -o outputs/cards/gemini-spark/gemini-spark-45s.mp4   # 45 秒 MP4，約 80 秒
```

產出：`outputs/cards/gemini-spark/`（`card-01..08.png` ＋ `gemini-spark-45s.mp4`）

> 為什麼不用 AI 生圖／生片：每天發一支的話，AI 生圖字卡 ＋ AI 動態要 **1380 credits／月**，
> 超過 Plus 方案的 1000；AI 說話頭（`seedance_2_0`）更是 **16,200 credits／月**。
> 完整比較見 `context/video-format-photo-explainer.md`。

## 剪輯註記

- **0-4 秒不要有片頭、logo、問候。** 也不要出現 Gemini／Spark 字樣，鉤子只講訂閱那件事
- 工具名第一次出現在 **第 8 秒**（卡 3），符合品牌規則
- 字卡一次最多 12 個中文字，粗體置中偏上，下方 20% 留給 IG UI
- 強調色黃 `#FFC72C` **整支只出現一次**（卡 1 的「一年多」）
- 背景音樂壓到口白的 20%，不要有人聲
- 結尾定格 1.5 秒

---

## IG 貼文文案

```
我有三筆訂閱，扣了我一年多才發現。

不是我笨，是沒有人會每個月去翻信用卡帳單。

Google 五月發表的 Gemini Spark 在做的就是這件事——
它不是你問一句它答一句，
它有自己的一台電腦，跑在 Google 雲端上。

你手機鎖起來去睡覺，它還在做事。
甚至有自己的 Gmail 信箱，你寄信給它，它就去辦。

但講結論：台灣還用不到。
只有美國、月費 100 美金的 Ultra 方案才有 beta。

等它開放我第一個試。

Day X／100
```

**Hashtag：** `#AI工具` `#Gemini` `#GeminiSpark` `#AI挑戰100天` `#訂閱制`

---

## 資料來源

- [Google introduces Gemini Spark, a 24/7 agentic assistant with Gmail integration, at IO 2026 — TechCrunch](https://techcrunch.com/2026/05/19/google-introduces-gemini-spark-a-24-7-agentic-assistant-with-gmail-integration/)
- [Gemini Spark: new Chrome browsing integration — Google Blog](https://blog.google/innovation-and-ai/products/gemini-app/gemini-spark-updates-july-2026/)
- [The Gemini app becomes more agentic, delivering proactive, 24/7 help — Google Blog](https://blog.google/innovation-and-ai/products/gemini-app/next-evolution-gemini-app/)
- [Inside Google I/O 2026: Gemini Spark and the Rise of Autonomous AI Agents — CTO Magazine](https://ctomagazine.com/google-io-2026-ai-agents-gemini-spark/)
