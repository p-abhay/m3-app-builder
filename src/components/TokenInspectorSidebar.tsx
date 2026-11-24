import { useM3Theme } from "@/theme/ThemeContext";
import type { ColorTokenKey } from "@/theme/types";
import { Icon } from "./Icon";

const TOKEN_GROUPS: { title: string; roles: ColorTokenKey[] }[] = [
  {
    title: "Accent Roles",
    roles: ["primary", "onPrimary", "primaryContainer", "onPrimaryContainer", "secondaryContainer", "tertiaryContainer"],
  },
  {
    title: "Surface Hierarchy",
    roles: [
      "surface",
      "surfaceContainerLowest",
      "surfaceContainerLow",
      "surfaceContainer",
      "surfaceContainerHigh",
      "surfaceContainerHighest",
    ],
  },
  {
    title: "Outline & Semantic",
    roles: ["onSurface", "onSurfaceVariant", "outline", "outlineVariant", "error", "errorContainer"],
  },
];

export function TokenInspectorSidebar() {
  const { theme, palette, shapes, spacing, typeStyle } = useM3Theme();

  return (
    <div
      className="flex flex-col h-full border-r"
      style={{
        backgroundColor: palette.surfaceContainerLow,
        borderColor: palette.outlineVariant,
        color: palette.onSurface,
      }}
    >
      <div
        className="px-4 py-3 border-b flex items-center gap-2"
        style={{ borderColor: palette.outlineVariant }}
      >
        <Icon name="data_object" size={20} color={palette.primary} />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold truncate">Generated M3 Tokens</h2>
          <p className="text-[11px] truncate" style={{ color: palette.onSurfaceVariant }}>
            Phase 1 Token &amp; System Engine
          </p>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto p-3 space-y-5">
        {/* Active System Summary */}
        <div
          className="p-3 space-y-2 text-xs"
          style={{
            backgroundColor: palette.surfaceContainer,
            borderRadius: shapes.large,
          }}
        >
          <div className="font-semibold flex items-center gap-1.5">
            <Icon name="android" size={16} color={palette.primary} />
            Active System Profile
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]" style={{ color: palette.onSurfaceVariant }}>
            <div>Display: <strong style={{ color: palette.onSurface }}>{theme.displayFont}</strong></div>
            <div>Body: <strong style={{ color: palette.onSurface }}>{theme.bodyFont}</strong></div>
            <div>Scale: <strong style={{ color: palette.onSurface }}>{Math.round(theme.fontScale * 100)}%</strong></div>
            <div>Shape: <strong style={{ color: palette.onSurface }}>{theme.shapeScale}</strong></div>
            <div>Margin: <strong style={{ color: palette.onSurface }}>{spacing.screenMargin}dp</strong></div>
            <div>Motion: <strong style={{ color: palette.onSurface }}>{theme.motion}</strong></div>
          </div>
        </div>

        {/* Shape Scale Tokens */}
        <div>
          <div
            className="text-[11px] font-bold uppercase tracking-wider px-1 mb-2"
            style={{ color: palette.onSurfaceVariant }}
          >
            Shape Tokens (dp)
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                ["XS", shapes.extraSmall],
                ["S", shapes.small],
                ["M", shapes.medium],
                ["L", shapes.large],
                ["XL", shapes.extraLarge],
                ["Full", "∞"],
              ] as const
            ).map(([label, val]) => (
              <div
                key={label}
                className="p-2 flex flex-col items-center justify-center gap-1"
                style={{
                  backgroundColor: palette.surfaceContainer,
                  borderRadius: typeof val === "number" ? Math.min(val, 16) : 16,
                  border: `1px solid ${palette.outlineVariant}`,
                }}
              >
                <span className="text-[10px] font-bold" style={{ color: palette.onSurfaceVariant }}>
                  {label}
                </span>
                <span className="text-xs font-mono font-semibold">
                  {typeof val === "number" ? `${val}dp` : val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Typography Preview */}
        <div>
          <div
            className="text-[11px] font-bold uppercase tracking-wider px-1 mb-2"
            style={{ color: palette.onSurfaceVariant }}
          >
            Computed Type Scale
          </div>
          <div
            className="p-3 space-y-2"
            style={{
              backgroundColor: palette.surfaceContainer,
              borderRadius: shapes.large,
            }}
          >
            <div style={typeStyle("headlineSmall")} className="truncate">
              Headline Small
            </div>
            <div style={typeStyle("titleMedium")} className="truncate">
              Title Medium ({typeStyle("titleMedium").fontSize})
            </div>
            <div style={typeStyle("bodyMedium")} className="truncate">
              Body Medium ({typeStyle("bodyMedium").fontSize})
            </div>
            <div style={typeStyle("labelLarge")} className="truncate">
              Label Large • Weight {typeStyle("labelLarge").fontWeight}
            </div>
          </div>
        </div>

        {/* Color Scheme Swatches */}
        {TOKEN_GROUPS.map((group) => (
          <div key={group.title}>
            <div
              className="text-[11px] font-bold uppercase tracking-wider px-1 mb-2"
              style={{ color: palette.onSurfaceVariant }}
            >
              {group.title}
            </div>
            <div className="space-y-1">
              {group.roles.map((role) => (
                <div
                  key={role}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-[11px]"
                  style={{
                    backgroundColor: palette.surfaceContainer,
                    borderRadius: shapes.small,
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-4 h-4 rounded shrink-0"
                      style={{
                        backgroundColor: palette[role],
                        border: `1px solid ${palette.outlineVariant}`,
                      }}
                    />
                    <span className="font-mono truncate">{role}</span>
                  </div>
                  <span className="font-mono opacity-75">{palette[role]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
