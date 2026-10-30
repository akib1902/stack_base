import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/providers.dart';
import '../features/setup/presentation/setup_screen.dart';
import '../features/setup/presentation/startup_failure_screen.dart';
import 'router/app_router.dart';
import 'theme/motion.dart';
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
    final reduceMotion = WidgetsBinding
        .instance
        .platformDispatcher
        .accessibilityFeatures
        .disableAnimations;

    final theme = StackBaseTheme.light();
    final darkTheme = StackBaseTheme.dark();

    if (!config.isConfigured) {
      return MaterialApp(
        title: 'StackBase',
        debugShowCheckedModeBanner: false,
        theme: theme,
        darkTheme: darkTheme,
        themeMode: themeMode,
        themeAnimationDuration: reduceMotion ? Duration.zero : Motion.base,
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
        themeAnimationDuration: reduceMotion ? Duration.zero : Motion.base,
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
      themeAnimationDuration: reduceMotion ? Duration.zero : Motion.base,
      builder: _withoutMotion,
      routerConfig: ref.watch(appRouterProvider),
    );
  }

  /// Removes page-transition animation when the platform asks for reduced
  /// motion. The app does not add decorative motion elsewhere.
  static Widget _withoutMotion(BuildContext context, Widget? child) {
    if (child == null) return const SizedBox.shrink();
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (!reduced) return child;
    final theme = Theme.of(context);
    return Theme(
      data: theme.copyWith(
        pageTransitionsTheme: const PageTransitionsTheme(
          builders: {
            TargetPlatform.android: _InstantPageTransitionsBuilder(),
            TargetPlatform.iOS: _InstantPageTransitionsBuilder(),
          },
        ),
      ),
      child: child,
    );
  }
}

class _InstantPageTransitionsBuilder extends PageTransitionsBuilder {
  const _InstantPageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return child;
  }
}
