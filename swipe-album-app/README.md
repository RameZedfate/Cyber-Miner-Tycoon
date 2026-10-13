# 滑滑相簿 SwipeAlbum

像交友軟體一樣滑動整理相簿的 App（Flutter，一套程式碼同時支援 iOS 與 Android）。

## 功能

### 滑動整理
| 手勢 | 動作 |
|---|---|
| 👉 右滑 | 保留（預設，同交友軟體；設定裡可以左右對調） |
| 👈 左滑 | 刪除（先放進「待刪除區」，不會馬上刪） |
| 👆 上滑 | 再考慮 |
| 👇 下滑 | 保留並加入最愛 |

### A. 基本功能
- **復原**：可以一路往回復原，不限次數
- **待刪除區**：最後一次刪除，系統只跳一次確認。iOS 會先移到「最近刪除」，Android 11 以上會先移到垃圾桶，30 天內都救得回來
- **依月份整理**：每個月都有進度條，整理完會打勾、劃線
- **釋放空間統計**：首頁顯示已釋放的容量和已刪除的張數
- **篩選**：所有截圖、30 天以前的舊截圖、影片（由大到小）
- **再考慮區**：可以選兩張並排比較（能放大），也能逐張重新滑，或一次全部保留／全部刪除

### B. 差異化功能
- **合理收費**：每滑 100 張出現一則可以跳過的廣告；一次買斷 USD 5 就永久移除廣告，**不是訂閱**
- **相似照片挑最佳**：在手機上用 dHash 找出連拍和相似照片，用清晰度挑出最好的一張（👑），一鍵保留最佳、其餘刪除
- **可能模糊**：在手機上計算清晰度，找出可能模糊的照片
- **隱私**：照片不上傳、不需要帳號，分析全部在手機上完成
- **四個方向都能用**：下滑加入最愛，右上角的按鈕可以加入任何相簿（iOS 也可以直接新增相簿）
- **亞洲在地**：「LINE 圖片」一鍵篩選
- **影片專區**：顯示影片大小、可以直接播放，也能「壓縮保留」（轉成 720p 另存新檔，原影片放進待刪除區）
- **遊戲化**：每日目標圈、連續天數 🔥、12 個成就徽章、「那年今日」卡片，每天晚上 8 點提醒
- **年度回顧卡**：9:16 尺寸（1080×1920），一鍵分享到 IG／LINE 限動
- **雲端同步提醒**：第一次刪除前，會提醒「iCloud／Google 相簿會同步刪除」

## 專案結構

```
lib/
  main.dart                 啟動、主題、語系（繁中／英文）
  config.dart               廣告 ID、買斷商品 ID、每幾張出現廣告
  logic/                    純邏輯（都有單元測試）
    swipe_logic.dart          手勢 → 動作、拖曳判定
    ad_gate.dart              每 100 張一則廣告的規則
    similarity.dart           dHash、清晰度、相似分組
    album_rules.dart          截圖／LINE 相簿名稱判斷
    achievements.dart         成就
  state/app_state.dart      決定、統計、連續天數、設定（存成本機 JSON）
  services/                 相簿、分析、廣告、內購、通知、影片壓縮
  ui/                       各頁面
test/                       47 個測試
```

## 開發環境

```bash
flutter pub get
flutter test          # 47 個測試
flutter run           # 接上手機或模擬器
```

需要 Flutter 3.47 以上（Dart 3.13）。iOS 最低版本 15，Android 最低 API 24（Android 7.0）。

## ⚠️ 上架前要換掉的設定

目前用的都是 **Google 官方的測試 ID**。測試 ID 會顯示測試廣告，**不會有收入**。

1. **AdMob**（https://admob.google.com）
   - 建立 iOS 和 Android 兩個 App，取得 App ID
     - Android：`android/app/src/main/AndroidManifest.xml` 裡的 `com.google.android.gms.ads.APPLICATION_ID`
     - iOS：`ios/Runner/Info.plist` 裡的 `GADApplicationIdentifier`
   - 各建立一個「插頁式廣告」單元，把 ID 貼到 `lib/config.dart` 的 `_prodInterstitialAndroid`／`_prodInterstitialIos`
   - 廣告類型選「多媒體＋影片」，不要選獎勵式。插頁式廣告本來就有關閉鈕，影片廣告約 5 秒後可以跳過
2. **一次買斷 USD 5**
   - App Store Connect：App 內購買項目 →「非消耗性項目」，產品 ID `remove_ads_lifetime`，價格選 USD 4.99 或 5.00
   - Google Play Console：營利 → 應用程式內產品，產品 ID `remove_ads_lifetime`，價格 USD 5
   - 「恢復購買」按鈕已經做好了，這是 App Store 審核的要求
3. **App ID**：`com.adamaiplus.swipe_album`，要改的話在 Android `build.gradle.kts` 和 Xcode 的 Bundle Identifier 修改
4. **App 圖示**：目前是 Flutter 預設圖示，建議用 `flutter_launcher_icons` 換掉
5. **Android 簽章**：`build.gradle.kts` 的 release 目前還是用 debug key，上架前要設定自己的 keystore
6. **隱私表單**
   - App Store「隱私權營養標籤」：照片不收集；廣告（AdMob）會收集裝置 ID
   - Google Play「資料安全性」：同上
   - Google Play 會詢問 `MANAGE_MEDIA` 權限的用途：用於「媒體管理類 App 免逐張確認刪除／加入最愛」

## 已驗證的部分與限制

- ✅ `flutter analyze` 沒有任何問題
- ✅ 47 個測試全部通過：手勢判定、廣告規則、相似度與模糊判定、連續天數（含跨月）、存檔與讀檔、成就、滑卡元件，以及用假照片完整操作滑動頁
- ⚠️ **還沒在真機上跑過。** 開發用的雲端環境連不到 Google 的 Android SDK 下載站，也沒有 Mac 可以編譯 iOS，所以 `flutter build apk`／`ios` 還沒驗證。請先在自己的電腦用 `flutter run` 接上手機測試
- ⚠️ 模糊門檻（`blurryThreshold = 35`）是經驗值，用真實照片測過後可能需要微調
- ⚠️ Android 12 以下沒有「媒體管理」權限，每次加入最愛都會跳出系統確認。Android 10 以下沒有系統垃圾桶，會直接刪除（刪除前一樣有確認）
- ❌ 還沒做：辨識長輩圖、辨識 QR Code（需要額外的 ML 模型），以及 iOS 的 ATT 追蹤授權（沒做時，廣告一樣會顯示，只是變成非個人化廣告）
