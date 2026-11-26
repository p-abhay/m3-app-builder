import type {
  ComponentStyle,
  ScreenNode,
  UserAction,
  VisibilityCondition,
} from "../../ast/types.ts";
import type { ColorTokenKey } from "../../theme/types.ts";

const KOTLIN_KEYWORDS = new Set([
  "as", "break", "class", "continue", "do", "else", "false", "for", "fun", "if",
  "in", "interface", "is", "null", "object", "package", "return", "super", "this",
  "throw", "true", "try", "typealias", "typeof", "val", "var", "when", "while",
]);

/** Normalize an Android package name into valid dot-separated Kotlin segments. */
export function sanitizePackageName(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.]+/g, "_")
    .split(".")
    .map((seg) => seg.replace(/^[^a-z]+/, "").replace(/_+$/, ""))
    .filter(Boolean)
    .map((seg) => (KOTLIN_KEYWORDS.has(seg) ? `${seg}app` : seg));

  if (cleaned.length === 0) return "com.example.myapp";
  if (cleaned.length === 1) return `com.example.${cleaned[0]}`;
  return cleaned.join(".");
}

/** Convert an arbitrary label into a valid UpperCamelCase Kotlin identifier. */
export function toPascalCase(raw: string, fallback = "App"): string {
  const words = raw
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return fallback;
  const joined = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return /^[0-9]/.test(joined) ? `${fallback}${joined}` : joined;
}

/** Convert an arbitrary label or node ID into a valid lowerCamelCase Kotlin identifier. */
export function toCamelCase(raw: string, fallback = "state"): string {
  const pascal = toPascalCase(raw, "State");
  const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);
  return KOTLIN_KEYWORDS.has(camel) ? `${fallback}${pascal}` : camel;
}

/** Derive unique composable function names (e.g. `HomeScreen`) for every screen in a project. */
export function buildScreenNameMap(screens: ScreenNode[]): Map<string, string> {
  const used = new Set<string>();
  const map = new Map<string, string>();
  for (const screen of screens) {
    const base = toPascalCase(screen.name, "Screen").replace(/Screen$/, "");
    let candidate = `${base}Screen`;
    let suffix = 2;
    while (used.has(candidate)) {
      candidate = `${base}${suffix}Screen`;
      suffix++;
    }
    used.add(candidate);
    map.set(screen.id, candidate);
  }
  return map;
}

/** Build a guaranteed-unique route map for Compose Navigation targets. */
export function buildScreenRouteMap(screens: ScreenNode[]): Map<string, string> {
  const used = new Set<string>();
  const map = new Map<string, string>();
  screens.forEach((screen, index) => {
    const raw = screen.route.trim().replace(/^\/+/, "") || `screen_${index + 1}`;
    let candidate = raw;
    let suffix = 2;
    while (used.has(candidate)) {
      candidate = `${raw}_${suffix}`;
      suffix++;
    }
    used.add(candidate);
    map.set(screen.id, candidate);
  });
  return map;
}

/** Convert a template string containing `{{item.field}}`, `{{state.key}}`, or `{{count.col}}` into a safe Kotlin literal. */
export function kotlinTemplateString(value: string, hasAppState: boolean, inItemScope: boolean): string {
  if (!value.includes("{{")) return kotlinString(value);
  const parts = value.split(/(\{\{\s*[a-zA-Z0-9_.-]+\s*\}\})/g);
  const out = parts
    .map((part) => {
      const match = /^\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}$/.exec(part);
      if (!match) {
        return part
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"')
          .replace(/\$/g, "\\$")
          .replace(/\r/g, "")
          .replace(/\n/g, "\\n")
          .replace(/\t/g, "\\t");
      }
      const expr = match[1];
      if (expr.startsWith("item.") && inItemScope) {
        return `\${item.${toCamelCase(expr.slice(5))}}`;
      }
      if (expr.startsWith("state.") && hasAppState) {
        return `\${appState.${toCamelCase(expr.slice(6), "stateVar")}}`;
      }
      if (expr.startsWith("count.") && hasAppState) {
        return `\${appState.${toCamelCase(expr.slice(6), "items")}.size}`;
      }
      return part.replace(/\$/g, "\\$");
    })
    .join("");
  return `"${out}"`;
}

/** Escape a JS string cleanly into a Kotlin double-quoted string literal. */
export function kotlinString(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

/** Convert `#RRGGBB` hex string to Compose `Color(0xFFRRGGBB)` literal. */
export function kotlinColorLiteral(hex: string): string {
  const normalized = hex.replace("#", "").toUpperCase();
  const six = /^[0-9A-F]{6}$/.test(normalized) ? normalized : "6750A4";
  return `Color(0xFF${six})`;
}

/** Format a number as a valid Kotlin Float literal (`1.0f`, `0.65f`). */
export function kotlinFloat(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}f` : `${rounded}f`;
}

/** Format a rounded dp/sp numeric value (`16.dp`, `14.5.sp`). */
export function kotlinUnit(value: number, unit: "dp" | "sp"): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}.${unit}`;
}

const COLOR_TOKEN_TO_SCHEME: Record<ColorTokenKey, string> = {
  primary: "MaterialTheme.colorScheme.primary",
  onPrimary: "MaterialTheme.colorScheme.onPrimary",
  primaryContainer: "MaterialTheme.colorScheme.primaryContainer",
  onPrimaryContainer: "MaterialTheme.colorScheme.onPrimaryContainer",
  inversePrimary: "MaterialTheme.colorScheme.inversePrimary",
  secondary: "MaterialTheme.colorScheme.secondary",
  onSecondary: "MaterialTheme.colorScheme.onSecondary",
  secondaryContainer: "MaterialTheme.colorScheme.secondaryContainer",
  onSecondaryContainer: "MaterialTheme.colorScheme.onSecondaryContainer",
  tertiary: "MaterialTheme.colorScheme.tertiary",
  onTertiary: "MaterialTheme.colorScheme.onTertiary",
  tertiaryContainer: "MaterialTheme.colorScheme.tertiaryContainer",
  onTertiaryContainer: "MaterialTheme.colorScheme.onTertiaryContainer",
  background: "MaterialTheme.colorScheme.background",
  onBackground: "MaterialTheme.colorScheme.onBackground",
  surface: "MaterialTheme.colorScheme.surface",
  surfaceDim: "MaterialTheme.colorScheme.surfaceDim",
  surfaceBright: "MaterialTheme.colorScheme.surfaceBright",
  surfaceContainerLowest: "MaterialTheme.colorScheme.surfaceContainerLowest",
  surfaceContainerLow: "MaterialTheme.colorScheme.surfaceContainerLow",
  surfaceContainer: "MaterialTheme.colorScheme.surfaceContainer",
  surfaceContainerHigh: "MaterialTheme.colorScheme.surfaceContainerHigh",
  surfaceContainerHighest: "MaterialTheme.colorScheme.surfaceContainerHighest",
  onSurface: "MaterialTheme.colorScheme.onSurface",
  surfaceVariant: "MaterialTheme.colorScheme.surfaceVariant",
  onSurfaceVariant: "MaterialTheme.colorScheme.onSurfaceVariant",
  outline: "MaterialTheme.colorScheme.outline",
  outlineVariant: "MaterialTheme.colorScheme.outlineVariant",
  inverseSurface: "MaterialTheme.colorScheme.inverseSurface",
  inverseOnSurface: "MaterialTheme.colorScheme.inverseOnSurface",
  error: "MaterialTheme.colorScheme.error",
  onError: "MaterialTheme.colorScheme.onError",
  errorContainer: "MaterialTheme.colorScheme.errorContainer",
  onErrorContainer: "MaterialTheme.colorScheme.onErrorContainer",
  scrim: "MaterialTheme.colorScheme.scrim",
};

/** Resolve an AST color token or `"transparent"` into a Compose `Color` expression. */
export function colorTokenExpr(token?: ColorTokenKey | "transparent"): string {
  if (!token || token === "transparent") return "Color.Transparent";
  return COLOR_TOKEN_TO_SCHEME[token] ?? "MaterialTheme.colorScheme.onSurface";
}

export const AUTO_MIRRORED_ICONS: Record<string, string> = {
  arrow_back: "ArrowBack",
  arrow_forward: "ArrowForward",
  send: "Send",
  help: "Help",
  open_in_new: "OpenInNew",
  reply: "Reply",
  logout: "Logout",
  login: "Login",
  undo: "Undo",
  redo: "Redo",
  sort: "Sort",
};

export const ICON_ALIASES: Record<string, string> = {
  lock_person: "Lock",
  palette: "Palette",
  dashboard_customize: "DashboardCustomize",
  rocket_launch: "RocketLaunch",
  notifications_active: "NotificationsActive",
  chevron_right: "ChevronRight",
  more_vert: "MoreVert",
  more_horiz: "MoreHoriz",
  brightness_6: "Brightness6",
  volume_up: "VolumeUp",
  wifi: "Wifi",
  explore: "Explore",
  home: "Home",
  person: "Person",
  settings: "Settings",
  search: "Search",
  menu: "Menu",
  edit: "Edit",
  tune: "Tune",
  mail: "Mail",
  key: "Key",
  add: "Add",
  close: "Close",
  check: "Check",
  star: "Star",
  favorite: "Favorite",
  flame: "LocalFireDepartment",
  progress_activity: "Autorenew",
  bottom_sheets: "VerticalSplit",
  bottom_navigation: "ViewCompact",
  toolbar: "WebAsset",
  tab: "Tab",
  arrow_drop_down_circle: "ArrowDropDownCircle",
  arrow_drop_down: "ArrowDropDown",
  arrow_drop_up: "ArrowDropUp",
  radio_button_checked: "RadioButtonChecked",
  checklist: "Checklist",
  auto_awesome: "AutoAwesome",
};

/** Map a Material Symbols snake_case icon name to `Icons.Rounded.*` or `Icons.AutoMirrored.Rounded.*`. */
export function toMaterialIconRef(iconName?: string): string {
  const cleaned = (iconName || "star").trim();
  if (AUTO_MIRRORED_ICONS[cleaned]) {
    return `Icons.AutoMirrored.Rounded.${AUTO_MIRRORED_ICONS[cleaned]}`;
  }
  const mapped = ICON_ALIASES[cleaned] ?? toPascalCase(cleaned, "Star");
  return `Icons.Rounded.${mapped}`;
}

export interface ModifierOptions {
  skipBackground?: boolean;
  extra?: string[];
  /** True when inside a non-wrapping `RowScope` (`width: "fill"` maps to `.weight(1f)`). */
  inRowScope?: boolean;
  /** True when inside a `ColumnScope` (`alignSelf` maps to `Modifier.align(Alignment.*)`). */
  inColumnScope?: boolean;
  /** True when inside a `BoxScope` (`alignSelf` maps to `Modifier.align(Alignment.*)`). */
  inBoxScope?: boolean;
  /** Vertical alignment applied inside `FlowRowScope` (`Modifier.align(...)`). */
  alignInFlowRow?: "top" | "center" | "bottom";
}

/** Build a clean Compose `Modifier` chain from `ComponentStyle` and container scope rules. */
export function buildModifierExpr(
  style: ComponentStyle,
  options: ModifierOptions = {},
): string {
  const parts: string[] = [];

  if (options.inRowScope && style.width === "fill") {
    parts.push(".weight(1f)");
  }

  if (options.alignInFlowRow === "center") {
    parts.push(".align(Alignment.CenterVertically)");
  } else if (options.alignInFlowRow === "bottom") {
    parts.push(".align(Alignment.Bottom)");
  } else if (style.alignSelf && style.alignSelf !== "auto" && style.alignSelf !== "stretch") {
    if (options.inColumnScope) {
      const colAlign =
        style.alignSelf === "start"
          ? "Alignment.Start"
          : style.alignSelf === "center"
            ? "Alignment.CenterHorizontally"
            : "Alignment.End";
      parts.push(`.align(${colAlign})`);
    } else if (options.inRowScope) {
      const rowAlign =
        style.alignSelf === "start"
          ? "Alignment.Top"
          : style.alignSelf === "center"
            ? "Alignment.CenterVertically"
            : "Alignment.Bottom";
      parts.push(`.align(${rowAlign})`);
    } else if (options.inBoxScope) {
      const boxAlign =
        style.alignSelf === "start"
          ? "Alignment.CenterStart"
          : style.alignSelf === "center"
            ? "Alignment.Center"
            : "Alignment.CenterEnd";
      parts.push(`.align(${boxAlign})`);
    }
  }

  if (style.margin) {
    const { top, right, bottom, left } = style.margin;
    if (top || right || bottom || left) {
      parts.push(`.padding(start = ${left}.dp, top = ${top}.dp, end = ${right}.dp, bottom = ${bottom}.dp)`);
    }
  }

  const stretchWidth = style.alignSelf === "stretch" && !options.inRowScope;
  const stretchHeight = style.alignSelf === "stretch" && options.inRowScope;

  if (!options.inRowScope && (style.width === "fill" || stretchWidth)) parts.push(".fillMaxWidth()");
  else if (typeof style.width === "number") parts.push(`.width(${style.width}.dp)`);

  if (style.height === "fill" || stretchHeight) parts.push(".fillMaxHeight()");
  else if (typeof style.height === "number") parts.push(`.height(${style.height}.dp)`);

  if (typeof style.cornerRadius === "number" && style.cornerRadius > 0) {
    parts.push(`.clip(RoundedCornerShape(${style.cornerRadius}.dp))`);
  }

  if (!options.skipBackground && style.backgroundToken && style.backgroundToken !== "transparent") {
    parts.push(`.background(${colorTokenExpr(style.backgroundToken)})`);
  }

  if (style.padding) {
    const { top, right, bottom, left } = style.padding;
    if (top || right || bottom || left) {
      if (top === right && right === bottom && bottom === left) {
        parts.push(`.padding(${top}.dp)`);
      } else {
        parts.push(`.padding(start = ${left}.dp, top = ${top}.dp, end = ${right}.dp, bottom = ${bottom}.dp)`);
      }
    }
  }

  if (options.extra) {
    parts.push(...options.extra);
  }

  return parts.length === 0 ? "Modifier" : `Modifier${parts.join("")}`;
}

export interface ActionContextOptions {
  hasAppState?: boolean;
  inItemScope?: boolean;
  variableDefaults?: Map<string, string | boolean | number>;
  variableTypes?: Map<string, "string" | "boolean" | "number">;
  collectionFieldTypes?: Map<string, Map<string, "string" | "boolean" | "number">>;
  overlayIds?: Set<string>;
  onBrokenOverlay?: (targetNodeId: string) => void;
}

/** Build a Kotlin boolean condition expression for a `VisibilityCondition`. */
export function visibilityConditionExpr(
  condition: VisibilityCondition | undefined,
  variableTypes?: Map<string, "string" | "boolean" | "number">,
): string | null {
  if (!condition || !condition.stateKey.trim()) return null;
  const prop = `appState.${toCamelCase(condition.stateKey, "stateVar")}`;
  const vType = variableTypes?.get(condition.stateKey) ?? "string";

  if (condition.operator === "truthy" || condition.operator === "falsy") {
    const base =
      vType === "boolean"
        ? prop
        : vType === "number"
          ? `${prop} != 0f`
          : `(${prop}.isNotBlank() && !${prop}.equals("false", ignoreCase = true))`;
    return condition.operator === "falsy" ? `!${base.startsWith("(") ? `(${base})` : base}` : base;
  }

  const targetVal = condition.value ?? "";
  const neg = condition.operator === "notEquals";
  if (vType === "boolean") {
    const boolLit = targetVal.trim().toLowerCase() === "true" ? "true" : "false";
    return `${prop} ${neg ? "!=" : "=="} ${boolLit}`;
  }
  if (vType === "number") {
    return `${prop} ${neg ? "!=" : "=="} ${kotlinFloat(Number(targetVal) || 0)}`;
  }
  return `${neg ? "!" : ""}${prop}.equals(${kotlinString(targetVal)}, ignoreCase = true)`;
}

function buildFieldArgExpr(
  colKey: string,
  fKey: string,
  sKey: string,
  opts: ActionContextOptions,
): string {
  const sProp = `appState.${toCamelCase(sKey, "stateVar")}`;
  const varType = opts.variableTypes?.get(sKey) ?? "string";
  const colType = opts.collectionFieldTypes?.get(colKey)?.get(fKey) ?? varType;
  let valueExpr = varType === "string" ? `${sProp}.trim()` : sProp;
  if (varType === "number" && colType === "number") {
    valueExpr = `${sProp}.toLong()`;
  } else if (varType !== "string" && colType === "string") {
    valueExpr = `${sProp}.toString()`;
  }
  return `${toCamelCase(fKey)} = ${valueExpr}`;
}

/** Emit a Kotlin action statement list for a `UserAction` inside callbacks (`onClick`). */
export function actionStatements(
  action: UserAction | undefined,
  routeMap: Map<string, string>,
  onBrokenNav?: (targetScreenId: string) => void,
  opts: ActionContextOptions = {},
): string[] {
  if (!action || action.type === "none") return [];
  const hasAppState = Boolean(opts.hasAppState);
  const inItemScope = Boolean(opts.inItemScope);

  const resetExpr = (stateKey: string): string => {
    const def = opts.variableDefaults?.get(stateKey);
    const prop = `appState.${toCamelCase(stateKey, "stateVar")}`;
    if (typeof def === "boolean") return `${prop} = ${def ? "true" : "false"}`;
    if (typeof def === "number") return `${prop} = ${def}f`;
    return `${prop} = ${kotlinString(typeof def === "string" ? def : "")}`;
  };

  switch (action.type) {
    case "navigate": {
      const targetRoute = routeMap.get(action.targetScreenId);
      if (!targetRoute) {
        onBrokenNav?.(action.targetScreenId);
        return [`// Broken navigation target: ${action.targetScreenId}`];
      }
      return [`onNavigate(${kotlinString(targetRoute)})`];
    }
    case "navigateBack":
      return ["onNavigateBack()"];
    case "showSnackbar":
      return [`onShowSnackbar(${kotlinString(action.message || "Action triggered")})`];
    case "openUrl":
      return [`uriHandler.openUri(${kotlinString(action.url)})`];
    case "openOverlay":
      if (opts.overlayIds && !opts.overlayIds.has(action.targetNodeId)) {
        opts.onBrokenOverlay?.(action.targetNodeId);
        return [`// Broken overlay target: ${action.targetNodeId}`];
      }
      return [`activeOverlayId = ${kotlinString(action.targetNodeId)}`];
    case "dismissOverlay":
      return ["activeOverlayId = null"];
    case "toggleState":
      if (hasAppState && action.stateKey) {
        const prop = `appState.${toCamelCase(action.stateKey, "stateVar")}`;
        return [`${prop} = !${prop}`, "appState.notifyChanged()"];
      }
      return [`onShowSnackbar("State toggled")`];
    case "setState":
      if (!hasAppState) return [`onShowSnackbar("State updated")`];
      {
        const prop = `appState.${toCamelCase(action.stateKey, "stateVar")}`;
        const vType = opts.variableTypes?.get(action.stateKey);
        const val =
          vType === "boolean" || typeof action.value === "boolean"
            ? Boolean(action.value && String(action.value).toLowerCase() !== "false")
              ? "true"
              : "false"
            : vType === "number" || typeof action.value === "number"
              ? `${Number(action.value) || 0}f`
              : kotlinString(String(action.value));
        return [`${prop} = ${val}`, "appState.notifyChanged()"];
      }
    case "createItem": {
      if (!hasAppState) return [];
      const colPascal = toPascalCase(action.collectionKey, "Items");
      const args = Object.entries(action.fieldFromState).map(([fKey, sKey]) =>
        buildFieldArgExpr(action.collectionKey, fKey, sKey, opts),
      );
      const stmts = [`appState.create${colPascal}(${args.join(", ")})`];
      for (const ck of action.clearStateKeys ?? []) stmts.push(resetExpr(ck));
      if (action.snackbarMessage) stmts.push(`onShowSnackbar(${kotlinString(action.snackbarMessage)})`);
      if (action.navigateBackAfter) stmts.push("onNavigateBack()");
      const titleKey = action.fieldFromState.title;
      if (titleKey && (opts.variableTypes?.get(titleKey) ?? "string") === "string") {
        const tProp = `appState.${toCamelCase(titleKey, "stateVar")}`;
        return [
          `if (${tProp}.isBlank()) { onShowSnackbar("Please enter a title first") } else { ${stmts.join("; ")} }`,
        ];
      }
      return stmts;
    }
    case "selectItem": {
      if (!hasAppState) return [];
      const targetProp = `appState.${toCamelCase(action.targetStateKey, "stateVar")}`;
      const stmts: string[] = [];
      if (inItemScope) {
        stmts.push(`${targetProp} = item.id`);
        for (const [sKey, fKey] of Object.entries(action.populateState ?? {})) {
          stmts.push(
            `appState.${toCamelCase(sKey, "stateVar")} = item.${toCamelCase(fKey)}`,
          );
        }
      } else {
        stmts.push(`${targetProp} = ""`);
        for (const sKey of Object.keys(action.populateState ?? {})) {
          stmts.push(resetExpr(sKey));
        }
      }
      if (action.targetScreenId) {
        const route = routeMap.get(action.targetScreenId);
        if (route) stmts.push(`onNavigate(${kotlinString(route)})`);
      }
      return stmts;
    }
    case "updateItem": {
      if (!hasAppState) return [];
      const colPascal = toPascalCase(action.collectionKey, "Items");
      const idExpr = action.idStateKey
        ? `appState.${toCamelCase(action.idStateKey, "stateVar")}`
        : inItemScope
          ? "item.id"
          : '""';
      const args = Object.entries(action.fieldFromState).map(([fKey, sKey]) =>
        buildFieldArgExpr(action.collectionKey, fKey, sKey, opts),
      );
      const stmts = [`appState.upsert${colPascal}(id = ${idExpr}, ${args.join(", ")})`];
      for (const ck of action.clearStateKeys ?? []) stmts.push(resetExpr(ck));
      if (action.snackbarMessage) stmts.push(`onShowSnackbar(${kotlinString(action.snackbarMessage)})`);
      if (action.navigateBackAfter) stmts.push("onNavigateBack()");
      const titleKey = action.fieldFromState.title;
      if (titleKey && (opts.variableTypes?.get(titleKey) ?? "string") === "string") {
        const tProp = `appState.${toCamelCase(titleKey, "stateVar")}`;
        return [
          `if (${tProp}.isBlank()) { onShowSnackbar("Please enter a title first") } else { ${stmts.join("; ")} }`,
        ];
      }
      return stmts;
    }
    case "toggleItemField": {
      if (!hasAppState) return [];
      const colPascal = toPascalCase(action.collectionKey, "Items");
      const idExpr = action.idStateKey
        ? `appState.${toCamelCase(action.idStateKey, "stateVar")}`
        : inItemScope
          ? "item.id"
          : '""';
      return [`appState.toggle${colPascal}Field(id = ${idExpr}, field = ${kotlinString(action.field)})`];
    }
    case "deleteItem": {
      if (!hasAppState) return [];
      const colPascal = toPascalCase(action.collectionKey, "Items");
      const idExpr = action.idStateKey
        ? `appState.${toCamelCase(action.idStateKey, "stateVar")}`
        : inItemScope
          ? "item.id"
          : '""';
      const stmts = [`appState.delete${colPascal}(id = ${idExpr})`];
      if (action.idStateKey) stmts.push(resetExpr(action.idStateKey));
      if (action.snackbarMessage) stmts.push(`onShowSnackbar(${kotlinString(action.snackbarMessage)})`);
      if (action.navigateBackAfter) stmts.push("onNavigateBack()");
      return stmts;
    }
  }
}

/** Prefix every line of a multiline block cleanly for deterministic Kotlin formatting. */
export function indentLines(lines: string[], spaces: number): string[] {
  const pad = " ".repeat(spaces);
  return lines.map((line) => (line.length === 0 ? "" : `${pad}${line}`));
}
