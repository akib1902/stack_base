import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/providers.dart';
import '../../core/ui/components/state_message.dart';
import '../../features/auth/presentation/sign_in_screen.dart';
import '../../features/cloud_files/presentation/cloud_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/local_files/presentation/local_screen.dart';
import '../../features/settings/presentation/settings_screen.dart';
import '../../features/shell/presentation/app_shell.dart';
import '../../features/splash/presentation/splash_screen.dart';

enum AuthRouteStage { bootstrapping, signedOut, expired, signedIn }

@immutable
class AuthRouteView {
  const AuthRouteView(this.stage, this.userId);

  final AuthRouteStage stage;
  final String? userId;

  @override
  bool operator ==(Object other) =>
      other is AuthRouteView &&
      other.stage == stage &&
      other.userId == userId;

  @override
  int get hashCode => Object.hash(stage, userId);
}

final authRouteViewProvider = Provider<AuthRouteView>((ref) {
  final auth = ref.watch(authControllerProvider);
  final value = auth.value;
  if (value == null) {
    return AuthRouteView(
      auth.isLoading ? AuthRouteStage.bootstrapping : AuthRouteStage.signedOut,
      null,
    );
  }
  final stage = switch (value.status) {
    AuthStatus.signedIn => AuthRouteStage.signedIn,
    AuthStatus.expired => AuthRouteStage.expired,
    AuthStatus.signedOut => AuthRouteStage.signedOut,
  };
  return AuthRouteView(stage, value.session?.userId);
});

final appRouterProvider = Provider<GoRouter>((ref) {
  final view = ref.watch(authRouteViewProvider);
  final initialLocation = switch (view.stage) {
    AuthRouteStage.signedIn => '/home',
    AuthRouteStage.bootstrapping => '/splash',
    AuthRouteStage.signedOut || AuthRouteStage.expired => '/sign-in',
  };

  final router = GoRouter(
    initialLocation: initialLocation,
    redirect: (context, state) {
      final location = state.uri.path;
      switch (view.stage) {
        case AuthRouteStage.bootstrapping:
          return location == '/splash' ? null : '/splash';
        case AuthRouteStage.signedIn:
          return location == '/sign-in' || location == '/splash'
              ? '/home'
              : null;
        case AuthRouteStage.signedOut:
        case AuthRouteStage.expired:
          return location == '/sign-in' ? null : '/sign-in';
      }
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/sign-in',
        builder: (context, state) => const SignInScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AppShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/local',
                builder: (context, state) => const LocalScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/cloud',
                builder: (context, state) => const CloudScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/settings',
                builder: (context, state) => const SettingsScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: StateMessage(
          icon: Icons.explore_off_outlined,
          title: 'That screen does not exist',
          message: 'The address ${state.uri.path} is not part of this build.',
          actionLabel: view.stage == AuthRouteStage.signedIn
              ? 'Go to Home'
              : 'Go to sign in',
          onAction: () => context.go(
            view.stage == AuthRouteStage.signedIn ? '/home' : '/sign-in',
          ),
        ),
      ),
    ),
  );

  ref.onDispose(router.dispose);
  return router;
});
