import 'dart:typed_data';

/// An authenticated ciphertext response body plus the headers the client must
/// verify before it attempts decryption.
class CiphertextDownload {
  const CiphertextDownload({
    required this.stream,
    required this.contentLength,
    required this.ciphertextHash,
    required this.formatVersion,
  });

  final Stream<Uint8List> stream;
  final int? contentLength;
  final String? ciphertextHash;
  final String? formatVersion;
}
