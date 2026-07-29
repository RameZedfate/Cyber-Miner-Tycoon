---
name: insurance-claim-form-automation
description: Use when the user asks to prepare, revise, validate, or deliver unsigned Global Life or Taiwan Life medical claim application PDFs from current-case details and a diagnosis document.
---

# Insurance Claim Form Automation

Prepare private, unsigned claim-form drafts for 全球人壽 and 台灣人壽. Treat every output as a draft for human review; never submit a claim.

## Choose the operating mode

- **快速填寫模式**: Use for a routine case with an unchanged supported form. Stay single-agent, reuse verified layouts, run focused output checks, and avoid the full development test suite.
- **Development mode**: Use when an insurer, form edition, layout, or standing rule changes. Inspect the blank form, update the adapter or layout, and run the full project tests before handling real data.

Do not describe a routine run as development work. If the required form version or executable workflow is unavailable, stop and report that exact limitation.

## Read the contract

Read [references/claim-contract.md](references/claim-contract.md) before filling or revising a form. Its intake rules, insurer matrix, blank-field rules, privacy limits, and delivery checks are mandatory.

## Routine workflow

1. Accept only the current case's data. Normalize full-width characters and ROC dates, but preserve identity, phone, and account values as strings.
2. Require the selected insurer names. Fill only those insurers.
3. Inspect the current diagnosis document. Do not reuse facts from another customer or an earlier case.
4. Apply the disease or accident rules below and the insurer-specific checkbox rules in the reference.
5. Render the official form without altering its page geometry. Keep text inside the intended boxes.
6. Produce an internal QA draft if needed, but **只交付第 1 頁** for every insurer.
7. Run:

   ```powershell
   python "<skill-dir>\scripts\validate_claim_output.py" --expected-count <insurer-count> <pdf-files>
   ```

8. Render page 1 to an image and visually confirm legibility, line wrapping, checkbox placement, bank digits, and that nothing crosses a form boundary.
9. If Drive delivery is requested, create or use the approved customer folder, upload new page-1 PDFs only, download them again, and verify byte size plus SHA-256 before returning the customer-folder link.

## Non-negotiable form rules

- 不要求保單號碼；保單號碼保持空白。
- 不詢問或填寫地址。全球人壽與台灣人壽都固定勾選「同保單／要保書地址」的相對應選項。
- Account holder, insured person, applicant, and beneficiary default to the customer's name unless the user explicitly states an exception.
- Disease: leave accident date, time, and location blank. Use only supported diagnosis, admission, surgery, and discharge facts. Never invent a missing fact.
- Accident: use the user-confirmed accident date. If the user asks to derive it from the diagnosis document, use the earliest confirmed encounter related to that accident. Leave time and location blank.
- For an accident, require occupation and the user's 事故經過. Preserve the facts exactly; only adjust punctuation and line wrapping. Do not append a diagnosis or inferred cause.
- Keep signatures, stamps, medical-consent signatures, sender fields, and application date blank.
- 不自動簽名、蓋章或送件。

## Privacy boundary

Never commit or publish customer names, identity numbers, phone numbers, bank details, diagnoses, case dates, diagnosis images, filled PDFs, OCR output, Drive identifiers, credentials, or machine-specific paths. Store real case material only in an ignored private runtime directory and remove temporary copies after verified delivery.
