# M3 App Builder (`v0.4.0`)

A visual, no-code Android UI builder and live **Material 3 Expressive (`M3E`)** design studio built with **React 18, TypeScript, Vite, Tailwind CSS v4, Zustand, `@dnd-kit`, and `motion`**.

Inspired by Android Jetpack Compose architecture and Material 3 Expressive token design, releases follow pre-`1.0.0` SemVer (`0.1.0`, `0.2.0`, `0.3.0`, `0.4.0`...) building toward `v1.0.0` GA.

---

## Milestones Overview

| Version | Scope | Status | Key Deliverables |
| --- | --- | --- | --- |
| **`v0.1.0`** | **Visual Android Studio, M3E Theming & Interactive Preview** | **Completed** | Phases 1–5 + Release Notes dialog: M3E theme/system token engine, normalized multi-screen Android AST, starter templates, slot-aware DnD & AST tree editor, Property Inspector, Material Symbols picker, and isolated multi-screen runtime preview. |
| **`v0.2.0`** | **Kotlin + Jetpack Compose Export & Gradle `.zip`** | **Completed** | Phases 6–7: Kotlin + Jetpack Compose AST compiler (`Color.kt`, `Type.kt`, `Shape.kt`, `Theme.kt`, `*Screen.kt`, `AppNavHost.kt`, `MainActivity.kt`), Hybrid Stable M3 + M3 Expressive Alpha toggle, live Android package/SDK configuration, and full Android Studio Gradle `.zip` export. |
| **`v0.3.0`** | **State Variables, Collections, Search/Sort & Pluggable Persistence** | **Completed** | Phase 8: App state variables & typed collections (**Data** tab), `SearchBar` / `SegmentedButton` / `DataList` components, **Todo & Tasks** CRUD template (**5 total**), two-way data bindings, `localStorage` Preview persistence, and pluggable Android `StateStorage` (`DataStore Preferences` / `SharedPreferences`) + `AppStateStore.kt`. |
| **`v0.4.0`** | **Core M3 Building Blocks, Overlays, Adaptive Tablet UI & Preflight** | **Completed (Current)** | Phase 9: 30 Material 3 components (`DropdownMenu`, `RadioGroup`, `Tabs`, `AlertDialog`, container `ModalBottomSheet`), `openOverlay` / `dismissOverlay`, Tablet `NavigationRail` + Compose `BoxWithConstraints`, `visibleWhen` conditional visibility, TopAppBar action & custom collection schema/seed editors, typed CRUD codegen fixes, and in-browser **Static Preflight Verifier**. Verified by unit tests (`npm test`) and Playwright E2E specs (`npm run test:e2e`). |
| **`v0.5.0`** | **Local Gradle APK Build, Download & ADB Device Deploy** | **Planned Next** | Abstract `AndroidBuildService` + `DeviceDeployService`, local Gradle `assembleDebug` companion bridge, downloadable `app-debug.apk`, `adb` USB/Wi-Fi/Emulator install & launch, and a guided **Setup Prerequisites Doctor** (JDK 17, Android SDK, Gradle & USB Debugging). |
| **`v0.6.0`** | **GitHub Actions Android Build CI & Sample APKs** | **Roadmap** | Path-filtered `android-export` CI workflow verifying Gradle compilation across exported apps and publishing downloadable `.apk` artifacts. |
| **`v1.0.0`** | **AI Co-Pilot, Cloud Previews & Production GA** | **Target 1.0** | Compact AI design spec / AST patch bridge, GitHub repository export sync, cloud Android builds, and Studio 1.0 stability. |

---

## `v0.1.0` Build Phases (Phases 1–5)

### Phase 1: Material 3 Expressive Theme & System Engine
*Files: [`src/theme/`](src/theme/), [`src/components/ThemePanel.tsx`](src/components/ThemePanel.tsx), [`src/components/TokenInspectorSidebar.tsx`](src/components/TokenInspectorSidebar.tsx)*

- **Color System (`color.ts`, `tokens.ts`, `types.ts`)**: Gamut-safe tonal palette generation from a seed color with curated presets, Light / Dark / System modes, **Contrast Levels** (`standard`, `medium`, `high`), Material You **Dynamic Color** wallpaper presets, and per-role hex color overrides aligned 1-to-1 with Compose `ColorScheme`.
- **Typography & System Controls (`fonts.ts`, `ThemeContext.tsx`)**: Paired Display & Body fonts (`roboto`, `robotoFlex`, `robotoSerif`, `inter`, `poppins`, `outfit`, `system`), emphasized display/title weights, system font scale (`85%`–`130%`), shape scale (`square`, `rounded`, `full`), layout density (`compact`, `standard`, `comfortable`), motion physics (`standard`, `expressive`), and Android system bar chrome (`gesture` vs. `threeButton` navigation bar).
- **Live Token Inspector**: Dedicated **Tokens** tab displaying live resolved color tokens, typography scale samples, shape radii, and density values.

### Phase 2: Normalized Android AST, Multi-Screen Studio & Persistence
*Files: [`src/ast/`](src/ast/), [`src/store/useProjectStore.ts`](src/store/useProjectStore.ts), [`src/components/TemplatesModal.tsx`](src/components/TemplatesModal.tsx), [`src/components/ProjectJsonModal.tsx`](src/components/ProjectJsonModal.tsx)*

- **Normalized AST (`types.ts`, `factory.ts`, `operations.ts`, `validator.ts`)**: Screens use explicit Android `Scaffold` slots (`topBarId`, `bodyId`, `fabId`) plus a flat `O(1)` `Record<string, ComponentNode>` node map with parent-child ID references and schema validation.
- **5 Curated Starter Templates (`templates.ts`)**:
  - `material-showcase` — 4-screen app with shared bottom navigation, connected button rows, cards, and settings
  - `todo-app` — 2-screen CRUD task manager with live search, status filter, sort order & persistent storage
  - `settings-app` — Large `TopAppBar` with connected `ListItem` groups, switches, and search
  - `auth-flow` — 2-screen Sign In & Create Account flow with slide transitions
  - `blank` — Single-screen starter with `Scaffold` and `TopAppBar`
- **Multi-Screen & History Management (`useProjectStore.ts`)**: Create, duplicate, configure, and remove screens; configure up to 5 shared Bottom Navigation destinations; 50-step Undo/Redo stack (`Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y`); automatic `localStorage` persistence (`m3_app_builder_project_v1`); and validated AST JSON import/export.

### Phase 3: Live Device Canvas, Bidirectional Selection & Properties Inspector
*Files: [`src/components/DevicePreview.tsx`](src/components/DevicePreview.tsx), [`src/components/canvas/M3Renderer.tsx`](src/components/canvas/M3Renderer.tsx), [`src/components/LeftSidebar.tsx`](src/components/LeftSidebar.tsx), [`src/components/RightSidebar.tsx`](src/components/RightSidebar.tsx), [`src/components/inspector/PropertiesInspector.tsx`](src/components/inspector/PropertiesInspector.tsx)*

- **Android Device Frame (`DevicePreview.tsx`)**: Realistic Phone (`Compact`) and `Tablet` viewport switcher with status bar, Android navigation bar chrome, quick-add strip, and scrollable `Scaffold` canvas.
- **Bidirectional AST Tree & Canvas Selection**: Clicking any element on the device highlights and focuses it in both the **AST Tree** (`Layers`) and the **Properties Inspector** (and vice versa).
- **Properties Inspector (`PropertiesInspector.tsx`)**: Edit component props (labels, variants, alignment, connected M3E groups, wavy progress, image aspect ratios), spacing (`padding`, `margin`), sizing (`wrap`, `fill`, fixed px), background tokens, corner radius, reorder within parent, duplicate, delete, bind **Data** variables/item fields, or attach interactive **User Actions**.

### Phase 4: Slot-Aware Drag-and-Drop, Parts Palette, Icon Picker & 25-Component Catalog
*Files: [`src/components/dnd/BuilderDndProvider.tsx`](src/components/dnd/BuilderDndProvider.tsx), [`src/components/palette/`](src/components/palette/), [`src/components/inspector/IconPickerModal.tsx`](src/components/inspector/IconPickerModal.tsx), [`src/components/canvas/M3LoadingIndicator.tsx`](src/components/canvas/M3LoadingIndicator.tsx)*

- **Categorized & Searchable Parts Palette (`PartsPalette.tsx`, `paletteCatalog.ts`)**: Browse categorized M3 components (`Layout & Containment`, `Actions & Buttons`, `Scaffold Chrome`, `Inputs & Selection`, `Display & Content`, `Progress & M3E`) with click-to-insert or drag-to-drop.
- **Slot-Aware `@dnd-kit` Reordering & Nesting (`BuilderDndProvider.tsx`)**: Enforces Compose `Scaffold` placement—`TopAppBar` targets `topBarId`, `FloatingActionButton` targets `fabId`, general nodes drop into Body containers (`Column`, `Row`, `Box`, `Card`, `DataList`) or reorder smoothly in the sortable **AST Tree** with cycle protection.
- **Offline-Ready Material Symbols Picker (`IconPickerModal.tsx`, `iconCatalog.ts`)**: Searchable Material Symbols Rounded icon selector wired into buttons, FABs, top bars, list items, and icons.
- **M3 Expressive Components**: Supports `Column` / `Row` connected groups (`M3E`), shape-morphing `LoadingIndicator`, wavy/linear `ProgressBar`, `SearchBar`, `SegmentedButton`, and `DataList`.

### Phase 5: Isolated Interactive Preview & Multi-Screen Navigation
*Files: [`src/store/usePreviewStore.ts`](src/store/usePreviewStore.ts), [`src/components/canvas/M3Renderer.tsx`](src/components/canvas/M3Renderer.tsx), [`src/components/DevicePreview.tsx`](src/components/DevicePreview.tsx)*

- **Edit vs. Interactive Preview Mode**: Switching to **Preview** clones runtime interaction state into `usePreviewStore` so typing in `TextField` / `SearchBar`, toggling `Switch` / `Checkbox` / `Chip` / `IconButton`, selecting `SegmentedButton` options, or scrubbing `Slider` feels native without altering the design AST or polluting Undo/Redo history.
- **Navigation Back-Stack & Transitions**: Interactive `navigate` (with `slide`, `fade`, `expand`, `none` transitions powered by `motion`), `navigateBack`, shared Bottom Navigation tab switching, and Material 3 `Snackbar` notifications (`showSnackbar`).
- **Live Theme Experimentation in Preview**: The **Theme & System** sidebar remains active in Preview mode for live light/dark, seed color, font, and shape testing.

### Studio Info & Release Notes Modal
*Files: [`src/components/ReleaseNotesModal.tsx`](src/components/ReleaseNotesModal.tsx), [`src/version.ts`](src/version.ts), [`src/App.tsx`](src/App.tsx)*

- Clicking the **`i` info icon** next to the `v0.4.0 Studio` pill in the top header opens the SemVer release modal with **Release Notes** (`v0.4.0`, `v0.3.0`, `v0.2.0`, and `v0.1.0`) and **Future** (`v0.5.0` → `v1.0.0` roadmap).

---

## `v0.2.0` Build Phases (Phases 6–7)

### Phase 6: Kotlin + Jetpack Compose AST Compiler & Live Code Viewer
*Files: [`src/codegen/compose/`](src/codegen/compose/), [`src/components/ComposeExportModal.tsx`](src/components/ComposeExportModal.tsx)*

- **Theme Generation (`themeGen.ts`)**: Generates `Color.kt` (all 36 M3 color roles from seed + overrides + contrast level), `Type.kt` (scaled `AppTypography` with emphasized weights and Display/Body font pairing), `Shape.kt` (`AppShapes`), and `Theme.kt` (`dynamicLightColorScheme` / `dynamicDarkColorScheme` + `isSystemInDarkTheme()`).
- **Screen & Navigation Generation (`screenGen.ts`, `navGen.ts`)**: Compiles `Scaffold` (`TopAppBar`, `Body`, `FAB`, `NavigationBar`), local `remember { mutableStateOf(...) }` interactive state, `Modifier` chains, user actions (`navigate`, `navigateBack`, `showSnackbar`, `openUrl`), `AppNavHost.kt`, `MainActivity.kt` (`enableEdgeToEdge()`), and all AST components.
- **Hybrid M3 Expressive Mode**: Emits compile-ready Stable Material 3 Compose BOM composables by default with a live **M3 Expressive Alpha APIs** toggle (`LoadingIndicator`, `ContainedLoadingIndicator`, `LinearWavyProgressIndicator`, `MaterialExpressiveTheme`, `MotionScheme`).

### Phase 7: Android Studio Gradle Project `.zip` Export & SDK Config
*Files: [`src/codegen/gradle/index.ts`](src/codegen/gradle/index.ts), [`src/codegen/zip.ts`](src/codegen/zip.ts), [`src/components/ComposeExportModal.tsx`](src/components/ComposeExportModal.tsx), [`src/store/useProjectStore.ts`](src/store/useProjectStore.ts)*

- **Zero-Dependency PKZIP Archiver (`zip.ts`)**: Writes standards-compliant PKZIP archives (`STORE` + IEEE 802.3 CRC-32 + UTF-8 filenames) directly in the browser.
- **Complete Gradle Scaffold (`gradle/index.ts`)**: Packages `settings.gradle.kts`, root `build.gradle.kts`, `gradle.properties`, `gradle/libs.versions.toml` (auto-switching `material3` between Compose BOM and `1.4.0-alpha08` when M3E Alpha is enabled), `app/build.gradle.kts`, `AndroidManifest.xml`, `strings.xml`, `themes.xml`, and `README.md` alongside all compiled Kotlin files.
- **Live Package & SDK Controls**: Edit Android `Package Name` (persisted with Undo/Redo), `minSdk`, and `targetSdk` directly inside **Export Kotlin**, browse Gradle/Manifest/Kotlin files with single-file **Copy** / **Download File**, or export the entire project as `<project>-android-studio.zip`.

---

## `v0.3.0` Build Phase (Phase 8)

### Phase 8: State Variables, Typed Collections, Search/Sort & Pluggable Android Persistence
*Files: [`src/ast/state.ts`](src/ast/state.ts), [`src/components/DataStateSidebar.tsx`](src/components/DataStateSidebar.tsx), [`src/codegen/compose/stateGen.ts`](src/codegen/compose/stateGen.ts), [`src/store/usePreviewStore.ts`](src/store/usePreviewStore.ts), [`src/components/canvas/M3Renderer.tsx`](src/components/canvas/M3Renderer.tsx)*

- **Data State Architecture (`ast/state.ts`, `DataStateSidebar.tsx`)**: Manage app-level variables (`string`, `boolean`, `number`, optional persistence flag) and typed record collections (`fields` + seeded `initialItems`) in the new **Data** sidebar tab.
- **New M3 Components (`SearchBar`, `SegmentedButton`, `DataList`)**:
  - `SearchBar`: M3 pill search input with two-way `stateKey` binding and optional clear/trailing actions.
  - `SegmentedButton`: Choice selector (`SingleChoiceSegmentedButtonRow` in Compose) for status filters, priority pickers, and sort toggles.
  - `DataList`: Repeater container powered by shared `queryCollection` logic (field search, active/done or value filtering, and sorting by `newest`, `oldest`, `az`, `za`, `priority`) plus `{{item.*}}`, `{{state.*}}`, and `{{count.*}}` template interpolation and empty-state customization.
- **Live CRUD Runtime & Preview Persistence (`usePreviewStore.ts`)**: Supports `setState`, `createItem`, `selectItem`, `updateItem`, `toggleItemField`, and `deleteItem` actions in Interactive Preview with automatic `localStorage` snapshots (`m3_app_builder_runtime_<projectId>`) and one-click **Reset Preview** restoration back to collection seeds.
- **Pluggable Android `StateStorage` Codegen (`stateGen.ts`, `ComposeExportModal.tsx`)**: Generates `data/StateStorage.kt` (clean `interface StateStorage` with `DataStoreStateStorage` using `androidx.datastore:datastore-preferences` or `SharedPrefsStateStorage`) and `ui/state/AppStateStore.kt` (`org.json` serialization, typed immutable item models, and Compose state actions). Toggle `DataStore` vs. `SharedPreferences` live inside **Data** or **Export Kotlin** (`libs.versions.toml` and `app/build.gradle.kts` update automatically).

---

## `v0.4.0` Build Phase (Phase 9)

### Phase 9: Core M3 Building Blocks, Overlays, Adaptive Tablet Chrome & Static Preflight
*Files: [`src/codegen/verifier.ts`](src/codegen/verifier.ts), [`src/codegen/compose/navGen.ts`](src/codegen/compose/navGen.ts), [`src/codegen/compose/screenGen.ts`](src/codegen/compose/screenGen.ts), [`src/components/DevicePreview.tsx`](src/components/DevicePreview.tsx), [`src/components/ComposeExportModal.tsx`](src/components/ComposeExportModal.tsx)*

- **5 New Material 3 Parts**: Added `DropdownMenu` (`ExposedDropdownMenuBox`), `RadioGroup`, `Tabs` (`PrimaryTabRow` / `SecondaryTabRow`), `AlertDialog`, and container `ModalBottomSheet` (30 total components).
- **Modal Overlays & Scrims**: `openOverlay` and `dismissOverlay` actions trigger animated dialogs and bottom sheets in Interactive Preview (`activeOverlayNodeId`) and native Material 3 `AlertDialog` / `ModalBottomSheet` blocks in Kotlin.
- **Adaptive Tablet Navigation (`NavigationRail`)**: Switching viewport to **Tablet** adapts shared navigation to a leading vertical `NavigationRail`; exported `AppNavHost.kt` uses `BoxWithConstraints` (`maxWidth >= 600.dp`) for automatic Compose adaptation.
- **Conditional Visibility & Designer Completeness**: `visibleWhen` rules (`truthy`, `falsy`, `equals`, `notEquals`), `TopAppBar` right-side actions editor, custom Collection field schemas & seed row editor in the **Data** tab, layout `Height` / `Padding` / `Radius` inputs, and type-safe Compose CRUD statements.
- **Static Preflight Verifier (`verifier.ts`)**: Instant client-side check inside **Export Kotlin** validating Kotlin delimiter balance, verified `material-icons-extended` symbols, state bindings, overlay/route targets, SDK bounds, and XML safety with clickable file navigation.

---

## Supported Material 3 Component Catalog (30 Components)

Defined in [`src/ast/types.ts`](src/ast/types.ts) and [`src/components/palette/paletteCatalog.ts`](src/components/palette/paletteCatalog.ts):

| Category | Components |
| --- | --- |
| **Layout & Containment** | `Column`, `Row`, `Box`, `Card` (`elevated`, `filled`, `outlined`), `DataList` |
| **Scaffold Chrome** | `TopAppBar` (`small`, `centerAligned`, `medium`, `large`), `FloatingActionButton` (`standard`, `small`, `large`, `extended`) |
| **Actions & Buttons** | `Button`, `IconButton`, `SegmentedButton`, `Tabs` |
| **Inputs & Selection** | `SearchBar`, `TextField`, `DropdownMenu`, `RadioGroup`, `Switch`, `Checkbox`, `Slider`, `Chip` |
| **Overlays & Dialogs** | `AlertDialog`, `ModalBottomSheet` (container) |
| **Display & Content** | `Text`, `Icon`, `Image`, `ListItem`, `Badge`, `Spacer`, `Divider` |
| **Progress & M3E** | `LoadingIndicator` (M3E shape-morphing), `ProgressBar` (wavy / standard) |

---

## Tech Stack

- **UI Framework**: React 18 (`^18.3.1`) + TypeScript (`^5.7.2`) + Vite (`^6.1.0`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + Material Symbols Rounded + Google Fonts
- **State Management**: Zustand (`^5.0.3`) with separate design AST store (`useProjectStore`) and isolated preview store (`usePreviewStore`)
- **Drag & Drop**: `@dnd-kit/core` (`^6.3.1`), `@dnd-kit/sortable` (`^10.0.0`), `@dnd-kit/utilities`
- **Motion & Transitions**: `motion` (`^13.1.1`)
- **Testing**: Node native test runner (`node --test --experimental-strip-types`) for unit tests + Playwright (`@playwright/test`) for end-to-end verification

---

## Project Structure

```text
m3-app-builder/
├── src/
│   ├── ast/
│   │   ├── factory.ts          # Component & blank screen constructors
│   │   ├── operations.ts       # Pure AST tree mutations (insert, move, duplicate, remove, slot ops)
│   │   ├── state.ts            # Collection query/filter/sort, template & visibility evaluator
│   │   ├── templates.ts        # 5 starter app templates (incl. Todo & Tasks)
│   │   ├── types.ts            # Schema v1 types, 30 ComponentTypes, AppStateConfig, UserActions
│   │   └── validator.ts        # Runtime JSON & AST integrity validator
│   ├── codegen/
│   │   ├── compose/            # Kotlin/Compose compiler (themeGen, screenGen, navGen, stateGen, utils)
│   │   ├── gradle/             # Android Studio Gradle scaffold & Version Catalog generator
│   │   ├── verifier.ts         # Browser Static Preflight Verifier (Kotlin, Icons, Bindings, XML)
│   │   └── zip.ts              # Zero-dependency PKZIP binary archiver with CRC-32
│   ├── components/
│   │   ├── canvas/             # M3Renderer (DataList, DropdownMenu, RadioGroup, Tabs & overlays)
│   │   ├── dnd/                # BuilderDndProvider (slot-aware collision + DragOverlay)
│   │   ├── inspector/          # PropertiesInspector (bindings, visibleWhen, TopBar actions & CRUD)
│   │   ├── palette/            # PartsPalette, paletteCatalog (30 M3 parts)
│   │   ├── ComposeExportModal.tsx # Kotlin/Gradle explorer, Preflight Verifier, M3E & Storage toggles
│   │   ├── DataStateSidebar.tsx   # App variables, custom collection fields/seeds & storage editor
│   │   ├── DevicePreview.tsx      # Phone / Tablet NavigationRail frame, overlay scrims & Preview bar
│   │   ├── LeftSidebar.tsx        # Parts, Screens & BottomNav, Data, AST Tree, Tokens tabs
│   │   ├── RightSidebar.tsx       # Theme & System / Properties Inspector tabs
│   │   ├── ThemePanel.tsx         # Color presets, dynamic wallpaper, fonts, shapes, density, bars
│   │   ├── TemplatesModal.tsx     # Starter template browser
│   │   ├── ProjectJsonModal.tsx   # AST JSON import/export modal
│   │   └── ReleaseNotesModal.tsx  # SemVer Release Notes (v0.4.0..v0.1.0) & Future Roadmap modal
│   ├── store/
│   │   ├── useProjectStore.ts  # Undoable AST + Theme + Data State + localStorage persistence
│   │   └── usePreviewStore.ts  # Isolated preview runtime state, overlays, CRUD & persistence
│   ├── theme/                  # M3 seed palette generator, fonts, tokens, ThemeContext
│   └── version.ts              # Pre-1.0 SemVer version constant (0.4.0) synced with package.json
└── tests/
    ├── ast.test.ts             # AST schema, tree operations & multi-screen unit tests
    ├── compose.codegen.test.ts # Phase 6 Kotlin + Compose AST compiler unit tests
    ├── gradle.zip.test.ts      # Phase 7 PKZIP, Gradle scaffold & SemVer sync unit tests
    ├── state.crud.test.ts      # Phase 8 query/template, Todo template & StateStorage codegen unit tests
    ├── verifier.test.ts        # Phase 9 visibility, overlays, NavRail & Static Preflight unit tests
    └── e2e/                    # Playwright specs covering Phases 1–9 & Release Notes
```

---

## Getting Started

### Prerequisites
- Node.js **22+** (used for native TypeScript stripping in `npm test`)
- Microsoft Edge installed (configured as `channel: "msedge"` in [`playwright.config.ts`](playwright.config.ts) for E2E tests)

### Install & Run Locally

```bash
npm install
npm run dev
```

On Windows PowerShell (if script execution policy blocks `npm.ps1`), use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
```

### Scripts & Verification

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite development server |
| `npm run typecheck` | Run TypeScript type checking (`tsc -b --noEmit`) |
| `npm run build` | Type-check and build production bundle to `dist/` |
| `npm test` | Run unit tests across AST, Compose codegen, Gradle/ZIP & CRUD/state suites |
| `npm run test:e2e` | Run all Playwright E2E suites ([`tests/e2e/`](tests/e2e/)) against `127.0.0.1:4173` |
| `npm run preview` | Preview the built `dist/` bundle locally |

---

## CI/CD & GitHub Pages Hosting

- **Pull Request Quality Gate ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))**: Runs on PRs targeting `main` (opening, reopening, and every commit pushed to the PR branch) plus manual dispatch. Executes Node 22 typecheck, AST/codegen unit tests, production build, and headless Playwright Chromium E2E tests (`Playwright E2E`), uploading traces/reports if any test fails.
- **GitHub Pages Deployment ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml))**: Runs on pushes to `main` (and manual dispatch). Re-runs the full `ci.yml` verification suite first, builds with the repository subpath (`VITE_BASE_PATH`), and deploys to **GitHub Pages** (`https://p-abhay.github.io/m3-app-builder/`).
- **One-Time GitHub Repo Settings**:
  1. **Settings → Pages → Source**: Select **GitHub Actions**.
  2. **Settings → Branches → Branch protection rules (`main`)**: Enable **Require a pull request before merging** and **Require status checks to pass before merging** (`Typecheck, Unit Tests & Build`, `Playwright E2E`).

---

## Roadmap Toward `v1.0.0`

1. **`v0.5.0` — Local Gradle APK Build, APK Download & ADB Device Deploy**: Abstract `AndroidBuildService` and `DeviceDeployService` powered by a local companion bridge running `assembleDebug`, live Kotlin compile log streaming, one-click `adb` USB/Wi-Fi/Emulator install & launch, and a guided **Setup Prerequisites Doctor** (JDK 17, Android SDK, Gradle & USB Debugging).
2. **`v0.6.0` — GitHub Actions Android Build CI & Sample APKs**: Automated `assembleDebug` CI gate on AST/codegen PRs with downloadable sample APK build artifacts.
3. **`v1.0.0` — AI Co-Pilot, Cloud Previews & Production GA**: Compact AI design spec export / AST patch import, GitHub repository sync, cloud Android builds, and Studio 1.0 stability.
