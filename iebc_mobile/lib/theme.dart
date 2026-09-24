import 'package:flutter/material.dart';

// Palette: warm, earthy, government-appropriate — no gradients anywhere.
// Cafe noir carries primary actions and headings; harvest gold is the one
// accent color, used sparingly for emphasis and alerts; maize and moss
// greens support it in small doses (icon tints, status chips) rather than
// covering large surfaces, to keep the interface calm and legible.
class AppColors {
  static const primary = Color(0xFF283B0A); // IEBC green — buttons, headers, primary actions
  static const cafeNoir = Color(0xFF563D23); // warm brown — secondary accent only
  static const gold = Color(0xFFDD9C00); // harvest gold — alerts and highlights
  static const maize = Color(0xFFFAE45E); // maize — light tint fills only, never large blocks
  static const moss = Color(0xFFA7A865); // moss green — secondary/neutral support
  static const darkMoss = Color(0xFF283B0A); // same as primary — success states

  static const background = Color(0xFFFBF6EC); // warm cream, tinted (not plain white)
  static const surface = Color(0xFFFFFFFF);
  static const border = Color(0xFFE7DCC8);
  static const muted = Color(0xFF6B6152); // secondary text, warm gray
}

ThemeData buildAppTheme() {
  final colorScheme = ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    primary: AppColors.primary,
    onPrimary: Colors.white,
    secondary: AppColors.gold,
    surface: AppColors.surface,
    error: const Color(0xFFB3261E),
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: AppColors.background,
    fontFamily: 'Roboto',

    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.background,
      foregroundColor: AppColors.primary,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: AppColors.primary,
        fontSize: 18,
        fontWeight: FontWeight.w600,
      ),
    ),

    cardTheme: CardThemeData(
      color: AppColors.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
    ),

    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.gold, width: 1.5),
      ),
      labelStyle: const TextStyle(color: AppColors.muted),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    ),

    textTheme: const TextTheme(
      titleLarge: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700),
      titleMedium: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600),
      bodyMedium: TextStyle(color: AppColors.primary),
      bodySmall: TextStyle(color: AppColors.muted),
    ),

    dividerTheme: const DividerThemeData(color: AppColors.border, thickness: 1),
  );
}
