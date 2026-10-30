import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'tokens.dart';

abstract final class StackBaseTheme {
  static ThemeData light() => _build(Brightness.light, StackBasePalette.light);

  static ThemeData dark() => _build(Brightness.dark, StackBasePalette.dark);

  static ThemeData _build(Brightness brightness, StackBaseColors colors) {
    final baseScheme = ColorScheme.fromSeed(
      seedColor: colors.primary,
      brightness: brightness,
    );
    final scheme = baseScheme.copyWith(
      primary: colors.primary,
      onPrimary: colors.primaryForeground,
      primaryContainer: colors.surfaceRaised,
      onPrimaryContainer: colors.foreground,
      secondary: colors.primaryInk,
      onSecondary: brightness == Brightness.light
          ? Colors.white
          : colors.background,
      surface: colors.surface,
      onSurface: colors.foreground,
      surfaceContainerHighest: colors.surfaceRaised,
      surfaceContainerHigh: colors.surfaceRaised,
      onSurfaceVariant: colors.mutedForeground,
      outline: colors.border,
      outlineVariant: colors.border,
      error: colors.error,
      onError: Colors.white,
    );

    final baseText = ThemeData(
      brightness: brightness,
      fontFamily: 'Inter',
    ).textTheme;
    final text = baseText.copyWith(
      displaySmall: baseText.displaySmall?.copyWith(
        fontSize: 32,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.8,
        color: colors.foreground,
      ),
      headlineMedium: baseText.headlineMedium?.copyWith(
        fontSize: 26,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.5,
        color: colors.foreground,
      ),
      headlineSmall: baseText.headlineSmall?.copyWith(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.3,
        color: colors.foreground,
      ),
      titleLarge: baseText.titleLarge?.copyWith(
        fontSize: 19,
        fontWeight: FontWeight.w600,
        color: colors.foreground,
      ),
      titleMedium: baseText.titleMedium?.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: colors.foreground,
      ),
      titleSmall: baseText.titleSmall?.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: colors.foreground,
      ),
      bodyLarge: baseText.bodyLarge?.copyWith(
        fontSize: 16,
        height: 1.5,
        color: colors.foreground,
      ),
      bodyMedium: baseText.bodyMedium?.copyWith(
        fontSize: 14,
        height: 1.5,
        color: colors.foreground,
      ),
      bodySmall: baseText.bodySmall?.copyWith(
        fontSize: 12,
        height: 1.45,
        color: colors.mutedForeground,
      ),
      labelLarge: baseText.labelLarge?.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w600,
      ),
      labelMedium: baseText.labelMedium?.copyWith(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.2,
      ),
      labelSmall: baseText.labelSmall?.copyWith(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.3,
        color: colors.mutedForeground,
      ),
    );

    const shapeControl = RoundedRectangleBorder(
      borderRadius: BorderRadius.all(Radius.circular(Radii.control)),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: colors.background,
      canvasColor: colors.background,
      fontFamily: 'Inter',
      textTheme: text,
      extensions: [colors],
      visualDensity: VisualDensity.standard,
      splashFactory: InkRipple.splashFactory,
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: colors.background,
        surfaceTintColor: Colors.transparent,
        foregroundColor: colors.foreground,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        toolbarHeight: 64,
        titleTextStyle: text.titleLarge,
      ),
      cardTheme: CardThemeData(
        color: colors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: const BorderRadius.all(Radius.circular(Radii.card)),
          side: BorderSide(color: colors.border),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: colors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        height: 72,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        indicatorColor: colors.primary.withValues(alpha: 0.16),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            size: 24,
            color: selected ? colors.primaryInk : colors.mutedForeground,
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return text.labelMedium?.copyWith(
            color: selected ? colors.primaryInk : colors.mutedForeground,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
          );
        }),
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: colors.surface,
        indicatorColor: colors.primary.withValues(alpha: 0.16),
        selectedIconTheme: IconThemeData(color: colors.primaryInk),
        unselectedIconTheme: IconThemeData(color: colors.mutedForeground),
        selectedLabelTextStyle: text.labelMedium?.copyWith(
          color: colors.primaryInk,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelTextStyle: text.labelMedium?.copyWith(
          color: colors.mutedForeground,
        ),
        labelType: NavigationRailLabelType.all,
        minWidth: 80,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: Space.x4,
          vertical: Space.x3,
        ),
        hintStyle: text.bodyMedium?.copyWith(color: colors.mutedForeground),
        labelStyle: text.bodyMedium?.copyWith(color: colors.mutedForeground),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Radii.control),
          borderSide: BorderSide(color: colors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Radii.control),
          borderSide: BorderSide(color: colors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Radii.control),
          borderSide: BorderSide(color: colors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Radii.control),
          borderSide: BorderSide(color: colors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Radii.control),
          borderSide: BorderSide(color: colors.error, width: 2),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 48),
          padding: const EdgeInsets.symmetric(
            horizontal: Space.x5,
            vertical: Space.x3,
          ),
          backgroundColor: colors.primary,
          foregroundColor: colors.primaryForeground,
          disabledBackgroundColor: colors.border,
          disabledForegroundColor: colors.mutedForeground,
          textStyle: text.labelLarge,
          shape: shapeControl,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 48),
          padding: const EdgeInsets.symmetric(
            horizontal: Space.x5,
            vertical: Space.x3,
          ),
          foregroundColor: colors.foreground,
          side: BorderSide(color: colors.border),
          textStyle: text.labelLarge,
          shape: shapeControl,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(48, 48),
          foregroundColor: colors.primaryInk,
          textStyle: text.labelLarge,
          shape: shapeControl,
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          foregroundColor: colors.foreground,
          minimumSize: const Size(48, 48),
        ),
      ),
      dividerTheme: DividerThemeData(color: colors.border, thickness: 1),
      chipTheme: ChipThemeData(
        backgroundColor: colors.surfaceRaised,
        selectedColor: colors.primary.withValues(alpha: 0.18),
        side: BorderSide(color: colors.border),
        labelStyle: text.labelMedium,
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(
          horizontal: Space.x2,
          vertical: Space.x1,
        ),
      ),
      listTileTheme: ListTileThemeData(
        iconColor: colors.mutedForeground,
        textColor: colors.foreground,
        contentPadding: const EdgeInsets.symmetric(horizontal: Space.x4),
        minVerticalPadding: Space.x3,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: colors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Space.x6),
          side: BorderSide(color: colors.border),
        ),
        titleTextStyle: text.titleLarge,
        contentTextStyle: text.bodyMedium,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: colors.surface,
        surfaceTintColor: Colors.transparent,
        modalBackgroundColor: colors.surface,
        showDragHandle: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(Space.x6)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: colors.foreground,
        contentTextStyle: text.bodyMedium?.copyWith(color: colors.background),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.control),
        ),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: colors.primary,
        linearTrackColor: colors.surfaceRaised,
        circularTrackColor: colors.surfaceRaised,
      ),
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: colors.primary,
        selectionColor: colors.primary.withValues(alpha: 0.24),
        selectionHandleColor: colors.primaryInk,
      ),
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: colors.foreground,
          borderRadius: BorderRadius.circular(Space.x2),
        ),
        textStyle: text.bodySmall?.copyWith(color: colors.background),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          minimumSize: const WidgetStatePropertyAll(Size(48, 44)),
          side: WidgetStatePropertyAll(BorderSide(color: colors.border)),
          textStyle: WidgetStatePropertyAll(text.labelMedium),
          foregroundColor: WidgetStateProperty.resolveWith((states) {
            return states.contains(WidgetState.selected)
                ? colors.primaryInk
                : colors.mutedForeground;
          }),
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            return states.contains(WidgetState.selected)
                ? colors.primary.withValues(alpha: 0.18)
                : colors.surface;
          }),
        ),
      ),
    );
  }
}
