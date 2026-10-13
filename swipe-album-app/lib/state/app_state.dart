import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';

import '../config.dart';
import '../logic/achievements.dart';
import '../logic/formatters.dart';
import '../logic/swipe_logic.dart';

/// What the user decided about one photo/video. Favorites are stored as
/// [keep]; the heart itself lives in the system photo library.
enum Decision { keep, pendingDelete, maybe }

class YearStats {
  int deleted = 0;
  int kept = 0;
  int bytesFreed = 0;
  int swipes = 0;

  Map<String, int> toJson() => <String, int>{
        'deleted': deleted,
        'kept': kept,
        'bytes': bytesFreed,
        'swipes': swipes,
      };

  static YearStats fromJson(Map<String, dynamic> j) => YearStats()
    ..deleted = (j['deleted'] as num?)?.toInt() ?? 0
    ..kept = (j['kept'] as num?)?.toInt() ?? 0
    ..bytesFreed = (j['bytes'] as num?)?.toInt() ?? 0
    ..swipes = (j['swipes'] as num?)?.toInt() ?? 0;
}

/// Everything needed to undo one swipe.
class SwipeRecord {
  const SwipeRecord({
    required this.assetId,
    required this.action,
    required this.previous,
    required this.year,
  });

  final String assetId;
  final SwipeAction action;
  final Decision? previous;
  final int year;
}

abstract class StateStorage {
  Future<String?> read();
  Future<void> write(String data);
}

class FileStateStorage implements StateStorage {
  FileStateStorage(this.file);
  final File file;

  @override
  Future<String?> read() async =>
      await file.exists() ? file.readAsString() : null;

  @override
  Future<void> write(String data) async {
    final File tmp = File('${file.path}.tmp');
    await tmp.writeAsString(data, flush: true);
    await tmp.rename(file.path); // atomic replace, no half-written state
  }
}

class MemoryStateStorage implements StateStorage {
  String? data;
  @override
  Future<String?> read() async => data;
  @override
  Future<void> write(String value) async => data = value;
}

/// The app's persisted state: decisions, stats, streaks, settings.
class AppState extends ChangeNotifier {
  AppState(this._storage, {DateTime Function()? clock})
      : _clock = clock ?? DateTime.now;

  final StateStorage _storage;
  final DateTime Function() _clock;
  Timer? _saveTimer;

  // ---- decisions ----
  final Map<String, Decision> _decisions = <String, Decision>{};

  // ---- settings ----
  bool rightIsKeep = true;
  int dailyGoal = AppConfig.defaultDailyGoal;
  bool reminderOn = true;
  bool cloudWarningAcked = false;
  bool adsRemoved = false;

  // ---- counters ----
  int totalSwipes = 0;
  int swipesSinceAd = 0;
  int deletedCount = 0;
  int keptCount = 0;
  int bytesFreed = 0;
  final Map<int, YearStats> _years = <int, YearStats>{};

  // ---- streak / daily goal ----
  String? _lastActiveDay;
  int _streak = 0;
  int bestStreak = 0;
  String? _todayKey;
  int _todaySwipes = 0;

  final Set<String> achievements = <String>{};

  /// Achievements unlocked since the UI last asked; shown as a toast.
  final List<String> _freshAchievements = <String>[];

  // ------------------------------------------------------------------ load
  Future<void> load() async {
    final String? raw = await _storage.read();
    if (raw == null || raw.isEmpty) return;
    try {
      _fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      // Corrupt or incompatible file: start fresh rather than crash on launch.
    }
    notifyListeners();
  }

  void _fromJson(Map<String, dynamic> j) {
    final Map<String, dynamic> d =
        (j['decisions'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    _decisions
      ..clear()
      ..addEntries(d.entries.map((MapEntry<String, dynamic> e) =>
          MapEntry<String, Decision>(e.key, Decision.values[e.value as int])));
    rightIsKeep = j['rightIsKeep'] as bool? ?? true;
    dailyGoal = (j['dailyGoal'] as num?)?.toInt() ?? AppConfig.defaultDailyGoal;
    reminderOn = j['reminderOn'] as bool? ?? true;
    cloudWarningAcked = j['cloudWarningAcked'] as bool? ?? false;
    adsRemoved = j['adsRemoved'] as bool? ?? false;
    totalSwipes = (j['totalSwipes'] as num?)?.toInt() ?? 0;
    swipesSinceAd = (j['swipesSinceAd'] as num?)?.toInt() ?? 0;
    deletedCount = (j['deletedCount'] as num?)?.toInt() ?? 0;
    keptCount = (j['keptCount'] as num?)?.toInt() ?? 0;
    bytesFreed = (j['bytesFreed'] as num?)?.toInt() ?? 0;
    _years.clear();
    ((j['years'] as Map<String, dynamic>?) ?? <String, dynamic>{})
        .forEach((String k, dynamic v) {
      _years[int.parse(k)] = YearStats.fromJson(v as Map<String, dynamic>);
    });
    _lastActiveDay = j['lastActiveDay'] as String?;
    _streak = (j['streak'] as num?)?.toInt() ?? 0;
    bestStreak = (j['bestStreak'] as num?)?.toInt() ?? 0;
    _todayKey = j['todayKey'] as String?;
    _todaySwipes = (j['todaySwipes'] as num?)?.toInt() ?? 0;
    achievements
      ..clear()
      ..addAll(((j['achievements'] as List<dynamic>?) ?? <dynamic>[])
          .cast<String>());
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'v': 1,
        'decisions': _decisions
            .map((String k, Decision v) => MapEntry<String, int>(k, v.index)),
        'rightIsKeep': rightIsKeep,
        'dailyGoal': dailyGoal,
        'reminderOn': reminderOn,
        'cloudWarningAcked': cloudWarningAcked,
        'adsRemoved': adsRemoved,
        'totalSwipes': totalSwipes,
        'swipesSinceAd': swipesSinceAd,
        'deletedCount': deletedCount,
        'keptCount': keptCount,
        'bytesFreed': bytesFreed,
        'years': _years.map((int k, YearStats v) =>
            MapEntry<String, dynamic>('$k', v.toJson())),
        'lastActiveDay': _lastActiveDay,
        'streak': _streak,
        'bestStreak': bestStreak,
        'todayKey': _todayKey,
        'todaySwipes': _todaySwipes,
        'achievements': achievements.toList(),
      };

  // ------------------------------------------------------------------ save
  void _changed() {
    _checkCounterAchievements();
    notifyListeners();
    _saveTimer?.cancel();
    _saveTimer = Timer(const Duration(milliseconds: 600), flush);
  }

  Future<void> flush() async {
    _saveTimer?.cancel();
    _saveTimer = null;
    await _storage.write(jsonEncode(toJson()));
  }

  @override
  void dispose() {
    _saveTimer?.cancel();
    super.dispose();
  }

  // ------------------------------------------------------------- decisions
  Decision? decisionOf(String id) => _decisions[id];

  bool isUndecided(String id) => !_decisions.containsKey(id);

  List<String> idsWith(Decision d) => _decisions.entries
      .where((MapEntry<String, Decision> e) => e.value == d)
      .map((MapEntry<String, Decision> e) => e.key)
      .toList();

  int countWith(Decision d) =>
      _decisions.values.where((Decision v) => v == d).length;

  YearStats _year(int y) => _years.putIfAbsent(y, YearStats.new);

  YearStats statsFor(int year) => _years[year] ?? YearStats();

  /// Records one swipe and returns what's needed to undo it.
  SwipeRecord applySwipe(String id, SwipeAction action) {
    final DateTime now = _clock();
    final Decision? previous = _decisions[id];
    _decisions[id] = switch (action) {
      SwipeAction.keep || SwipeAction.favorite => Decision.keep,
      SwipeAction.delete => Decision.pendingDelete,
      SwipeAction.maybe => Decision.maybe,
    };
    if (action == SwipeAction.keep || action == SwipeAction.favorite) {
      keptCount++;
      _year(now.year).kept++;
    }
    totalSwipes++;
    swipesSinceAd++;
    _year(now.year).swipes++;
    _touchDay(now);
    _todaySwipes++;
    _changed();
    return SwipeRecord(
        assetId: id, action: action, previous: previous, year: now.year);
  }

  /// Reverts a swipe's decision. The ad counter and daily progress are left
  /// alone on purpose (undo is not a way to skip ads).
  void undo(SwipeRecord r) {
    if (r.previous == null) {
      _decisions.remove(r.assetId);
    } else {
      _decisions[r.assetId] = r.previous!;
    }
    if (r.action == SwipeAction.keep || r.action == SwipeAction.favorite) {
      keptCount = math.max(0, keptCount - 1);
      final YearStats y = _year(r.year);
      y.kept = math.max(0, y.kept - 1);
    }
    _changed();
  }

  /// Direct decision change from review screens (maybe pile, similar groups,
  /// trash tray). Not counted as a swipe.
  void setDecision(String id, Decision? decision) {
    final Decision? before = _decisions[id];
    if (decision == null) {
      _decisions.remove(id);
    } else {
      _decisions[id] = decision;
    }
    if (decision == Decision.keep && before != Decision.keep) {
      keptCount++;
      _year(_clock().year).kept++;
    }
    _changed();
  }

  /// Call after the OS confirmed the deletion.
  void recordDeleted(List<String> ids, int bytes) {
    final DateTime now = _clock();
    for (final String id in ids) {
      _decisions.remove(id);
    }
    deletedCount += ids.length;
    bytesFreed += bytes;
    final YearStats y = _year(now.year);
    y.deleted += ids.length;
    y.bytesFreed += bytes;
    _changed();
  }

  /// Drops decisions for assets that no longer exist (deleted elsewhere).
  void pruneMissing(Set<String> existingIds) {
    final int before = _decisions.length;
    _decisions.removeWhere((String id, _) => !existingIds.contains(id));
    if (_decisions.length != before) _changed();
  }

  // ----------------------------------------------------------- ads / IAP
  void markAdShown() {
    swipesSinceAd = 0;
    _changed();
  }

  void setAdsRemoved(bool value) {
    if (adsRemoved == value) return;
    adsRemoved = value;
    _changed();
  }

  // -------------------------------------------------------------- settings
  void setRightIsKeep(bool v) {
    rightIsKeep = v;
    _changed();
  }

  void setDailyGoal(int v) {
    dailyGoal = v.clamp(10, 500);
    _changed();
  }

  void setReminderOn(bool v) {
    reminderOn = v;
    _changed();
  }

  void ackCloudWarning() {
    cloudWarningAcked = true;
    _changed();
  }

  // --------------------------------------------------------- streak / goal
  void _touchDay(DateTime now) {
    final String today = dayKey(now);
    if (_todayKey != today) {
      _todayKey = today;
      _todaySwipes = 0;
    }
    if (_lastActiveDay == today) return;
    final String yesterday =
        dayKey(DateTime(now.year, now.month, now.day - 1));
    _streak = _lastActiveDay == yesterday ? _streak + 1 : 1;
    bestStreak = math.max(bestStreak, _streak);
    _lastActiveDay = today;
  }

  /// Current streak; drops to 0 once a whole day is missed.
  int get streak {
    final DateTime now = _clock();
    final String today = dayKey(now);
    final String yesterday =
        dayKey(DateTime(now.year, now.month, now.day - 1));
    if (_lastActiveDay == today || _lastActiveDay == yesterday) return _streak;
    return 0;
  }

  int get todaySwipes => _todayKey == dayKey(_clock()) ? _todaySwipes : 0;

  // ---------------------------------------------------------- achievements
  void _checkCounterAchievements() {
    final Set<String> earned = earnedFromCounters(AchievementInput(
      totalSwipes: totalSwipes,
      bytesFreed: bytesFreed,
      bestStreak: bestStreak,
    ));
    for (final String id in earned) {
      if (achievements.add(id)) _freshAchievements.add(id);
    }
  }

  void unlock(String id) {
    if (achievements.add(id)) {
      _freshAchievements.add(id);
      _changed();
    }
  }

  /// Returns and clears achievements unlocked since the last call.
  List<String> takeFreshAchievements() {
    final List<String> out = List<String>.of(_freshAchievements);
    _freshAchievements.clear();
    return out;
  }
}
