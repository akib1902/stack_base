import 'package:flutter/material.dart';

/// StackBase spacing scale, shared with the web design system.
abstract final class Space {
  static const x1 = 4.0;
  static const x2 = 8.0;
  static const x3 = 12.0;
  static const x4 = 16.0;
  static const x5 = 20.0;
  static const x6 = 24.0;
  static const x8 = 32.0;
  static const x10 = 40.0;
}

abstract final class Radii {
  static const card = 18.0;
  static const control = 14.0;
  static const chip = 999.0;
  static const chipSmall = 10.0;
}

abstract final class StackBasePalette {
  static const light = StackBaseColors(
    background: Color(0xFFFAF8F4),
    surface: Color(0xFFFFFFFF),
    surfaceRaised: Color(0xFFF3EFE7),
    primary: Color(0xFFD97706),
    primaryInk: Color(0xFF92400E),
    primaryForeground: Color(0xFF1F1A12),
    foreground: Color(0xFF29251F),
    mutedForeground: Color(0xFF6B655E),
    border: Color(0xFFE8E1D6),
    success: Color(0xFF2F7D57),
    error: Color(0xFFC2413A),
    ring: Color(0xFF92400E),
    amber: Color(0xFFD97706),
    rose: Color(0xFFBE3C5A),
    indigo: Color(0xFF4F46E5),
    sky: Color(0xFF0284C7),
    teal: Color(0xFF0D7470),
    slate: Color(0xFF71717A),
  );

  static const dark = StackBaseColors(
    background: Color(0xFF17191C),
    surface: Color(0xFF202328),
    surfaceRaised: Color(0xFF292D33),
    primary: Color(0xFFF2A93B),
    primaryInk: Color(0xFFF2A93B),
    primaryForeground: Color(0xFF17191C),
    foreground: Color(0xFFF1F2F4),
    mutedForeground: Color(0xFFA4AAB3),
    border: Color(0xFF383D45),
    success: Color(0xFF67C59A),
    error: Color(0xFFF07878),
    ring: Color(0xFFF2A93B),
    amber: Color(0xFFF2A93B),
    rose: Color(0xFFFBA0B6),
    indigo: Color(0xFFA5B4FC),
    sky: Color(0xFF7DD3FC),
    teal: Color(0xFF5EEAD4),
    slate: Color(0xFF94A3B8),
  );
}

@immutable
class StackBaseColors extends ThemeExtension<StackBaseColors> {
  const StackBaseColors({
    required this.background,
    required this.surface,
    required this.surfaceRaised,
    required this.primary,
    required this.primaryInk,
    required this.primaryForeground,
    required this.foreground,
    required this.mutedForeground,
    required this.border,
    required this.success,
    required this.error,
    required this.ring,
    required this.amber,
    required this.rose,
    required this.indigo,
    required this.sky,
    required this.teal,
    required this.slate,
  });

  final Color background;
  final Color surface;
  final Color surfaceRaised;
  final Color primary;
  final Color primaryInk;
  final Color primaryForeground;
  final Color foreground;
  final Color mutedForeground;
  final Color border;
  final Color success;
  final Color error;
  final Color ring;
  final Color amber;
  final Color rose;
  final Color indigo;
  final Color sky;
  final Color teal;
  final Color slate;

  Color categoryTint(String category) {
    switch (category) {
      case 'image':
      case 'video':
        return rose;
      case 'audio':
        return indigo;
      case 'document':
      case 'pdf':
        return sky;
      case 'archive':
        return teal;
      case 'apk':
      case 'other':
        return slate;
      default:
        return amber;
    }
  }

  @override
  StackBaseColors copyWith({
    Color? background,
    Color? surface,
    Color? surfaceRaised,
    Color? primary,
    Color? primaryInk,
    Color? primaryForeground,
    Color? foreground,
    Color? mutedForeground,
    Color? border,
    Color? success,
    Color? error,
    Color? ring,
    Color? amber,
    Color? rose,
    Color? indigo,
    Color? sky,
    Color? teal,
    Color? slate,
  }) {
    return StackBaseColors(
      background: background ?? this.background,
      surface: surface ?? this.surface,
      surfaceRaised: surfaceRaised ?? this.surfaceRaised,
      primary: primary ?? this.primary,
      primaryInk: primaryInk ?? this.primaryInk,
      primaryForeground: primaryForeground ?? this.primaryForeground,
      foreground: foreground ?? this.foreground,
      mutedForeground: mutedForeground ?? this.mutedForeground,
      border: border ?? this.border,
      success: success ?? this.success,
      error: error ?? this.error,
      ring: ring ?? this.ring,
      amber: amber ?? this.amber,
      rose: rose ?? this.rose,
      indigo: indigo ?? this.indigo,
      sky: sky ?? this.sky,
      teal: teal ?? this.teal,
      slate: slate ?? this.slate,
    );
  }

  @override
  StackBaseColors lerp(ThemeExtension<StackBaseColors>? other, double t) {
    if (other is! StackBaseColors) return this;
    return StackBaseColors(
      background: Color.lerp(background, other.background, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      surfaceRaised: Color.lerp(surfaceRaised, other.surfaceRaised, t)!,
      primary: Color.lerp(primary, other.primary, t)!,
      primaryInk: Color.lerp(primaryInk, other.primaryInk, t)!,
      primaryForeground: Color.lerp(
        primaryForeground,
        other.primaryForeground,
        t,
      )!,
      foreground: Color.lerp(foreground, other.foreground, t)!,
      mutedForeground: Color.lerp(
        mutedForeground,
        other.mutedForeground,
        t,
      )!,
      border: Color.lerp(border, other.border, t)!,
      success: Color.lerp(success, other.success, t)!,
      error: Color.lerp(error, other.error, t)!,
      ring: Color.lerp(ring, other.ring, t)!,
      amber: Color.lerp(amber, other.amber, t)!,
      rose: Color.lerp(rose, other.rose, t)!,
      indigo: Color.lerp(indigo, other.indigo, t)!,
      sky: Color.lerp(sky, other.sky, t)!,
      teal: Color.lerp(teal, other.teal, t)!,
      slate: Color.lerp(slate, other.slate, t)!,
    );
  }
}

extension StackBaseThemeX on BuildContext {
  StackBaseColors get stackColors =>
      Theme.of(this).extension<StackBaseColors>()!;

  bool get reducedMotion =>
      MediaQuery.maybeDisableAnimationsOf(this) ?? false;
}
