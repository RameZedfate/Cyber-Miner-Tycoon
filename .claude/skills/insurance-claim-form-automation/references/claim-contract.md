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

Added after a verified live run (2026-07-30), with layouts in `scripts/claim_forms.py`:

- 全球人壽 理賠申請書 2026.03 版 — 版面已驗證
- 三商美邦人壽 保險金申請書 CL106C — 版面已驗證
- 國泰人壽 理賠申請書 303002 學團險專用 114.12 版 — 版面已驗證

Stop instead of guessing for death, disability, critical-illness lump sum, travel insurance, group insurance, OIU, a changed form edition, or any unsupported benefit.

## Standing user rules

These override the generic defaults and apply to every future run until the user says otherwise.

1. **事故時間與事故地點一律不填**，任何保險公司都一樣，即使表單標示為必填
   （三商美邦紅字要求詳填事故時間、地點，仍不填）。相關的員警姓名、聯絡電話、
   處理憲警單位、事故地區也一併留空。
2. **表單要求地址時，先問使用者**，不要自行推斷，也不要沿用其他表單上的地址。
   若表單提供「同保單地址／同收費地址」選項，優先勾選該選項而不填寫地址。
3. **就醫院所**：只在表單有專屬欄位時填（例如三商美邦「曾就診之醫院診所」）。
   全球人壽的「事故發生經過情形及全部就醫院所」欄只寫事故經過，不加就醫院所。
4. **簽章區的法定代理人身分證字號與生日要填**（簽章本身仍留空）。
5. 金融機構的**分行通匯代號**若未取得就留空，不要臆測。

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
| 三商美邦 | 勾選「聯絡地址 ■同『收費地址』」，郵遞區號與地址欄全部留空。 | Page 1 only |
| 國泰人壽（學團險） | 表單將居住地址標為 (＊) 必填，**沒有同保單地址選項**，必須向使用者索取地址後填寫（郵遞區號、縣市、鄉鎮區、街道分四格）。 | Page 1 only |

Fill only insurers named in the current case.

### 三商美邦 specifics

- 險別預設勾「1 個人險」；若為團體險或旅平險則必須填保單號碼，此時停下來向使用者確認。
- 「曾就診之醫院診所」要填；「事故時間」「事故地點」「員警姓名」「聯絡電話」「處理憲警單位」「事故地區」一律留空。
- 帳號為 16 格，不足位數靠左對齊；「金融機構及分行代碼」7 格未知即留空。
- 申請人與法定代理人的身分證字號格子都要填，簽名欄留空。

### 國泰人壽（學團險專用）specifics

- ⚠️ 這張是**學生團體保險**專用表（左上角標示「學團險專用 含大專學團」，表單編號 303002）。
  若客戶在國泰另有個人醫療險，**不可沿用這張**，要另外索取個人險表單。
- 保單號碼標註「服務人員填寫」，一律留空。
- 「(＊)投保學校證明欄」整區（投保學校、學校代號、校址、電話、校長職章、經辦人簽章、
  關防／學保專用章）**由學校填寫蓋章，AI 一律不填**；學號與班級科別同樣需要學校提供。
- 交付時必須提醒使用者：這張表要送回投保學校用印才算完成。
- 理賠類別依案件勾選（一般醫療為「醫療(E)」）；「申請專案補助」限重大手術，非重大手術不勾。
- 同意書區的「受益人與被保險人關係」要勾（醫療保險金受益人為被保險人本人時勾「本人」），
  但立書人與法定代理人的**簽名欄仍留空**。

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
