# Claim Form Contract

Use this contract for every routine claim-form run. The user's current message and current diagnosis document are the only case-specific sources of truth.

## Supported scope

Supported in the initial version:

- 全球人壽 general medical claim
- 台灣人壽 general medical claim
- Disease hospitalization or surgery
- Accident medical claim
- Bank-transfer payment
- Unsigned draft PDF

Stop instead of guessing for death, disability, critical-illness lump sum, travel insurance, group insurance, OIU, a changed form edition, or any unsupported benefit.

## Minimum intake

Always require:

```text
姓名：<customer name>
身分證：<identity number>
生日：<ROC date>
手機：<mobile number>
銀行：<bank name>
分行：<branch name>
帳號：<account number>
事故類型：疾病／意外
保險公司：<selected insurers>
```

The account holder defaults to the customer name.

For disease, also require a clear diagnosis document containing the supported diagnosis, admission date, surgery date and procedure, and discharge date.

For accident, also require:

```text
職業：<occupation>
事故日：<confirmed ROC date>
病名：<diagnosis shown on the current document>
事故經過：<the user's factual wording>
```

Do not ask for a policy number or address.

## Common defaults

- Personal insurance
- Medical claim
- Applicant and beneficiary are the insured customer
- Payment by bank transfer
- Policy number blank
- Accident time blank
- Accident location blank
- Signatures and stamps blank
- Medical-consent signature blank
- Sender and agent fields blank
- Application date blank
- Final deliverable contains page 1 only

## Disease narrative

Use this sentence only when every fact is present and confirmed:

```text
因{病名}，於{入院日}入院，於{手術日}行{手術名稱}，於{出院日}出院
```

If one of those elements is missing, stop and request the missing fact. Do not create a different disease narrative unless the user explicitly teaches and approves it.

Keep the narrative inside the accident/cause box. Adjust font size and line breaks without changing the facts.

## Accident narrative

- Use the user's confirmed accident date.
- If the date must come from the diagnosis document, choose the earliest confirmed encounter related to this accident, not the certificate issue date.
- Keep time and location blank.
- Insert the user's cause wording without adding a diagnosis, location, mechanism, or other inferred detail.
- Only punctuation and line wrapping may be normalized.
- Require occupation for an accident case.

## Insurer matrix

| Insurer | Address handling | Final output |
|---|---|---|
| 全球人壽 | Check the option meaning the policyholder/insured address is the same as the policy address; leave the alternate-address line blank. | Page 1 only |
| 台灣人壽 | Check the first policy-address mailing option; do not check alternate mailing address; leave the address line blank. | Page 1 only |

Fill only insurers named in the current case.

## PDF acceptance checks

Before delivery:

1. Confirm the official blank-form edition and expected geometry.
2. Confirm every selected insurer has exactly one PDF.
3. Confirm every final PDF has exactly one page.
4. Render page 1 and inspect every filled field and checkbox.
5. Confirm the narrative remains inside its box.
6. Confirm bank digits, identity number, date, and phone are legible and not truncated.
7. Confirm all prohibited signature, consent, sender, policy-number, and application-date fields remain blank.
8. Run `scripts/validate_claim_output.py`.

## Drive delivery

- Use only the approved claim-form parent folder.
- Create a customer-name folder when no matching folder exists.
- Ask before reusing an ambiguous same-name folder.
- Upload new page-1 PDFs only.
- Never overwrite, update, delete, move, share, sign, or submit.
- Download every uploaded PDF for readback.
- Verify parent folder, MIME type, byte size, and SHA-256.
- Return the customer-folder link only after all selected insurer files pass readback.

## Public-repository boundary

The public skill may contain:

- This operating contract
- Generic scripts
- Blank placeholders
- Synthetic tests

It must not contain:

- Real customer or family data
- Medical facts from a real case
- Diagnosis or bank-book images
- Filled claim forms
- OCR dumps
- Drive folder or file identifiers
- Credentials or tokens
- Local absolute paths
- Customer-specific corrections
