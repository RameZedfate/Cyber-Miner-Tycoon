// Name-based album detection used on Android (folders) and as a fallback on
// iOS. iOS screenshots are detected precisely through the system
// "Screenshots" smart album instead.

final RegExp _screenshotName = RegExp(
  r'(screenshot|screen shot|screen_shot|截圖|截图|螢幕截圖|屏幕截图|スクリーンショット|스크린샷|ảnh chụp màn hình|ภาพหน้าจอ)',
  caseSensitive: false,
);

bool isScreenshotAlbumName(String name) => _screenshotName.hasMatch(name);

/// LINE saves received photos into a "LINE" album/folder (Android:
/// Pictures/LINE, iOS: album "LINE"). Matches "LINE", "LINE Album", "line_xxx"
/// but not words that merely contain the letters, like "Timeline".
final RegExp _lineName = RegExp(r'^line(\b|_|$)', caseSensitive: false);

bool isLineAlbumName(String name) => _lineName.hasMatch(name.trim());
