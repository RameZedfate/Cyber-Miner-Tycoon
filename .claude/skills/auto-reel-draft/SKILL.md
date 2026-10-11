---
name: auto-reel-draft
description: Use when Adam requests an editable JianYing Reel from YouTube, Instagram, news, or local reference media, or asks to find licensed stock footage with fallback to his own Drive or project media.
---

# Auto Reel Draft

## Overview

Create a source-traceable editable JianYing draft. Finish only after validation;
never export, publish, or substitute unlicensed or AI-generated media.

**REQUIRED SUB-SKILLS:** Use `agent-reach` for public web/YouTube/news analysis,
`assetseeker` for licensed stock search, and `jianying-editor` for draft creation.

## Fixed Workflow

1. Read the workspace `AGENTS.md`, then run:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\preflight.ps1 -Workspace <workspace> -Json
   ```

   Stop if a required tool or the JianYing drafts root is unavailable. Drive is
   optional until local fallback is required.

2. Create a new project with `prepare_job.py`. Never reuse a non-empty project
   or overwrite original media.

3. Analyze the reference into `SOURCE_ANALYSIS.md`, `SHOTLIST.md`, and
   `DESIGN.md`. For YouTube, call `run_ytdlp.ps1` for metadata/subtitles. For
   Instagram, use an existing user-controlled browser session. A reference
   supplies structure and style—not reusable media or scripts without rights.

4. Search external assets first with AssetSeeker. Accept only candidates with a
   source page and commercial-use license. If none fit, inspect project
   `assets/`, the Drive inbox, then Adam-supplied paths. Keep Drive read-only.
   Never use Higgsfield.

5. Write `asset-selection.json`, then run `acquire_assets.py`. This copies only
   selected Adam-owned files or downloads approved external files and writes
   `ASSET_MANIFEST.csv` with provenance and SHA-256. Run
   `validate_manifest.py`; stop on any error.

6. Fill `draft-plan.json` using microseconds. Keep source videos muted; put BGM
   and narration on audio tracks and captions on editable text tracks. Read
   [references/contracts.md](references/contracts.md) for exact fields.

7. Run `build_draft.py`, then `validate_draft.py`. Do not use an overwrite flag.
   If the name exists or `.locked` is present, stop and preserve the old draft.

8. Report completion only when `DRAFT_VALIDATION.json` has `ok: true`. Return
   the draft name/path, duration, video/audio/text counts, source summary, and
   remaining warnings. Do not open JianYing or export MP4 unless Adam asks.

## Source Routing

| Input | Primary route | Boundary |
|---|---|---|
| YouTube | `run_ytdlp.ps1` | Do not download reference media without rights |
| Instagram | Existing browser session | Never request credentials or codes |
| News/web | Agent Reach or browser | Record the source URL |
| Stock media | AssetSeeker | Require page and license |
| Adam media | Project, then Drive | Copy selected files only |

## Example

Adam:「用這個 YouTube 新聞做 30 秒 Reel，符合授權的素材直接下載，缺的用我的影片補，建立可編輯剪映草稿。」

Run the fixed workflow end to end. Ask only if the reference is inaccessible or
required shots remain missing after both external and Adam-owned searches.

## Common Mistakes

- Treating the reference video as licensed source media.
- Claiming Agent Reach or a stock source works without current preflight output.
- Saving a URL without the source page/license in `ASSET_MANIFEST.csv`.
- Falling back to Higgsfield instead of Adam-owned media.
- Reporting success from `project.save()` without saved-draft validation.
- Replacing an existing or locked draft.
