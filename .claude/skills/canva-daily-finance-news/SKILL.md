---
name: canva-daily-finance-news
description: Use when running or configuring Adam's recurring daily finance morning-news workflow for Taiwan, including web research, TOP 10 selection, Canva design DAGzYSfoIDY, direct saving, or source-link delivery.
---

# Canva Daily Finance News

## Overview

Produce one evidence-backed Taiwan-focused finance batch, use the same ordered Traditional-Chinese headlines in Canva and the link report, and never claim a Canva save without committed readback.

**REQUIRED SUB-SKILLS:** Use `agent-reach` for internet research and `canva:canva-edit-design` for the Canva transaction.

## Research contract

1. Read the active workspace `AGENTS.md` and any project-local daily-finance rules first.
2. At 09:00 Asia/Taipei, search the preceding 24 hours. If fewer than 10 credible distinct stories qualify, extend to 48 hours and disclose each publication time.
3. Open every selected source. Verify that the page supports the event, publication time, publisher, and a direct working URL. Prefer official regulators, exchanges, MOPS, central banks, government statistics, and company releases; then reputable Taiwanese finance media and authoritative international outlets.
4. Deduplicate the same event across publishers. Keep the most complete, primary, and recent source.
5. Rank by: direct Taiwan impact, financial-market impact, cross-source prominence, then recency. Cover major Taiwan investor or household concerns without filling the list with near-duplicate company or sector stories.
6. Select at most 10 stories. Include at least one materially finance-related AI, semiconductor, AI-investment, or AI-industry story. Never use weakly related, stale, duplicate, or invented content to reach 10.
7. Create faithful, concise Traditional-Chinese headlines for Taiwan readers. Do not add unsupported numbers, conclusions, forecasts, or investment advice.

## Canva contract

- Design ID: `DAGzYSfoIDY`. Use only the internal Canva connector; never switch to Chrome or Computer Use for this workflow.
- Start a fresh transaction and inspect the current pages and `NEW` elements. Replace only the date/year and news text. Preserve layout, animation, music, fixed text, and every current `NEW` element.
- Canva receives only the final headlines, in ranked order—no publisher, time, or URL. If fewer than 10 qualify, clear unused old-news text while keeping unused `NEW` elements.
- The user has granted standing direct-save authorization for this scheduled batch. Inspect the draft, then commit without asking again.
- Read back committed content with `content_types:["richtexts"]`. Verify the date/year, each headline exactly once and in order, no URLs, and no old date/news. Use the transaction response—not historical memory—for current animation/fill evidence.

## Delivery contract

Post to the same conversation after every run:

```text
今日財經 TOP 10（YYYY/MM/DD）
涵蓋期間：...

1. 精簡繁中標題 [AI，如適用]
來源：媒體｜發布：YYYY/MM/DD HH:mm
連結：https://原始文章

Canva 狀態：已提交並讀回驗證／Canva 未儲存：原因
降級狀態：無／僅取得 N 則可信新聞
```

The report headline text and order must exactly match Canva. A Canva failure must not suppress the verified link report.

## Stop conditions and common mistakes

| Condition | Required action |
|---|---|
| Fewer than 10 credible items after 48 hours | Deliver only verified items and label the degraded count. |
| `UNAUTHORIZED`, `oauth_token_invalid_grant`, or repeated accepted-authentication prompt | Stop retries, report `Settings → Apps/Plugins → Canva → Reconnect` (or Disconnect → Connect), and do not claim a save. |
| Transaction expired | Start a new transaction and replay the already approved batch. |
| Commit or readback failed | Report `Canva 未儲存` or `無法確認儲存`; never infer success. |
| Search result, aggregator, short link, tracking redirect, or unsupported headline | Replace it with a verified direct source or exclude it. |

Do not ask for daily save confirmation, delete fixed animations, reuse stale transaction IDs, expose URLs in Canva, or fabricate an item to satisfy the quota.
