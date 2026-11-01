import 'package:integration_test/integration_test.dart';

import '../test/crypto/vectors_test.dart' as vectors;

/// Runs the same `stackbase/1` vectors on a real Android device or emulator,
/// where libsodium is built from source by the sodium build hook.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  vectors.main();
}
