import type { AppProject, PersistenceBackend } from "../../ast/types.ts";
import { generateNavAndActivityFiles } from "./navGen.ts";
import { generateScreenFile } from "./screenGen.ts";
import { generateAppStateStoreFile, generateStateStorageFile } from "./stateGen.ts";
import { generateThemeFiles } from "./themeGen.ts";
import type { ComposeCodegenOptions, ComposeCodegenResult, ComposeDiagnostic } from "./types.ts";
import { buildScreenNameMap, buildScreenRouteMap, sanitizePackageName } from "./utils.ts";

export type {
  ComposeCodegenOptions,
  ComposeCodegenResult,
  ComposeDiagnostic,
  GeneratedKotlinFile,
} from "./types.ts";

/**
 * Compile an `AppProject` (normalized Android AST + Material 3 Expressive theme + optional AppState)
 * into idiomatic Kotlin + Jetpack Compose files and actionable compatibility diagnostics.
 */
export function generateComposeProject(
  project: AppProject,
  options: ComposeCodegenOptions & { persistenceBackend?: PersistenceBackend } = {},
): ComposeCodegenResult {
  const pkg = sanitizePackageName(project.packageName);
  const m3Expressive = Boolean(options.m3Expressive);
  const diagnostics: ComposeDiagnostic[] = [];

  const appState = project.state;
  const hasAppState = Boolean(
    appState && (appState.variables.length > 0 || appState.collections.length > 0),
  );
  const backend: PersistenceBackend =
    options.persistenceBackend ?? appState?.persistenceBackend ?? "datastore";

  if (!m3Expressive) {
    const usesM3eParts = project.screens.some((screen) =>
      Object.values(screen.nodes).some(
        (n) =>
          n.type === "LoadingIndicator" ||
          (n.type === "ProgressBar" && n.props.wavy) ||
          ((n.type === "Row" || n.type === "Column") && n.props.connected),
      ),
    );
    if (usesM3eParts) {
      diagnostics.push({
        severity: "info",
        message:
          "Hybrid Stable M3 mode is active: expressive parts emit stable Material 3 fallbacks. Enable M3 Expressive Alpha to emit alpha composables.",
      });
    }
  }

  const screenNameMap = buildScreenNameMap(project.screens);
  const routeMap = buildScreenRouteMap(project.screens);

  const themeFiles = generateThemeFiles(pkg, project.name, project.theme, m3Expressive);
  const stateFiles = hasAppState
    ? [
        generateStateStorageFile(pkg, project.name, backend),
        generateAppStateStoreFile(pkg, project),
      ]
    : [];
  const screenFiles = project.screens.map((screen) =>
    generateScreenFile(
      pkg,
      screen,
      screenNameMap.get(screen.id)!,
      routeMap,
      m3Expressive,
      diagnostics,
      appState,
    ),
  );
  const appFiles = generateNavAndActivityFiles(
    pkg,
    project,
    screenNameMap,
    routeMap,
    diagnostics,
    hasAppState,
  );

  return {
    packageName: pkg,
    files: [...themeFiles, ...stateFiles, ...screenFiles, ...appFiles],
    diagnostics,
  };
}
