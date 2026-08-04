---
name: insurance-claim-form-automation
description: 產生、校正與驗證未簽名的理賠申請書草稿，含新光、元大、遠雄、富邦、凱基、宏泰、保誠及既有支援表單。當使用者提供案件資料與診斷證明書，要求填寫、修改、驗證或交付醫療或意外理賠申請書時使用。Use when the user asks to prepare, revise, validate, or deliver unsigned medical claim application PDFs from current-case details and a diagnosis document.
---

# Insurance Claim Form Automation

Prepare private, unsigned claim-form drafts for the verified insurers listed in the contract, including 新光、元大、遠雄、富邦、凱基、宏泰、保誠、全球、三商美邦、國泰學團險 and 台灣人壽. Treat every output as a draft for human review; never submit a claim.

## 兩個填表引擎，依保險公司選用

| 引擎 | 適用 | 座標形式 | 狀態 |
|---|---|---|---|
| `scripts/claim_forms.py` | 全球人壽 2026.03、三商美邦 CL106C、國泰人壽 303002/303004 學團險 114.12 | 單點座標，可跨頁 | 2026-07-30 實案驗證 |
| `scripts/claim_overlay_fill.py` | 新光、元大、遠雄、富邦 114.11、凱基、宏泰、保誠 | 讀 `claim_overlay_layout.py` 的矩形方框 | 座標由上游提供，**尚未用真實表單驗證** |

```bash
# 全球／三商／國泰
python "<skill-dir>/scripts/claim_forms.py" --form <空白表單.pdf> --case <案件.json> --outdir <輸出資料夾>

# 其餘七家（一次一家）
python "<skill-dir>/scripts/claim_overlay_fill.py" --form <空白表單.pdf> --insurer <layout鍵值> --case <案件.json> --out <輸出.pdf>
```

`claim_overlay_fill.py` 會把值放進方框並**自動縮字級到放得下為止**，輸出 JSON 報告：
每欄用了幾級字、幾行、是否溢出、逐格欄位寫了幾格、頁面尺寸是否與版面宣告相符、
以及該版面有無方框互相重疊。**有任何警告就以離開碼 1 結束**，不要當成填好了。

⚠️ 那七家的座標尚未經真實表單驗證。第一次用某一家時，**務必以 144 DPI 以上渲染逐欄目視確認**，
確認無誤後再把該家改註記為已驗證。

相依套件：填表需 `pymupdf`，輸出驗證需 `pypdf`（`pip install pymupdf pypdf`）。

⚠️ 案件 JSON 含個資，**只放在忽略追蹤的本機目錄，絕不進 git**；`claim_forms.py` 本身不含任何客戶資料。
⚠️ 未列於上表的保險公司或改版表單，**先停下來**，依 development mode 重新解析版面後才可填。

## Choose the operating mode

- **快速填寫模式**: Use for a routine case with an unchanged supported form. Stay single-agent, reuse verified layouts, run focused output checks, and avoid the full development test suite.
- **Development mode**: Use when an insurer, form edition, layout, or standing rule changes. Inspect the blank form, update the adapter or layout, and run the full project tests before handling real data.

Do not describe a routine run as development work. If the required form version or executable workflow is unavailable, stop and report that exact limitation.

## Read the contract

Read [references/claim-contract.md](references/claim-contract.md) before filling or revising a form. Its intake rules, insurer matrix, blank-field rules, privacy limits, and delivery checks are mandatory.

For 新光、元大、遠雄、富邦、凱基、宏泰、保誠, reuse the bundled tested layout adapter at `scripts/claim_overlay_layout.py`. Never reconstruct these coordinates from label positions. If an official form edition changes, enter development mode and replace the affected rectangles only after render-based verification.

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

8. Render page 1 at 144 DPI or higher and visually confirm legibility, line wrapping, checkbox placement, bank digits, and that nothing crosses a form boundary.
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
