export type ContrastLevel = "standard" | "medium" | "high";
export type ThemeMode = "light" | "dark" | "system";
export type ShapeScale = "square" | "rounded" | "full";
export type MotionScheme = "standard" | "expressive";
export type DensityScale = "compact" | "standard" | "comfortable";
export type NavBarStyle = "gesture" | "threeButton";

export type FontKey =
  | "roboto"
  | "robotoFlex"
  | "robotoSerif"
  | "inter"
  | "poppins"
  | "outfit"
  | "system";

/**
 * Full Material 3 ColorScheme aligned 1-to-1 with Jetpack Compose `androidx.compose.material3.ColorScheme`.
 */
export interface M3Palette {
  key: string;
  label: string;
  seed: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  inversePrimary: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  surfaceDim: string;
  surfaceBright: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  scrim: string;
}

export type ColorTokenKey = keyof Omit<M3Palette, "key" | "label" | "seed">;

export type TypeRole =
  | "displayLarge"
  | "displayMedium"
  | "displaySmall"
  | "headlineLarge"
  | "headlineMedium"
  | "headlineSmall"
  | "titleLarge"
  | "titleMedium"
  | "titleSmall"
  | "bodyLarge"
  | "bodyMedium"
  | "bodySmall"
  | "labelLarge"
  | "labelMedium"
  | "labelSmall";

export interface M3ShapeTokens {
  none: number;
  extraSmall: number;
  small: number;
  medium: number;
  large: number;
  extraLarge: number;
  full: number;
}

export interface M3DensityTokens {
  screenMargin: number;
  sectionGap: number;
  itemGap: number;
  cardPadding: number;
  controlHeight: number;
}

export interface SystemBarsConfig {
  edgeToEdge: boolean;
  navBarStyle: NavBarStyle;
  statusBarIcons: "auto" | "light" | "dark";
}

export interface AppThemeConfig {
  paletteKey: string;
  seedColor: string;
  useDynamicColor: boolean;
  wallpaperId: string;
  mode: ThemeMode;
  contrast: ContrastLevel;
  customOverrides: Partial<Record<ColorTokenKey, string>>;
  shapeScale: ShapeScale;
  displayFont: FontKey;
  bodyFont: FontKey;
  emphasizedType: boolean;
  fontScale: number;
  motion: MotionScheme;
  density: DensityScale;
  systemBars: SystemBarsConfig;
}
