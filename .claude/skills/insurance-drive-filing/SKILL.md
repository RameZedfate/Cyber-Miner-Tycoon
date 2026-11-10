---
name: insurance-drive-filing
description: Use when Codex needs to classify, review, expand, or run an OCR-assisted insurance document filing workflow for JPG or PNG files, especially claims, policy changes, new contracts, and personal documents.
---

# Insurance Drive Filing

Classify insurance document photos conservatively. Produce a reviewable CSV before moving any file.

## Core workflow

1. Scan the inbox and run OCR.
2. Produce a CSV suggestion table.
3. Review grouped results with the user.
4. Apply user corrections and regenerate the CSV.
5. Move only rows whose `ApproveMove` value is `Y`.
6. Verify the remaining inbox count and destination counts.

Never infer approval from silence. Never move files during the first classification pass.

## Run the bundled script

Generate suggestions:

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>\scripts\drive-filing-assistant.ps1" `
  -InboxPath "<inbox-path>" `
  -CustomerRoot "<customer-root>" `
  -ReportPath "<output-path>\drive-filing-suggestions.csv"
```

Move approved rows only:

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>\scripts\drive-filing-assistant.ps1" `
  -InboxPath "<inbox-path>" `
  -CustomerRoot "<customer-root>" `
  -ReportPath "<approved-csv-path>" `
  -MoveApproved
```

## Folder model

Support either of these layouts:

```text
Customer\Category
Customer\Family member\Category
```

Recommended categories:

- 理賠
- 保全
- 新契約
- 個人文件

Use dots in ROC-format dates because Windows filenames cannot contain slashes, for example `115.06.10`.

## Claim grouping

Treat consecutively numbered photos as one document group until a different person or a new lead document appears.

- Anchor the group to the first reliable person-bearing document.
- Let later receipts, certificates, bank books, ID backs, and other attachments inherit the anchor when they do not repeat the name.
- Stop inheritance when numbering is not consecutive, a different person is identified, or a new claim application or lead document starts.
- Keep a bank book or identity document inside an active claim sequence with the claim unless the user explicitly classifies it as standalone.
- Let explicit user corrections outrank OCR.

## Ambiguity rules

Ask for confirmation when:

- OCR finds a person who does not exist in the customer root.
- A bank book may be either a standalone personal document or a claim attachment.
- The category or destination cannot be supported by OCR and sequence context.
- A proposed destination would require creating a new customer or family folder.

## Expanding the skill

When adding rules, request or use a small set of correctly labeled examples. Preserve existing correct rules and edit only the relevant category. Store local customer mappings and diagnosis corrections outside the public skill; do not commit names, medical details, document images, cloud paths, or filename-specific overrides.

Update both:

- `SKILL.md`
- `scripts/drive-filing-assistant.ps1`

## Privacy boundary

Treat insurance documents and OCR output as sensitive. Do not publish or commit:

- client or family names
- diagnoses or claim dates
- document images or OCR dumps
- email addresses, credentials, or tokens
- machine-specific cloud-drive paths
- filename-specific mappings tied to real cases
