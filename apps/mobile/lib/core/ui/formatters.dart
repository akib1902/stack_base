import 'package:intl/intl.dart';

String formatBytes(int bytes) {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  var value = bytes.toDouble();
  var unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  final digits = value >= 100 || unit == 0 ? 0 : 1;
  return '${value.toStringAsFixed(digits)} ${units[unit]}';
}

String formatDate(DateTime value) {
  final local = value.toLocal();
  final now = DateTime.now();
  final sameDay =
      local.year == now.year &&
      local.month == now.month &&
      local.day == now.day;
  if (sameDay) return 'Today, ${DateFormat.Hm().format(local)}';
  return DateFormat.yMMMd().format(local);
}

String initialsFor(String? displayName, String? email) {
  final source = (displayName ?? email ?? '').trim();
  if (source.isEmpty) return '?';
  final parts = source.split(RegExp(r'[\s@._-]+')).where((p) => p.isNotEmpty);
  if (parts.isEmpty) return source.characters.first.toUpperCase();
  final first = parts.first.characters.first;
  final last = parts.length > 1 ? parts.elementAt(1).characters.first : '';
  return '$first$last'.toUpperCase();
}
