import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/providers.dart';
import '../features/setup/presentation/setup_screen.dart';
import '../features/setup/presentation/startup_failure_screen.dart';
import 'router/app_router.dart';
import 'theme/theme.dart';
import 'theme/theme_controller.dart';

class StackBaseApp extends ConsumerWidget {
  const StackBaseApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider);
    final startupFailure = ref.watch(startupFailureProvider);
    final themeMode =
        ref.watch(themeModeProvider).value ?? ThemeMode.system;

    final theme = StackBaseTheme.light();
    final darkTheme = StackBaseTheme.dark();

    if (!config.isConfigured) {
      return MaterialApp(
        title: 'StackBase',
        debugShowCheckedModeBanner: false,
        theme: theme,
        darkTheme: darkTheme,
        themeMode: themeMode,
        home: SetupScreen(config: config),
      );
    }

    if (startupFailure != null) {
      return MaterialApp(
        title: 'StackBase',
        debugShowCheckedModeBanner: false,
        theme: theme,
        darkTheme: darkTheme,
        themeMode: themeMode,
        home: StartupFailureScreen(
          config: config,
          details: startupFailure,
        ),
      );
    }

    return MaterialApp.router(
      title: 'StackBase',
      debugShowCheckedModeBanner: false,
      theme: theme,
      darkTheme: darkTheme,
      themeMode: themeMode,
      routerConfig: ref.watch(appRouterProvider),
    );
  }
}
