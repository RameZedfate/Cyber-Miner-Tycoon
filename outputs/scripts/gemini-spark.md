# Gemini Spark — 「它有自己的電腦，你睡覺它在做事」

**支柱：** 痛點實測 ＋ 踩坑紀錄（結尾誠實說台灣用不到）
**長度：** 45 秒（另附 20 秒精簡版）
**形式：** Reels 9:16，**本人照當主持人**＋ 字卡與線條圖形 ＋ 自己口白
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

## 8 張畫面卡

規格定義在 `outputs/cards/gemini-spark/cards.json`，改那份再重跑即可。
底色一律 `#0E2A47` 深藍、白字 `#FFFFFF`；**黃 `#FFC72C` 整支只出現在卡 1 的「一年多」**。

| # | 秒數 | 型別 | 字卡 | 圖形（SVG，非 AI 生成） | 運鏡 |
|---|---|---|---|---|---|
| 1 | 4.0 | `hook` | 扣了一年多／才發現 | 本人照 | push |
| 2 | 4.0 | `statement` | — | `rows` 帳單列表 | left |
| 3 | 6.0 | `statement` | Gemini Spark | `core` 能量核心 | pull |
| 4 | 9.0 | `statement` | 它有／自己的電腦 | `racks` 機櫃，中間一台亮 | push |
| 5 | 7.0 | `statement` | 你睡覺，／它在做事 | `phone-locked` 鎖屏手機＋光流 | push |
| 6 | 6.0 | `statement` | — | `rows-circled` 三行被圈出 | right |
| 7 | 5.0 | `statement` | 寄信給它，／它就去辦 | `envelope-core` 信封飛向核心 | push |
| 8 | 4.0 | `closing` | 台灣還用不到 | 本人照 ＋ Day X／100 | still |

**運鏡不要每張都做同一種**：連續八張都推近會像自動播放的投影片。
`still` 留給結尾，讓觀眾有時間按追蹤。

> 🔴 **卡 1 與卡 8 目前缺本人照**，所以那兩張下半部是空的。
> 補法：把去背 PNG 放進 `outputs/cards/gemini-spark/` 命名 `adam.png`，
> 再把 `cards.json` 裡那兩張的 `_photo` 欄位改成 `photo`，重跑 render.py 即可。

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
