import type { ComponentNode, NodeOfType, ScreenNode } from "../../ast/types.ts";
import type { ComposeDiagnostic, GeneratedKotlinFile } from "./types.ts";
import {
  actionStatements,
  buildModifierExpr,
  colorTokenExpr,
  indentLines,
  kotlinFloat,
  kotlinString,
  toCamelCase,
  toMaterialIconRef,
} from "./utils.ts";

interface ScreenGenContext {
  screen: ScreenNode;
  routeMap: Map<string, string>;
  m3Expressive: boolean;
  stateDecls: string[];
  stateCounter: Record<string, number>;
  diagnostics: ComposeDiagnostic[];
  needsExperimentalLayout: boolean;
}

function nextStateVar(ctx: ScreenGenContext, base: string): string {
  const count = (ctx.stateCounter[base] ?? 0) + 1;
  ctx.stateCounter[base] = count;
  return count === 1 ? base : `${base}${count}`;
}

function recordBrokenNav(ctx: ScreenGenContext, nodeId: string, targetScreenId: string): void {
  ctx.diagnostics.push({
    severity: "warning",
    screenId: ctx.screen.id,
    nodeId,
    message: `Screen "${ctx.screen.name}" links to missing target screen "${targetScreenId}".`,
  });
}

function emitActionLambda(ctx: ScreenGenContext, node: ComponentNode): string {
  const stmts = actionStatements(node.action, ctx.routeMap, (target) =>
    recordBrokenNav(ctx, node.id, target),
  );
  if (stmts.length === 0) return "{}";
  return `{ ${stmts.join("; ")} }`;
}

function emitColumnOrRowChildren(ctx: ScreenGenContext, node: ComponentNode): string[] {
  const out: string[] = [];
  for (const childId of node.childIds) {
    out.push(...emitNode(ctx, childId));
  }
  return out;
}

function hAlignExpr(align: "start" | "center" | "end"): string {
  if (align === "center") return "Alignment.CenterHorizontally";
  if (align === "end") return "Alignment.End";
  return "Alignment.Start";
}

function vAlignExpr(align: "top" | "center" | "bottom"): string {
  if (align === "center") return "Alignment.CenterVertically";
  if (align === "bottom") return "Alignment.Bottom";
  return "Alignment.Top";
}

function hArrExpr(arr: "start" | "center" | "end" | "spaceBetween", gap: number): string {
  if (arr === "center") return `Arrangement.spacedBy(${gap}.dp, Alignment.CenterHorizontally)`;
  if (arr === "end") return `Arrangement.spacedBy(${gap}.dp, Alignment.End)`;
  if (arr === "spaceBetween") return "Arrangement.SpaceBetween";
  return `Arrangement.spacedBy(${gap}.dp)`;
}

function vArrExpr(arr: "top" | "center" | "bottom" | "spaceBetween", gap: number): string {
  if (arr === "center") return `Arrangement.spacedBy(${gap}.dp, Alignment.CenterVertically)`;
  if (arr === "bottom") return `Arrangement.spacedBy(${gap}.dp, Alignment.Bottom)`;
  if (arr === "spaceBetween") return "Arrangement.SpaceBetween";
  return `Arrangement.spacedBy(${gap}.dp)`;
}

function boxAlignExpr(align: NodeOfType<"Box">["props"]["contentAlignment"]): string {
  const table: Record<NodeOfType<"Box">["props"]["contentAlignment"], string> = {
    topStart: "Alignment.TopStart",
    topEnd: "Alignment.TopEnd",
    center: "Alignment.Center",
    bottomStart: "Alignment.BottomStart",
    bottomEnd: "Alignment.BottomEnd",
  };
  return table[align] ?? "Alignment.TopStart";
}

function emitTopAppBar(ctx: ScreenGenContext, node: NodeOfType<"TopAppBar">): string[] {
  const fnMap: Record<NodeOfType<"TopAppBar">["props"]["variant"], string> = {
    small: "TopAppBar",
    centerAligned: "CenterAlignedTopAppBar",
    medium: "MediumTopAppBar",
    large: "LargeTopAppBar",
  };
  const fn = fnMap[node.props.variant];
  const lines: string[] = [
    `${fn}(`,
    "    title = {",
    ...(node.props.subtitle
      ? [
          "        Column {",
          `            Text(${kotlinString(node.props.title)}, style = MaterialTheme.typography.titleLarge)`,
          `            Text(${kotlinString(node.props.subtitle)}, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)`,
          "        }",
        ]
      : [`        Text(${kotlinString(node.props.title)})`]),
    "    },",
  ];

  if (node.props.navigationIcon) {
    const navStmts = actionStatements(node.props.navigationAction, ctx.routeMap, (t) =>
      recordBrokenNav(ctx, node.id, t),
    );
    const navBody = navStmts.length ? navStmts.join("; ") : "";
    lines.push(
      "    navigationIcon = {",
      `        IconButton(onClick = { ${navBody} }) {`,
      `            Icon(${toMaterialIconRef(node.props.navigationIcon)}, contentDescription = "Navigation")`,
      "        }",
      "    },",
    );
  }

  if (node.props.actions.length > 0) {
    lines.push("    actions = {");
    for (const act of node.props.actions) {
      const actStmts = actionStatements(act.action, ctx.routeMap, (t) =>
        recordBrokenNav(ctx, node.id, t),
      );
      lines.push(
        `        IconButton(onClick = { ${actStmts.join("; ")} }) {`,
        `            Icon(${toMaterialIconRef(act.icon)}, contentDescription = ${kotlinString(act.label)})`,
        "        }",
      );
    }
    lines.push("    },");
  }

  lines.push(")");
  return lines;
}

function emitFab(ctx: ScreenGenContext, node: NodeOfType<"FloatingActionButton">): string[] {
  const onClick = emitActionLambda(ctx, node);
  const colorArg = `containerColor = ${colorTokenExpr(node.props.colorRole)}`;
  const iconCall = `Icon(${toMaterialIconRef(node.props.icon)}, contentDescription = ${kotlinString(node.props.label || "Action")})`;

  if (node.props.variant === "extended") {
    return [
      "ExtendedFloatingActionButton(",
      `    onClick = ${onClick},`,
      `    ${colorArg},`,
      `    icon = { ${iconCall} },`,
      `    text = { Text(${kotlinString(node.props.label || "Action")}) },`,
      ")",
    ];
  }

  const fnMap = {
    standard: "FloatingActionButton",
    small: "SmallFloatingActionButton",
    large: "LargeFloatingActionButton",
  } as const;
  return [
    `${fnMap[node.props.variant]}(onClick = ${onClick}, ${colorArg}) {`,
    `    ${iconCall}`,
    "}",
  ];
}

function emitButton(ctx: ScreenGenContext, node: NodeOfType<"Button">): string[] {
  const fnMap: Record<NodeOfType<"Button">["props"]["variant"], string> = {
    filled: "Button",
    tonal: "FilledTonalButton",
    elevated: "ElevatedButton",
    outlined: "OutlinedButton",
    text: "TextButton",
  };
  const mod = buildModifierExpr(node.style);
  const fn = fnMap[node.props.variant];
  return [
    `${fn}(`,
    `    onClick = ${emitActionLambda(ctx, node)},`,
    `    modifier = ${mod},`,
    `    enabled = ${node.props.enabled ? "true" : "false"},`,
    ") {",
    ...(node.props.icon
      ? [
          `    Icon(${toMaterialIconRef(node.props.icon)}, contentDescription = null, modifier = Modifier.size(18.dp))`,
          "    Spacer(Modifier.width(8.dp))",
        ]
      : []),
    `    Text(${kotlinString(node.props.label)})`,
    "}",
  ];
}

function emitInputControl(ctx: ScreenGenContext, node: ComponentNode): string[] {
  const mod = buildModifierExpr(node.style);
  switch (node.type) {
    case "IconButton": {
      const fnMap: Record<NodeOfType<"IconButton">["props"]["variant"], string> = {
        standard: "IconButton",
        filled: "FilledIconButton",
        tonal: "FilledTonalIconButton",
        outlined: "OutlinedIconButton",
      };
      if (node.props.toggleable) {
        const varName = nextStateVar(ctx, toCamelCase(node.name || "iconSelected"));
        ctx.stateDecls.push(`var ${varName} by remember { mutableStateOf(false) }`);
        const extra = actionStatements(node.action, ctx.routeMap, (t) =>
          recordBrokenNav(ctx, node.id, t),
        );
        const toggleStmt = `${varName} = !${varName}${extra.length ? `; ${extra.join("; ")}` : ""}`;
        const activeIcon = toMaterialIconRef(node.props.selectedIcon || node.props.icon);
        const idleIcon = toMaterialIconRef(node.props.icon);
        return [
          `${fnMap[node.props.variant]}(onClick = { ${toggleStmt} }, modifier = ${mod}) {`,
          `    Icon(if (${varName}) ${activeIcon} else ${idleIcon}, contentDescription = null)`,
          "}",
        ];
      }
      return [
        `${fnMap[node.props.variant]}(onClick = ${emitActionLambda(ctx, node)}, modifier = ${mod}) {`,
        `    Icon(${toMaterialIconRef(node.props.icon)}, contentDescription = null)`,
        "}",
      ];
    }
    case "TextField": {
      const varName = nextStateVar(ctx, toCamelCase(node.props.label || "fieldText"));
      ctx.stateDecls.push(`var ${varName} by remember { mutableStateOf(${kotlinString(node.props.value)}) }`);
      const fn = node.props.variant === "outlined" ? "OutlinedTextField" : "TextField";
      const lines = [
        `${fn}(`,
        `    value = ${varName},`,
        `    onValueChange = { ${varName} = it },`,
        `    modifier = ${mod},`,
        `    label = { Text(${kotlinString(node.props.label)}) },`,
        `    placeholder = { Text(${kotlinString(node.props.placeholder)}) },`,
      ];
      if (node.props.leadingIcon) {
        lines.push(`    leadingIcon = { Icon(${toMaterialIconRef(node.props.leadingIcon)}, contentDescription = null) },`);
      }
      if (node.props.trailingIcon) {
        lines.push(`    trailingIcon = { Icon(${toMaterialIconRef(node.props.trailingIcon)}, contentDescription = null) },`);
      }
      if (node.props.supportingText) {
        lines.push(`    supportingText = { Text(${kotlinString(node.props.supportingText)}) },`);
      }
      lines.push(")");
      return lines;
    }
    case "Switch": {
      const varName = nextStateVar(ctx, toCamelCase(node.props.label || "switchChecked"));
      ctx.stateDecls.push(`var ${varName} by remember { mutableStateOf(${node.props.checked ? "true" : "false"}) }`);
      return [
        `Row(modifier = ${mod}, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {`,
        `    Text(${kotlinString(node.props.label)}, style = MaterialTheme.typography.bodyLarge)`,
        `    Switch(checked = ${varName}, onCheckedChange = { ${varName} = it })`,
        "}",
      ];
    }
    case "Checkbox": {
      const varName = nextStateVar(ctx, toCamelCase(node.props.label || "checkboxChecked"));
      ctx.stateDecls.push(`var ${varName} by remember { mutableStateOf(${node.props.checked ? "true" : "false"}) }`);
      return [
        `Row(modifier = ${mod}, verticalAlignment = Alignment.CenterVertically) {`,
        `    Checkbox(checked = ${varName}, onCheckedChange = { ${varName} = it })`,
        `    Spacer(Modifier.width(8.dp))`,
        `    Text(${kotlinString(node.props.label)}, style = MaterialTheme.typography.bodyMedium)`,
        "}",
      ];
    }
    case "Slider": {
      const varName = nextStateVar(ctx, toCamelCase(node.props.label || "sliderValue"));
      ctx.stateDecls.push(`var ${varName} by remember { mutableStateOf(${kotlinFloat(node.props.value)}) }`);
      return [
        `Column(modifier = ${mod}) {`,
        `    Text(${kotlinString(node.props.label)}, style = MaterialTheme.typography.labelLarge)`,
        `    Slider(value = ${varName}, onValueChange = { ${varName} = it }, valueRange = ${kotlinFloat(node.props.min)}..${kotlinFloat(node.props.max)})`,
        "}",
      ];
    }
    case "Chip": {
      const varName = nextStateVar(ctx, toCamelCase(node.props.label || "chipSelected"));
      if (node.props.variant === "filter") {
        ctx.stateDecls.push(`var ${varName} by remember { mutableStateOf(${node.props.selected ? "true" : "false"}) }`);
        return [
          "FilterChip(",
          `    selected = ${varName},`,
          `    onClick = { ${varName} = !${varName} },`,
          `    modifier = ${mod},`,
          `    label = { Text(${kotlinString(node.props.label)}) },`,
          ...(node.props.icon
            ? [`    leadingIcon = { Icon(${toMaterialIconRef(node.props.icon)}, contentDescription = null) },`]
            : []),
          ")",
        ];
      }
      const chipFn =
        node.props.variant === "input"
          ? "InputChip"
          : node.props.variant === "suggestion"
            ? "SuggestionChip"
            : "AssistChip";
      if (chipFn === "InputChip") {
        return [
          `InputChip(selected = ${node.props.selected ? "true" : "false"}, onClick = ${emitActionLambda(ctx, node)}, modifier = ${mod}, label = { Text(${kotlinString(node.props.label)}) })`,
        ];
      }
      return [
        `${chipFn}(onClick = ${emitActionLambda(ctx, node)}, modifier = ${mod}, label = { Text(${kotlinString(node.props.label)}) })`,
      ];
    }
    default:
      return [];
  }
}

function emitListItem(ctx: ScreenGenContext, node: NodeOfType<"ListItem">): string[] {
  const mod = buildModifierExpr(node.style, {
    extra:
      node.action && node.action.type !== "none"
        ? [`.clickable ${emitActionLambda(ctx, node)}`]
        : undefined,
  });
  const lines = [
    `ListItem(`,
    `    modifier = ${mod},`,
    `    headlineContent = { Text(${kotlinString(node.props.headline)}) },`,
  ];
  if (node.props.supportingText) {
    lines.push(`    supportingContent = { Text(${kotlinString(node.props.supportingText)}) },`);
  }
  if (node.props.overlineText) {
    lines.push(`    overlineContent = { Text(${kotlinString(node.props.overlineText)}) },`);
  }
  if (node.props.leadingStyle !== "none" && node.props.leadingIcon) {
    const iconExpr = `Icon(${toMaterialIconRef(node.props.leadingIcon)}, contentDescription = null)`;
    lines.push(
      node.props.leadingStyle === "avatar"
        ? `    leadingContent = { Surface(shape = CircleShape, color = MaterialTheme.colorScheme.secondaryContainer, modifier = Modifier.size(40.dp)) { Box(contentAlignment = Alignment.Center) { ${iconExpr} } } },`
        : `    leadingContent = { ${iconExpr} },`,
    );
  }
  if (node.props.trailingType === "icon" && node.props.trailingIcon) {
    lines.push(`    trailingContent = { Icon(${toMaterialIconRef(node.props.trailingIcon)}, contentDescription = null) },`);
  } else if (node.props.trailingType === "switch") {
    const v = nextStateVar(ctx, toCamelCase(node.props.headline || "itemSwitch"));
    ctx.stateDecls.push(`var ${v} by remember { mutableStateOf(${node.props.checked ? "true" : "false"}) }`);
    lines.push(`    trailingContent = { Switch(checked = ${v}, onCheckedChange = { ${v} = it }) },`);
  } else if (node.props.trailingType === "checkbox") {
    const v = nextStateVar(ctx, toCamelCase(node.props.headline || "itemChecked"));
    ctx.stateDecls.push(`var ${v} by remember { mutableStateOf(${node.props.checked ? "true" : "false"}) }`);
    lines.push(`    trailingContent = { Checkbox(checked = ${v}, onCheckedChange = { ${v} = it }) },`);
  }
  lines.push(")");
  return lines;
}

function emitProgressOrLoader(ctx: ScreenGenContext, node: ComponentNode): string[] {
  const mod = buildModifierExpr(node.style);
  if (node.type === "LoadingIndicator") {
    if (ctx.m3Expressive) {
      return node.props.contained
        ? [`ContainedLoadingIndicator(modifier = Modifier.size(${node.props.size}.dp))`]
        : [`LoadingIndicator(modifier = Modifier.size(${node.props.size}.dp))`];
    }
    return [
      "// Hybrid Stable M3 fallback (enable M3 Expressive toggle for morphing loader)",
      node.props.contained
        ? `Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.size(${node.props.size}.dp)) { Box(contentAlignment = Alignment.Center) { CircularProgressIndicator(modifier = Modifier.size(${Math.round(node.props.size * 0.55)}.dp)) } }`
        : `CircularProgressIndicator(modifier = Modifier.size(${node.props.size}.dp))`,
    ];
  }

  if (node.type === "ProgressBar") {
    const valArg = node.props.determinate ? `progress = { ${kotlinFloat(node.props.value)} }, ` : "";
    if (ctx.m3Expressive && node.props.wavy) {
      const fn = node.props.variant === "circular" ? "CircularWavyProgressIndicator" : "LinearWavyProgressIndicator";
      return [`${fn}(${valArg}modifier = ${mod})`];
    }
    const comment = node.props.wavy ? ["// Hybrid Stable M3 fallback for wavy ProgressBar"] : [];
    const fn = node.props.variant === "circular" ? "CircularProgressIndicator" : "LinearProgressIndicator";
    return [...comment, `${fn}(${valArg}modifier = ${mod})`];
  }
  return [];
}

function emitNode(ctx: ScreenGenContext, nodeId: string): string[] {
  const node = ctx.screen.nodes[nodeId];
  if (!node) return [];

  switch (node.type) {
    case "TopAppBar":
      return emitTopAppBar(ctx, node);
    case "FloatingActionButton":
      return emitFab(ctx, node);
    case "Column": {
      const gap = node.props.connected ? Math.min(node.props.gap, 3) : node.props.gap;
      const extra: string[] = [];
      if (node.props.scrollable) extra.push(".verticalScroll(rememberScrollState())");
      const mod = buildModifierExpr(node.style, { extra });
      const children = emitColumnOrRowChildren(ctx, node);
      return [
        ...(node.props.connected ? ["// Connected M3 group container"] : []),
        `Column(modifier = ${mod}, verticalArrangement = ${vArrExpr(node.props.verticalArrangement, gap)}, horizontalAlignment = ${hAlignExpr(node.props.horizontalAlignment)}) {`,
        ...indentLines(children, 4),
        "}",
      ];
    }
    case "Row": {
      const gap = node.props.connected ? Math.min(node.props.gap, 3) : node.props.gap;
      const mod = buildModifierExpr(node.style);
      const children = emitColumnOrRowChildren(ctx, node);
      const fn = node.props.wrap ? "FlowRow" : "Row";
      if (node.props.wrap) ctx.needsExperimentalLayout = true;
      return [
        ...(node.props.connected ? ["// Connected M3 action group"] : []),
        `${fn}(modifier = ${mod}, horizontalArrangement = ${hArrExpr(node.props.horizontalArrangement, gap)}, verticalAlignment = ${vAlignExpr(node.props.verticalAlignment)}) {`,
        ...indentLines(children, 4),
        "}",
      ];
    }
    case "Box": {
      const mod = buildModifierExpr(node.style);
      const children = emitColumnOrRowChildren(ctx, node);
      return [
        `Box(modifier = ${mod}, contentAlignment = ${boxAlignExpr(node.props.contentAlignment)}) {`,
        ...indentLines(children, 4),
        "}",
      ];
    }
    case "Card": {
      const cardFn =
        node.props.variant === "elevated"
          ? "ElevatedCard"
          : node.props.variant === "outlined"
            ? "OutlinedCard"
            : "Card";
      const mod = buildModifierExpr({ ...node.style, padding: undefined }, { skipBackground: true });
      const innerPad = node.style.padding;
      const padMod = innerPad
        ? `Modifier.padding(start = ${innerPad.left}.dp, top = ${innerPad.top}.dp, end = ${innerPad.right}.dp, bottom = ${innerPad.bottom}.dp)`
        : "Modifier.padding(16.dp)";
      const args = [`modifier = ${mod}`];
      if (node.style.backgroundToken && node.style.backgroundToken !== "transparent") {
        args.push(`colors = CardDefaults.cardColors(containerColor = ${colorTokenExpr(node.style.backgroundToken)})`);
      }
      if (node.action && node.action.type !== "none") {
        args.push(`onClick = ${emitActionLambda(ctx, node)}`);
      }
      const children = emitColumnOrRowChildren(ctx, node);
      return [
        `${cardFn}(${args.join(", ")}) {`,
        `    Column(modifier = ${padMod}, verticalArrangement = Arrangement.spacedBy(${node.props.gap}.dp)) {`,
        ...indentLines(children, 8),
        "    }",
        "}",
      ];
    }
    case "Text": {
      const alignMap = { left: "TextAlign.Start", center: "TextAlign.Center", right: "TextAlign.End" };
      const maxLinesArg = node.props.maxLines ? `, maxLines = ${node.props.maxLines}` : "";
      const mod = buildModifierExpr(node.style);
      return [
        `Text(text = ${kotlinString(node.props.text)}, modifier = ${mod}, style = MaterialTheme.typography.${node.props.role}, color = ${colorTokenExpr(node.props.colorToken)}, textAlign = ${alignMap[node.props.align]}${maxLinesArg})`,
      ];
    }
    case "Icon":
      return [
        `Icon(${toMaterialIconRef(node.props.name)}, contentDescription = null, modifier = Modifier.size(${node.props.size}.dp), tint = ${colorTokenExpr(node.props.colorToken)})`,
      ];
    case "Image": {
      const shapeMod =
        node.props.shape === "circle"
          ? ".clip(CircleShape)"
          : node.props.shape === "rounded"
            ? ".clip(MaterialTheme.shapes.medium)"
            : "";
      const ratio =
        node.props.aspectRatio === "16:9"
          ? ".aspectRatio(16f / 9f)"
          : node.props.aspectRatio === "4:3"
            ? ".aspectRatio(4f / 3f)"
            : node.props.aspectRatio === "1:1"
              ? ".aspectRatio(1f)"
              : "";
      const mod = buildModifierExpr(node.style, {
        extra: [ratio, shapeMod, `.background(MaterialTheme.colorScheme.surfaceVariant)`].filter(Boolean),
      });
      return [
        `// Async image source: ${node.props.src} (wire Coil AsyncImage for network loading)`,
        `Box(modifier = ${mod}, contentAlignment = Alignment.Center) {`,
        `    Icon(Icons.Rounded.Image, contentDescription = ${kotlinString(node.props.alt)}, tint = MaterialTheme.colorScheme.onSurfaceVariant)`,
        "}",
      ];
    }
    case "Spacer":
      return [`Spacer(modifier = Modifier.size(${node.props.size}.dp))`];
    case "Divider": {
      const insetMod = node.props.inset ? "Modifier.padding(horizontal = 16.dp)" : "Modifier";
      return [`HorizontalDivider(modifier = ${insetMod}, thickness = ${node.props.thickness}.dp)`];
    }
    case "Badge": {
      const bg = colorTokenExpr(node.props.colorRole);
      return [`Badge(containerColor = ${bg}) { Text(${kotlinString(node.props.label)}) }`];
    }
    case "Button":
      return emitButton(ctx, node);
    case "IconButton":
    case "TextField":
    case "Switch":
    case "Checkbox":
    case "Slider":
    case "Chip":
      return emitInputControl(ctx, node);
    case "ListItem":
      return emitListItem(ctx, node);
    case "LoadingIndicator":
    case "ProgressBar":
      return emitProgressOrLoader(ctx, node);
  }
}

/** Generate a standalone Jetpack Compose `@Composable` screen file for one `ScreenNode`. */
export function generateScreenFile(
  pkg: string,
  screen: ScreenNode,
  composableName: string,
  routeMap: Map<string, string>,
  m3Expressive: boolean,
  diagnostics: ComposeDiagnostic[],
): GeneratedKotlinFile {
  const ctx: ScreenGenContext = {
    screen,
    routeMap,
    m3Expressive,
    stateDecls: [],
    stateCounter: {},
    diagnostics,
    needsExperimentalLayout: false,
  };

  const bodyNode = screen.nodes[screen.slots.bodyId];
  const bodyChildren = bodyNode ? emitColumnOrRowChildren(ctx, bodyNode) : [];
  const topBarLines = screen.slots.topBarId ? emitNode(ctx, screen.slots.topBarId) : [];
  const fabLines = screen.slots.fabId ? emitNode(ctx, screen.slots.fabId) : [];

  const bodyGap = bodyNode?.type === "Column" ? bodyNode.props.gap : 12;
  const bodyBg = screen.backgroundToken
    ? `.background(${colorTokenExpr(screen.backgroundToken)})`
    : "";

  const optIns = [
    "ExperimentalMaterial3Api::class",
    ...(m3Expressive ? ["ExperimentalMaterial3ExpressiveApi::class"] : []),
    ...(ctx.needsExperimentalLayout ? ["ExperimentalLayoutApi::class"] : []),
  ];

  const lines: string[] = [
    `package ${pkg}.ui.screens`,
    "",
    "import androidx.compose.foundation.background",
    "import androidx.compose.foundation.clickable",
    "import androidx.compose.foundation.layout.*",
    "import androidx.compose.foundation.rememberScrollState",
    "import androidx.compose.foundation.shape.CircleShape",
    "import androidx.compose.foundation.shape.RoundedCornerShape",
    "import androidx.compose.foundation.verticalScroll",
    "import androidx.compose.material.icons.Icons",
    "import androidx.compose.material.icons.rounded.*",
    "import androidx.compose.material3.*",
    "import androidx.compose.runtime.*",
    "import androidx.compose.ui.Alignment",
    "import androidx.compose.ui.Modifier",
    "import androidx.compose.ui.draw.clip",
    "import androidx.compose.ui.graphics.Color",
    "import androidx.compose.ui.platform.LocalUriHandler",
    "import androidx.compose.ui.text.style.TextAlign",
    "import androidx.compose.ui.unit.dp",
    "",
    `@OptIn(${optIns.join(", ")})`,
    "@Composable",
    `fun ${composableName}(`,
    "    onNavigate: (String) -> Unit = {},",
    "    onNavigateBack: () -> Unit = {},",
    "    onShowSnackbar: (String) -> Unit = {},",
    "    bottomBar: @Composable () -> Unit = {},",
    "    snackbarHost: @Composable () -> Unit = {},",
    ") {",
    "    val uriHandler = LocalUriHandler.current",
    ...indentLines(ctx.stateDecls, 4),
    ...(ctx.stateDecls.length > 0 ? [""] : []),
    "    Scaffold(",
    ...(topBarLines.length > 0
      ? ["        topBar = {", ...indentLines(topBarLines, 12), "        },"]
      : []),
    ...(fabLines.length > 0
      ? ["        floatingActionButton = {", ...indentLines(fabLines, 12), "        },"]
      : []),
    "        bottomBar = bottomBar,",
    "        snackbarHost = snackbarHost,",
    "    ) { innerPadding ->",
    `        Column(`,
    `            modifier = Modifier`,
    "                .fillMaxSize()",
    "                .padding(innerPadding)",
    ...(bodyBg ? [`                ${bodyBg}`] : []),
    "                .verticalScroll(rememberScrollState())",
    "                .padding(16.dp),",
    `            verticalArrangement = Arrangement.spacedBy(${bodyGap}.dp),`,
    "        ) {",
    ...indentLines(bodyChildren, 12),
    "        }",
    "    }",
    "}",
    "",
  ];

  const pkgPath = pkg.replace(/\./g, "/");
  const shortName = `${composableName}.kt`;
  return {
    path: `app/src/main/java/${pkgPath}/ui/screens/${shortName}`,
    shortName,
    category: "screen",
    content: lines.join("\n"),
  };
}
