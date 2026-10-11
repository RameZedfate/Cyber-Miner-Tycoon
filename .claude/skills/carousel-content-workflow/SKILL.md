---
name: carousel-content-workflow
description: Use when creating, validating, delivering, or explicitly publishing Adam's Traditional-Chinese Instagram carousel, including topic-queue selection, source checks, 5-8 page copy, visual consistency, and verified Drive delivery.
---

# Carousel Content Workflow

Use this skill for Adam's IG carousel planning, copy, image set, or daily draft workflow.

## Fixed workflow

1. Read workspace rules and `TOPIC_QUEUE.md` when present. Use Asia/Taipei dates.
2. Make at most one new topic per calendar day. Resume an incomplete same-day draft instead of starting another.
3. Prefer the first due `pending` queue item. Mark it `used` only after the draft and required output are verified.
4. If the user did not provide a topic, choose one clear angle under growth, AI, or travel. Check recent output to avoid repeating the same topic or cover angle.
5. Verify every time-sensitive or factual claim from direct sources. Never invent Adam's personal experience, results, numbers, quotations, or endorsements.
6. Write 5–8 consecutive pages in Traditional Chinese: cover, one idea per content page, then closing. Use one CTA only. The Instagram caption must be 150–300 Chinese characters and add context instead of repeating the pages.
7. Keep the content artifact in this order: YAML metadata, `# Carousel`, numbered pages with role/headline/body, `## Instagram Caption`, `## CTA`, and `## Sources`.
8. If generating images, choose one visual system for the full set, keep 1:1 dimensions and safe margins, and verify every Traditional-Chinese character against the approved copy. Do not imitate another account, logo, watermark, or identifiable person.
9. Do not publish automatically. Publish only when the user's current request explicitly asks for it, the intended account and connector are confirmed, and the repository's publishing skill can submit and read back the result. Otherwise stop at a verified draft. Drive delivery is allowed only through the configured destination after local count, filename, size, and SHA-256 verification.

## Completion gate

Report the content path, pillar, structure, page count, source status, image status, and Drive verification status. Do not call the batch complete when any required page is missing, text differs from the approved copy, or external delivery lacks readback evidence.
