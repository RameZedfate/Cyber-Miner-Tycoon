# Claude Code 接手任務：Higgsfield Reels

## 目標

用本資料夾內已完成的六張直式分鏡，透過 Higgsfield 生成六支 4 秒影片，再依序合成約 24 秒、9:16 的 Reel。

主題：**人生卡住時，先換個環境，不一定要換個人生**

## 素材位置

工作資料夾：

`C:\Users\USER\Documents\輪播圖文\output\2026-07-13-人生卡住時先換個環境-Reels`

必用檔案：

- `frame-01.png` 至 `frame-06.png`：六張正式分鏡，依檔名順序使用。
- `prompt-manifest.md`：六鏡的影片動作、運鏡與負面限制提示詞。
- `storyboard-contact-sheet.jpg`：整體敘事與角色一致性參考。
- `hero-anchor.png`：角色與美術風格參考。
- `higgsfield-generation-log.md`：生成與扣點紀錄，完成後更新。

不要重新生成、重新命名或覆蓋上述圖片。

## Higgsfield 設定

- 網址：`https://higgsfield.ai/ai/video`
- Model：Seedance 2.0
- 長度：4 秒
- 比例：9:16
- 解析度：1080p
- Bitrate：High
- 每支：36 credits
- 六支總上限：216 credits

Adam 已明確同意使用最多 216 credits。交接時尚未按下 Generate，已使用點數為 0。

## 執行順序

1. 使用現有已登入的 Chrome 工作階段開啟 Higgsfield。
2. 一次上傳 `frame-01.png` 至 `frame-06.png`；不要上傳 contact sheet 或 hero anchor 當正式生成素材。
3. 依序選取每張分鏡，從 `prompt-manifest.md` 套用對應的 Shot 1 至 Shot 6 提示詞。
4. 每一鏡只按一次 Generate，並立刻在 `higgsfield-generation-log.md` 記錄時間、扣點與結果。
5. 每支完成後先檢查成功再進到下一支。若失敗但已扣點，不可自行重試，因為會超過 216 credits。
6. 下載六支成品，以 `shot-01.mp4` 至 `shot-06.mp4` 儲存在本資料夾。
7. 依序無縫合成為 `final-reel-24s.mp4`。保留 9:16、1080p，先不加字幕、旁白或音樂，除非 Adam 另有指示。

## 品質檢查

- 主角外觀、服裝與整體電影感盡量保持一致。
- 敘事順序必須是：室內低潮 → 走向門口 → 踏出室外 → 街道移動 → 海岸轉換 → 面向地平線。
- 檢查臉、手腳、身體比例與背景有無明顯變形。
- 不要讓模型生成文字、Logo、水印或額外人物搶鏡。
- 最終影片必須能完整播放、總長約 24 秒、畫面順序正確。

## 安全與交付

- 若 Chrome 登入失效，請停止並請 Adam 自行登入；不要要求密碼或六位驗證碼。
- 不得超過 216 credits，不得自行購買點數或升級方案。
- 不得發布影片，只需保存本機成品。
- 完成後在 `higgsfield-generation-log.md` 記錄六支生成結果、實際總扣點、下載檔與最終影片路徑。

