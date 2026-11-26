import { useState } from "react";
import { useM3Theme } from "@/theme/ThemeContext";
import { APP_MILESTONE_LABEL } from "@/version";
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

interface ReleaseGroup {
  version: string;
  subtitle: string;
  isCurrent?: boolean;
  items: FeatureItem[];
}

const RELEASE_GROUPS: ReleaseGroup[] = [
  {
    version: APP_MILESTONE_LABEL,
    subtitle: "Device Auto Theme, Left NavigationRail & Component Alignment",
    isCurrent: true,
    items: [
      {
        title: "Auto Device Light/Dark Theme (Studio + Export)",
        icon: "brightness_auto",
        tag: "Patch",
        points: [
          "Projects and starter templates now default to System (Auto) mode, automatically tracking the user's OS/browser light or dark preference via prefers-color-scheme.",
          "Updated the header theme toggle to cycle smoothly through Auto -> Light -> Dark, while exported Android Theme.kt defaults to isSystemInDarkTheme().",
        ],
      },
      {
        title: "Left Panel NavigationRail Organization",
        icon: "view_sidebar",
        tag: "UX Fix",
        points: [
          "Reorganized the Left Sidebar with a dedicated Material 3 vertical NavigationRail for Parts, Screens, Data, AST Tree, and Tokens.",
          "Eliminated tab label truncation so every section icon and title stays crisp and readable without clipping.",
        ],
      },
      {
        title: "Per-Component Self Alignment Control",
        icon: "align_horizontal_center",
        tag: "Layout",
        points: [
          "Added Alignment controls (Auto, Left, Center, Right, Stretch) inside Properties Inspector -> Layout & Surface for body and container child components.",
          "Synchronized live Studio Canvas/Preview CSS alignment with native Compose Modifier.align(Alignment.*) and .fillMaxWidth() generation.",
        ],
      },
    ],
  },
  {
    version: "v0.4.0",
    subtitle: "Core M3 Building Blocks, Modal Overlays, Tablet NavigationRail & Export Preflight",
    items: [
      {
        title: "Core Controls & Modal Overlays",
        icon: "layers",
        tag: "Phase 9",
        points: [
          "Expanded to 30 Material 3 components with DropdownMenu (ExposedDropdownMenuBox), RadioGroup, Tabs (Primary/SecondaryTabRow), AlertDialog, and container ModalBottomSheet.",
          "Added openOverlay / dismissOverlay actions with interactive Material 3 scrim animations in Preview and native Compose ModalBottomSheet / AlertDialog output.",
          "Added Conditional Visibility (visibleWhen) rules evaluated in Preview and compiled as Kotlin if(...) blocks.",
        ],
      },
      {
        title: "Adaptive Tablet Chrome & Studio UX Completeness",
        icon: "tablet_android",
        tag: "Phase 9",
        points: [
          "Adaptive NavigationBar ↔ NavigationRail automatically switches on Tablet viewports in Preview and compiles responsive BoxWithConstraints (>= 600.dp) layouts in AppNavHost.kt.",
          "Full TopAppBar right-side action icon & trigger editor plus layout Height / Padding / Radius controls in Properties Inspector.",
          "Custom Collection Field Schema and Seed Row editor directly inside the Data sidebar tab.",
        ],
      },
      {
        title: "In-Browser Static Preflight Verifier & Typed Codegen",
        icon: "verified",
        tag: "Export",
        points: [
          "Instant client-side Preflight Diagnostics inside Export Kotlin checking brace/paren balance, Compose material-icons-extended symbols, state bindings, overlays, routes & XML safety.",
          "Type-safe Compose CRUD actionStatements (.trim() restricted to String variables with non-blank title guard) and expanded Material Symbols icon mappings.",
        ],
      },
    ],
  },
  {
    version: "v0.3.0",
    subtitle: "State Variables, Collections, Search/Sort & Pluggable Persistence",
    items: [
      {
        title: "State Variables, Collections & CRUD Runtime",
        icon: "database",
        tag: "Phase 8",
        points: [
          "Dedicated Data sidebar tab to define app variables, typed collection schemas, seed records, and choose the Android persistence backend.",
          "Added the Todo & Tasks (todo-app) 2-screen starter template showcasing live search, status filter, sort order, quick add, detail editing, and deletion.",
          "Interactive Preview executes createItem, selectItem, updateItem, toggleItemField, and deleteItem actions with automatic localStorage persistence and Reset Preview seed restore, plus {{item.*}}, {{state.*}}, and {{count.*}} interpolation.",
        ],
      },
      {
        title: "SearchBar, SegmentedButton & DataList Components",
        icon: "widgets",
        tag: "Phase 8",
        points: [
          "Expanded the studio catalog to 25 Material 3 components with SearchBar, SingleChoice SegmentedButton, and DataList item repeaters.",
          "Two-way Data Binding (stateKey / itemField) and CRUD Interaction Action editors integrated directly in the Properties Inspector.",
          "Compiles DataList repeaters to Compose LazyColumn / keyed Column loops alongside native M3 SearchBar and SingleChoiceSegmentedButtonRow composables.",
        ],
      },
      {
        title: "Pluggable Android StateStorage (DataStore & SharedPreferences)",
        icon: "storage",
        tag: "Export",
        points: [
          "Generates data/StateStorage.kt (interface StateStorage, DataStoreStateStorage, SharedPrefsStateStorage) and ui/state/AppStateStore.kt using org.json without annotation-processor overhead.",
          "Switch between Jetpack DataStore Preferences and SharedPreferences directly in the Data tab or Export Kotlin modal with automatic libs.versions.toml dependency syncing.",
        ],
      },
    ],
  },
  {
    version: "v0.2.0",
    subtitle: "Kotlin + Jetpack Compose Export & Android Studio Gradle Project",
    items: [
      {
        title: "Kotlin + Jetpack Compose AST Compiler",
        icon: "code",
        tag: "Phase 6",
        points: [
          "Compiles multi-screen ASTs, Scaffold slots (TopAppBar, Body, FAB, NavigationBar), and all 22 M3 components into idiomatic @Composable screens and AppNavHost.kt.",
          "Generates Color.kt, Type.kt, Shape.kt, and Theme.kt mapped 1-to-1 from seed palettes, custom color overrides, contrast level, fonts, and dynamic color rules.",
          "Hybrid Stable Material 3 mode emits compile-ready Compose BOM APIs by default with a one-click M3 Expressive Alpha APIs toggle (LoadingIndicator, wavy progress bars, MaterialExpressiveTheme).",
        ],
      },
      {
        title: "Android Studio Gradle Project .zip Export",
        icon: "folder_zip",
        tag: "Phase 7",
        points: [
          "Packages complete Android Studio projects (settings.gradle.kts, build.gradle.kts, gradle/libs.versions.toml, app/build.gradle.kts, AndroidManifest.xml, and XML resources) using an in-browser PKZIP builder.",
          "Live editable Android Package Name, minSdk, and targetSdk persisted with Undo/Redo and local storage auto-save.",
          "Categorized file explorer with horizontal code scrolling, single-file Copy, Download File, and full .zip package download.",
        ],
      },
    ],
  },
  {
    version: "v0.1.0",
    subtitle: "Visual Android Studio, M3E Theming & Interactive Preview",
    items: [
      {
        title: "Material 3 Expressive Theme & System Engine",
        icon: "palette",
        tag: "Phase 1",
        points: [
          "Gamut-safe seed color palette generator with 7 presets, Light/Dark/System modes, and Standard/Medium/High contrast.",
          "Material You Dynamic Color wallpaper simulation and per-role hex fine-tuning.",
          "Display & Body Google Font pairing, emphasized type weights, system font scaling (85%–130%), shape scales (Square/Rounded/Full), layout density, motion physics, and Android system bars.",
        ],
      },
      {
        title: "Normalized Android AST & Project Studio",
        icon: "account_tree",
        tag: "Phase 2",
        points: [
          "Android Scaffold slots (TopAppBar, Body, FAB, and Shared Bottom Navigation) backed by an O(1) normalized node map.",
          "4 curated starter templates (Material Showcase, Android Settings, Auth Flow, Blank App).",
          "50-step Undo/Redo (Ctrl+Z / Ctrl+Shift+Z), localStorage auto-save, and validated JSON import/export.",
        ],
      },
      {
        title: "Visual Drag-and-Drop & 22 M3 Components",
        icon: "widgets",
        tag: "Phases 3–4",
        points: [
          "Categorized, searchable Parts Palette with click-to-insert and slot-aware drag-and-drop into TopAppBar, FAB, Body, and nested Cards.",
          "Sortable AST Tree / Layers panel with bidirectional selection and M3E connected button/list groups.",
          "Offline-ready Material Symbols Icon Picker, full component Properties Inspector, and Phone/Tablet viewport switcher.",
        ],
      },
      {
        title: "Isolated Interactive Preview",
        icon: "play_arrow",
        tag: "Phase 5",
        points: [
          "Live TextField typing, Switch/Checkbox/Chip/IconButton toggling, Slider scrubbing, and ListItem actions without mutating your AST.",
          "Multi-screen navigation stack with M3 slide/fade/expand transitions, back navigation, Shared BottomNav routing, and Material 3 Snackbar.",
        ],
      },
    ],
  },
];

const FUTURE_ROADMAP: FeatureItem[] = [
  {
    title: "Local Gradle Build, APK Download & ADB Device Deploy",
    icon: "build_circle",
    tag: "v0.5.0 • Next",
    points: [
      "Abstract AndroidBuildService & DeviceDeployService backed by a local companion bridge running Gradle assembleDebug, streaming compiler logs, and serving downloadable app-debug.apk.",
      "One-click adb install & Activity launch onto connected USB phones, Wi-Fi ADB devices, or Android Emulators—plus a guided Setup Prerequisites Doctor (JDK 17, Android SDK, Gradle & USB Debugging).",
    ],
  },
  {
    title: "GitHub Actions Export Compile CI & Sample APKs",
    icon: "rocket_launch",
    tag: "v0.6.0",
    points: [
      "Automated GitHub Actions Gradle compilation check on codegen/AST PRs with downloadable sample APK workflow artifacts.",
    ],
  },
  {
    title: "AI Co-Pilot, Cloud Previews & Production GA",
    icon: "auto_awesome",
    tag: "v1.0.0 Target",
    points: [
      "Compact AI design spec / AST patch bridge, GitHub repository export sync, cloud Android builds, and 1.0 production stability.",
    ],
  },
];

export function ReleaseNotesModal({ open, onClose }: ReleaseNotesModalProps) {
  const { palette, shapes } = useM3Theme();
  const [tab, setTab] = useState<"release" | "future">("release");

  if (!open) return null;

  const renderCard = (section: FeatureItem, accent: "primary" | "tertiary") => (
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
                accent === "primary" ? palette.primaryContainer : palette.tertiaryContainer,
              color:
                accent === "primary" ? palette.onPrimaryContainer : palette.onTertiaryContainer,
            }}
          >
            <Icon name={section.icon} size={17} />
          </div>
          <h4 className="text-sm font-semibold truncate">{section.title}</h4>
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
  );

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
                  {APP_MILESTONE_LABEL}
                </span>
              </div>
              <p className="text-xs truncate" style={{ color: palette.onSurfaceVariant }}>
                Pre-1.0 SemVer • No-Code Material 3 Expressive Android Studio
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
        <div className="no-scrollbar flex-1 overflow-y-auto p-5 pt-3 space-y-5">
          {tab === "release"
            ? RELEASE_GROUPS.map((group) => (
                <section
                  key={group.version}
                  data-testid={`release-group-${group.version}`}
                  className="space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-sm font-bold tracking-tight">{group.version}</h3>
                      {group.isCurrent && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5"
                          style={{
                            borderRadius: shapes.full,
                            backgroundColor: palette.primaryContainer,
                            color: palette.onPrimaryContainer,
                          }}
                        >
                          Current
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] truncate" style={{ color: palette.onSurfaceVariant }}>
                      {group.subtitle}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {group.items.map((item) => renderCard(item, "primary"))}
                  </div>
                </section>
              ))
            : FUTURE_ROADMAP.map((item) => renderCard(item, "tertiary"))}
        </div>
      </div>
    </div>
  );
}
