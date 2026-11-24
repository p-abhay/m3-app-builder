# M3 App Builder (`V1 Studio`)

A visual, no-code Android UI builder and live **Material 3 Expressive (`M3E`)** design studio built with **React 18, TypeScript, Vite, Tailwind CSS v4, Zustand, `@dnd-kit`, and `motion`**.

Inspired by Android Jetpack Compose architecture and Material 3 Expressive token design, V1 models apps using a normalized Android AST (`schemaVersion: 1`) paired with a live interactive device preview—laying the structured foundation for idiomatic **Kotlin + Jetpack Compose** code generation in V2.

---

## Milestones Overview

| Milestone | Status | Scope & Key Deliverables |
| --- | --- | --- |
| **V1 — Visual Android Studio, M3E Theming & Interactive Preview** | **Completed** | Phases 1–5 + Studio Release Notes dialog: M3E theme/system token engine, normalized multi-screen Android AST, 4 starter templates, 22 M3 components, slot-aware DnD & AST tree editor, Property Inspector, Material Symbols picker, and isolated multi-screen runtime preview. Verified by 8 unit tests and 25 Playwright E2E specs. |
| **V2 — Kotlin + Jetpack Compose Export & Data Binding** | **Planned Next** | Kotlin + Jetpack Compose code generator (`Color.kt`, `Theme.kt`, `Type.kt`, `Shape.kt`, screen composables, `AppNavHost.kt`), Android Studio Gradle zip export, AI Screen Co-Pilot / structured agent design spec export, and JSON dataset binding / `LazyColumn` repeaters. |
| **V3 — Adaptive Layouts & Cloud APK Delivery** | **Roadmap** | Adaptive tablet `NavigationRail` conversion from `NavigationBar`, `ModalBottomSheet` and `AlertDialog` overlays, GitHub sync, and cloud Android APK preview builds. |

---

## V1 Build Phases (Implemented)

### Phase 1: Material 3 Expressive Theme & System Engine
*Files: [`src/theme/`](src/theme/), [`src/components/ThemePanel.tsx`](src/components/ThemePanel.tsx), [`src/components/TokenInspectorSidebar.tsx`](src/components/TokenInspectorSidebar.tsx)*

- **Color System (`color.ts`, `tokens.ts`, `types.ts`)**: Gamut-safe tonal palette generation from a seed color with curated presets, Light / Dark / System modes, **Contrast Levels** (`standard`, `medium`, `high`), Material You **Dynamic Color** wallpaper presets, and per-role hex color overrides aligned 1-to-1 with Compose `ColorScheme`.
- **Typography & System Controls (`fonts.ts`, `ThemeContext.tsx`)**: Paired Display & Body fonts (`roboto`, `robotoFlex`, `robotoSerif`, `inter`, `poppins`, `outfit`, `system`), emphasized display/title weights, system font scale (`85%`–`130%`), shape scale (`square`, `rounded`, `full`), layout density (`compact`, `standard`, `comfortable`), motion physics (`standard`, `expressive`), and Android system bar chrome (`gesture` vs. `threeButton` navigation bar).
- **Live Token Inspector**: Dedicated **Tokens** tab displaying live resolved color tokens, typography scale samples, shape radii, and density values.

### Phase 2: Normalized Android AST, Multi-Screen Studio & Persistence
*Files: [`src/ast/`](src/ast/), [`src/store/useProjectStore.ts`](src/store/useProjectStore.ts), [`src/components/TemplatesModal.tsx`](src/components/TemplatesModal.tsx), [`src/components/ProjectJsonModal.tsx`](src/components/ProjectJsonModal.tsx)*

- **Normalized AST (`types.ts`, `factory.ts`, `operations.ts`, `validator.ts`)**: Screens use explicit Android `Scaffold` slots (`topBarId`, `bodyId`, `fabId`) plus a flat `O(1)` `Record<string, ComponentNode>` node map with parent-child ID references and schema validation.
- **4 Curated Starter Templates (`templates.ts`)**:
  - `material-showcase` — 4-screen app with shared bottom navigation, connected button rows, cards, and settings
  - `settings-app` — Large `TopAppBar` with connected `ListItem` groups, switches, and search
  - `auth-flow` — 2-screen Sign In & Create Account flow with slide transitions
  - `blank` — Single-screen starter with `Scaffold` and `TopAppBar`
- **Multi-Screen & History Management (`useProjectStore.ts`)**: Create, duplicate, configure, and remove screens; configure up to 5 shared Bottom Navigation destinations; 50-step Undo/Redo stack (`Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y`); automatic `localStorage` persistence (`m3_app_builder_project_v1`); and validated AST JSON import/export.

### Phase 3: Live Device Canvas, Bidirectional Selection & Properties Inspector
*Files: [`src/components/DevicePreview.tsx`](src/components/DevicePreview.tsx), [`src/components/canvas/M3Renderer.tsx`](src/components/canvas/M3Renderer.tsx), [`src/components/LeftSidebar.tsx`](src/components/LeftSidebar.tsx), [`src/components/RightSidebar.tsx`](src/components/RightSidebar.tsx), [`src/components/inspector/PropertiesInspector.tsx`](src/components/inspector/PropertiesInspector.tsx)*

- **Android Device Frame (`DevicePreview.tsx`)**: Realistic Phone (`Compact`) and `Tablet` viewport switcher with status bar, Android navigation bar chrome, quick-add strip, and scrollable `Scaffold` canvas.
- **Bidirectional AST Tree & Canvas Selection**: Clicking any element on the device highlights and focuses it in both the **AST Tree** (`Layers`) and the **Properties Inspector** (and vice versa).
- **Properties Inspector (`PropertiesInspector.tsx`)**: Edit component props (labels, variants, alignment, connected M3E groups, wavy progress, image aspect ratios), spacing (`padding`, `margin`), sizing (`wrap`, `fill`, fixed px), background tokens, corner radius, reorder within parent, duplicate, delete, or bind interactive **User Actions**.

### Phase 4: Slot-Aware Drag-and-Drop, Parts Palette, Icon Picker & 22-Component Catalog
*Files: [`src/components/dnd/BuilderDndProvider.tsx`](src/components/dnd/BuilderDndProvider.tsx), [`src/components/palette/`](src/components/palette/), [`src/components/inspector/IconPickerModal.tsx`](src/components/inspector/IconPickerModal.tsx), [`src/components/canvas/M3LoadingIndicator.tsx`](src/components/canvas/M3LoadingIndicator.tsx)*

- **Categorized & Searchable Parts Palette (`PartsPalette.tsx`, `paletteCatalog.ts`)**: Browse by 6 categories (`Layout & Containment`, `Actions & Buttons`, `Scaffold Chrome`, `Inputs & Selection`, `Display & Content`, `Progress & M3E`) with click-to-insert or drag-to-drop.
- **Slot-Aware `@dnd-kit` Reordering & Nesting (`BuilderDndProvider.tsx`)**: Enforces Compose `Scaffold` placement—`TopAppBar` targets `topBarId`, `FloatingActionButton` targets `fabId`, general nodes drop into Body containers (`Column`, `Row`, `Box`, `Card`) or reorder smoothly in the sortable **AST Tree** with cycle protection.
- **Offline-Ready Material Symbols Picker (`IconPickerModal.tsx`, `iconCatalog.ts`)**: Searchable Material Symbols Rounded icon selector wired into buttons, FABs, top bars, list items, and icons.
- **M3 Expressive Components**: Supports `Column` / `Row` connected groups (`M3E`), shape-morphing `LoadingIndicator`, and wavy/linear `ProgressBar`.

### Phase 5: Isolated Interactive Preview & Multi-Screen Navigation
*Files: [`src/store/usePreviewStore.ts`](src/store/usePreviewStore.ts), [`src/components/canvas/M3Renderer.tsx`](src/components/canvas/M3Renderer.tsx), [`src/components/DevicePreview.tsx`](src/components/DevicePreview.tsx)*

- **Edit vs. Interactive Preview Mode**: Switching to **Preview** clones runtime interaction state into `usePreviewStore` so typing in `TextField`, toggling `Switch` / `Checkbox` / `Chip` / `IconButton`, or scrubbing `Slider` feels native without altering the design AST or polluting Undo/Redo history.
- **Navigation Back-Stack & Transitions**: Interactive `navigate` (with `slide`, `fade`, `expand`, `none` transitions powered by `motion`), `navigateBack`, shared Bottom Navigation tab switching, and Material 3 `Snackbar` notifications (`showSnackbar`).
- **Live Theme Experimentation in Preview**: The **Theme & System** sidebar remains active in Preview mode for live light/dark, seed color, font, and shape testing.

### Studio Info & Release Notes Modal
*Files: [`src/components/ReleaseNotesModal.tsx`](src/components/ReleaseNotesModal.tsx), [`src/App.tsx`](src/App.tsx)*

- Clicking the **`i` info icon** next to the `V1 Studio` pill in the top header opens a modal with **Release Notes** (V1 feature summary) and **Future** (V2/V3 upcoming roadmap).

---

## Supported Material 3 Component Catalog (22 Components)

Defined in [`src/ast/types.ts`](src/ast/types.ts) and [`src/components/palette/paletteCatalog.ts`](src/components/palette/paletteCatalog.ts):

| Category | Components |
| --- | --- |
| **Layout & Containment** | `Column`, `Row`, `Box`, `Card` (`elevated`, `filled`, `outlined`) |
| **Scaffold Chrome** | `TopAppBar` (`small`, `centerAligned`, `medium`, `large`), `FloatingActionButton` (`standard`, `small`, `large`, `extended`) |
| **Actions & Buttons** | `Button`, `IconButton` |
| **Inputs & Selection** | `TextField`, `Switch`, `Checkbox`, `Slider`, `Chip` |
| **Display & Content** | `Text`, `Icon`, `Image`, `ListItem`, `Badge`, `Spacer`, `Divider` |
| **Progress & M3E** | `LoadingIndicator` (M3E shape-morphing), `ProgressBar` (wavy / standard) |

---

## Tech Stack

- **UI Framework**: React 18 (`^18.3.1`) + TypeScript (`^5.7.2`) + Vite (`^6.1.0`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + Material Symbols Rounded + Google Fonts
- **State Management**: Zustand (`^5.0.3`) with separate design AST store (`useProjectStore`) and isolated preview store (`usePreviewStore`)
- **Drag & Drop**: `@dnd-kit/core` (`^6.3.1`), `@dnd-kit/sortable` (`^10.0.0`), `@dnd-kit/utilities`
- **Motion & Transitions**: `motion` (`^13.1.1`)
- **Testing**: Node native test runner (`node --test --experimental-strip-types`) for AST unit tests + Playwright (`@playwright/test`) for end-to-end verification

---

## Project Structure

```text
m3-app-builder/
├── src/
│   ├── ast/
│   │   ├── factory.ts          # Component & blank screen constructors
│   │   ├── operations.ts       # Pure AST tree mutations (insert, move, duplicate, remove, slot ops)
│   │   ├── templates.ts        # 4 starter app templates
│   │   ├── types.ts            # Schema v1 types, 22 ComponentTypes, UserActions, PropsMap
│   │   └── validator.ts        # Runtime JSON & AST integrity validator
│   ├── components/
│   │   ├── canvas/             # M3Renderer, M3LoadingIndicator, M3E morph shapes
│   │   ├── dnd/                # BuilderDndProvider (slot-aware collision + DragOverlay)
│   │   ├── inspector/          # PropertiesInspector, IconPickerModal, iconCatalog
│   │   ├── palette/            # PartsPalette, paletteCatalog
│   │   ├── DevicePreview.tsx   # Compact Phone / Tablet frame, status bar, Snackbar, Preview bar
│   │   ├── LeftSidebar.tsx     # Parts, Screens & BottomNav, AST Tree, Tokens tabs
│   │   ├── RightSidebar.tsx    # Theme & System / Properties Inspector tabs
│   │   ├── ThemePanel.tsx      # Color presets, dynamic wallpaper, fonts, shapes, density, bars
│   │   ├── TemplatesModal.tsx  # Starter template browser
│   │   ├── ProjectJsonModal.tsx# AST JSON import/export modal
│   │   └── ReleaseNotesModal.tsx # V1 Release Notes & V2/V3 Future Roadmap modal
│   ├── store/
│   │   ├── useProjectStore.ts  # Undoable AST + Theme state + localStorage persistence
│   │   └── usePreviewStore.ts  # Isolated preview runtime state, nav stack & Snackbar
│   └── theme/                  # M3 seed palette generator, fonts, tokens, ThemeContext
└── tests/
    ├── ast.test.ts             # AST schema, tree operations & multi-screen unit tests
    └── e2e/                    # Playwright specs covering Phases 1–5 & Release Notes
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
| `npm test` | Run AST unit & schema tests ([`tests/ast.test.ts`](tests/ast.test.ts)) |
| `npm run test:e2e` | Run all Playwright E2E suites ([`tests/e2e/`](tests/e2e/)) against `127.0.0.1:4173` |
| `npm run preview` | Preview the built `dist/` bundle locally |

---

## CI/CD & GitHub Pages Hosting

- **Pull Request Quality Gate ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))**: Runs on PRs targeting `main` (opening, reopening, and every commit pushed to the PR branch) plus manual dispatch. Executes Node 22 typecheck, AST unit tests, production build, and headless Playwright Chromium E2E tests (`Playwright E2E`), uploading traces/reports if any test fails.
- **GitHub Pages Deployment ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml))**: Runs on pushes to `main` (and manual dispatch). Re-runs the full `ci.yml` verification suite first, builds with the repository subpath (`VITE_BASE_PATH`), and deploys to **GitHub Pages** (`https://p-abhay.github.io/m3-app-builder/`).
- **One-Time GitHub Repo Settings**:
  1. **Settings → Pages → Source**: Select **GitHub Actions**.
  2. **Settings → Branches → Branch protection rules (`main`)**: Enable **Require a pull request before merging** and **Require status checks to pass before merging** (`Typecheck, Unit Tests & Build`, `Playwright E2E`).

---

## Roadmap Beyond V1

1. **V2 — Kotlin + Jetpack Compose Exporter**: Direct AST-to-Kotlin compiler generating `Color.kt`, `Theme.kt`, `Type.kt`, `Shape.kt`, composable screen files, and `AppNavHost.kt` packaged as a downloadable Android Studio Gradle project.
2. **V2 — AI Screen Co-Pilot & Data Binding**: Natural-language screen scaffolding into the normalized AST, agent-ready design spec export, mock JSON dataset binding, `LazyColumn` list repeaters, and conditional visibility rules.
3. **V3 — Adaptive Layouts & Cloud Previews**: Automatic `NavigationBar` to `NavigationRail` adaptation on tablet breakpoints, `ModalBottomSheet` / `AlertDialog` overlays, GitHub repo sync, and cloud APK builds.
