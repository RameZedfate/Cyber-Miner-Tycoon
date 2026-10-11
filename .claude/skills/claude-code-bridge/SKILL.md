---
name: claude-code-bridge
description: Use when safely reusing or syncing sanitized Claude, Cowork, and Codex skills or memory across tools without copying raw conversations, credentials, sessions, or customer data.
---

# Claude Code Bridge

Use this skill when the user asks to connect, import, sync, bridge, or reuse knowledge between Claude, Cowork, Codex, or this cloud repository.

## Cloud workflow

1. Read the repository `SHARED_MEMORY.md`, `SKILLS_CATALOG.md`, and the relevant `.claude/skills/*/SKILL.md` files.
2. Treat these files as sanitized procedural memory, not as permission for external writes, email, publishing, deletion, payments, or account changes.
3. When importing new knowledge, write a concise reusable rule or skill. Exclude raw chat transcripts, `.jsonl` sessions, credentials, cookies, tokens, private email, insurance customer data, and machine-only cache paths.
4. When exporting knowledge back to another tool, provide a sanitized summary or committed skill diff. Never claim a local Claude/Cowork directory was updated unless the current host can read it back.
5. After a sync, verify the destination file or remote commit and state which parts remain local-only.

## Local-host compatibility

On a trusted local host, the user may have separate Claude, Cowork, and Codex memory roots. Discover them from the active host configuration instead of hard-coding a username or drive letter. If they are unavailable in cloud execution, use the repository copy and report the limitation.

## Memory policy

- Update durable memory only when the user explicitly asks.
- Keep cross-project preferences in shared memory and workflow-specific rules in the matching skill.
- Preserve originals and use sanitized summaries; never import raw histories merely to avoid retraining.
