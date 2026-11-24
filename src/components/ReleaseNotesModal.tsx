import { useState } from "react";
import { useM3Theme } from "@/theme/ThemeContext";
import { Icon } from "./Icon";

interface ReleaseNotesModalProps {
  open: boolean;
  onClose: () => void;
}

interface FeatureItem {
  title: string;
  icon: string;
  tag?: string;
  points: string[];
}

const V1_RELEASE_NOTES: FeatureItem[] = [
  {
    title: "Material 3 Expressive Theme & System Engine",
    icon: "palette",
    tag: "V1 Core",
    points: [
      "Gamut-safe seed color palette generator with 7 presets, Light/Dark/System modes, and Standard/Medium/High contrast.",
      "Material You Dynamic Color wallpaper simulation and per-role hex fine-tuning.",
      "Display & Body Google Font pairing, emphasized type weights, system font scaling (85%–130%), shape scales (Square/Rounded/Full), layout density, motion physics, and Android system bars.",
    ],
  },
  {
    title: "Normalized Android AST & Project Studio",
    icon: "account_tree",
    tag: "Schema v1",
    points: [
      "Android Scaffold slots (TopAppBar, Body, FAB, and Shared Bottom Navigation) backed by an O(1) normalized node map.",
      "4 curated starter templates (Material Showcase, Android Settings, Auth Flow, Blank App).",
      "50-step Undo/Redo (Ctrl+Z / Ctrl+Shift+Z), localStorage auto-save, and validated JSON import/export.",
    ],
  },
  {
    title: "Visual Drag-and-Drop & 22 M3 Components",
    icon: "widgets",
    tag: "Editor",
    points: [
      "Categorized, searchable Parts Palette with click-to-insert and slot-aware drag-and-drop into TopAppBar, FAB, Body, and nested Cards.",
      "Sortable AST Tree / Layers panel with bidirectional selection and M3E connected button/list groups.",
      "Offline-ready Material Symbols Icon Picker, full component Properties Inspector, and Phone/Tablet viewport switcher.",
    ],
  },
  {
    title: "Isolated Interactive Preview",
    icon: "play_arrow",
    tag: "Simulator",
    points: [
      "Live TextField typing, Switch/Checkbox/Chip/IconButton toggling, Slider scrubbing, and ListItem actions without mutating your AST.",
      "Multi-screen navigation stack with M3 slide/fade/expand transitions, back navigation, Shared BottomNav routing, and Material 3 Snackbar.",
    ],
  },
];

const FUTURE_ROADMAP: FeatureItem[] = [
  {
    title: "Kotlin + Jetpack Compose Code Generator",
    icon: "code",
    tag: "V2 • Next",
    points: [
      "Compile the normalized AST directly into idiomatic Jetpack Compose (.kt) files: Color.kt, Theme.kt, Type.kt, Shape.kt, screen composables, and AppNavHost.kt.",
      "One-click export as a ready-to-open Android Studio Gradle project zip.",
    ],
  },
  {
    title: "AI Screen Co-Pilot & Vibe-Coding Prompts",
    icon: "auto_awesome",
    tag: "V2",
    points: [
      "Describe screens in natural language to scaffold M3 AST layouts, or export structured design specs for coding agents.",
    ],
  },
  {
    title: "State Variables & Mock Data Binding",
    icon: "data_object",
    tag: "V2",
    points: [
      "Bind ListItems, Cards, and Text nodes to JSON datasets, LazyColumn repeaters, and conditional visibility rules.",
    ],
  },
  {
    title: "Adaptive Navigation Rail, Bottom Sheets & Dialogs",
    icon: "tablet_android",
    tag: "V3",
    points: [
      "Automatic NavigationBar → NavigationRail adaptation on Tablet viewports, plus ModalBottomSheet and AlertDialog overlays.",
    ],
  },
  {
    title: "Cloud APK Preview & GitHub Sync",
    icon: "cloud_upload",
    tag: "V3",
    points: [
      "Push generated Kotlin Compose projects straight to GitHub and trigger cloud builds for instant Android APK testing.",
    ],
  },
];

export function ReleaseNotesModal({ open, onClose }: ReleaseNotesModalProps) {
  const { palette, shapes } = useM3Theme();
  const [tab, setTab] = useState<"release" | "future">("release");

  if (!open) return null;

  const items = tab === "release" ? V1_RELEASE_NOTES : FUTURE_ROADMAP;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        data-testid="release-notes-modal"
        className="w-full max-w-2xl flex flex-col max-h-[84vh] overflow-hidden shadow-2xl border"
        style={{
          backgroundColor: palette.surfaceContainerLow,
          borderColor: palette.outlineVariant,
          borderRadius: shapes.extraLarge,
          color: palette.onSurface,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b flex items-center justify-between gap-3"
          style={{ borderColor: palette.outlineVariant }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 shrink-0 flex items-center justify-center"
              style={{
                borderRadius: shapes.medium,
                backgroundColor: palette.primaryContainer,
                color: palette.onPrimaryContainer,
              }}
            >
              <Icon name="info" size={20} fill />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold truncate">M3 App Builder</h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5"
                  style={{
                    borderRadius: shapes.full,
                    backgroundColor: palette.secondaryContainer,
                    color: palette.onSecondaryContainer,
                  }}
                >
                  v1.0
                </span>
              </div>
              <p className="text-xs truncate" style={{ color: palette.onSurfaceVariant }}>
                No-Code Material 3 Expressive Android Studio
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0"
            style={{ borderRadius: shapes.full, color: palette.onSurfaceVariant }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 pb-1">
          <div
            role="tablist"
            className="inline-flex p-1 gap-1"
            style={{
              backgroundColor: palette.surfaceContainerHigh,
              borderRadius: shapes.full,
            }}
          >
            {(
              [
                { key: "release", label: "Release Notes", icon: "verified" },
                { key: "future", label: "Future", icon: "rocket_launch" },
              ] as const
            ).map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item.key)}
                  className="m3-press flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold border-0 cursor-pointer"
                  style={{
                    borderRadius: shapes.full,
                    backgroundColor: active ? palette.secondaryContainer : "transparent",
                    color: active ? palette.onSecondaryContainer : palette.onSurfaceVariant,
                  }}
                >
                  <Icon name={item.icon} size={15} fill={active} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="no-scrollbar flex-1 overflow-y-auto p-5 pt-3 space-y-3">
          {items.map((section) => (
            <div
              key={section.title}
              className="p-4 border space-y-2"
              style={{
                backgroundColor: palette.surfaceContainer,
                borderColor: palette.outlineVariant,
                borderRadius: shapes.large,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 shrink-0 flex items-center justify-center"
                    style={{
                      borderRadius: shapes.small,
                      backgroundColor:
                        tab === "release" ? palette.primaryContainer : palette.tertiaryContainer,
                      color:
                        tab === "release"
                          ? palette.onPrimaryContainer
                          : palette.onTertiaryContainer,
                    }}
                  >
                    <Icon name={section.icon} size={17} />
                  </div>
                  <h3 className="text-sm font-semibold truncate">{section.title}</h3>
                </div>
                {section.tag && (
                  <span
                    className="text-[10px] font-bold px-2.5 py-0.5 shrink-0"
                    style={{
                      borderRadius: shapes.full,
                      backgroundColor: palette.surfaceContainerHighest,
                      color: palette.onSurfaceVariant,
                    }}
                  >
                    {section.tag}
                  </span>
                )}
              </div>

              <ul
                className="space-y-1.5 pl-4 text-xs leading-relaxed list-disc"
                style={{ color: palette.onSurfaceVariant }}
              >
                {section.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
