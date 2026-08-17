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

Added after a verified live run (2026-08-17), with rectangles in `scripts/claim_overlay_layout.py`
（座標取自空白表單的向量格線與字元框，並以 200 DPI 逐欄目視確認）：

- 南山人壽 保險金申請書 115/04/01 版 → `nanshan_115_04`
- 台灣人壽 理賠申請書 CA03 → `taiwanlife_ca03`
- 元大人壽 保險金申請書 202506 版 → `yuanta_202506`
- 遠雄人壽 保險金申請書 11501 版 → `farglory_11501`

⚠️ 這四組與舊有的 `yuanta`／`farglory` **不是同一版次**，座標差很多（舊版的
`farglory` 出生日期、工作內容欄位落在別的格子裡）。依表單版次選鍵值，不要混用。

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
6. **交付＝填好的申請書草稿本身，就是完整版。** 不要附「應附文件清單」、送件流程提醒、
   用印提醒或其他待辦事項。使用者是保險實務工作者，**業界怎麼送件由他決定**，
   AI 不是流程指導者。除非使用者主動問，否則只交付檔案並說明填了什麼、依規則留空了什麼。

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

### 疾病敘述要寫進哪一欄（依表單而定）

不是每張表單都有通用的經過欄。寫之前先看該欄的標示：

| Insurer | 疾病案件的敘述 |
|---|---|
| 全球人壽 | 寫入「事故發生經過情形及全部就醫院所」。⚠️ 該欄實際可寫區只有 **x 21–276 × y 368–391**（右半是另一欄的印刷文字），約**兩行**。65 字的制式敘述在 size 8 單行會壓到右欄，必須自動縮字級斷行（實測 size 7.5、兩行剛好）。不要沿用固定單點座標單行寫入。 |
| 遠雄人壽 | 寫入「事故原因及經過情形，請詳述於下」，整列可用，一行放得下。 |
| 元大人壽 | 沒有通用經過欄。欄位是「診斷病名/事故經過」＋獨立的「手術名稱」，**疾病案件分開填**：診斷病名填病名，手術名稱填術式。該格寬僅 174pt，塞不下整句制式敘述。 |
| 南山人壽 | 經過欄整格 (107,478)-(573,504)，印刷說明佔掉上半，可寫區只剩下面一行。雖然該區塊標題是「意外事故內容（申請意外理賠時填寫）」，**使用者 2026-08-17 指示疾病案件照填**。 |
| 台灣人壽 | 經過欄整格 (75,126)-(571,178)，標題與括號說明佔掉上半。雖然標示「（勾選意外者，請填寫）」，**使用者 2026-08-17 指示疾病案件照填**。 |

南山與台灣人壽這兩欄雖印為意外專用，仍照填制式敘述，不必再問。

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
| 南山人壽 | **沒有「同保單地址」選項**，聯絡地址須向使用者索取後填寫（縣市／鄉鎮市區／村里／路街／段／巷／弄／號／樓，值寫在各印刷單位之前）。郵遞區號 3+3 格未取得就留空。 | Page 1 only |
| 台灣人壽 | 勾「簡訊未發送成功：■以您留存本公司之保單地址郵寄紙本理賠給付通知書」，不勾「郵寄其它地址」，地址列留空。 | Page 1 only |
| 元大人壽 | 「受益人住址」無同保單地址選項，須向使用者索取後以整串文字填入。 | Page 1 only |
| 遠雄人壽 | 勾「聯絡地址：■同『事故人留存公司最新之地址(住所)』」，地址列留空。 | Page 1 only |
| 全球人壽 | Check the option meaning the policyholder/insured address is the same as the policy address; leave the alternate-address line blank. | Page 1 only |
| 台灣人壽 | Check the first policy-address mailing option; do not check alternate mailing address; leave the address line blank. | Page 1 only |
| 三商美邦 | 勾選「聯絡地址 ■同『收費地址』」，郵遞區號與地址欄全部留空。 | Page 1 only |
| 國泰人壽（學團險） | 表單將居住地址標為 (＊) 必填，**沒有同保單地址選項**，必須向使用者索取地址後填寫（郵遞區號、縣市、鄉鎮區、街道分四格）。 | **本文 303002 + 附件 303004 共 2 頁** |

Fill only insurers named in the current case.

### 帳號格數限制

南山（`account` 14 格）、台灣人壽（14 格）、遠雄（14 格）的帳號是逐格方框，**超過 14 碼就放不下**。
全球與元大的帳號是底線自由文字欄，長度不限。

若使用者提供的帳號超過該表單的格數：**不要截斷、不要硬塞**，把該欄留空並向使用者確認正確碼數，
同一個帳號在自由文字欄可以照填。逐格欄的銀行代號（3 格）與分行代號（4 格）未取得就整組留空，
不要只填銀行代號。

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
- 「投保學校證明欄」由學校填寫用印，AI 一律不填，但**不需要在交付時提醒使用者**（見長期規則 6）。
- 理賠類別依案件勾選（一般醫療為「醫療(E)」）；「申請專案補助」限重大手術，非重大手術不勾。
- 同意書區的「受益人與被保險人關係」要勾（醫療保險金受益人為被保險人本人時勾「本人」），
  但立書人與法定代理人的**簽名欄仍留空**。
- **交付兩頁**：本文（303002）與附件（303004）。附件要重填姓名、身分證字號、
  領取方式勾選與第一組帳戶資料（戶名／身分證字號／金融機構(分行)／帳號），第二三組帳戶留空。
  驗證時用 `--expected-pages 2`。
- 身分證字號欄位是**逐格方格**，必須一格一字元，不可當成一般文字寫入
  （本文基本資料列、本文保險金領取方式列、附件基本資料列、附件帳戶資料列，共四處）。
- 附件背面雖印有「各項理賠申請所需文件一覽表」，**不要把它整理成清單提醒使用者**（見長期規則 6）。

## PDF acceptance checks

Before delivery:

1. Confirm the official blank-form edition and expected geometry.
2. Confirm every selected insurer has exactly one PDF.
3. Confirm every final PDF has exactly the approved page count for that insurer
   （預設 1 頁；國泰學團險為 2 頁，見 insurer matrix）。
4. Render page 1 and inspect every filled field and checkbox.
5. Confirm the narrative remains inside its box.
6. Confirm bank digits, identity number, date, and phone are legible and not truncated.
7. Confirm all prohibited signature, consent, sender, policy-number, and application-date fields remain blank.
8. Run `scripts/validate_claim_output.py`.

## Seven-insurer verified layout rules

Use the explicit rectangles in bundled `scripts/claim_overlay_layout.py`; do not position text by guessing from nearby labels. These rules are reusable and contain no customer data.

| Insurer | Persistent writing rule |
|---|---|
| 新光 | Write identity and account one character per printed cell. Keep the mid-page accident date in its three date blanks. In the lower applicant block, fill identity, birth/nationality, mobile, and address on their own rows; keep the signature blank. |
| 元大 | Check 個人險. Center the accident date as `民國年年/月/月/日/日` text inside the complete accident-date cell. |
| 遠雄 | Keep name clear of its label. Write identity and account one character per printed cell. Check 同公司最新地址 and align work content and accident date to their own cells. |
| 富邦 | Use the official 114.11 form. Write county/city and district as full names, then put road, lane, and house-number values before the form's printed units. |
| 凱基 | Start 戶名 after the label, keep 事故時職業 inside its value cell, write the 14-digit account one character per cell, and fill the lower beneficiary identity while leaving the signature blank. |
| 宏泰 | Start the identity value after the 身分證字號 label. Keep occupation and work content in separate lower cells. |
| 保誠 | Center the top-left name inside its value cell. Put the accident-cause check inside the box immediately before 其他. |

Render every completed first page at **144 DPI** or higher. Inspect the reported fields at enlarged scale, not only the whole-page thumbnail. Draw checkmarks as vector strokes so they do not disappear when the selected font lacks a check glyph.

### 寫入方式

用 `scripts/claim_overlay_fill.py` 讀上表座標並寫入，不要自行換算位置。它保證值留在方框內
（字級自動縮小、必要時斷行），並回報每欄用的字級、行數、逐格欄位寫了幾格。

**收到警告就停下來，不要當成已完成。** 警告包含：

- 表單頁面尺寸與版面宣告不符 → 座標可能整體偏移，多半是拿到不同版次的表單
- 逐格欄位的值超過格數而被截斷
- 縮到最小字級仍放不下
- 富邦的縣市／鄉鎮區未填全名，或門牌號欄位混入非數字

`report["layout_overlaps"]` 列出該版面互相重疊的欄位方框。重疊時兩欄的值會壓在一起，
但各自檢查都「在框內」，所以一定要看這一項。**目前已知：宏泰有兩組重疊
（accident_year／accident_month、bank／beneficiary_identity），新光有兩組（申請人區三列上下各壓 4pt）。**
這幾欄輸出後務必放大確認。

⚠️ 上表七家的座標**尚未經真實空白表單驗證**。第一次處理某一家時視為 development mode：
144 DPI 以上渲染、逐欄目視確認，確認無誤才可改註記為已驗證。

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
