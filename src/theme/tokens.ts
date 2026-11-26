import type { CSSProperties } from "react";
import { fontFamilyOf } from "./fonts.ts";
import type {
  AppThemeConfig,
  DensityScale,
  M3DensityTokens,
  M3ShapeTokens,
  MotionScheme,
  ShapeScale,
  TypeRole,
} from "./types.ts";

export const DEFAULT_THEME: AppThemeConfig = {
  paletteKey: "purple",
  seedColor: "#6750A4",
  useDynamicColor: false,
  wallpaperId: "bloom",
  mode: "system",
  contrast: "standard",
  customOverrides: {},
  shapeScale: "rounded",
  displayFont: "roboto",
  bodyFont: "roboto",
  emphasizedType: false,
  fontScale: 1.0,
  motion: "expressive",
  density: "standard",
  systemBars: {
    edgeToEdge: true,
    navBarStyle: "gesture",
    statusBarIcons: "auto",
  },
};

export const SHAPE_SCALES: { key: ShapeScale; label: string; description: string }[] = [
  { key: "square", label: "Square", description: "Crisp architectural 4–10dp corners" },
  { key: "rounded", label: "Rounded", description: "Default Material 3 Expressive radii" },
  { key: "full", label: "Full", description: "Soft pill & oversized 24–36dp curves" },
];

export const CONTRAST_LEVELS = [
  { key: "standard", label: "Standard" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
] as const;

export const DENSITY_SCALES: { key: DensityScale; label: string }[] = [
  { key: "compact", label: "Compact" },
  { key: "standard", label: "Standard" },
  { key: "comfortable", label: "Relaxed" },
];

export const FONT_SCALES = [
  { value: 0.85, label: "Small (85%)" },
  { value: 1.0, label: "Default (100%)" },
  { value: 1.15, label: "Large (115%)" },
  { value: 1.3, label: "Max (130%)" },
] as const;

export function scaleRadius(baseDp: number, scale: ShapeScale): number {
  if (baseDp >= 999) return 9999;
  if (scale === "square") return Math.round(baseDp * 0.35);
  if (scale === "full") return Math.round(baseDp * 1.5);
  return baseDp;
}

export function shapeTokensFor(scale: ShapeScale): M3ShapeTokens {
  return {
    none: 0,
    extraSmall: scaleRadius(4, scale),
    small: scaleRadius(8, scale),
    medium: scaleRadius(12, scale),
    large: scaleRadius(16, scale),
    extraLarge: scaleRadius(28, scale),
    full: 9999,
  };
}

export function densitySpacingFor(density: DensityScale): M3DensityTokens {
  switch (density) {
    case "compact":
      return { screenMargin: 12, sectionGap: 12, itemGap: 8, cardPadding: 12, controlHeight: 40 };
    case "comfortable":
      return { screenMargin: 20, sectionGap: 20, itemGap: 14, cardPadding: 20, controlHeight: 52 };
    case "standard":
    default:
      return { screenMargin: 16, sectionGap: 16, itemGap: 12, cardPadding: 16, controlHeight: 46 };
  }
}

interface TypeSpec {
  size: number;
  lineHeight: number;
  weight: number;
  emphasizedWeight: number;
  tracking: number;
  isDisplay: boolean;
}

export const M3_TYPE_SCALE: Record<TypeRole, TypeSpec> = {
  displayLarge: { size: 57, lineHeight: 64, weight: 400, emphasizedWeight: 600, tracking: -0.25, isDisplay: true },
  displayMedium: { size: 45, lineHeight: 52, weight: 400, emphasizedWeight: 600, tracking: 0, isDisplay: true },
  displaySmall: { size: 36, lineHeight: 44, weight: 400, emphasizedWeight: 600, tracking: 0, isDisplay: true },
  headlineLarge: { size: 32, lineHeight: 40, weight: 400, emphasizedWeight: 600, tracking: 0, isDisplay: true },
  headlineMedium: { size: 28, lineHeight: 36, weight: 400, emphasizedWeight: 600, tracking: 0, isDisplay: true },
  headlineSmall: { size: 24, lineHeight: 32, weight: 500, emphasizedWeight: 700, tracking: 0, isDisplay: true },
  titleLarge: { size: 22, lineHeight: 28, weight: 500, emphasizedWeight: 700, tracking: 0, isDisplay: false },
  titleMedium: { size: 16, lineHeight: 24, weight: 500, emphasizedWeight: 700, tracking: 0.15, isDisplay: false },
  titleSmall: { size: 14, lineHeight: 20, weight: 500, emphasizedWeight: 700, tracking: 0.1, isDisplay: false },
  bodyLarge: { size: 16, lineHeight: 24, weight: 400, emphasizedWeight: 500, tracking: 0.5, isDisplay: false },
  bodyMedium: { size: 14, lineHeight: 20, weight: 400, emphasizedWeight: 500, tracking: 0.25, isDisplay: false },
  bodySmall: { size: 12, lineHeight: 16, weight: 400, emphasizedWeight: 500, tracking: 0.4, isDisplay: false },
  labelLarge: { size: 14, lineHeight: 20, weight: 500, emphasizedWeight: 700, tracking: 0.1, isDisplay: false },
  labelMedium: { size: 12, lineHeight: 16, weight: 500, emphasizedWeight: 700, tracking: 0.5, isDisplay: false },
  labelSmall: { size: 11, lineHeight: 16, weight: 500, emphasizedWeight: 700, tracking: 0.5, isDisplay: false },
};

export function resolveTypeStyle(role: TypeRole, theme: AppThemeConfig): CSSProperties {
  const spec = M3_TYPE_SCALE[role];
  const fontKey = spec.isDisplay ? theme.displayFont : theme.bodyFont;
  return {
    fontFamily: fontFamilyOf(fontKey),
    fontSize: `${Math.round(spec.size * theme.fontScale * 10) / 10}px`,
    lineHeight: `${Math.round(spec.lineHeight * theme.fontScale * 10) / 10}px`,
    fontWeight: theme.emphasizedType ? spec.emphasizedWeight : spec.weight,
    letterSpacing: `${spec.tracking}px`,
  };
}

export function transitionFor(motion: MotionScheme) {
  if (motion === "expressive") {
    return { type: "spring" as const, stiffness: 380, damping: 24, mass: 0.9 };
  }
  return { duration: 0.28, ease: [0.2, 0, 0, 1] as const };
}
