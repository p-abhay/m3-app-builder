import type { ComponentStyle, ScreenNode, UserAction } from "../../ast/types.ts";
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

const AUTO_MIRRORED_ICONS: Record<string, string> = {
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
};

const ICON_ALIASES: Record<string, string> = {
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
  }

  if (style.margin) {
    const { top, right, bottom, left } = style.margin;
    if (top || right || bottom || left) {
      parts.push(`.padding(start = ${left}.dp, top = ${top}.dp, end = ${right}.dp, bottom = ${bottom}.dp)`);
    }
  }

  if (!options.inRowScope && style.width === "fill") parts.push(".fillMaxWidth()");
  else if (typeof style.width === "number") parts.push(`.width(${style.width}.dp)`);

  if (style.height === "fill") parts.push(".fillMaxHeight()");
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

/** Emit a Kotlin action statement list for a `UserAction` inside callbacks (`onClick`). */
export function actionStatements(
  action: UserAction | undefined,
  routeMap: Map<string, string>,
  onBrokenNav?: (targetScreenId: string) => void,
): string[] {
  if (!action || action.type === "none") return [];
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
    case "toggleState":
      return [`onShowSnackbar("State toggled")`];
  }
}

/** Prefix every line of a multiline block cleanly for deterministic Kotlin formatting. */
export function indentLines(lines: string[], spaces: number): string[] {
  const pad = " ".repeat(spaces);
  return lines.map((line) => (line.length === 0 ? "" : `${pad}${line}`));
}
