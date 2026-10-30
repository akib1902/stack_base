import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:stackbase_mobile/app/app.dart';
import 'package:stackbase_mobile/app/theme/motion.dart';
import 'package:stackbase_mobile/core/auth/secure_session_store.dart';
import 'package:stackbase_mobile/core/config/app_config.dart';
import 'package:stackbase_mobile/core/providers.dart';

import '../support/fake_auth_repository.dart';
import '../support/fixtures.dart';
import '../support/memory_secure_store.dart';

void main() {
  Future<void> pumpApp(
    WidgetTester tester, {
    required FakeAuthRepository repository,
    required AppConfig config,
    Map<String, Object> preferences = const {},
  }) async {
    SharedPreferences.setMockInitialValues(preferences);
    final store = SecureSessionStore(MemorySecureStore());
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(config),
          authRepositoryProvider.overrideWithValue(repository),
          secureSessionStoreProvider.overrideWithValue(store),
          meProvider.overrideWith((ref) async => meFixture),
          setupStatusProvider.overrideWith((ref) async => setupFixture),
          healthProvider.overrideWith((ref) async => healthFixture),
          packageInfoProvider.overrideWith(
            (ref) async => PackageInfo(
              appName: 'StackBase',
              packageName: 'app.stackbase.mobile',
              version: '0.1.0',
              buildNumber: '1',
            ),
          ),
          interfaceOfflineProvider.overrideWithValue(false),
        ],
        child: const StackBaseApp(),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('signed-out state shows a real sign-in form, never the shell', (
    tester,
  ) async {
    await pumpApp(
      tester,
      repository: FakeAuthRepository(),
      config: testConfig(),
    );

    expect(find.text('Sign in'), findsWidgets);
    expect(find.text('Use development session'), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
    expect(find.text('Home'), findsNothing);
  });

  testWidgets('Supabase sign-in adopts the session and opens Home', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = FakeAuthRepository(authMode: AuthMode.supabase);
    await pumpApp(
      tester,
      repository: repository,
      config: testConfig(
        authMode: 'supabase',
        api: 'https://api.example.test',
        supabaseUrl: 'https://project.supabase.co',
        supabaseKey: 'sb_publishable_test',
      ),
    );

    await tester.enterText(
      find.widgetWithText(TextFormField, 'Email'),
      'owner@example.test',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Password'),
      'correct horse battery staple',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();

    final greetingFound =
        find.text('Good morning').evaluate().isNotEmpty ||
        find.text('Good afternoon').evaluate().isNotEmpty ||
        find.text('Good evening').evaluate().isNotEmpty;
    expect(greetingFound, isTrue);
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(repository.currentSession?.email, 'owner@example.test');
  });

  testWidgets('signed-in shell exposes all four destinations', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await pumpApp(
      tester,
      repository: FakeAuthRepository(initial: sessionFixture),
      config: testConfig(),
    );

    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Home'), findsWidgets);
    expect(find.text('Local'), findsOneWidget);
    expect(find.text('Cloud'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);

    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.byIcon(Icons.cloud_outlined),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Cloud browsing arrives next'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.settings_outlined));
    await tester.pumpAndSettle();
    expect(find.text('StackBase API'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Sign out'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Sign out'), findsOneWidget);
  });

  testWidgets('dark preference applies Graphite Terminal', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await pumpApp(
      tester,
      repository: FakeAuthRepository(initial: sessionFixture),
      config: testConfig(),
      preferences: {'stackbase.theme.mode': 'dark'},
    );

    final context = tester.element(find.byType(NavigationBar));
    expect(Theme.of(context).brightness, Brightness.dark);
  });

  testWidgets('320 dp shell has no overflow', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await pumpApp(
      tester,
      repository: FakeAuthRepository(initial: sessionFixture),
      config: testConfig(),
    );

    expect(tester.takeException(), isNull);
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.byIcon(Icons.cloud_outlined),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('Cloud browsing arrives next'), findsOneWidget);
  });

  testWidgets('tablet width uses a navigation rail', (tester) async {
    tester.view.physicalSize = const Size(900, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await pumpApp(
      tester,
      repository: FakeAuthRepository(initial: sessionFixture),
      config: testConfig(),
    );

    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
  });

  testWidgets('expired session returns to sign-in with an explanation', (
    tester,
  ) async {
    final repository = FakeAuthRepository(initial: sessionFixture);
    await pumpApp(
      tester,
      repository: repository,
      config: testConfig(),
    );

    final container = ProviderScope.containerOf(
      tester.element(find.byType(StackBaseApp)),
      listen: false,
    );
    await container.read(authControllerProvider.notifier).markExpired();
    await tester.pumpAndSettle();

    expect(find.textContaining('session expired'), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
    expect(repository.clearLocalCalls, greaterThan(0));
  });

  testWidgets('reduced motion yields zero-duration transitions', (tester) async {
    late Duration duration;
    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(disableAnimations: true),
        child: Builder(
          builder: (context) {
            duration = Motion.of(context, Motion.base);
            return const SizedBox.shrink();
          },
        ),
      ),
    );
    expect(duration, Duration.zero);
  });
}
