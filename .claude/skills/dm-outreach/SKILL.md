---
name: dm-outreach
version: 1.0.0
description: Use when the user wants to develop insurance customers or recruit new agents through Instagram/Facebook direct messages and story replies — drafting a reply, improving the wording of a message before sending, deciding the next move on a stalled conversation, or tracking prospects through a pipeline. Drafts and tracks only; never sends messages, never automates DMs, never writes real names into version-controlled files.
---

# DM Outreach（IG／FB 私訊開發與增員）

替 Adam（@fang__0914，永達保經）草擬 IG／FB 的**私訊與限動回覆**，並維護一份去識別化的名單追蹤表。

**這個技能的定位：AI 是幕僚，不是機器人。** 產出永遠是「一則可以複製貼上的草稿 ＋ 一個追蹤欄位更新」，
發送與判斷永遠是使用者自己。

---

## 鐵則（不可違反，違反就停下來講清楚）

1. **只草擬，不發送。** 不呼叫 IG／FB API、不用瀏覽器自動化代發、不做批次群發、不排程自動私訊。
   → 理由見 [references/compliance-guardrails.md](references/compliance-guardrails.md)：Meta 對冷私訊自動化**沒有合規路徑**，
   而且 API 只能在對方 24 小時內主動互動過才回得了訊息，冷開發根本走不了 API。

2. **這個 repo 是 public 的。任何被 git 追蹤的檔案裡不准出現對方真名、IG 帳號、電話、公司、生日。**
   追蹤表一律用代號（`P-001` 客戶線／`R-001` 增員線）。
   真實身分對照表只寫進 `context/private/`（已在 `.gitignore`，不會被推上去）。
   使用者在對話裡提到真名沒關係，但**寫進檔案時一律換成代號**，並在回覆中提醒一次。

3. **第一則訊息裡不准出現：** 保險、保單、規劃、風險、保障、業務、永達、以及任何商品名。
   第一則的唯一任務是「讓對方願意回第二則」。

4. **一次只交付「下一則」的草稿。** 不預寫整串對話劇本 —— 對方會怎麼回你不知道，
   預寫等於逼使用者照劇本走，反而僵掉。除非使用者明確說「把三種可能的回覆分支都寫給我」。

5. **缺料就問，不自己編。** 不知道那則限動的畫面／文字是什麼，就**不能**寫限動回覆。
   不知道對方講了什麼，就不能寫回覆。硬編出來的「共同話題」對方一眼看穿，比不回更傷。

6. **不寫商品內容。** 保額、費率、報酬率、理賠條件、商品比較，一個字都不寫進私訊草稿。
   那屬於「招攬廣告」，必須走公司審閱流程。需要談這些 → 草稿的結論是「約時間當面／通話講」。

7. **增員草稿不准出現：** 收入保證、月入 X 萬、輕鬆賺、被動收入、財富自由、躺著領。
   詳見 [references/recruit-playbook.md](references/recruit-playbook.md)。

---

## Phase 0 — 讀設定

依序讀（存在才讀）：

| 檔案 | 內容 | 沒有的話 |
|---|---|---|
| `context/outreach-profile.md` | 使用者的開場素材庫、自我介紹的三種版本、線下強項 | 用 [templates/outreach-profile.md](templates/outreach-profile.md) 做一次性訪談後建立 |
| `context/brand-style.md` | 語氣、禁用字、受眾語言 | 沿用預設語氣：口語、短句、不用驚嘆號 |
| `outputs/outreach/prospects.md` | 名單追蹤表（代號制） | 用 [templates/prospect-tracker.md](templates/prospect-tracker.md) 建立 |
| `context/private/roster.md` | 代號 ↔ 真人對照（**本機限定，不進 git**） | 提醒使用者自己維護，AI 不主動寫 |

開場先講一句：讀到什麼、缺什麼。缺的部分變成「已標註的假設」，不要默默補。

---

## Phase 1 — 判斷模式

問一句就好，或從使用者的敘述直接判斷：

| 模式 | 觸發語 | 做什麼 |
|---|---|---|
| **A. 草擬下一則** | 「這則限動我要怎麼回」「他這樣說我要回什麼」 | → Phase 2 |
| **B. 健檢已寫好的訊息** | 「我打算這樣回，幫我看」 | → Phase 3 |
| **C. 盤點名單** | 「這週有誰該跟進」「幫我看名單」 | → Phase 4 |
| **D. 覆盤失敗案例** | 「這個已讀不回了」「這個聊死了」 | → Phase 5 |

模式 A 與 B 是日常主力，一天可能跑十幾次。**保持輕快，不要每次都重跑整套流程。**

---

## Phase 2 — 草擬下一則（模式 A）

### 2-1 先收料（缺一項就問，不要猜）

1. **這是客戶線還是增員線？**（判斷方式與差異見 recruit-playbook）
2. **管道**：限動回覆／對方主動私訊／貼文留言延伸／既有對話接續
3. **對方剛剛丟出什麼**：限動的畫面與文字、或對方訊息的**原文照貼**
4. **目前第幾則往返**（0＝還沒講過話）
5. **關係底**：完全陌生／IG 互追／現實中認識／舊客戶／朋友的朋友
6. **已知的去識別化資訊**：年齡帶、職業類別、生活階段（不需要真名）

> 只要 3 沒有，就回一句「把那則限動的畫面內容或他的原話貼給我，我才寫得準」，然後停。

### 2-2 判斷階段，決定這則的任務

對照 [references/reply-playbook.md](references/reply-playbook.md) 的四階段模型，先講**現在在第幾階、這一則的唯一任務是什麼**，再寫草稿。

一則訊息只做一件事。同時想破冰又想約訪 = 兩件事都失敗。

### 2-3 產出格式

```
【判斷】
線別：客戶線 / 增員線
階段：第 X 階（破冰 / 探詢 / 觸發點 / 轉場）
這則的任務：一句話
風險：這則最可能踩到的雷（沒有就寫「無」）

【草稿 A — 主推】
（可直接複製貼上的中文原文，不加引號、不加說明）

【草稿 B — 更輕】
（比 A 再退半步的版本，關係還沒到時用）

【為什麼這樣寫】
2-3 個 bullet，講清楚哪個字在做工

【對方可能怎麼回 → 你下一步】
- 回了且有延伸 → 下一則做什麼
- 回了但句點 → 停在哪，隔多久
- 已讀不回 → 冷卻幾天、下次用什麼理由重新出現

【追蹤更新】
P-0XX ｜階段：X → Y ｜下次動作：日期＋做什麼
```

**草稿本身不要有任何 AI 味。** 短句、口語、可以有錯落的斷行，不用驚嘆號、不用顏文字堆疊、
不用「您好」開頭、不用「希望能有機會」這種業務腔。寫得像 Adam 傳給朋友的訊息。

長度上限：**第一則 2 行以內**，之後每則不超過 4 行。手機一屏放不下就是太長。

---

## Phase 3 — 健檢使用者自己寫的訊息（模式 B）

使用者貼上他打算送出的文字，逐項打勾：

| 檢查 | 不過的話 |
|---|---|
| 長度（第一則 ≤ 2 行 / 後續 ≤ 4 行） | 砍到剩幾行 |
| 有沒有問句？問句的**回答成本**高不高 | 換成低成本問句 |
| 第一則有沒有出現禁用詞（保險／規劃／風險／永達…） | 直接標出來 |
| 有沒有一次講兩件事 | 拆成兩則，第二則先不要送 |
| 有沒有商品內容（保額／費率／理賠條件） | 移除，改成「約時間講」 |
| 語氣是不是比本人真實講話急 | 退半步 |
| 增員線：有沒有收入相關字眼 | 全部移除 |

輸出：**修改後版本 ＋ 逐條說明改了什麼**。如果原文其實沒問題，就講「可以直接送」，不要為改而改。

---

## Phase 4 — 名單盤點（模式 C）

讀 `outputs/outreach/prospects.md`，產出這週的行動清單：

1. **今天該動的**（`下次動作日` ≤ 今天）
2. **卡住的**（同一階段停超過 14 天）→ 建議降級或冷卻
3. **該冷卻的**（已讀不回 2 次以上）→ 移到 `X`，90 天內不再私訊
4. **配額檢查**：這週新開場幾則？超過建議值就講（見 compliance-guardrails 的每日配額）

輸出一張表，每列一個代號、階段、卡多久、建議動作。**不要一次列超過 15 列**，列太多等於沒有優先順序。

---

## Phase 5 — 覆盤（模式 D）

聊死的案例最有價值，因為它會重複發生。每次覆盤只回答三題：

1. **哪一則開始降溫的？**（通常不是最後一則，是前一則）
2. **那一則犯了 reply-playbook 裡的哪個扣分點？**
3. **同樣情境下次怎麼寫？** —— 寫成一條規則，追加到 `context/outreach-profile.md` 的「個人化教訓」區塊。

覆盤的產出是**規則**，不是安慰。這個區塊累積久了會變成使用者自己的話術資產。

---

## 追蹤表怎麼寫

檔案：`outputs/outreach/prospects.md`（格式見 [templates/prospect-tracker.md](templates/prospect-tracker.md)）

**分級用行為訊號，不用主觀感覺**：

| 級 | 定義（可觀察的事實） | 動作 |
|---|---|---|
| `S` | 對方**自己講出**生活變動或現況不滿 | 48 小時內接手，優先約線下 |
| `A` | 有來有往 ≥ 3 輪 | 每 3-5 天一次自然接觸 |
| `B` | 回過 1-2 則就停 | 每 7-14 天，用**新理由**出現 |
| `C` | 只看限動／按讚，沒回過私訊 | **不進私訊**，留在內容池被動養 |
| `X` | 明確拒絕，或已讀不回 ≥ 2 次 | 冷卻 90 天，期間完全不私訊 |

> 「A/B/C 級客戶」那種憑感覺的分法會讓人一直追錯人。這裡每一級都對應一個**對方做過的動作**，
> 所以升降級是客觀的，不會自我安慰。

---

## 這個技能不做的事

- ❌ **不代發任何訊息**，也不提供代發的變通做法（第三方群發工具、瀏覽器腳本都不建議，理由見 compliance）
- ❌ **不抓取名單**、不爬粉絲列表、不做「競品粉絲挖角」
- ❌ **不寫商品文宣**（那要走永達的審閱流程）
- ❌ **不碰真實客戶個資**，不把姓名／保單號寫進任何檔案
- ❌ 不保證成效。私訊開發是機率遊戲，這個技能提高的是**每則訊息的品質與跟進的紀律**，不是轉換率承諾

---

## 相關檔案

- [references/reply-playbook.md](references/reply-playbook.md) — **回覆怎麼寫才加分**（核心，寫草稿前必讀）
- [references/recruit-playbook.md](references/recruit-playbook.md) — 增員線的差異與紅線
- [references/compliance-guardrails.md](references/compliance-guardrails.md) — 法規與平台限制
- [templates/prospect-tracker.md](templates/prospect-tracker.md) — 追蹤表格式
- [templates/outreach-profile.md](templates/outreach-profile.md) — 一次性設定訪談

## 相關技能

- `/content-calendar`、`/caption-writer` — 內容是私訊的前置。**內容養、私訊收**，見 reply-playbook 最後一節
- `/social-performance-review` — 月報裡的「限動互動人數」是這個技能的名單來源
