import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:stackbase_mobile/bootstrap.dart' as app;
import 'package:stackbase_mobile/core/auth/secure_session_store.dart';

/// On-device development sign-in and account isolation. Requires the local API:
///
///   flutter test integration_test/auth_flow_test.dart -d <device> \
///     --dart-define=API_BASE_URL=http://10.0.2.2:8787 \
///     --dart-define=AUTH_MODE=dev
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('signs in, clears the account, and signs in as a second user', (
    tester,
  ) async {
    final suffix = DateTime.now().millisecondsSinceEpoch;
    final firstEmail = 'emulator-a-$suffix@example.test';
    final secondEmail = 'emulator-b-$suffix@example.test';
    final store = SecureSessionStore(PlatformSecureKeyValueStore());

    await app.bootstrap();
    await tester.pumpAndSettle();

    expect(
      find.text('Use development session'),
      findsOneWidget,
      reason: 'The app must start on the real sign-in surface.',
    );

    await _signIn(tester, firstEmail);
    final firstRaw = await store.readDevSession();
    expect(firstRaw, isNotNull);
    final firstJson = jsonDecode(firstRaw!) as Map<String, dynamic>;
    final firstUserId = firstJson['userId'] as String;
    await store.writeAccountSecret(firstUserId, 'probe', 'first-account');

    // Settings → Sign out. The dialog is the only FilledButton with this label.
    await tester.tap(find.byIcon(Icons.settings_outlined));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.widgetWithText(OutlinedButton, 'Sign out'),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.widgetWithText(OutlinedButton, 'Sign out'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Sign out'));
    await tester.pumpAndSettle();

    expect(find.text('Use development session'), findsOneWidget);
    expect(
      await store.readAccountSecret(firstUserId, 'probe'),
      isNull,
      reason: 'Sign-out must remove the departing account namespace.',
    );

    await _signIn(tester, secondEmail);
    final secondRaw = await store.readDevSession();
    expect(secondRaw, contains(secondEmail));
    expect(secondRaw, isNot(contains(firstEmail)));
    expect(find.text(firstEmail), findsNothing);
  });
}

Future<void> _signIn(WidgetTester tester, String email) async {
  await tester.enterText(find.byType(TextFormField), email);
  await tester.tap(find.text('Use development session'));

  for (var i = 0; i < 60; i++) {
    await tester.pump(const Duration(seconds: 1));
    if (find.text(email).evaluate().isNotEmpty) break;
  }

  if (find.text(email).evaluate().isEmpty) {
    final visible = tester
        .widgetList<Text>(find.byType(Text))
        .map((text) => text.data ?? '\<rich>')
        .join(' | ');
    fail('Sign-in did not reach the shell. Visible text: $visible');
  }
  expect(find.text('Home'), findsWidgets);
  expect(find.text(email), findsWidgets);
}
