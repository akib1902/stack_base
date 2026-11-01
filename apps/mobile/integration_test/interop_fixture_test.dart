import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart' show sha256;
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:stackbase_mobile/core/crypto/encoding.dart';
import 'package:stackbase_mobile/core/crypto/file_format.dart';
import 'package:stackbase_mobile/core/crypto/sodium_service.dart';

/// Produces a deterministic Flutter-encrypted stream for
/// `tool/interop/verify_flutter_fixture.mjs`. The fixture contains ciphertext,
/// the pinned test vault key and the manifest — never a production key.
///
/// Run on Android:
///   flutter test integration_test/interop_fixture_test.dart -d emulator-5554
/// Then pull the printed path and run the Node verifier against it.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('writes Flutter ciphertext for Node interop', (tester) async {
    const chunkSize = 64 * 1024;
    const size = 70_000;
    final vaultKey = fromHex(
      '404142434445464748494a4b4c4d4e4f'
      '505152535455565758595a5b5c5d5e5f',
    );
    final plaintext = Uint8List(size);
    for (var index = 0; index < plaintext.length; index += 1) {
      plaintext[index] = (index * 31 + 7) & 0xff;
    }

    final crypto = FileCrypto(await SodiumService.instance());
    final encrypted = await crypto.encryptBytes(
      plaintext: plaintext,
      vaultKey: vaultKey,
      chunkSize: chunkSize,
    );
    expect(encrypted.manifest.chunking.totalChunks, 2);
    expect(encrypted.ciphertext.length, encrypted.manifest.ciphertextSize);

    final fixture = <String, dynamic>{
      'description':
          'Produced by Flutter sodium 4.1.2+1 through '
          'integration_test/interop_fixture_test.dart. Do not edit by hand.',
      'vaultKeyHex': toHex(vaultKey),
      'chunkSize': chunkSize,
      'plaintextSha256': sha256.convert(plaintext).toString(),
      'ciphertextBase64': base64Encode(encrypted.ciphertext),
      'ciphertextSha256': sha256.convert(encrypted.ciphertext).toString(),
      'manifest': encrypted.manifest.toJson(),
    };

    final directory = await getApplicationSupportDirectory();
    final file = File(p.join(directory.path, 'interop-flutter-to-web.json'));
    await file.writeAsString(
      '${const JsonEncoder.withIndent('  ').convert(fixture)}\n',
      flush: true,
    );
    // ignore: avoid_print
    print('INTEROP_FIXTURE_PATH=${file.path}');
    expect(await file.exists(), isTrue);
  });
}
