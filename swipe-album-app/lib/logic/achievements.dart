/// Gamification badges. Ids are stable (persisted); titles live in l10n.
class Achievement {
  const Achievement(this.id, this.emoji);
  final String id;
  final String emoji;
}

const List<Achievement> allAchievements = <Achievement>[
  Achievement('first_swipe', '👋'),
  Achievement('swipes_100', '💯'),
  Achievement('swipes_1000', '🏃'),
  Achievement('swipes_10000', '🏆'),
  Achievement('freed_100mb', '🧹'),
  Achievement('freed_1gb', '💾'),
  Achievement('freed_10gb', '🚀'),
  Achievement('streak_3', '🔥'),
  Achievement('streak_7', '📅'),
  Achievement('streak_30', '👑'),
  Achievement('month_done', '✅'),
  Achievement('similar_cleaned', '🎯'),
];

class AchievementInput {
  const AchievementInput({
    required this.totalSwipes,
    required this.bytesFreed,
    required this.bestStreak,
  });

  final int totalSwipes;
  final int bytesFreed;
  final int bestStreak;
}

const int _mb = 1024 * 1024;
const int _gb = 1024 * _mb;

/// Badges earned purely from counters. Event badges (month_done,
/// similar_cleaned) are unlocked explicitly by the UI.
Set<String> earnedFromCounters(AchievementInput s) {
  return <String>{
    if (s.totalSwipes >= 1) 'first_swipe',
    if (s.totalSwipes >= 100) 'swipes_100',
    if (s.totalSwipes >= 1000) 'swipes_1000',
    if (s.totalSwipes >= 10000) 'swipes_10000',
    if (s.bytesFreed >= 100 * _mb) 'freed_100mb',
    if (s.bytesFreed >= _gb) 'freed_1gb',
    if (s.bytesFreed >= 10 * _gb) 'freed_10gb',
    if (s.bestStreak >= 3) 'streak_3',
    if (s.bestStreak >= 7) 'streak_7',
    if (s.bestStreak >= 30) 'streak_30',
  };
}
