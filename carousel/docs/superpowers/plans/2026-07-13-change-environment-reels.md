# Change Environment Reels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a verified 20–25 second, 9:16 Reels package for「人生卡住時，先換個環境，不一定要換個人生」from one character anchor image through storyboard frames and Higgsfield video generation.

**Architecture:** A single 9:16 character anchor establishes the protagonist, wardrobe, lighting, and cinematic look. Six derived keyframes preserve that anchor while changing only scene and action; each frame receives one Higgsfield motion prompt, then the generated clips are checked as one continuous emotional arc.

**Tech Stack:** Built-in image generation, local PNG inspection, Markdown prompt manifest, Chrome with the authenticated Higgsfield session.

## Global Constraints

- Output is vertical 9:16 and targets 20–25 seconds.
- The protagonist is an original adult Asian male with short dark hair, a light gray-beige jacket, and dark trousers; he is not presented as Adam's literal likeness.
- No logos, watermarks, recognizable trademarks, or generated text inside source images.
- The emotional and color arc moves from dim, confined, and low-saturation to open, naturally bright, and calm.
- Add Traditional Chinese subtitles during video assembly, not during image generation.
- Keep all project-bound assets under `output/2026-07-13-人生卡住時先換個環境-Reels/`.

---

### Task 1: Prepare and Generate the Character Anchor

**Files:**
- Create: `output/2026-07-13-人生卡住時先換個環境-Reels/hero-anchor.png`
- Create: `output/2026-07-13-人生卡住時先換個環境-Reels/prompt-manifest.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-07-13-change-environment-reels-design.md`
- Produces: one approved identity/style anchor used by every storyboard frame

- [x] **Step 1: Create the output directory without changing existing files**

Run: `New-Item -ItemType Directory -Path 'output/2026-07-13-人生卡住時先換個環境-Reels' -Force`

Expected: the directory exists and contains no previous Reels artifact.

- [x] **Step 2: Generate the anchor image**

Use the built-in image generator with a photorealistic-natural prompt: a full-body original adult Asian man, short dark hair, light gray-beige jacket and dark trousers, seated at a desk in a dim modest room, shoulders slightly lowered, a narrow warm light from a distant doorway, cinematic lifestyle editorial photography, 9:16, realistic skin and fabric, enough negative space above and below for later captions, no text, logo, watermark, trademark, or extra people.

Expected: one vertical image with a clearly visible face, natural hands, readable silhouette, and an obvious path from the desk toward the doorway.

- [x] **Step 3: Save and inspect the anchor**

Copy the selected built-in output to `hero-anchor.png`, open it at original detail, and reject it if the face, hands, wardrobe, room geometry, or caption safety areas are malformed.

Expected: the inspected image passes all listed visual checks.

### Task 2: Produce Six Storyboard Keyframes

**Files:**
- Create: `output/2026-07-13-人生卡住時先換個環境-Reels/frame-01.png`
- Create: `output/2026-07-13-人生卡住時先換個環境-Reels/frame-02.png`
- Create: `output/2026-07-13-人生卡住時先換個環境-Reels/frame-03.png`
- Create: `output/2026-07-13-人生卡住時先換個環境-Reels/frame-04.png`
- Create: `output/2026-07-13-人生卡住時先換個環境-Reels/frame-05.png`
- Create: `output/2026-07-13-人生卡住時先換個環境-Reels/frame-06.png`

**Interfaces:**
- Consumes: `hero-anchor.png`
- Produces: six identity-consistent image-to-video inputs

- [x] **Step 1: Derive frames 1–3 from the anchor**

Use the anchor as the identity/style reference. Preserve face, hair, body proportions, outfit, and cinematic grade while changing only the action: seated and still; looking toward the warm doorway; walking toward the doorway from behind.

Expected: the same character and room remain recognizable across all three frames.

- [x] **Step 2: Derive frames 4–6 from the anchor**

Preserve the same person and outfit while changing the setting and action: stepping into a broad city street; breathing calmly on a coastal walkway; standing in a wide rear-view composition facing an open horizon.

Expected: the lighting grows brighter without a sudden style change, and frame 6 retains clean upper and lower caption zones.

- [x] **Step 3: Inspect all six frames**

Open every frame and compare identity, outfit, body proportions, color progression, motion continuity, and absence of text or watermarks.

Expected: all six frames pass; regenerate only the failing frame.

### Task 3: Write the Higgsfield Motion Manifest

**Files:**
- Modify: `output/2026-07-13-人生卡住時先換個環境-Reels/prompt-manifest.md`

**Interfaces:**
- Consumes: six verified storyboard frames
- Produces: one exact motion prompt and duration per frame

- [x] **Step 1: Record image prompts and six motion prompts**

Write durations totaling 20–25 seconds and use one simple camera/subject action per clip: subtle locked-off breathing; slow push-in toward the face; gentle follow shot toward the door; forward tracking through the threshold; slow side orbit during a deep breath; gradual pullback toward the horizon.

Expected: every prompt names a single dominant movement, explicitly preserves identity and clothing, and prohibits morphing, extra limbs, sudden cuts, and text.

- [x] **Step 2: Record the subtitle timing**

Use these exact lines: `人生卡住時，你不一定要立刻換一種人生。` / `先離開原本的位置。` / `換一條路、換一個視角、讓自己重新呼吸。` / `環境改變了，你才更容易看見原本忽略的選擇。` / `先走出去，下一步才會出現。`

Expected: the five caption windows cover 0–25 seconds without adding another CTA.

### Task 4: Generate and Verify in Higgsfield

**Files:**
- Create: `output/2026-07-13-人生卡住時先換個環境-Reels/higgsfield-generation-log.md`
- Create when export is available: `output/2026-07-13-人生卡住時先換個環境-Reels/final-reels.mp4`

**Interfaces:**
- Consumes: six keyframes and `prompt-manifest.md`
- Produces: generated clips or the final exported Reels video plus evidence of settings and results

- [ ] **Step 1: Open the authenticated Higgsfield workflow**

Select the image-to-video or storyboard surface that accepts reference frames. Keep aspect ratio at 9:16 and use the exact durations and prompts from the manifest.

Expected: all six source frames are attached to their matching shots before generation.

- [ ] **Step 2: Generate each shot**

Generate one shot at a time so a failed shot can be replaced without changing approved clips.

Expected: each result preserves the adult male's identity and outfit, uses the requested camera action, and contains no visible morphing, extra limbs, text, logo, or watermark.

- [ ] **Step 3: Export and verify**

Export the completed vertical video when the logged-in plan permits it. Verify 9:16 orientation, 20–25 second duration, continuous emotional progression, and correct subtitle order; record any plan limitation or generation failure instead of claiming completion.

Expected: `final-reels.mp4` exists and opens successfully, or the generation log names the exact blocking screen and remaining action.
