import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

import '../logic/formatters.dart';

/// UI strings. Traditional Chinese first, English fallback.
/// Every getter is checked by the analyzer, so a typo can't ship.
class S {
  const S._(this.zh, this.locale);

  final bool zh;
  final String locale;

  static S of(BuildContext context) {
    final Locale l = Localizations.localeOf(context);
    return S._(l.languageCode == 'zh', l.toLanguageTag());
  }

  String _t(String zhText, String enText) => zh ? zhText : enText;

  // ---- app ----
  String get appName => _t('滑滑相簿', 'SwipeAlbum');

  // ---- permission ----
  String get permTitle => _t('讓我們幫你整理相簿', "Let's tidy up your photos");
  String get permBody => _t('需要讀取相簿的權限，才能顯示你的照片和影片。',
      'We need photo library access to show your photos and videos.');
  String get permPrivacy1 => _t('所有分析都在手機上完成，照片不會上傳',
      'Everything runs on your phone. Nothing is uploaded.');
  String get permPrivacy2 => _t('不用註冊帳號', 'No account needed');
  String get permPrivacy3 => _t('真的刪除前，一定會再讓你確認一次',
      'You always confirm before anything is deleted');
  String get permGrant => _t('允許存取相簿', 'Allow photo access');
  String get permDenied => _t('沒有相簿權限，請到系統設定開啟。',
      'Photo access is off. Please enable it in Settings.');
  String get openSettings => _t('開啟設定', 'Open Settings');
  String get limitedNote =>
      _t('你只授權了部分照片', 'You granted access to selected photos only');
  String get pickMore => _t('選擇更多照片', 'Select more photos');
  String loadingLibrary(int n, int total) =>
      _t('正在載入相簿… $n / $total', 'Loading your library… $n / $total');

  // ---- home ----
  String get todayGoal => _t('今日目標', "Today's goal");
  String streakDays(int n) => _t('連續 $n 天', '$n-day streak');
  String get freed => _t('已釋放', 'Freed');
  String get deletedLabel => _t('已刪除', 'Deleted');
  String pendingBanner(int n) =>
      _t('待刪除 $n 項', '$n items waiting to be deleted');
  String get pendingAction => _t('檢查並刪除', 'Review & delete');
  String maybeBanner(int n) => _t('再考慮 $n 項', '$n items to decide later');
  String get maybeAction => _t('回頭決定', 'Decide now');
  String get onThisDay => _t('那年今日', 'On this day');
  String onThisDayCount(int n) => _t('過去的今天，你拍了 $n 張',
      '$n photos from this day in past years');
  String get quickClean => _t('快速清理', 'Quick clean');
  String get deckSimilar => _t('相似照片', 'Similar photos');
  String get deckBlurry => _t('可能模糊', 'Possibly blurry');
  String get deckScreenshots => _t('所有截圖', 'Screenshots');
  String get deckOldScreenshots => _t('舊截圖（30 天前）', 'Old screenshots (30+ days)');
  String get deckVideos => _t('影片（大到小）', 'Videos (largest first)');
  String get deckLine => _t('LINE 圖片', 'LINE images');
  String get deckRandom => _t('隨機回顧', 'Random shuffle');
  String get byMonth => _t('依月份整理', 'By month');
  String monthLabel(MonthKey m) =>
      zh ? '${m.year} 年 ${m.month} 月' : DateFormat.yMMMM('en').format(m.start);
  String monthProgress(int done, int total) =>
      _t('已整理 $done / $total', '$done / $total sorted');
  String get achievementsTitle => _t('成就', 'Achievements');
  String items(int n) => _t('$n 項', '$n items');
  String get libraryEmpty => _t('相簿裡還沒有照片', 'Your library is empty');

  // ---- swipe ----
  String get keep => _t('保留', 'Keep');
  String get delete => _t('刪除', 'Delete');
  String get maybe => _t('再考慮', 'Maybe');
  String get favorite => _t('最愛', 'Favorite');
  String get undo => _t('復原', 'Undo');
  String get addToAlbum => _t('加入相簿', 'Add to album');
  String get newAlbum => _t('新增相簿', 'New album');
  String get albumName => _t('相簿名稱', 'Album name');
  String addedToAlbum(String name) => _t('已加入「$name」', 'Added to "$name"');
  String get addFailed => _t('加入失敗', "Couldn't add");
  String get cancel => _t('取消', 'Cancel');
  String get ok => _t('好', 'OK');
  String get create => _t('建立', 'Create');
  String get deckDone => _t('這組整理完成！', 'All done here!');
  String deckDoneBody(int kept, int deleted) => _t(
      '保留 $kept 項，待刪除 $deleted 項', 'Kept $kept, $deleted in the delete tray');
  String get backHome => _t('回首頁', 'Back home');
  String get emptyDeck => _t('這裡沒有需要整理的項目', 'Nothing to sort here');
  String get compressKeep => _t('壓縮保留', 'Compress & keep');
  String get compressing => _t('正在壓縮影片…', 'Compressing video…');
  String compressDone(String saved) => _t('省下 $saved，原影片已移到待刪除區',
      'Saved $saved. The original is in the delete tray.');
  String get compressNoGain =>
      _t('這部影片已經很小，不需要壓縮', 'This video is already small');
  String get compressFailed => _t('壓縮失敗', 'Compression failed');
  String get favoriteFailed => _t('無法加入最愛', "Couldn't favorite");
  String get manageMediaTitle => _t('開啟「免確認」模式？', 'Skip confirmation pop-ups?');
  String get manageMediaBody => _t(
      'Android 每次加入最愛或刪除都會跳出確認。授權「媒體管理」後，就不會一直跳出來。',
      'Android asks for confirmation every time you favorite or delete. '
          'Granting "media management" access stops the pop-ups.');
  String get grant => _t('授權', 'Allow');
  String get notNow => _t('稍後', 'Not now');
  String get loadingVideo => _t('載入影片中…', 'Loading video…');
  String adIn(int n) => _t('再 $n 張後播放廣告', 'Ad in $n swipes');

  // ---- trash ----
  String get trashTitle => _t('待刪除', 'Delete tray');
  String get trashHint => _t('點一下可以移回，不刪除', 'Tap an item to put it back');
  String trashDeleteAll(int n, String size) =>
      _t('刪除 $n 項（釋放 $size）', 'Delete $n items (free $size)');
  String get trashEmpty => _t('待刪除區是空的', 'The delete tray is empty');
  String get calculating => _t('計算中…', 'calculating…');
  String get cloudWarnTitle => _t('刪除前請注意', 'Before you delete');
  String get cloudWarnIos => _t(
      '如果你有開 iCloud 照片，刪除會同步到所有 Apple 裝置。\n\n照片會先移到「最近刪除」，30 天內都能救回。',
      'If iCloud Photos is on, deleting syncs to all your Apple devices.\n\n'
          'Items go to "Recently Deleted" first and can be recovered for 30 days.');
  String get cloudWarnAndroid => _t(
      '如果你有開 Google 相簿備份或其他雲端同步，刪除可能也會同步到其他裝置。\n\nAndroid 11 以上會先移到垃圾桶，30 天內都能救回。',
      'If Google Photos backup or another cloud sync is on, deleting may sync to other devices.\n\n'
          'On Android 11+ items go to the trash first and can be recovered for 30 days.');
  String get dontShowAgain => _t('不再提醒', "Don't show again");
  String get continueDelete => _t('繼續刪除', 'Delete');
  String deletedDone(int n, String size) =>
      _t('已刪除 $n 項，釋放 $size', 'Deleted $n items, freed $size');
  String get deleteCancelled => _t('沒有刪除任何項目', 'Nothing was deleted');

  // ---- maybe ----
  String get maybeTitle => _t('再考慮', 'Maybe pile');
  String get maybeHint => _t('選兩張，可以並排比較', 'Select two to compare side by side');
  String get compare => _t('並排比較', 'Compare');
  String get swipeAgain => _t('逐張重新滑', 'Swipe through again');
  String get keepAll => _t('全部保留', 'Keep all');
  String get deleteAll => _t('全部移到待刪除', 'Move all to delete tray');
  String get maybeEmpty => _t('沒有待考慮的項目', 'The maybe pile is empty');

  // ---- similar / blurry ----
  String get similarTitle => _t('相似與模糊', 'Similar & blurry');
  String analyzing(int done, int total) =>
      _t('正在手機上分析… $done / $total', 'Analyzing on your phone… $done / $total');
  String get analyzeMore => _t('分析更多照片', 'Analyze more photos');
  String get keepBest => _t('保留最佳，其餘刪除', 'Keep best, delete the rest');
  String get best => _t('最佳', 'Best');
  String get groupHint =>
      _t('點照片可以改選要保留的那張', 'Tap a photo to choose which one to keep');
  String get noSimilar => _t('沒有找到相似照片', 'No similar photos found');
  String get noBlurry => _t('沒有找到模糊照片', 'No blurry photos found');
  String blurryStart(int n) => _t('開始滑這 $n 張', 'Swipe through $n photos');
  String scopeNote(int n) => _t('已分析最近 $n 張照片', 'Analyzed your latest $n photos');
  String groupCount(int n) => _t('$n 組', '$n groups');

  // ---- recap ----
  String get recapTitle => _t('年度整理回顧', 'Year in review');
  String recapHeadline(int year) =>
      _t('$year 我的相簿大掃除', 'My $year photo clean-up');
  String get recapDeleted => _t('清掉', 'Cleared');
  String get recapFreed => _t('釋放空間', 'Space freed');
  String get recapKept => _t('留下的回憶', 'Memories kept');
  String get recapSwipes => _t('總共滑了', 'Total swipes');
  String get recapStreak => _t('最長連續', 'Best streak');
  String get recapShare => _t('分享到 IG 限動', 'Share to stories');
  String get recapFooter => _t('用「滑滑相簿」整理', 'Cleaned with SwipeAlbum');
  String days(int n) => _t('$n 天', '$n days');
  String photos(int n) => _t('$n 張', '$n');

  // ---- settings ----
  String get settingsTitle => _t('設定', 'Settings');
  String get swipeDirection => _t('滑動方向', 'Swipe direction');
  String get dirRightKeep =>
      _t('右滑保留、左滑刪除（同交友軟體）', 'Right = keep, left = delete');
  String get dirLeftKeep => _t('左滑保留、右滑刪除', 'Left = keep, right = delete');
  String get dirHint =>
      _t('上滑＝再考慮　下滑＝加入最愛', 'Up = maybe · Down = favorite');
  String get dailyGoal => _t('每日目標', 'Daily goal');
  String get dailyReminder => _t('每日提醒（晚上 8 點）', 'Daily reminder (8 pm)');
  String get reminderTitle => _t('今天滑幾張吧 📸', 'Time for a quick tidy 📸');
  String get reminderBody =>
      _t('看看那年今日，順便清出一點空間', 'Revisit this day and free up some space');
  String get removeAds => _t('永久移除廣告', 'Remove ads forever');
  String get removeAdsDesc => _t('一次買斷，不是訂閱', 'One-time purchase, not a subscription');
  String get purchased => _t('已購買，感謝支持！', 'Purchased — thank you!');
  String get restore => _t('恢復購買', 'Restore purchase');
  String get storeUnavailable => _t('商店暫時無法連線', 'Store unavailable right now');
  String get adsNote => _t('每滑 100 張會出現一則可以跳過的廣告',
      'A skippable ad appears every 100 swipes');
  String get manageMedia =>
      _t('免確認模式（媒體管理權限）', 'Skip confirmations (media management)');
  String get privacy => _t('隱私', 'Privacy');
  String get privacyBody => _t(
      '照片分析全部在手機上進行，不會上傳任何照片，也不需要帳號。廣告由 Google AdMob 提供。',
      'All photo analysis happens on your phone. No photo is ever uploaded and no account is needed. Ads are served by Google AdMob.');
  String achievementUnlocked(String name) =>
      _t('解鎖成就：$name', 'Achievement unlocked: $name');

  String achievementName(String id) => switch (id) {
        'first_swipe' => _t('第一滑', 'First swipe'),
        'swipes_100' => _t('滑了 100 張', '100 swipes'),
        'swipes_1000' => _t('滑了 1,000 張', '1,000 swipes'),
        'swipes_10000' => _t('滑了 10,000 張', '10,000 swipes'),
        'freed_100mb' => _t('釋放 100 MB', 'Freed 100 MB'),
        'freed_1gb' => _t('釋放 1 GB', 'Freed 1 GB'),
        'freed_10gb' => _t('釋放 10 GB', 'Freed 10 GB'),
        'streak_3' => _t('連續 3 天', '3-day streak'),
        'streak_7' => _t('連續 7 天', '7-day streak'),
        'streak_30' => _t('連續 30 天', '30-day streak'),
        'month_done' => _t('整理完一個月', 'Finished a month'),
        'similar_cleaned' => _t('清掉一組相似照片', 'Cleaned a similar group'),
        _ => id,
      };
}
