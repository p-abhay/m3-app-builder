import { OVERLAY_TYPES, type AppProject } from "../ast/types.ts";
import { AUTO_MIRRORED_ICONS, ICON_ALIASES } from "./compose/utils.ts";
import type { GradleProjectBundle } from "./gradle/index.ts";

export type PreflightSeverity = "error" | "warning" | "info";

export interface PreflightIssue {
  id: string;
  severity: PreflightSeverity;
  category: "kotlin" | "icons" | "state" | "navigation" | "gradle";
  filePath?: string;
  shortName?: string;
  line?: number;
  message: string;
}

export interface PreflightReport {
  ok: boolean;
  checksRun: number;
  errorCount: number;
  warningCount: number;
  issues: PreflightIssue[];
}

const KNOWN_MISSING_COMPOSE_ICONS = new Set([
  "Flame",
  "ProgressActivity",
  "BottomSheets",
  "BottomNavigation",
]);

function countUnescapedDelimiter(line: string, open: string, close: string): number {
  let delta = 0;
  let inStr = false;
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (!inStr && ch === "/" && line[i + 1] === "/") break;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\" && inStr) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (!inStr) {
      if (ch === open) delta++;
      else if (ch === close) delta--;
    }
  }
  return delta;
}

/**
 * Deterministic client-side Preflight Verifier checking syntax balance, icon symbols,
 * state/binding compatibility, route/overlay integrity, and Android Gradle metadata.
 */
export function verifyGradleBundle(
  project: AppProject,
  bundle: GradleProjectBundle,
): PreflightReport {
  const issues: PreflightIssue[] = [];
  let seq = 1;
  const pushIssue = (issue: Omit<PreflightIssue, "id">) => {
    issues.push({ id: `pf_${seq++}`, ...issue });
  };

  // 1. Surface compiler diagnostics
  for (const diag of bundle.compose.diagnostics) {
    const matchedScreen = diag.screenId
      ? project.screens.find((s) => s.id === diag.screenId)
      : undefined;
    const screenFile = matchedScreen
      ? bundle.files.find(
          (f) => f.category === "screen" && f.shortName.toLowerCase().includes(matchedScreen.name.toLowerCase().replace(/[^a-z0-9]/g, "")),
        )
      : undefined;
    pushIssue({
      severity: diag.severity === "warning" ? "warning" : "info",
      category: "navigation",
      filePath: screenFile?.path,
      shortName: screenFile?.shortName,
      message: diag.message,
    });
  }

  // 2. Kotlin syntax, delimiter balance & deprecated/missing icon verification
  const kotlinFiles = bundle.files.filter((f) => f.shortName.endsWith(".kt"));
  for (const file of kotlinFiles) {
    const lines = file.content.split("\n");
    let braceDelta = 0;
    let parenDelta = 0;

    lines.forEach((line, idx) => {
      braceDelta += countUnescapedDelimiter(line, "{", "}");
      parenDelta += countUnescapedDelimiter(line, "(", ")");

      const iconMatch = /Icons\.Rounded\.([A-Za-z0-9_]+)/g;
      let m: RegExpExecArray | null;
      while ((m = iconMatch.exec(line)) !== null) {
        if (KNOWN_MISSING_COMPOSE_ICONS.has(m[1])) {
          pushIssue({
            severity: "error",
            category: "icons",
            filePath: file.path,
            shortName: file.shortName,
            line: idx + 1,
            message: `${file.shortName}:${idx + 1} references unmapped Compose icon Icons.Rounded.${m[1]}.`,
          });
        }
      }
    });

    if (braceDelta !== 0) {
      pushIssue({
        severity: "error",
        category: "kotlin",
        filePath: file.path,
        shortName: file.shortName,
        message: `Unbalanced curly braces in ${file.shortName} (delta ${braceDelta}).`,
      });
    }
    if (parenDelta !== 0) {
      pushIssue({
        severity: "error",
        category: "kotlin",
        filePath: file.path,
        shortName: file.shortName,
        message: `Unbalanced parentheses in ${file.shortName} (delta ${parenDelta}).`,
      });
    }
    if (file.content.includes("undefined") || file.content.includes("NaN")) {
      pushIssue({
        severity: "error",
        category: "kotlin",
        filePath: file.path,
        shortName: file.shortName,
        message: `${file.shortName} contains unresolved literal "undefined" or "NaN".`,
      });
    }
  }

  // 3. State bindings, visibility conditions, overlays & icon catalog warnings
  const varKeys = new Set((project.state?.variables ?? []).map((v) => v.key));
  const colKeys = new Set((project.state?.collections ?? []).map((c) => c.key));

  const checkRawIcon = (iconName: string | undefined, location: string, filePath?: string) => {
    if (!iconName) return;
    const cleaned = iconName.trim();
    if (!cleaned) return;
    if (cleaned in AUTO_MIRRORED_ICONS || cleaned in ICON_ALIASES) return;
    if (/^[a-z0-9_]+$/.test(cleaned)) return;
    pushIssue({
      severity: "warning",
      category: "icons",
      filePath,
      message: `${location} uses non-snake_case icon "${iconName}".`,
    });
  };

  for (const scr of project.screens) {
    const overlayIds = new Set(
      Object.values(scr.nodes)
        .filter((n) => OVERLAY_TYPES.has(n.type))
        .map((n) => n.id),
    );

    for (const node of Object.values(scr.nodes)) {
      if (node.bindings?.stateKey && !varKeys.has(node.bindings.stateKey)) {
        pushIssue({
          severity: "warning",
          category: "state",
          message: `Node "${node.name || node.type}" on "${scr.name}" binds missing state variable "${node.bindings.stateKey}".`,
        });
      }
      if (node.visibleWhen?.stateKey && !varKeys.has(node.visibleWhen.stateKey)) {
        pushIssue({
          severity: "warning",
          category: "state",
          message: `Node "${node.name || node.type}" visibility condition references missing stateKey "${node.visibleWhen.stateKey}".`,
        });
      }
      if (node.type === "DataList" && node.props.collectionKey && !colKeys.has(node.props.collectionKey)) {
        pushIssue({
          severity: "warning",
          category: "state",
          message: `DataList on "${scr.name}" references missing collection "${node.props.collectionKey}".`,
        });
      }
      if (node.action?.type === "openOverlay" && !overlayIds.has(node.action.targetNodeId)) {
        pushIssue({
          severity: "warning",
          category: "navigation",
          message: `Action on "${node.name || node.type}" references missing overlay "${node.action.targetNodeId}" on "${scr.name}".`,
        });
      }
      if (node.type === "AlertDialog" && "icon" in node.props) {
        checkRawIcon(node.props.icon, `AlertDialog on ${scr.name}`);
      }
    }
  }

  // 4. Gradle, SDK & Manifest XML checks
  if (bundle.minSdk > bundle.targetSdk) {
    pushIssue({
      severity: "error",
      category: "gradle",
      shortName: "app/build.gradle.kts",
      message: `minSdk (${bundle.minSdk}) cannot exceed targetSdk (${bundle.targetSdk}).`,
    });
  }
  const xmlFiles = bundle.files.filter((f) => f.shortName.endsWith(".xml"));
  for (const xml of xmlFiles) {
    if (/&(?!(?:amp|lt|gt|quot|apos);)/.test(xml.content)) {
      pushIssue({
        severity: "error",
        category: "gradle",
        filePath: xml.path,
        shortName: xml.shortName,
        message: `${xml.shortName} contains unescaped '&' entity.`,
      });
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    ok: errorCount === 0,
    checksRun: kotlinFiles.length + xmlFiles.length + project.screens.length + 2,
    errorCount,
    warningCount,
    issues,
  };
}
