import 'package:flutter_test/flutter_test.dart';
import 'package:swipe_album/logic/swipe_logic.dart';
import 'package:swipe_album/state/app_state.dart';

void main() {
  late DateTime now;
  late MemoryStateStorage storage;
  late AppState state;

  setUp(() {
    now = DateTime(2026, 10, 13, 9);
    storage = MemoryStateStorage();
    state = AppState(storage, clock: () => now);
  });

  test('swipes record decisions and counters', () {
    state.applySwipe('a', SwipeAction.keep);
    state.applySwipe('b', SwipeAction.delete);
    state.applySwipe('c', SwipeAction.maybe);
    state.applySwipe('d', SwipeAction.favorite);

    expect(state.decisionOf('a'), Decision.keep);
    expect(state.decisionOf('b'), Decision.pendingDelete);
    expect(state.decisionOf('c'), Decision.maybe);
    expect(state.decisionOf('d'), Decision.keep);
    expect(state.totalSwipes, 4);
    expect(state.swipesSinceAd, 4);
    expect(state.keptCount, 2);
    expect(state.todaySwipes, 4);
    expect(state.statsFor(2026).swipes, 4);
    expect(state.countWith(Decision.pendingDelete), 1);
  });

  test('undo restores the decision but not the ad counter', () {
    final SwipeRecord r = state.applySwipe('a', SwipeAction.keep);
    state.undo(r);
    expect(state.decisionOf('a'), isNull);
    expect(state.keptCount, 0);
    expect(state.swipesSinceAd, 1, reason: 'undo must not be a way to skip ads');
  });

  test('undo of a re-swiped maybe goes back to maybe', () {
    state.applySwipe('a', SwipeAction.maybe);
    final SwipeRecord r = state.applySwipe('a', SwipeAction.delete);
    state.undo(r);
    expect(state.decisionOf('a'), Decision.maybe);
  });

  test('recordDeleted clears decisions and adds freed bytes', () {
    state.applySwipe('a', SwipeAction.delete);
    state.applySwipe('b', SwipeAction.delete);
    state.recordDeleted(<String>['a', 'b'], 3000);
    expect(state.decisionOf('a'), isNull);
    expect(state.deletedCount, 2);
    expect(state.bytesFreed, 3000);
    expect(state.statsFor(2026).deleted, 2);
    expect(state.statsFor(2026).bytesFreed, 3000);
  });

  test('streak grows on consecutive days and resets after a gap', () {
    state.applySwipe('a', SwipeAction.keep);
    expect(state.streak, 1);

    now = DateTime(2026, 10, 14, 22);
    expect(state.todaySwipes, 0, reason: 'daily counter resets on a new day');
    state.applySwipe('b', SwipeAction.keep);
    expect(state.streak, 2);

    now = DateTime(2026, 10, 15, 8); // next day, not swiped yet: streak still alive
    expect(state.streak, 2);

    now = DateTime(2026, 10, 17, 8); // missed a whole day
    expect(state.streak, 0);
    state.applySwipe('c', SwipeAction.keep);
    expect(state.streak, 1);
    expect(state.bestStreak, 2);
  });

  test('streak survives month boundaries', () {
    now = DateTime(2026, 10, 31, 23);
    state.applySwipe('a', SwipeAction.keep);
    now = DateTime(2026, 11, 1, 1);
    state.applySwipe('b', SwipeAction.keep);
    expect(state.streak, 2);
  });

  test('achievements are reported once', () {
    state.applySwipe('a', SwipeAction.keep);
    expect(state.takeFreshAchievements(), contains('first_swipe'));
    state.applySwipe('b', SwipeAction.keep);
    expect(state.takeFreshAchievements(), isEmpty);
    state.unlock('month_done');
    state.unlock('month_done');
    expect(state.takeFreshAchievements(), <String>['month_done']);
  });

  test('markAdShown resets only the ad counter', () {
    for (int i = 0; i < 100; i++) {
      state.applySwipe('id$i', SwipeAction.keep);
    }
    expect(state.swipesSinceAd, 100);
    state.markAdShown();
    expect(state.swipesSinceAd, 0);
    expect(state.totalSwipes, 100);
  });

  test('pruneMissing drops decisions for assets deleted elsewhere', () {
    state.applySwipe('a', SwipeAction.keep);
    state.applySwipe('b', SwipeAction.maybe);
    state.pruneMissing(<String>{'a'});
    expect(state.decisionOf('a'), Decision.keep);
    expect(state.decisionOf('b'), isNull);
  });

  test('persists and reloads everything', () async {
    state.applySwipe('a', SwipeAction.keep);
    state.applySwipe('b', SwipeAction.delete);
    state.setRightIsKeep(false);
    state.setDailyGoal(80);
    state.setAdsRemoved(true);
    state.ackCloudWarning();
    state.recordDeleted(<String>['b'], 1234);
    await state.flush();

    final AppState reloaded = AppState(storage, clock: () => now);
    await reloaded.load();
    expect(reloaded.decisionOf('a'), Decision.keep);
    expect(reloaded.decisionOf('b'), isNull);
    expect(reloaded.rightIsKeep, isFalse);
    expect(reloaded.dailyGoal, 80);
    expect(reloaded.adsRemoved, isTrue);
    expect(reloaded.cloudWarningAcked, isTrue);
    expect(reloaded.bytesFreed, 1234);
    expect(reloaded.totalSwipes, 2);
    expect(reloaded.streak, 1);
    expect(reloaded.statsFor(2026).deleted, 1);
    expect(reloaded.achievements, contains('first_swipe'));
  });

  test('corrupt storage starts fresh instead of crashing', () async {
    storage.data = '{not json';
    final AppState s = AppState(storage, clock: () => now);
    await s.load();
    expect(s.totalSwipes, 0);
  });

  test('daily goal is clamped', () {
    state.setDailyGoal(1);
    expect(state.dailyGoal, 10);
    state.setDailyGoal(9999);
    expect(state.dailyGoal, 500);
  });
}
