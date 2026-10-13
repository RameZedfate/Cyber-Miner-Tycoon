/// Human readable byte size, e.g. 1536 → "1.5 KB".
String formatBytes(int bytes) {
  if (bytes < 1024) return '$bytes B';
  const List<String> units = <String>['KB', 'MB', 'GB', 'TB'];
  double value = bytes / 1024;
  int unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  final String text =
      value >= 100 ? value.toStringAsFixed(0) : value.toStringAsFixed(1);
  return '$text ${units[unit]}';
}

String formatDuration(Duration d) {
  final int minutes = d.inMinutes;
  final int seconds = d.inSeconds % 60;
  return '$minutes:${seconds.toString().padLeft(2, '0')}';
}

/// yyyy-MM-dd in local time; used as the day key for streaks.
String dayKey(DateTime t) =>
    '${t.year.toString().padLeft(4, '0')}-'
    '${t.month.toString().padLeft(2, '0')}-'
    '${t.day.toString().padLeft(2, '0')}';

/// A calendar month, used to group the library.
class MonthKey implements Comparable<MonthKey> {
  const MonthKey(this.year, this.month);

  factory MonthKey.of(DateTime t) => MonthKey(t.year, t.month);

  final int year;
  final int month;

  DateTime get start => DateTime(year, month);
  DateTime get end => DateTime(year, month + 1);

  @override
  int compareTo(MonthKey other) =>
      year != other.year ? year - other.year : month - other.month;

  @override
  bool operator ==(Object other) =>
      other is MonthKey && other.year == year && other.month == month;

  @override
  int get hashCode => year * 100 + month;

  @override
  String toString() => '$year-${month.toString().padLeft(2, '0')}';
}
