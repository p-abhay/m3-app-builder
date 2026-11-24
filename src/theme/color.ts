import type { AppThemeConfig, ColorTokenKey, ContrastLevel, M3Palette } from "./types.ts";

type Lab = { L: number; a: number; b: number };
type Lch = { L: number; C: number; h: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.round(clamp01(v / 255) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
      .toUpperCase()
  );
}

const linearize = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const gammaEncode = (v: number) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

const WHITE = [0.95047, 1, 1.08883];
const fLab = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const fLabInv = (t: number) => (t > 0.2069 ? t * t * t : (t - 16 / 116) / 7.787);

function rgbToLab(r: number, g: number, b: number): Lab {
  const R = linearize(r);
  const G = linearize(g);
  const B = linearize(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / WHITE[0];
  const y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / WHITE[1];
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / WHITE[2];
  const fx = fLab(x);
  const fy = fLab(y);
  const fz = fLab(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

function labToRgb(lab: Lab): [number, number, number] | null {
  const fy = (lab.L + 16) / 116;
  const fx = lab.a / 500 + fy;
  const fz = fy - lab.b / 200;
  const x = fLabInv(fx) * WHITE[0];
  const y = fLabInv(fy) * WHITE[1];
  const z = fLabInv(fz) * WHITE[2];
  const R = x * 3.2406 + y * -1.5372 + z * -0.4986;
  const G = x * -0.9689 + y * 1.8758 + z * 0.0415;
  const B = x * 0.0557 + y * -0.204 + z * 1.057;
  const out = [R, G, B].map(gammaEncode);
  if (out.some((v) => v < -0.002 || v > 1.002)) return null;
  return out.map((v) => clamp01(v) * 255) as [number, number, number];
}

function labToLch(lab: Lab): Lch {
  const C = Math.hypot(lab.a, lab.b);
  let h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L: lab.L, C, h };
}

/** Generate a gamut-safe sRGB hex color for a given tone L, chroma C, and hue h. */
export function toneColor(L: number, C: number, h: number): string {
  const rad = (h * Math.PI) / 180;
  let c = C;
  for (let i = 0; i < 40; i++) {
    const rgb = labToRgb({ L, a: c * Math.cos(rad), b: c * Math.sin(rad) });
    if (rgb) return rgbToHex(rgb[0], rgb[1], rgb[2]);
    c *= 0.88;
  }
  const gray = labToRgb({ L, a: 0, b: 0 }) ?? [128, 128, 128];
  return rgbToHex(gray[0], gray[1], gray[2]);
}

type ToneMap = Record<
  | "primary"
  | "onPrimary"
  | "primaryContainer"
  | "onPrimaryContainer"
  | "inversePrimary"
  | "secondary"
  | "onSecondary"
  | "secondaryContainer"
  | "onSecondaryContainer"
  | "tertiary"
  | "onTertiary"
  | "tertiaryContainer"
  | "onTertiaryContainer"
  | "surface"
  | "surfaceDim"
  | "surfaceBright"
  | "surfaceContainerLowest"
  | "surfaceContainerLow"
  | "surfaceContainer"
  | "surfaceContainerHigh"
  | "surfaceContainerHighest"
  | "onSurface"
  | "surfaceVariant"
  | "onSurfaceVariant"
  | "outline"
  | "outlineVariant"
  | "inverseSurface"
  | "inverseOnSurface",
  number
>;

const LIGHT_TONES: ToneMap = {
  primary: 40,
  onPrimary: 100,
  primaryContainer: 90,
  onPrimaryContainer: 10,
  inversePrimary: 80,
  secondary: 40,
  onSecondary: 100,
  secondaryContainer: 90,
  onSecondaryContainer: 10,
  tertiary: 40,
  onTertiary: 100,
  tertiaryContainer: 90,
  onTertiaryContainer: 10,
  surface: 98,
  surfaceDim: 87,
  surfaceBright: 98,
  surfaceContainerLowest: 100,
  surfaceContainerLow: 96,
  surfaceContainer: 94,
  surfaceContainerHigh: 92,
  surfaceContainerHighest: 90,
  onSurface: 10,
  surfaceVariant: 90,
  onSurfaceVariant: 30,
  outline: 50,
  outlineVariant: 80,
  inverseSurface: 20,
  inverseOnSurface: 95,
};

const DARK_TONES: ToneMap = {
  primary: 80,
  onPrimary: 20,
  primaryContainer: 30,
  onPrimaryContainer: 90,
  inversePrimary: 40,
  secondary: 80,
  onSecondary: 20,
  secondaryContainer: 30,
  onSecondaryContainer: 90,
  tertiary: 80,
  onTertiary: 20,
  tertiaryContainer: 30,
  onTertiaryContainer: 90,
  surface: 6,
  surfaceDim: 6,
  surfaceBright: 24,
  surfaceContainerLowest: 4,
  surfaceContainerLow: 10,
  surfaceContainer: 12,
  surfaceContainerHigh: 17,
  surfaceContainerHighest: 22,
  onSurface: 90,
  surfaceVariant: 30,
  onSurfaceVariant: 80,
  outline: 60,
  outlineVariant: 30,
  inverseSurface: 90,
  inverseOnSurface: 20,
};

function tonesFor(dark: boolean, contrast: ContrastLevel): ToneMap {
  const tones = { ...(dark ? DARK_TONES : LIGHT_TONES) };
  if (contrast === "medium") {
    if (dark) {
      Object.assign(tones, {
        primary: 85,
        secondary: 85,
        tertiary: 85,
        onPrimaryContainer: 95,
        onSecondaryContainer: 95,
        onTertiaryContainer: 95,
        onSurfaceVariant: 85,
        outline: 70,
        outlineVariant: 50,
      });
    } else {
      Object.assign(tones, {
        primary: 30,
        secondary: 30,
        tertiary: 30,
        onPrimaryContainer: 20,
        onSecondaryContainer: 20,
        onTertiaryContainer: 20,
        onSurfaceVariant: 25,
        outline: 40,
        outlineVariant: 65,
      });
    }
  } else if (contrast === "high") {
    if (dark) {
      Object.assign(tones, {
        primary: 95,
        onPrimary: 0,
        primaryContainer: 80,
        onPrimaryContainer: 0,
        secondary: 95,
        onSecondary: 0,
        secondaryContainer: 80,
        onSecondaryContainer: 0,
        tertiary: 95,
        onTertiary: 0,
        tertiaryContainer: 80,
        onTertiaryContainer: 0,
        onSurface: 100,
        onSurfaceVariant: 95,
        outline: 90,
        outlineVariant: 90,
      });
    } else {
      Object.assign(tones, {
        primary: 20,
        secondary: 20,
        tertiary: 20,
        primaryContainer: 30,
        onPrimaryContainer: 100,
        secondaryContainer: 30,
        onSecondaryContainer: 100,
        tertiaryContainer: 30,
        onTertiaryContainer: 100,
        onSurface: 0,
        onSurfaceVariant: 10,
        outline: 20,
        outlineVariant: 20,
      });
    }
  }
  return tones;
}

const ERROR_LIGHT = {
  error: "#B3261E",
  onError: "#FFFFFF",
  errorContainer: "#F9DEDC",
  onErrorContainer: "#410E0B",
};

const ERROR_DARK = {
  error: "#F2B8B5",
  onError: "#601410",
  errorContainer: "#8C1D18",
  onErrorContainer: "#F9DEDC",
};

export interface SchemeOptions {
  key?: string;
  label?: string;
  dark?: boolean;
  contrast?: ContrastLevel;
  keepChroma?: boolean;
}

/** Generate a complete Material 3 ColorScheme from a single hex seed color. */
export function schemeFromSeed(seedHex: string, opts: SchemeOptions = {}): M3Palette {
  const rgb = hexToRgb(seedHex) ?? [103, 80, 164];
  const lch = labToLch(rgbToLab(rgb[0], rgb[1], rgb[2]));
  const h = lch.h;
  const primaryC = opts.keepChroma ? Math.min(lch.C, 60) : Math.max(36, Math.min(lch.C, 60));
  const secondaryC = primaryC / 3;
  const tertiaryH = (h + 60) % 360;
  const tertiaryC = primaryC / 2;
  const neutralC = 3;
  const neutralVarC = 7;

  const P = (L: number) => toneColor(L, primaryC, h);
  const S = (L: number) => toneColor(L, secondaryC, h);
  const T = (L: number) => toneColor(L, tertiaryC, tertiaryH);
  const N = (L: number) => toneColor(L, neutralC, h);
  const NV = (L: number) => toneColor(L, neutralVarC, h);

  const dark = !!opts.dark;
  const k = tonesFor(dark, opts.contrast ?? "standard");
  const surface = N(k.surface);
  const onSurface = N(k.onSurface);

  return {
    key: opts.key ?? "custom",
    label: opts.label ?? "Custom",
    seed: seedHex.toUpperCase(),
    primary: P(k.primary),
    onPrimary: P(k.onPrimary),
    primaryContainer: P(k.primaryContainer),
    onPrimaryContainer: P(k.onPrimaryContainer),
    inversePrimary: P(k.inversePrimary),
    secondary: S(k.secondary),
    onSecondary: S(k.onSecondary),
    secondaryContainer: S(k.secondaryContainer),
    onSecondaryContainer: S(k.onSecondaryContainer),
    tertiary: T(k.tertiary),
    onTertiary: T(k.onTertiary),
    tertiaryContainer: T(k.tertiaryContainer),
    onTertiaryContainer: T(k.onTertiaryContainer),
    background: surface,
    onBackground: onSurface,
    surface,
    surfaceDim: N(k.surfaceDim),
    surfaceBright: N(k.surfaceBright),
    surfaceContainerLowest: N(k.surfaceContainerLowest),
    surfaceContainerLow: N(k.surfaceContainerLow),
    surfaceContainer: N(k.surfaceContainer),
    surfaceContainerHigh: N(k.surfaceContainerHigh),
    surfaceContainerHighest: N(k.surfaceContainerHighest),
    onSurface,
    surfaceVariant: NV(k.surfaceVariant),
    onSurfaceVariant: NV(k.onSurfaceVariant),
    outline: NV(k.outline),
    outlineVariant: NV(k.outlineVariant),
    inverseSurface: N(k.inverseSurface),
    inverseOnSurface: N(k.inverseOnSurface),
    ...(dark ? ERROR_DARK : ERROR_LIGHT),
    scrim: "#000000",
  };
}

export interface PalettePreset {
  key: string;
  label: string;
  seed: string;
  keepChroma?: boolean;
}

export const PALETTE_PRESETS: PalettePreset[] = [
  { key: "purple", label: "Baseline Purple", seed: "#6750A4" },
  { key: "blue", label: "Pixel Blue", seed: "#0B57D0" },
  { key: "green", label: "Forest Green", seed: "#2E6A45" },
  { key: "coral", label: "Expressive Coral", seed: "#984061" },
  { key: "amber", label: "Warm Amber", seed: "#8B5000" },
  { key: "teal", label: "Ocean Teal", seed: "#00696E" },
  { key: "mono", label: "Monochrome", seed: "#4A4459", keepChroma: true },
];

export interface WallpaperPreset {
  id: string;
  label: string;
  seed: string;
  gradient: string;
}

/** Simulated Android Material You wallpaper presets for testing Dynamic Color extraction. */
export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: "bloom",
    label: "Lavender Bloom",
    seed: "#7B4FB3",
    gradient: "linear-gradient(135deg, #4A237A 0%, #9E72D8 50%, #F5D5F2 100%)",
  },
  {
    id: "meadow",
    label: "Sage Meadow",
    seed: "#2D6B4F",
    gradient: "linear-gradient(135deg, #103A27 0%, #48976F 55%, #BCEAD3 100%)",
  },
  {
    id: "sunset",
    label: "Desert Sunset",
    seed: "#B04A2F",
    gradient: "linear-gradient(135deg, #6E1F14 0%, #DF7857 52%, #FFD8B8 100%)",
  },
  {
    id: "tide",
    label: "Pacific Tide",
    seed: "#00658F",
    gradient: "linear-gradient(135deg, #003552 0%, #248CB8 52%, #C0EBFF 100%)",
  },
];

export function resolvePalette(theme: AppThemeConfig, isDark: boolean): M3Palette {
  const wallpaper = theme.useDynamicColor
    ? WALLPAPER_PRESETS.find((w) => w.id === theme.wallpaperId)
    : undefined;
  const preset = PALETTE_PRESETS.find((p) => p.key === theme.paletteKey);

  const seed = wallpaper
    ? wallpaper.seed
    : theme.paletteKey === "custom"
      ? theme.seedColor
      : preset?.seed ?? theme.seedColor;

  const base = schemeFromSeed(seed, {
    key: wallpaper ? `dynamic:${wallpaper.id}` : preset?.key ?? "custom",
    label: wallpaper ? wallpaper.label : preset?.label ?? "Custom",
    dark: isDark,
    contrast: theme.contrast,
    keepChroma: !wallpaper && preset?.keepChroma,
  });

  if (!Object.keys(theme.customOverrides).length) return base;
  return { ...base, ...theme.customOverrides };
}

/** Compute an accessible foreground color (tone 10 or 100) for an arbitrary background hex. */
export function onColorFor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#000000";
  const lch = labToLch(rgbToLab(rgb[0], rgb[1], rgb[2]));
  return lch.L > 60 ? toneColor(10, Math.min(lch.C, 30), lch.h) : toneColor(100, 0, lch.h);
}

export const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v.trim());

export const TUNABLE_COLOR_ROLES: { key: ColorTokenKey; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "primaryContainer", label: "Primary Container" },
  { key: "secondaryContainer", label: "Secondary Container" },
  { key: "tertiaryContainer", label: "Tertiary Container" },
  { key: "surface", label: "Surface" },
  { key: "surfaceContainerHigh", label: "Surface High" },
];
