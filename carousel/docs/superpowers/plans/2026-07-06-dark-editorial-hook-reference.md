# Dark Editorial Hook Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save three supplied carousel covers as local references and extend `CODEX.MD` with reusable dark-editorial layout and hook-writing rules.

**Architecture:** Keep source images as immutable reference assets under `references/carousel-visuals/`. Add one self-contained Style entry and four hook formulas to the existing rule document without changing its schema, page-count contract, or unrelated user edits.

**Tech Stack:** Markdown, PNG assets, PowerShell, Git diff checks

---

### Task 1: Preserve the supplied visual references

**Files:**
- Create: `references/carousel-visuals/reference-06-dark-editorial-tool-benefit.png`
- Create: `references/carousel-visuals/reference-07-dark-editorial-authority-hook.png`
- Create: `references/carousel-visuals/reference-08-dark-editorial-number-list.png`

- [ ] **Step 1: Copy each supplied PNG into the reference library**

Use `Copy-Item -LiteralPath` to map the three temporary files, in the order provided, to references 06–08. Do not overwrite references 01–05.

- [ ] **Step 2: Verify reference integrity**

Run `Get-Item` on all six source and destination paths and confirm each destination exists with the same byte length as its source. Open the three destinations with the image viewer to confirm they decode successfully.

### Task 2: Add reusable hook formulas

**Files:**
- Modify: `CODEX.MD`, section `## 6. 爆款鉤子原則`

- [ ] **Step 1: Add the four formulas after the existing trust rules**

Add a subsection named `### 可重複使用的封面開場公式` containing:

- 工具利益型：`低門檻／關鍵特性 + 這個工具能幫你完成的具體任務 + 使用限制或差異點`
- 權威人物型：`具名且可查證的人物 + 明確數量 + 反常識能力／做法 + 對讀者的關聯`
- 數字清單型：`明確讀者或常見錯誤 + 工具／方法數量 + 可量化但可驗證的實際利益`
- 資訊缺口型：`多數人的既有做法 + 尚未取得的能力／結果 + 這篇會補上的知識`

For every formula, state that the inner pages must fulfill the promise and that dates, percentages, product features, quotes, and attributed claims require verification under section 4. Explicitly prohibit copying the reference wording or using unsupported multipliers such as `省下五倍時間`.

- [ ] **Step 2: Add a quality gate**

In section `## 11. 發布前品質檢查`, add one checkbox requiring the cover's person, number, date, product feature, and benefit claims to be traceable to the sources and fully answered by the inner pages.

### Task 3: Add the independent dark-person editorial Style

**Files:**
- Modify: `CODEX.MD`, section `## 13. 視覺參考庫｜供 Image Two 使用`

- [ ] **Step 1: Add Style 6 after Style 5**

Add `### Style 6｜深色人物資訊鉤子風`, list references 06–08, and define these reusable rules:

- Use a full-bleed real-person or work-scene photo with a dark gradient overlay.
- Build a strict hierarchy with a small context label, a 2–4-line white headline, yellow highlighted keywords, one thin divider, one short benefit line, and one restrained swipe cue.
- Keep the person visible but subordinate to headline readability; reserve a clean text-safe region.
- Use a maximum of white, yellow, and one neutral color; do not copy account handles, wording, identity marks, or unsupported claims.
- Attribute a public figure or photo only when identity, context, source, and usage rights are verified.
- Apply to AI tools, public-figure viewpoints, list roundups, product updates, and strong information-gap topics.

- [ ] **Step 2: Extend the style selection table**

Use Style 6 as the preferred style for `權威人物觀點、數字工具清單、強資訊缺口`, with Style 2 as fallback. Keep all existing rows unchanged.

### Task 4: Verify the complete change

**Files:**
- Verify: `CODEX.MD`
- Verify: `references/carousel-visuals/reference-06-dark-editorial-tool-benefit.png`
- Verify: `references/carousel-visuals/reference-07-dark-editorial-authority-hook.png`
- Verify: `references/carousel-visuals/reference-08-dark-editorial-number-list.png`

- [ ] **Step 1: Check the Markdown contract**

Run searches confirming the original YAML fields, `page_count`, `## Instagram Caption`, `## CTA`, and `## Sources` still exist unchanged.

- [ ] **Step 2: Check formatting and scope**

Run `git diff --check -- CODEX.MD references/carousel-visuals`. Expected: no whitespace errors; an LF/CRLF warning is non-blocking. Review `git diff -- CODEX.MD` and confirm unrelated existing edits remain intact.

- [ ] **Step 3: Report without committing user work**

Do not stage or commit `CODEX.MD`, the reference images, or any unrelated dirty-worktree files unless Adam explicitly requests a commit.
