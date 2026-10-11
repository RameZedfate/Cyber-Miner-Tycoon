---
name: identity-replacement-video
description: Use when replacing the main actor in a reference video while preserving the reference scene, action, composition, and pacing with a confirmed non-Higgsfield provider.
---

# Identity Replacement Video

Use this skill when the user wants the person in an existing video replaced while keeping the reference video's visual construction.

## Contract

1. Inspect the actual reference video and the approved replacement identity image before planning or generation.
2. Preserve the reference scene, action, camera language, timing, composition, and pacing. Replace only the requested actor unless the user explicitly asks for another change.
3. Never use Higgsfield, including as fallback or retry provider.
4. Before submitting a generation, confirm that a non-Higgsfield provider is currently connected, supports the required workflow, and has sufficient authorization or credits. An authentication prompt or retry loop is not confirmation.
5. If no usable provider is confirmed, stop with the completed analysis and prompt package; do not claim that a video was generated.
6. Keep source media unchanged. Store generated drafts separately and record provider, model, input assets, settings, attempt count, and output path without credentials or session data.
7. Verify the final video's identity consistency, scene fidelity, action timing, dimensions, duration, playback, and absence of unintended subject changes before delivery.

## Safety and scope

Use only user-authorized identity media. Do not create deceptive endorsements, impersonation, or misleading real-world evidence. Do not publish the result unless the user's current request explicitly asks for publishing and the destination account is confirmed.
