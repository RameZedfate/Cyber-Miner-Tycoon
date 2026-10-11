# Adam 自訂技能目錄

本目錄記錄已同步到雲端 repo 的可重用技能。第三方工具不重複打包；需要時依「外部依賴」安裝或連線。

| 技能 | 用途 | 雲端狀態 | 外部依賴／限制 |
| --- | --- | --- | --- |
| `insurance-claim-form-automation` | 產生、校正、合併與驗證未簽名理賠申請書 | 可讀規則、執行 Python 與測試；真實案件必須使用私有目錄 | `pymupdf`、`pypdf`、官方空白表單；不得把案件資料提交到 Git |
| `insurance-drive-filing` | OCR 分類、先出 CSV、核准後才搬檔 | 規則可讀；實際 OCR／搬檔為本機 Windows 流程 | Windows OCR、客戶資料夾、使用者核准 |
| `canva-daily-finance-news` | 台灣財經 TOP 10 研究、Canva 更新與讀回 | 研究規則可用；儲存需有效連接器 | Agent Reach 或等效網路研究、Canva 連接器與授權 |
| `carousel-content-workflow` | IG 輪播選題、文案、圖片驗證與草稿交付 | 文案規則可用；圖片與 Drive 交付視連接器而定 | 圖片生成工具、選用的 Drive 連線；禁止自動發布社群 |
| `auto-reel-draft` | 依參考片建立具來源紀錄的可編輯剪映草稿 | 腳本與測試可讀；雲端通常缺少剪映執行環境 | `agent-reach`、`assetseeker`、`jianying-editor`、本機剪映；不得用 Higgsfield |
| `identity-replacement-video` | 保留參考影片場景與節奏，只替換指定人物 | 規則可用；生成前必須確認替代供應商可用 | 禁用 Higgsfield；需可用的非 Higgsfield 供應商、授權與額度 |
| `video-editing` | 以 HyperFrames 製作與驗證 9:16 成片 | 有 Node/ffmpeg/HyperFrames 時可執行 | HyperFrames、Node.js、ffmpeg、ffprobe |
| `howtravle-top2-email` | Trip.com Top 2 航班卡片、比價閘門與寄信交付 | 規則可用；寄信需獨立授權與寄件能力 | 即時票價、Skyscanner、私有寄件設定；repo 不存 SMTP 憑證 |
| `claude-code-bridge` | 在 Claude、Cowork 與 Codex 間交換安全摘要與技能 | 可用 repo 內摘要；無法直接讀本機私有目錄 | 只同步安全摘要，不同步原始對話或工作階段 |

## 未打包的第三方依賴

- `jianying-editor`、`agent-reach` 與 `assetseeker` 屬外部套件，不複製第三方原始碼與示範素材。Higgsfield 已被明確排除，不得使用或當成備援。
- 社群經營技能為 repo 既有套件，維持原位置；是否能發布取決於實際 MCP／連接器。
- 任何依賴若未安裝、未登入或未授權，技能必須停止在可驗證的草稿階段。
