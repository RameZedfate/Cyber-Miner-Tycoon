/// Pure rule for "one skippable ad every N swipes".
///
/// The counter is never decremented by undo, and a due ad stays due until
/// it is actually shown, so a slow network can't be used to skip ads forever
/// and a failed load doesn't punish the user with two ads in a row.
class AdGate {
  const AdGate({required this.swipesPerAd});

  final int swipesPerAd;

  bool isDue({required int swipesSinceAd, required bool adsRemoved}) {
    if (adsRemoved) return false;
    return swipesSinceAd >= swipesPerAd;
  }

  /// Swipes left before the next ad, for the small counter in the swipe UI.
  int remaining({required int swipesSinceAd}) {
    final int left = swipesPerAd - swipesSinceAd;
    return left < 0 ? 0 : left;
  }
}
