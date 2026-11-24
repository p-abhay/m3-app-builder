import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { resolvePalette } from "./color.ts";
import { ensureFontLoaded } from "./fonts.ts";
import {
  densitySpacingFor,
  resolveTypeStyle,
  scaleRadius,
  shapeTokensFor,
  transitionFor,
} from "./tokens.ts";
import type {
  AppThemeConfig,
  ColorTokenKey,
  M3DensityTokens,
  M3Palette,
  M3ShapeTokens,
  SystemBarsConfig,
  TypeRole,
} from "./types.ts";

interface M3ThemeContextValue {
  theme: AppThemeConfig;
  palette: M3Palette;
  isDark: boolean;
  shapes: M3ShapeTokens;
  spacing: M3DensityTokens;
  transition: ReturnType<typeof transitionFor>;
  scaleR: (baseDp: number) => number;
  typeStyle: (role: TypeRole) => CSSProperties;
  updateTheme: (patch: Partial<AppThemeConfig>) => void;
  updateSystemBars: (patch: Partial<SystemBarsConfig>) => void;
  setColorOverride: (role: ColorTokenKey, hex: string) => void;
  clearColorOverrides: () => void;
  resetTheme: () => void;
}

const M3ThemeContext = createContext<M3ThemeContextValue | null>(null);

export function M3ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useProjectStore((s) => s.project.theme);
  const updateTheme = useProjectStore((s) => s.updateTheme);
  const updateSystemBars = useProjectStore((s) => s.updateSystemBars);
  const setColorOverride = useProjectStore((s) => s.setColorOverride);
  const clearColorOverrides = useProjectStore((s) => s.clearColorOverrides);
  const resetTheme = useProjectStore((s) => s.resetTheme);

  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    ensureFontLoaded(theme.displayFont);
    ensureFontLoaded(theme.bodyFont);
  }, [theme.displayFont, theme.bodyFont]);

  const isDark = theme.mode === "dark" || (theme.mode === "system" && systemDark);
  const palette = useMemo(() => resolvePalette(theme, isDark), [theme, isDark]);
  const shapes = useMemo(() => shapeTokensFor(theme.shapeScale), [theme.shapeScale]);
  const spacing = useMemo(() => densitySpacingFor(theme.density), [theme.density]);
  const transition = useMemo(() => transitionFor(theme.motion), [theme.motion]);

  const scaleR = useCallback(
    (baseDp: number) => scaleRadius(baseDp, theme.shapeScale),
    [theme.shapeScale],
  );

  const typeStyle = useCallback(
    (role: TypeRole) => resolveTypeStyle(role, theme),
    [theme],
  );

  const value = useMemo<M3ThemeContextValue>(
    () => ({
      theme,
      palette,
      isDark,
      shapes,
      spacing,
      transition,
      scaleR,
      typeStyle,
      updateTheme,
      updateSystemBars,
      setColorOverride,
      clearColorOverrides,
      resetTheme,
    }),
    [
      theme,
      palette,
      isDark,
      shapes,
      spacing,
      transition,
      scaleR,
      typeStyle,
      updateTheme,
      updateSystemBars,
      setColorOverride,
      clearColorOverrides,
      resetTheme,
    ],
  );

  return <M3ThemeContext.Provider value={value}>{children}</M3ThemeContext.Provider>;
}

export function useM3Theme(): M3ThemeContextValue {
  const ctx = useContext(M3ThemeContext);
  if (!ctx) {
    throw new Error("useM3Theme must be used inside <M3ThemeProvider>");
  }
  return ctx;
}
