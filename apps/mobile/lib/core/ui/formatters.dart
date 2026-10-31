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

/// Short, honest freshness label. A future timestamp is treated as "just now"
/// rather than showing a negative age.
String formatRelativeTime(DateTime value, {DateTime? now}) {
  final current = (now ?? DateTime.now()).toUtc();
  final difference = current.difference(value.toUtc());
  if (difference.inSeconds < 45) return 'just now';
  if (difference.inMinutes < 60) return '${difference.inMinutes} min ago';
  if (difference.inHours < 24) return '${difference.inHours} h ago';
  if (difference.inDays < 7) return '${difference.inDays} d ago';
  return formatDate(value);
}

String initialsFor(String? displayName, String? email) {
  final source = (displayName ?? email ?? '').trim();
  if (source.isEmpty) return '?';
  final parts = source.split(RegExp(r'[\s@._-]+')).where((p) => p.isNotEmpty);
  if (parts.isEmpty) return source.substring(0, 1).toUpperCase();
  final first = parts.first.substring(0, 1);
  final second = parts.length > 1 ? parts.elementAt(1).substring(0, 1) : '';
  return '$first$second'.toUpperCase();
}
