import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final themeModeProvider =
    AsyncNotifierProvider<ThemeModeController, ThemeMode>(
      ThemeModeController.new,
    );

/// Device-local presentation preference. The server setting is the account
/// default (`amber`/`graphite`) and is updated separately, never used as a
/// silent override of this device choice.
class ThemeModeController extends AsyncNotifier<ThemeMode> {
  static const storageKey = 'stackbase.theme.mode';

  @override
  Future<ThemeMode> build() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return switch (prefs.getString(storageKey)) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        _ => ThemeMode.system,
      };
    } catch (_) {
      return ThemeMode.system;
    }
  }

  Future<void> setMode(ThemeMode mode) async {
    state = AsyncData(mode);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(storageKey, switch (mode) {
        ThemeMode.light => 'light',
        ThemeMode.dark => 'dark',
        ThemeMode.system => 'system',
      });
    } catch (_) {
      // The in-memory choice still applies for this session.
    }
  }
}
