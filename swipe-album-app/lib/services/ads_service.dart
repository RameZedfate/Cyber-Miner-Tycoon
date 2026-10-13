import 'dart:async';

import 'package:google_mobile_ads/google_mobile_ads.dart';

import '../config.dart';

/// One skippable interstitial every [AppConfig.swipesPerAd] swipes.
///
/// "Skippable": AdMob interstitials always have a close button; video
/// creatives become closable after ~5 seconds. In the AdMob console keep the
/// unit's ad types at "Display + Video" (do NOT pick a rewarded format).
class AdsService {
  InterstitialAd? _ad;
  bool _loading = false;
  bool _ready = false;
  bool _disabled = false;

  bool get isAdLoaded => _ad != null;

  /// Runs Google's consent flow (GDPR/CCPA regions only show a form),
  /// then initialises the SDK and preloads the first ad.
  Future<void> init({required bool adsRemoved}) async {
    _disabled = adsRemoved;
    if (_disabled) return;
    await _gatherConsent();
    if (!await ConsentInformation.instance.canRequestAds()) return;
    await MobileAds.instance.initialize();
    _ready = true;
    preload();
  }

  Future<void> _gatherConsent() {
    final Completer<void> done = Completer<void>();
    ConsentInformation.instance.requestConsentInfoUpdate(
      ConsentRequestParameters(),
      () async {
        await ConsentForm.loadAndShowConsentFormIfRequired((FormError? _) {
          if (!done.isCompleted) done.complete();
        });
        if (!done.isCompleted) done.complete();
      },
      (FormError _) {
        if (!done.isCompleted) done.complete();
      },
    );
    return done.future.timeout(const Duration(seconds: 15), onTimeout: () {});
  }

  void preload() {
    if (_disabled || !_ready || _loading || _ad != null) return;
    _loading = true;
    InterstitialAd.load(
      adUnitId: AppConfig.interstitialAdUnitId,
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (InterstitialAd ad) {
          _ad = ad;
          _loading = false;
        },
        onAdFailedToLoad: (LoadAdError error) {
          _loading = false;
          // Retry later; the gate keeps the ad "due" until one is shown.
          Future<void>.delayed(const Duration(seconds: 30), preload);
        },
      ),
    );
  }

  /// Shows the ad if one is loaded. Completes with true after it was shown
  /// and dismissed, false if nothing could be shown.
  Future<bool> show() {
    final InterstitialAd? ad = _ad;
    if (_disabled || ad == null) {
      preload();
      return Future<bool>.value(false);
    }
    _ad = null;
    final Completer<bool> result = Completer<bool>();
    ad.fullScreenContentCallback = FullScreenContentCallback<InterstitialAd>(
      onAdDismissedFullScreenContent: (InterstitialAd ad) {
        ad.dispose();
        preload();
        if (!result.isCompleted) result.complete(true);
      },
      onAdFailedToShowFullScreenContent: (InterstitialAd ad, AdError error) {
        ad.dispose();
        preload();
        if (!result.isCompleted) result.complete(false);
      },
    );
    ad.show();
    return result.future;
  }

  /// Called after a successful "remove ads" purchase.
  void disable() {
    _disabled = true;
    _ad?.dispose();
    _ad = null;
  }
}
