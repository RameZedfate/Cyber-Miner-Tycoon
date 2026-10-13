import 'dart:io' show Platform;

/// App-wide constants. Replace every TEST id below with your real ids
/// before publishing (see README.md → 上架前要換掉的設定).
class AppConfig {
  AppConfig._();

  /// Show one skippable interstitial after this many swipes (photos or videos).
  static const int swipesPerAd = 100;

  /// Non-consumable "remove ads forever" product. Create the same id in
  /// App Store Connect and Google Play Console and price it at USD 5.
  static const String removeAdsProductId = 'remove_ads_lifetime';

  static const int defaultDailyGoal = 50;

  /// Screenshots older than this are offered in the "舊截圖" deck.
  static const Duration oldScreenshotAge = Duration(days: 30);

  /// Google's public TEST interstitial unit ids. They never pay out.
  static const String _testInterstitialAndroid =
      'ca-app-pub-3940256099942544/1033173712';
  static const String _testInterstitialIos =
      'ca-app-pub-3940256099942544/4411468910';

  // TODO(release): paste your AdMob interstitial unit ids here.
  static const String _prodInterstitialAndroid = '';
  static const String _prodInterstitialIos = '';

  static String get interstitialAdUnitId {
    if (Platform.isIOS) {
      return _prodInterstitialIos.isNotEmpty
          ? _prodInterstitialIos
          : _testInterstitialIos;
    }
    return _prodInterstitialAndroid.isNotEmpty
        ? _prodInterstitialAndroid
        : _testInterstitialAndroid;
  }
}
