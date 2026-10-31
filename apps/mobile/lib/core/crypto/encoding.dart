import 'dart:convert';
import 'dart:typed_data';

const String _hexDigits = '0123456789abcdef';

/// Canonical base64: padded, standard alphabet. The API schemas accept exactly
/// this form, so the client must produce it and reject anything else.
final RegExp _base64Pattern = RegExp(
  r'^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$',
);

final RegExp _hexPattern = RegExp(r'^[0-9a-f]{64}$');

String toHex(List<int> bytes) {
  final out = StringBuffer();
  for (final byte in bytes) {
    out
      ..write(_hexDigits[byte >> 4])
      ..write(_hexDigits[byte & 0x0f]);
  }
  return out.toString();
}

Uint8List fromHex(String value) {
  if (value.length.isOdd || !RegExp(r'^[0-9a-fA-F]*$').hasMatch(value)) {
    throw const FormatException('Not a hex string.');
  }
  final bytes = Uint8List(value.length ~/ 2);
  for (var index = 0; index < bytes.length; index += 1) {
    bytes[index] = int.parse(value.substring(index * 2, index * 2 + 2), radix: 16);
  }
  return bytes;
}

String toBase64(Uint8List bytes) => base64Encode(bytes);

Uint8List fromBase64(String value) {
  if (!_base64Pattern.hasMatch(value)) {
    throw const FormatException('Not canonical base64.');
  }
  return base64Decode(value);
}

bool isLowercaseSha256Hex(String value) => _hexPattern.hasMatch(value);

String toBase64Url(Uint8List bytes) =>
    base64UrlEncode(bytes).replaceAll('=', '');

Uint8List fromBase64Url(String value) {
  if (!RegExp(r'^[A-Za-z0-9_-]{43}$').hasMatch(value)) {
    throw const FormatException('Not a 32-byte base64url value.');
  }
  final padded = value.replaceAll('-', '+').replaceAll('_', '/').padRight(44, '=');
  final bytes = base64Decode(padded);
  if (bytes.length != 32) {
    throw const FormatException('Not a 32-byte base64url value.');
  }
  return bytes;
}

Uint8List utf8Bytes(String value) => Uint8List.fromList(utf8.encode(value));

String bytesToUtf8(Uint8List bytes) => utf8.decode(bytes);

bool equalBytes(Uint8List a, Uint8List b) {
  if (a.length != b.length) return false;
  var difference = 0;
  for (var index = 0; index < a.length; index += 1) {
    difference |= a[index] ^ b[index];
  }
  return difference == 0;
}

Uint8List concatBytes(Iterable<Uint8List> parts) {
  final total = parts.fold<int>(0, (sum, part) => sum + part.length);
  final out = Uint8List(total);
  var offset = 0;
  for (final part in parts) {
    out.setRange(offset, offset + part.length, part);
    offset += part.length;
  }
  return out;
}

/// Best-effort zeroization of Dart-owned key bytes. Native [SecureKey] values
/// zero themselves on dispose; this covers the copies that cross isolates.
void zeroBytes(Uint8List bytes) => bytes.fillRange(0, bytes.length, 0);
