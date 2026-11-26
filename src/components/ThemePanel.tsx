import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useM3Theme } from "@/theme/ThemeContext";
import { PALETTE_PRESETS, TUNABLE_COLOR_ROLES, WALLPAPER_PRESETS, isHex } from "@/theme/color";
import { ensureFontLoaded, FONTS } from "@/theme/fonts";
import { CONTRAST_LEVELS, DENSITY_SCALES, FONT_SCALES, SHAPE_SCALES } from "@/theme/tokens";
import type { NavBarStyle, ShapeScale, ThemeMode } from "@/theme/types";
import { Icon } from "./Icon";

type StudioTab = "color" | "typeShape" | "system";

function SectionTitle({ children }: { children: string }) {
  const { palette } = useM3Theme();
  return (
    <div
      className="text-[11px] font-bold uppercase tracking-wider px-1 mb-2"
      style={{ color: palette.onSurfaceVariant }}
    >
      {children}
    </div>
  );
}

function SegmentedButtons<T extends string>({
  options,
  value,
  onChange,
  asTabs = false,
}: {
  options: readonly { key: T; label: string; icon?: string }[];
  value: T;
  onChange: (value: T) => void;
  asTabs?: boolean;
}) {
  const { palette, shapes } = useM3Theme();
  return (
    <div
      role={asTabs ? "tablist" : undefined}
      className="flex p-1 gap-1"
      style={{
        backgroundColor: palette.surfaceContainerHigh,
        borderRadius: shapes.full,
      }}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            role={asTabs ? "tab" : undefined}
            aria-selected={asTabs ? active : undefined}
            onClick={() => onChange(opt.key)}
            className="m3-press flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold cursor-pointer border-0"
            style={{
              borderRadius: shapes.full,
              backgroundColor: active ? palette.secondaryContainer : "transparent",
              color: active ? palette.onSecondaryContainer : palette.onSurfaceVariant,
            }}
          >
            {opt.icon && <Icon name={opt.icon} size={15} fill={active} />}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ShapePreviewArt({ shape }: { shape: ShapeScale }) {
  const { palette } = useM3Theme();
  const r = shape === "square" ? 6 : shape === "full" ? 26 : 14;
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <span
        style={{
          width: 56,
          height: 24,
          borderRadius: r,
          backgroundColor: palette.primary,
        }}
      />
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: Math.round(r * 0.65),
          backgroundColor: palette.primaryContainer,
        }}
      />
      <span
        style={{
          width: 38,
          height: 24,
          borderRadius: Math.round(r * 0.75),
          backgroundColor: palette.surfaceContainerHighest,
          border: `1px solid ${palette.outlineVariant}`,
        }}
      />
    </div>
  );
}

export function ThemePanel() {
  const {
    theme,
    isDark,
    palette,
    shapes,
    transition,
    updateTheme,
    updateSystemBars,
    setColorOverride,
    clearColorOverrides,
    resetTheme,
  } = useM3Theme();

  const [tab, setTab] = useState<StudioTab>("color");
  const [seedInput, setSeedInput] = useState(theme.seedColor);
  const [motionTick, setMotionTick] = useState(0);

  useEffect(() => {
    setSeedInput(theme.seedColor);
  }, [theme.seedColor]);

  const overrideCount = Object.keys(theme.customOverrides).length;

  return (
    <div
      className="flex flex-col h-full"
      style={{
        backgroundColor: palette.surfaceContainerLow,
        color: palette.onSurface,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between gap-2"
        style={{ borderColor: palette.outlineVariant }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="palette" size={20} color={palette.primary} />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">Theme &amp; System</h2>
            <p className="text-[11px] truncate" style={{ color: palette.onSurfaceVariant }}>
              Material 3 Expressive Engine
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            resetTheme();
            setSeedInput("#6750A4");
          }}
          className="m3-press text-[11px] font-semibold px-2.5 py-1 cursor-pointer border-0"
          style={{
            borderRadius: shapes.full,
            backgroundColor: palette.surfaceContainerHigh,
            color: palette.onSurfaceVariant,
          }}
          title="Reset all theme settings to defaults"
        >
          Reset
        </button>
      </div>

      {/* Studio Tabs */}
      <div className="px-3 pt-3 pb-2">
        <SegmentedButtons<StudioTab>
          asTabs
          value={tab}
          onChange={setTab}
          options={[
            { key: "color", label: "Color", icon: "color_lens" },
            { key: "typeShape", label: "Type & Shape", icon: "text_fields" },
            { key: "system", label: "System", icon: "tune" },
          ]}
        />
      </div>

      {/* Scrollable Body */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-5 pt-2 space-y-5">
        {tab === "color" && (
          <>
            <div>
              <SectionTitle>Theme Mode</SectionTitle>
              <SegmentedButtons<ThemeMode>
                value={theme.mode}
                onChange={(mode) => updateTheme({ mode })}
                options={[
                  { key: "light", label: "Light", icon: "light_mode" },
                  { key: "dark", label: "Dark", icon: "dark_mode" },
                  { key: "system", label: "System", icon: "brightness_auto" },
                ]}
              />
              {theme.mode === "system" && (
                <p className="text-[11px] mt-1.5" style={{ color: palette.onSurfaceVariant }}>
                  Auto following device settings ({isDark ? "Dark" : "Light"} active; exported{" "}
                  <code>Theme.kt</code> uses <code>isSystemInDarkTheme()</code>)
                </p>
              )}
            </div>

            <div>
              <SectionTitle>Contrast Level</SectionTitle>
              <SegmentedButtons
                value={theme.contrast}
                onChange={(contrast) => updateTheme({ contrast })}
                options={CONTRAST_LEVELS}
              />
            </div>

            {/* Dynamic Color / Wallpaper Simulator */}
            <div
              className="p-3 space-y-2.5"
              style={{
                backgroundColor: palette.surfaceContainer,
                borderRadius: shapes.large,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon name="wallpaper" size={18} color={palette.primary} />
                  <div>
                    <div className="text-xs font-semibold">Dynamic Color (Material You)</div>
                    <div className="text-[11px]" style={{ color: palette.onSurfaceVariant }}>
                      Extract scheme from wallpaper
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={theme.useDynamicColor}
                  onClick={() => updateTheme({ useDynamicColor: !theme.useDynamicColor })}
                  className="w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer border-0 flex items-center"
                  style={{
                    backgroundColor: theme.useDynamicColor ? palette.primary : palette.surfaceContainerHighest,
                    justifyContent: theme.useDynamicColor ? "flex-end" : "flex-start",
                    border: theme.useDynamicColor ? "none" : `1px solid ${palette.outline}`,
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full transition-transform"
                    style={{
                      backgroundColor: theme.useDynamicColor ? palette.onPrimary : palette.outline,
                    }}
                  />
                </button>
              </div>

              {theme.useDynamicColor && (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {WALLPAPER_PRESETS.map((wp) => {
                    const active = theme.wallpaperId === wp.id;
                    return (
                      <button
                        key={wp.id}
                        type="button"
                        onClick={() => updateTheme({ wallpaperId: wp.id })}
                        className="m3-press flex items-center gap-2 p-1.5 text-left cursor-pointer border-0"
                        style={{
                          borderRadius: shapes.medium,
                          backgroundColor: active ? palette.secondaryContainer : palette.surfaceContainerLow,
                          color: active ? palette.onSecondaryContainer : palette.onSurface,
                          outline: active ? `2px solid ${palette.primary}` : "none",
                        }}
                      >
                        <span
                          className="w-6 h-6 rounded-full shrink-0"
                          style={{ background: wp.gradient }}
                        />
                        <span className="text-[11px] font-medium truncate">{wp.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {!theme.useDynamicColor && (
              <>
                <div>
                  <SectionTitle>Seed Presets</SectionTitle>
                  <div className="space-y-1.5">
                    {PALETTE_PRESETS.map((preset) => {
                      const active = theme.paletteKey === preset.key;
                      return (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => {
                            updateTheme({ paletteKey: preset.key, seedColor: preset.seed });
                            setSeedInput(preset.seed);
                          }}
                          className="m3-press w-full flex items-center justify-between px-3 py-2 cursor-pointer border-0"
                          style={{
                            borderRadius: shapes.medium,
                            backgroundColor: active ? palette.secondaryContainer : palette.surfaceContainer,
                            color: active ? palette.onSecondaryContainer : palette.onSurface,
                          }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-5 h-5 rounded-full shrink-0"
                              style={{ backgroundColor: preset.seed }}
                            />
                            <span className="text-xs font-medium truncate">{preset.label}</span>
                          </div>
                          {active && <Icon name="check" size={18} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <SectionTitle>Custom Seed Hex</SectionTitle>
                  <div
                    className="flex items-center gap-2.5 p-2"
                    style={{
                      backgroundColor: palette.surfaceContainer,
                      borderRadius: shapes.medium,
                    }}
                  >
                    <label className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 cursor-pointer">
                      <span
                        className="block w-full h-full"
                        style={{ backgroundColor: palette.primary }}
                      />
                      <input
                        type="color"
                        value={theme.seedColor}
                        onChange={(e) => {
                          const hex = e.target.value.toUpperCase();
                          setSeedInput(hex);
                          updateTheme({ paletteKey: "custom", seedColor: hex });
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                    <input
                      type="text"
                      value={seedInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSeedInput(val);
                        if (isHex(val)) {
                          updateTheme({ paletteKey: "custom", seedColor: val.toUpperCase() });
                        }
                      }}
                      onBlur={() => setSeedInput(theme.seedColor)}
                      className="flex-1 min-w-0 bg-transparent text-xs font-mono outline-none px-1"
                      style={{ color: palette.onSurface }}
                      spellCheck={false}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: palette.onSurfaceVariant }}>
                  Fine-Tune Roles
                </span>
                {overrideCount > 0 && (
                  <button
                    type="button"
                    onClick={clearColorOverrides}
                    className="text-[11px] font-semibold cursor-pointer bg-transparent border-0"
                    style={{ color: palette.primary }}
                  >
                    Clear ({overrideCount})
                  </button>
                )}
              </div>
              <div
                className="p-2.5 space-y-2"
                style={{
                  backgroundColor: palette.surfaceContainer,
                  borderRadius: shapes.large,
                }}
              >
                {TUNABLE_COLOR_ROLES.map(({ key, label }) => {
                  const val = palette[key];
                  return (
                    <div key={key} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <label
                          className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 cursor-pointer"
                          style={{
                            backgroundColor: val,
                            border: `1px solid ${palette.outlineVariant}`,
                          }}
                        >
                          <input
                            type="color"
                            value={val}
                            onChange={(e) => setColorOverride(key, e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </label>
                        <span className="truncate">{label}</span>
                      </div>
                      <span className="font-mono text-[11px]" style={{ color: palette.onSurfaceVariant }}>
                        {val}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === "typeShape" && (
          <>
            <div>
              <SectionTitle>Display &amp; Headline Font</SectionTitle>
              <div className="space-y-1.5">
                {FONTS.map((f) => {
                  const active = theme.displayFont === f.key;
                  ensureFontLoaded(f.key);
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => updateTheme({ displayFont: f.key })}
                      className="m3-press w-full flex items-center gap-3 px-3 py-2 text-left cursor-pointer border-0"
                      style={{
                        borderRadius: shapes.medium,
                        backgroundColor: active ? palette.secondaryContainer : palette.surfaceContainer,
                        color: active ? palette.onSecondaryContainer : palette.onSurface,
                        fontFamily: f.family,
                      }}
                    >
                      <span className="text-lg font-semibold w-7">Aa</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{f.label}</div>
                        <div className="text-[10px] opacity-75 truncate">{f.category}</div>
                      </div>
                      {active && <Icon name="check" size={18} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <SectionTitle>Body &amp; Label Font</SectionTitle>
              <select
                value={theme.bodyFont}
                onChange={(e) => updateTheme({ bodyFont: e.target.value as typeof theme.bodyFont })}
                className="w-full px-3 py-2 text-xs font-medium outline-none cursor-pointer"
                style={{
                  borderRadius: shapes.medium,
                  backgroundColor: palette.surfaceContainer,
                  color: palette.onSurface,
                  border: `1px solid ${palette.outlineVariant}`,
                }}
              >
                {FONTS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label} — {f.category}
                  </option>
                ))}
              </select>
            </div>

            {/* Emphasized Typography & Accessibility Scale */}
            <div
              className="p-3 space-y-3"
              style={{
                backgroundColor: palette.surfaceContainer,
                borderRadius: shapes.large,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold">Emphasized Type Weights</div>
                  <div className="text-[11px]" style={{ color: palette.onSurfaceVariant }}>
                    M3 Expressive bolder titles &amp; labels
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={theme.emphasizedType}
                  onClick={() => updateTheme({ emphasizedType: !theme.emphasizedType })}
                  className="w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer border-0 flex items-center"
                  style={{
                    backgroundColor: theme.emphasizedType ? palette.primary : palette.surfaceContainerHighest,
                    justifyContent: theme.emphasizedType ? "flex-end" : "flex-start",
                    border: theme.emphasizedType ? "none" : `1px solid ${palette.outline}`,
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: theme.emphasizedType ? palette.onPrimary : palette.outline,
                    }}
                  />
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold">System Font Scale</span>
                  <span className="font-mono text-[11px]" style={{ color: palette.primary }}>
                    {Math.round(theme.fontScale * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {FONT_SCALES.map((fs) => {
                    const active = theme.fontScale === fs.value;
                    return (
                      <button
                        key={fs.value}
                        type="button"
                        onClick={() => updateTheme({ fontScale: fs.value })}
                        className="m3-press py-1.5 text-[11px] font-semibold cursor-pointer border-0"
                        style={{
                          borderRadius: shapes.small,
                          backgroundColor: active ? palette.primary : palette.surfaceContainerHigh,
                          color: active ? palette.onPrimary : palette.onSurface,
                        }}
                      >
                        {Math.round(fs.value * 100)}%
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <SectionTitle>Shape Corner Scale</SectionTitle>
              <div className="space-y-2">
                {SHAPE_SCALES.map((sh) => {
                  const active = theme.shapeScale === sh.key;
                  return (
                    <button
                      key={sh.key}
                      type="button"
                      onClick={() => updateTheme({ shapeScale: sh.key })}
                      className="m3-press w-full text-left p-3 cursor-pointer border-0"
                      style={{
                        borderRadius: shapes.large,
                        backgroundColor: active ? palette.secondaryContainer : palette.surfaceContainer,
                        color: active ? palette.onSecondaryContainer : palette.onSurface,
                        outline: active ? `2px solid ${palette.primary}` : "none",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{sh.label}</span>
                        {active && <Icon name="check" size={16} />}
                      </div>
                      <div className="text-[11px] opacity-80">{sh.description}</div>
                      <ShapePreviewArt shape={sh.key} />
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === "system" && (
          <>
            <div>
              <SectionTitle>Layout Density</SectionTitle>
              <SegmentedButtons
                value={theme.density}
                onChange={(density) => updateTheme({ density })}
                options={DENSITY_SCALES}
              />
            </div>

            <div>
              <SectionTitle>Motion Physics</SectionTitle>
              <SegmentedButtons
                value={theme.motion}
                onChange={(motion) => {
                  updateTheme({ motion });
                  setMotionTick((n) => n + 1);
                }}
                options={[
                  { key: "standard", label: "Standard", icon: "trending_flat" },
                  { key: "expressive", label: "Expressive Spring", icon: "waves" },
                ]}
              />

              <button
                type="button"
                onClick={() => setMotionTick((n) => n + 1)}
                className="mt-2.5 w-full h-20 flex flex-col items-center justify-center gap-1 cursor-pointer border-0 overflow-hidden"
                style={{
                  borderRadius: shapes.large,
                  backgroundColor: palette.surfaceContainer,
                  color: palette.onSurfaceVariant,
                }}
              >
                <motion.div
                  key={`${theme.motion}-${motionTick}`}
                  initial={{ x: -80, scale: 0.75, rotate: -18 }}
                  animate={{ x: 0, scale: 1, rotate: 0 }}
                  transition={transition}
                  className="w-10 h-10 flex items-center justify-center"
                  style={{
                    borderRadius: theme.motion === "expressive" ? shapes.medium : shapes.full,
                    backgroundColor: palette.primary,
                    color: palette.onPrimary,
                  }}
                >
                  <Icon name="bolt" size={20} fill />
                </motion.div>
                <span className="text-[10px] font-medium">Tap to test {theme.motion} motion</span>
              </button>
            </div>

            <div>
              <SectionTitle>Android System Bars</SectionTitle>
              <div
                className="p-3 space-y-3"
                style={{
                  backgroundColor: palette.surfaceContainer,
                  borderRadius: shapes.large,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold">Edge-to-Edge</div>
                    <div className="text-[11px]" style={{ color: palette.onSurfaceVariant }}>
                      Draw behind status &amp; nav bars
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={theme.systemBars.edgeToEdge}
                    onClick={() => updateSystemBars({ edgeToEdge: !theme.systemBars.edgeToEdge })}
                    className="w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer border-0 flex items-center"
                    style={{
                      backgroundColor: theme.systemBars.edgeToEdge
                        ? palette.primary
                        : palette.surfaceContainerHighest,
                      justifyContent: theme.systemBars.edgeToEdge ? "flex-end" : "flex-start",
                      border: theme.systemBars.edgeToEdge ? "none" : `1px solid ${palette.outline}`,
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor: theme.systemBars.edgeToEdge
                          ? palette.onPrimary
                          : palette.outline,
                      }}
                    />
                  </button>
                </div>

                <div>
                  <div className="text-xs font-semibold mb-1.5">Navigation Bar Style</div>
                  <SegmentedButtons<NavBarStyle>
                    value={theme.systemBars.navBarStyle}
                    onChange={(navBarStyle) => updateSystemBars({ navBarStyle })}
                    options={[
                      { key: "gesture", label: "Gesture Pill" },
                      { key: "threeButton", label: "3-Button" },
                    ]}
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold mb-1.5">Status Bar Icons</div>
                  <SegmentedButtons
                    value={theme.systemBars.statusBarIcons}
                    onChange={(statusBarIcons) => updateSystemBars({ statusBarIcons })}
                    options={[
                      { key: "auto", label: "Auto" },
                      { key: "dark", label: "Dark" },
                      { key: "light", label: "Light" },
                    ]}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
