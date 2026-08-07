# 專案技能包（Project Skills）

這個資料夾裡的每個子資料夾都是一個 **Claude Code Skill**。
只要 Claude Code（本機或雲端）在這個 repo 底下工作，就會自動載入這些技能，
可以用 `/技能名稱` 直接呼叫，或直接描述需求讓 Claude 自動判斷要不要用。

## 來源

這個資料夾裡有三批技能，來源不同，更新方式也不同：

| 批次 | 技能 | 來源 |
| --- | --- | --- |
| 社群流程包（10 個） | `/social-media-manager` 等 | 上游 `stevenflanagan1/social-ai-team` |
| 保險（2 個） | `/insurance-drive-filing`、`/insurance-claim-form-automation` | 上游 `RameZedfate/insurance-drive-filing-skill`（Codex 寫的） |
| **自製（1 個）** | **`/dm-outreach`** | **本 repo 原創，無上游，更新直接改這裡** |

### 社群流程包（上游）

- 上游：https://github.com/stevenflanagan1/social-ai-team
- 取得版本：commit `3d140a1`（2026-05-08）
- 授權／內容：純 Markdown 指令檔，不含程式碼、不含網路呼叫

### 之後想更新到上游最新版

```bash
git clone --depth 1 https://github.com/stevenflanagan1/social-ai-team.git /tmp/sat
cp -r /tmp/sat/skills/. .claude/skills/
git add .claude/skills && git commit -m "更新 social-ai-team 技能包" && git push
```

> ⚠️ 更新前記得先看一下 diff，避免上游改動蓋掉你自己的客製內容。

## 技能清單

| 技能 | 角色 | 現在可用？ |
| --- | --- | --- |
| `/social-media-manager` | 總指揮，串起下面所有流程 | ✅ |
| `/brand-onboarding` | 品牌調性訪談 → 寫出 `context/brand-style.md` | ⚠️ 網站/IG 自動擷取需 Playwright MCP，可改用手動問答 |
| `/content-calendar` | 排一個月的貼文選題 → `context/content-calendar.md` | ✅ |
| `/caption-writer` | IG / FB 貼文文案 | ✅（趨勢研究需 Firecrawl / SerpApi MCP，可略） |
| `/linkedin-writer` | LinkedIn 貼文 | ✅ |
| `/threads-writer` | Threads 貼文（限 500 字） | ✅ |
| `/x-writer` | X / Twitter 貼文（限 280 字） | ✅ |
| `/social-creative-designer` | 生成品牌視覺圖 | ❌ 需 Nano Banana MCP |
| `/publisher` | 排程發文 | ❌ 需 Blotato MCP |
| `/social-performance-review` | 月報成效分析 | ✅（貼上 CSV 或截圖數據即可） |
| **`/dm-outreach`** | **IG／FB 私訊與限動回覆草擬 ＋ 名單追蹤（開發客戶／增員）** | ✅ **純草擬，不代發** |

## 工作流程（建議順序）

```
/brand-onboarding      ← 只做一次，先讓 AI 認識 fang__0914 的調性
        ↓  產出 context/brand-style.md
/content-calendar      ← 每月一次，排出這個月要發什麼
        ↓  產出 context/content-calendar.md
/caption-writer        ← 每篇貼文的文案
/threads-writer        ← 同一主題改寫成 Threads
        ↓
/social-performance-review  ← 月底檢討，回饋到下個月選題
```

### 開發／增員流程（`/dm-outreach`，與上面那條並行）

```
（一次性）  /dm-outreach → 訪談建立 context/outreach-profile.md
                ↓
每天       「這則限動我要怎麼回」 → 草稿 + 追蹤欄位更新
           「我打算這樣回，幫我看」 → 逐條健檢
                ↓
每週       「幫我看名單」 → 到期跟進清單 + 該冷卻的
                ↓
聊死時     「這個已讀不回了」 → 覆盤，產出一條規則寫回 outreach-profile.md
```

⚠️ 三個前提，用之前一定要知道：
1. **AI 只草擬，不代發。** IG 冷私訊沒有合規的 API 路徑，自動群發是封號風險最高的行為。
2. **repo 是 public，追蹤表一律用代號。** 真名對照表放 `context/private/`（已 gitignore）。
3. **私訊只聊人，不聊商品。** 保額／費率／理賠條件屬招攬廣告，要走公司審閱。

## 與 `.claude/agents/` 子代理的關係

| 需求 | 用哪個 |
| --- | --- |
| IG／社群貼文的完整月度流程 | **這裡的 skills**（流程完整、有產出檔案格式） |
| IG／FB 私訊、限動回覆、名單追蹤 | **`/dm-outreach`** |
| 短影音逐字稿、口播腳本 | `@script-writer` 子代理 |
| 保險理賠申請書文字草擬 | 直接跟創意總監說（skills 不涵蓋） |
| 招募夥伴 SOP 整理 | 部分由 `/dm-outreach` 的增員手冊涵蓋，完整訓練 SOP 仍由創意總監處理 |

兩者不衝突：skills 偏「有固定產出格式的流程」，subagents 偏「單點任務委派」。
