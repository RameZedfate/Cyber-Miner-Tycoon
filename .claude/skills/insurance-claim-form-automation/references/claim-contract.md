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

Added after a second verified live run (2026-08-10), layouts also in `scripts/claim_forms.py`
（新格式：座標不含頁索引，改由 `source_page` 指定，可用 `--page` 覆寫）：

- 遠雄人壽 保險金申請書 CLA003 11501 版 — 版面已驗證
- 台灣人壽 保險金申請書 CA03 2025.02 版 — 版面已驗證
- 國泰人壽 理賠申請書 300002 個險暨國壽在職福團專用 115.08 版 — 版面已驗證

⚠️ `scripts/claim_overlay_layout.py` 裡的 `farglory` 版面**不是 11501 版**，實測對不上
（身分證逐格區起點差約 12pt，等於整排錯一格）。遠雄一律走 `claim_forms.py` 的
「遠雄人壽」版面，不要用 overlay 的 `farglory`。這也再次證明 overlay 那七家在
沒有真實表單驗證前都不能當成可用。

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

### 住院手術（原有句型）

Use this sentence only when every fact is present and confirmed:

```text
因{病名}，於{入院日}入院，於{手術日}行{手術名稱}，於{出院日}出院
```

### 門診手術（使用者於 2026-08-10 核可）

住院型句型缺「入院日／出院日」時**不要硬套**。門診手術改用：

```text
因{病名}，於{手術日}至{科別}門診行{手術名稱}，於{回診日}回診拆線
```

沒有回診／拆線這一段時，只留前半句：

```text
因{病名}，於{手術日}至{科別}門診行{手術名稱}
```

日期一律用民國年（診斷證明書多為西元，要換算）。

### 共同規則

If one of those elements is missing, stop and request the missing fact. Do not create a
different disease narrative unless the user explicitly teaches and approves it.
純住院無手術、慢性病回診仍無句型，遇到要停下來問。

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
| 國泰人壽（學團險） | 表單將居住地址標為 (＊) 必填，**沒有同保單地址選項**，必須向使用者索取地址後填寫（郵遞區號、縣市、鄉鎮區、街道分四格）。 | **本文 303002 + 附件 303004 共 2 頁** |
| 遠雄人壽 | 勾選「聯絡地址 ■同『事故人留存公司最新之地址(住所)』」，下方縣市／路街／號樓等格全部留空。 | Page 1 only |
| 國泰人壽（個險 300002） | 居住地址標為 (＊) 必填且**無同保單地址選項**，須向使用者索取；日間易晤地址勾「同居住地址」，第二組郵遞區號與地址留空。 | **本文 300002 + 附件 00016 共 2 頁** |

Fill only insurers named in the current case.

### 遠雄人壽（11501 版）specifics

- 申請項目勾「醫療」；事故種類勾「疾病」或「意外」。
- 「工作內容」「就診身分（健保／自費）」屬意外續填區，**疾病案件留空**。
- 事故日期只填年月日，**時、分留空**；報案日期、事故地點、處理單位、處理員警、連絡電話一律留空。
- 給付方式勾「匯款至受益人帳戶」，戶名／金融機構名稱／分行名稱照填。
- 帳號是 14 格，但**印刷格寬不等距**（第 10 格特寬、第 11 格特窄），
  必須用 `cells` 的實測邊界逐格定位，改成等分會整排偏掉。
- 事故經過欄只有約 12pt 高（紅色說明字下方到框線），字級壓在 9 以下才不會壓線。
- 要保單位、團險件、E-mail、申請日期、簽名與所有用印區留空。

### 台灣人壽（CA03 2025.02 版）specifics

- 險別勾「個人險」、申請項目勾「醫療」、事故種類勾「非意外」。
- 「被保險人與要保人關係」勾「本人」（除非使用者另外指明）。
- 事故經過寫在「請詳述保險事故發生地點、原因、經過情形、事故時職業及工作內容」下方空白區；
  疾病案件**不寫職業與工作內容**。報案日、處理單位、承辦警員、電話留空。
- 領取方式四欄（戶名／受款人身分證統一編號／金融機構名稱／金融機構分行）都要填。
- 帳號列是「銀行代號 3 格－分行代號 4 格－帳號 14 格」三段。
  **銀行代號與分行代號未取得就整段留空**（長期規則 5），只填帳號那 14 格。
- 通知書區勾第一個「以您留存本公司之保單地址郵寄紙本理賠給付通知書」，
  不勾「郵寄其它地址」，下方縣市／路街地址列全部留空。
- 保單號碼、團體保險、申請聲明、禁背支票整區、簽名、申請日期、送件人區留空。

### 國泰人壽（個險 300002 115.08 版）specifics

- ⚠️ 這張是**個險暨國壽在職福團專用**，和已驗證的 303002「學團險專用」是**不同表單**，
  兩者不可互換。學團險那張的投保學校證明欄規定不適用於這張。
- 申請種類勾「非意外事故(疾病)」或「意外事故」（僅可勾一項）。
- 理賠類別依實際險種勾選；門診手術／實支實付案件勾「醫療實支(F)」，
  無住院天數時**不要順手勾「醫療日額(E)」**。
- ⚠️ **這張跟學團險一樣是兩頁一組，交付要 2 頁**：本文 300002 + 附件 00016。
  兩個編號都印在本文頁的條碼列（`*300002*  *00016*`），看到就知道還有附件那頁。
  驗證時用 `--expected-pages 2`。
- ⚠️ **本文 300002 第 1 頁沒有領取方式／帳戶欄位**，戶名／受款人身分證／金融機構／分行／帳號
  全部在附件 00016 上。**只拿到本文就先向使用者要附件那頁**，不要只交 1 頁就當作完成，
  也不要假裝帳號填得上去。
- 附件 00016 的版面**尚未驗證**（2026-08-10 該次使用者只提供本文頁）。
  第一次拿到要當 development mode：144 DPI 以上渲染、逐欄目視確認後才可標為已驗證。
- 「事故經過」整區（事故地點／工作內容／相關經過／報案）標明僅意外案件填寫，疾病案件留空。
- 申請日期雖標 (＊) 必填，仍依長期規則留空。無記名式保單區留空。

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
