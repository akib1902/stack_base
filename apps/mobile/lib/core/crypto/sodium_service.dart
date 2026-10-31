import 'dart:typed_data';

import 'package:sodium/sodium_sumo.dart';

/// The single libsodium sumo instance for the app. `sodium` 4 builds and loads
/// the native library through Dart build hooks. The package's portable
/// initializer is typed `FutureOr`, so callers await it once and reuse this
/// service for every operation.
///
/// Tests inject a service through the crypto classes instead of reading a
/// global, but production still needs one process-wide instance because the
/// FFI bindings are not cheap to recreate.
class SodiumService {
  SodiumService._(this.raw);

  final SodiumSumo raw;

  static Future<SodiumService>? _loading;

  static Future<SodiumService> instance() => _loading ??= _create();

  static Future<SodiumService> _create() async {
    final sodium = await SodiumSumoInit.init();
    return SodiumService._(sodium);
  }

  SecureKey keyFromBytes(Uint8List bytes) => SecureKey.fromList(raw, bytes);

  SecureKey newKey() => raw.crypto.secretBox.keygen();

  Uint8List randomBytes(int length) => raw.randombytes.buf(length);
}
