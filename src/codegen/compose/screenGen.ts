import {
  OVERLAY_TYPES,
  type AppStateConfig,
  type ComponentNode,
  type NodeOfType,
  type ScreenNode,
} from "../../ast/types.ts";
import type { ComposeDiagnostic, GeneratedKotlinFile } from "./types.ts";
import {
  actionStatements,
  buildModifierExpr,
  colorTokenExpr,
  indentLines,
  kotlinFloat,
  kotlinString,
  kotlinTemplateString,
  toCamelCase,
  toMaterialIconRef,
  toPascalCase,
  visibilityConditionExpr,
  type ActionContextOptions,
  type ModifierOptions,
} from "./utils.ts";

interface ScreenGenContext {
  screen: ScreenNode;
  routeMap: Map<string, string>;
  m3Expressive: boolean;
  hasAppState: boolean;
  appStateConfig?: AppStateConfig;
  variableDefaults: Map<string, string | boolean | number>;
  variableTypes: Map<string, "string" | "boolean" | "number">;
  collectionFieldTypes: Map<string, Map<string, "string" | "boolean" | "number">>;
  overlayIds: Set<string>;
  overlayBlocks: string[][];
  hasOverlayState: boolean;
  stateDecls: string[];
  stateCounter: Record<string, number>;
  diagnostics: ComposeDiagnostic[];
  needsExperimentalLayout: boolean;
  needsLazyList: boolean;
  needsSelection: boolean;
  reportedNestedScrollWarning: boolean;
}

interface ChildScope {
  parentKind: "column" | "row" | "flowRow" | "box";
  hasVerticalScrollAncestor: boolean;
  inItemScope: boolean;
  itemCollectionKey?: string;
  flowVerticalAlign?: "top" | "center" | "bottom";
}

function childModOpts(scope: ChildScope, extraOpts: ModifierOptions = {}): ModifierOptions {
  return {
    inRowScope: scope.parentKind === "row",
    inColumnScope: scope.parentKind === "column",
    inBoxScope: scope.parentKind === "box",
    alignInFlowRow: scope.parentKind === "flowRow" ? scope.flowVerticalAlign : undefined,
    ...extraOpts,
  };
}

function actionOpts(ctx: ScreenGenContext, scope: ChildScope): ActionContextOptions {
  return {
    hasAppState: ctx.hasAppState,
    inItemScope: scope.inItemScope,
    variableDefaults: ctx.variableDefaults,
    variableTypes: ctx.variableTypes,
    collectionFieldTypes: ctx.collectionFieldTypes,
    overlayIds: ctx.overlayIds,
    onBrokenOverlay: (targetNodeId) =>
      ctx.diagnostics.push({
        severity: "warning",
        screenId: ctx.screen.id,
        message: `Screen "${ctx.screen.name}" opens missing overlay node "${targetNodeId}".`,
      }),
  };
}

function nextStateVar(ctx: ScreenGenContext, base: string): string {
  const count = (ctx.stateCounter[base] ?? 0) + 1;
  ctx.stateCounter[base] = count;
  return count === 1 ? base : `${base}${count}`;
}

function resolveBoundState(
  ctx: ScreenGenContext,
  node: ComponentNode,
  fallbackBase: string,
  initialKotlinExpr: string,
): { valueExpr: string; assignExpr: (rhs: string) => string } {
  const sKey = node.bindings?.stateKey;
  if (ctx.hasAppState && sKey && ctx.appStateConfig?.variables.some((v) => v.key === sKey)) {
    const prop = `appState.${toCamelCase(sKey, "stateVar")}`;
    return {
      valueExpr: prop,
      assignExpr: (rhs: string) => `${prop} = ${rhs}; appState.notifyChanged()`,
    };
  }
  const localVar = nextStateVar(ctx, fallbackBase);
  ctx.stateDecls.push(`var ${localVar} by remember { mutableStateOf(${initialKotlinExpr}) }`);
  return {
    valueExpr: localVar,
    assignExpr: (rhs: string) => `${localVar} = ${rhs}`,
  };
}

function recordBrokenNav(ctx: ScreenGenContext, nodeId: string, targetScreenId: string): void {
  ctx.diagnostics.push({
    severity: "warning",
    screenId: ctx.screen.id,
    nodeId,
    message: `Screen "${ctx.screen.name}" links to missing target screen "${targetScreenId}".`,
  });
}

function emitActionBody(ctx: ScreenGenContext, node: ComponentNode, scope: ChildScope): string {
  const stmts = actionStatements(
    node.action,
    ctx.routeMap,
    (target) => recordBrokenNav(ctx, node.id, target),
    actionOpts(ctx, scope),
  );
  return stmts.join("; ");
}

function emitActionLambda(ctx: ScreenGenContext, node: ComponentNode, scope: ChildScope): string {
  const body = emitActionBody(ctx, node, scope);
  return body ? `{ ${body} }` : "{}";
}

function emitContainerChildren(
  ctx: ScreenGenContext,
  node: ComponentNode,
  scope: ChildScope,
): string[] {
  const out: string[] = [];
  for (const childId of node.childIds) {
    out.push(...emitNode(ctx, childId, scope));
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

function emitTopAppBar(
  ctx: ScreenGenContext,
  node: NodeOfType<"TopAppBar">,
  scope: ChildScope,
): string[] {
  const fnMap: Record<NodeOfType<"TopAppBar">["props"]["variant"], string> = {
    small: "TopAppBar",
    centerAligned: "CenterAlignedTopAppBar",
    medium: "MediumTopAppBar",
    large: "LargeTopAppBar",
  };
  const fn = fnMap[node.props.variant];
  const titleExpr = kotlinTemplateString(node.props.title, ctx.hasAppState, scope.inItemScope);
  const subExpr = node.props.subtitle
    ? kotlinTemplateString(node.props.subtitle, ctx.hasAppState, scope.inItemScope)
    : null;

  const lines: string[] = [
    `${fn}(`,
    "    title = {",
    ...(subExpr
      ? [
          "        Column {",
          `            Text(${titleExpr}, style = MaterialTheme.typography.titleLarge)`,
          `            Text(${subExpr}, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)`,
          "        }",
        ]
      : [`        Text(${titleExpr})`]),
    "    },",
  ];

  if (node.props.navigationIcon) {
    const navStmts = actionStatements(
      node.props.navigationAction,
      ctx.routeMap,
      (t) => recordBrokenNav(ctx, node.id, t),
      actionOpts(ctx, scope),
    );
    lines.push(
      "    navigationIcon = {",
      `        IconButton(onClick = { ${navStmts.join("; ")} }) {`,
      `            Icon(${toMaterialIconRef(node.props.navigationIcon)}, contentDescription = "Navigation")`,
      "        }",
      "    },",
    );
  }

  if (node.props.actions.length > 0) {
    lines.push("    actions = {");
    for (const act of node.props.actions) {
      const actStmts = actionStatements(
        act.action,
        ctx.routeMap,
        (t) => recordBrokenNav(ctx, node.id, t),
        actionOpts(ctx, scope),
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

function emitFab(
  ctx: ScreenGenContext,
  node: NodeOfType<"FloatingActionButton">,
  scope: ChildScope,
): string[] {
  const onClick = emitActionLambda(ctx, node, scope);
  const colorArg = `containerColor = ${colorTokenExpr(node.props.colorRole)}`;
  const iconCall = `Icon(${toMaterialIconRef(node.props.icon)}, contentDescription = ${kotlinString(node.props.label || "Action")})`;

  if (node.props.variant === "extended") {
    return [
      "ExtendedFloatingActionButton(",
      `    onClick = ${onClick},`,
      `    ${colorArg},`,
      `    icon = { ${iconCall} },`,
      `    text = { Text(${kotlinTemplateString(node.props.label || "Action", ctx.hasAppState, scope.inItemScope)}) },`,
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

function emitButton(
  ctx: ScreenGenContext,
  node: NodeOfType<"Button">,
  scope: ChildScope,
): string[] {
  const fnMap: Record<NodeOfType<"Button">["props"]["variant"], string> = {
    filled: "Button",
    tonal: "FilledTonalButton",
    elevated: "ElevatedButton",
    outlined: "OutlinedButton",
    text: "TextButton",
  };
  const mod = buildModifierExpr(node.style, childModOpts(scope));
  const fn = fnMap[node.props.variant];
  return [
    `${fn}(`,
    `    onClick = ${emitActionLambda(ctx, node, scope)},`,
    `    modifier = ${mod},`,
    `    enabled = ${node.props.enabled ? "true" : "false"},`,
    ") {",
    ...(node.props.icon
      ? [
          `    Icon(${toMaterialIconRef(node.props.icon)}, contentDescription = null, modifier = Modifier.size(18.dp))`,
          "    Spacer(Modifier.width(8.dp))",
        ]
      : []),
    `    Text(${kotlinTemplateString(node.props.label, ctx.hasAppState, scope.inItemScope)})`,
    "}",
  ];
}

function emitSearchBar(
  ctx: ScreenGenContext,
  node: NodeOfType<"SearchBar">,
  scope: ChildScope,
): string[] {
  const mod = buildModifierExpr(node.style, childModOpts(scope));
  const { valueExpr, assignExpr } = resolveBoundState(
    ctx,
    node,
    toCamelCase("searchQuery"),
    kotlinString(node.props.value),
  );

  const trailingStmts = node.props.trailingAction
    ? actionStatements(
        node.props.trailingAction,
        ctx.routeMap,
        (t) => recordBrokenNav(ctx, node.id, t),
        actionOpts(ctx, scope),
      )
    : [];

  const hasTrailing = node.props.showClearButton || Boolean(node.props.trailingIcon);
  const lines = [
    "OutlinedTextField(",
    `    value = ${valueExpr},`,
    `    onValueChange = { ${assignExpr("it")} },`,
    `    modifier = ${mod},`,
    `    placeholder = { Text(${kotlinString(node.props.placeholder)}) },`,
    "    singleLine = true,",
    "    shape = CircleShape,",
    `    leadingIcon = { Icon(${toMaterialIconRef(node.props.leadingIcon)}, contentDescription = "Search") },`,
  ];

  if (hasTrailing) {
    lines.push("    trailingIcon = {");
    lines.push('        Row(verticalAlignment = Alignment.CenterVertically) {');
    if (node.props.showClearButton) {
      lines.push(
        `            if (${valueExpr}.isNotEmpty()) {`,
        `                IconButton(onClick = { ${assignExpr('""')} }) {`,
        '                    Icon(Icons.Rounded.Close, contentDescription = "Clear")',
        "                }",
        "            }",
      );
    }
    if (node.props.trailingIcon) {
      lines.push(
        `            IconButton(onClick = { ${trailingStmts.join("; ")} }) {`,
        `                Icon(${toMaterialIconRef(node.props.trailingIcon)}, contentDescription = "Action")`,
        "            }",
      );
    }
    lines.push("        }");
    lines.push("    },");
  }

  lines.push(")");
  return lines;
}

function emitSegmentedButton(
  ctx: ScreenGenContext,
  node: NodeOfType<"SegmentedButton">,
  scope: ChildScope,
): string[] {
  const mod = buildModifierExpr(node.style, childModOpts(scope));
  const options = node.props.options.length
    ? node.props.options
    : [{ value: "all", label: "All" }];
  const { valueExpr, assignExpr } = resolveBoundState(
    ctx,
    node,
    toCamelCase(node.name || "segment"),
    kotlinString(node.props.selectedValue || options[0].value),
  );
  const actionExtra = emitActionBody(ctx, node, scope);
  const count = options.length;

  return [
    `SingleChoiceSegmentedButtonRow(modifier = ${mod}) {`,
    ...options.flatMap((opt, idx) => {
      const valLit = kotlinString(opt.value);
      const onClickBody = actionExtra ? `${assignExpr(valLit)}; ${actionExtra}` : assignExpr(valLit);
      return [
        "    SegmentedButton(",
        `        shape = SegmentedButtonDefaults.itemShape(index = ${idx}, count = ${count}),`,
        `        onClick = { ${onClickBody} },`,
        `        selected = ${valueExpr} == ${valLit},`,
        ...(opt.icon
          ? [`        icon = { Icon(${toMaterialIconRef(opt.icon)}, contentDescription = null) },`]
          : []),
        `        label = { Text(${kotlinString(opt.label)}) },`,
        "    )",
      ];
    }),
    "}",
  ];
}

function emitInputControl(
  ctx: ScreenGenContext,
  node: ComponentNode,
  scope: ChildScope,
): string[] {
  const modOpts = childModOpts(scope);
  const mod = buildModifierExpr(node.style, modOpts);
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
        const extra = emitActionBody(ctx, node, scope);
        const toggleStmt = `${varName} = !${varName}${extra ? `; ${extra}` : ""}`;
        const activeIcon = toMaterialIconRef(node.props.selectedIcon || node.props.icon);
        const idleIcon = toMaterialIconRef(node.props.icon);
        return [
          `${fnMap[node.props.variant]}(onClick = { ${toggleStmt} }, modifier = ${mod}) {`,
          `    Icon(if (${varName}) ${activeIcon} else ${idleIcon}, contentDescription = null)`,
          "}",
        ];
      }
      return [
        `${fnMap[node.props.variant]}(onClick = ${emitActionLambda(ctx, node, scope)}, modifier = ${mod}) {`,
        `    Icon(${toMaterialIconRef(node.props.icon)}, contentDescription = null)`,
        "}",
      ];
    }
    case "TextField": {
      const { valueExpr, assignExpr } = resolveBoundState(
        ctx,
        node,
        toCamelCase(node.props.label || "fieldText"),
        kotlinString(node.props.value),
      );
      const fn = node.props.variant === "outlined" ? "OutlinedTextField" : "TextField";
      const lines = [
        `${fn}(`,
        `    value = ${valueExpr},`,
        `    onValueChange = { ${assignExpr("it")} },`,
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
      const { valueExpr, assignExpr } = resolveBoundState(
        ctx,
        node,
        toCamelCase(node.props.label || "switchChecked"),
        node.props.checked ? "true" : "false",
      );
      const itemField = node.bindings?.itemField;
      const checkedExpr =
        scope.inItemScope && itemField ? `item.${toCamelCase(itemField)}` : valueExpr;
      const extraBody = emitActionBody(ctx, node, scope);
      const onChangeBody =
        scope.inItemScope && itemField && extraBody
          ? extraBody
          : `${assignExpr("it")}${extraBody ? `; ${extraBody}` : ""}`;

      const allowAutoFill =
        !node.style.alignSelf || node.style.alignSelf === "auto" || node.style.alignSelf === "stretch";
      const switchStyle =
        scope.parentKind !== "flowRow" &&
        allowAutoFill &&
        (!node.style.width || node.style.width === "wrap")
          ? { ...node.style, width: "fill" as const }
          : node.style;
      const switchMod = buildModifierExpr(switchStyle, modOpts);
      const textMod = scope.parentKind !== "flowRow" ? ", modifier = Modifier.weight(1f)" : "";
      return [
        `Row(modifier = ${switchMod}, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {`,
        `    Text(${kotlinTemplateString(node.props.label, ctx.hasAppState, scope.inItemScope)}, style = MaterialTheme.typography.bodyLarge${textMod})`,
        "    Spacer(Modifier.width(12.dp))",
        `    Switch(checked = ${checkedExpr}, onCheckedChange = { ${onChangeBody} })`,
        "}",
      ];
    }
    case "Checkbox": {
      const itemField = node.bindings?.itemField;
      const { valueExpr, assignExpr } =
        scope.inItemScope && itemField
          ? { valueExpr: `item.${toCamelCase(itemField)}`, assignExpr: () => "" }
          : resolveBoundState(
              ctx,
              node,
              toCamelCase(node.props.label || "checkboxChecked"),
              node.props.checked ? "true" : "false",
            );
      const extraBody = emitActionBody(ctx, node, scope);
      const onChangeBody =
        scope.inItemScope && itemField
          ? extraBody ||
            (ctx.hasAppState && scope.itemCollectionKey
              ? `appState.toggle${toPascalCase(scope.itemCollectionKey, "Items")}Field(id = item.id, field = ${kotlinString(itemField)})`
              : "")
          : `${assignExpr("it")}${extraBody ? `; ${extraBody}` : ""}`;

      return [
        `Row(modifier = ${mod}, verticalAlignment = Alignment.CenterVertically) {`,
        `    Checkbox(checked = ${valueExpr}, onCheckedChange = { ${onChangeBody} })`,
        ...(node.props.label
          ? [
              "    Spacer(Modifier.width(8.dp))",
              `    Text(${kotlinTemplateString(node.props.label, ctx.hasAppState, scope.inItemScope)}, style = MaterialTheme.typography.bodyMedium)`,
            ]
          : []),
        "}",
      ];
    }
    case "Slider": {
      const { valueExpr, assignExpr } = resolveBoundState(
        ctx,
        node,
        toCamelCase(node.props.label || "sliderValue"),
        kotlinFloat(node.props.value),
      );
      return [
        `Column(modifier = ${mod}) {`,
        `    Text(${kotlinString(node.props.label)}, style = MaterialTheme.typography.labelLarge)`,
        `    Slider(value = ${valueExpr}, onValueChange = { ${assignExpr("it")} }, valueRange = ${kotlinFloat(node.props.min)}..${kotlinFloat(node.props.max)})`,
        "}",
      ];
    }
    case "Chip": {
      const { valueExpr, assignExpr } = resolveBoundState(
        ctx,
        node,
        toCamelCase(node.props.label || "chipSelected"),
        node.props.selected ? "true" : "false",
      );
      if (node.props.variant === "filter") {
        const extraBody = emitActionBody(ctx, node, scope);
        const onClickBody = `${assignExpr(`!${valueExpr}`)}${extraBody ? `; ${extraBody}` : ""}`;
        return [
          "FilterChip(",
          `    selected = ${valueExpr},`,
          `    onClick = { ${onClickBody} },`,
          `    modifier = ${mod},`,
          `    label = { Text(${kotlinTemplateString(node.props.label, ctx.hasAppState, scope.inItemScope)}) },`,
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
          `InputChip(selected = ${node.props.selected ? "true" : "false"}, onClick = ${emitActionLambda(ctx, node, scope)}, modifier = ${mod}, label = { Text(${kotlinString(node.props.label)}) })`,
        ];
      }
      return [
        `${chipFn}(onClick = ${emitActionLambda(ctx, node, scope)}, modifier = ${mod}, label = { Text(${kotlinString(node.props.label)}) })`,
      ];
    }
    default:
      return [];
  }
}

function emitListItem(
  ctx: ScreenGenContext,
  node: NodeOfType<"ListItem">,
  scope: ChildScope,
): string[] {
  const mod = buildModifierExpr(
    node.style,
    childModOpts(scope, {
      extra:
        node.action && node.action.type !== "none"
          ? [`.clickable ${emitActionLambda(ctx, node, scope)}`]
          : undefined,
    }),
  );
  const lines = [
    "ListItem(",
    `    modifier = ${mod},`,
    `    headlineContent = { Text(${kotlinTemplateString(node.props.headline, ctx.hasAppState, scope.inItemScope)}) },`,
  ];
  if (node.props.supportingText) {
    lines.push(
      `    supportingContent = { Text(${kotlinTemplateString(node.props.supportingText, ctx.hasAppState, scope.inItemScope)}) },`,
    );
  }
  if (node.props.overlineText) {
    lines.push(
      `    overlineContent = { Text(${kotlinTemplateString(node.props.overlineText, ctx.hasAppState, scope.inItemScope)}) },`,
    );
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

function normalizeProgress(raw: number): number {
  const frac = raw > 0 && raw < 1 ? raw : raw / 100;
  return Math.min(1, Math.max(0, frac));
}

function emitProgressOrLoader(
  ctx: ScreenGenContext,
  node: ComponentNode,
  scope: ChildScope,
): string[] {
  const modOpts = childModOpts(scope);
  if (node.type === "LoadingIndicator") {
    const loaderMod = buildModifierExpr(node.style, {
      ...modOpts,
      extra: [`.size(${node.props.size}.dp)`],
    });
    if (ctx.m3Expressive) {
      return node.props.contained
        ? [`ContainedLoadingIndicator(modifier = ${loaderMod})`]
        : [`LoadingIndicator(modifier = ${loaderMod})`];
    }
    return [
      "// Hybrid Stable M3 fallback (enable M3 Expressive toggle for morphing loader)",
      node.props.contained
        ? `Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer, modifier = ${loaderMod}) { Box(contentAlignment = Alignment.Center) { CircularProgressIndicator(modifier = Modifier.size(${Math.round(node.props.size * 0.55)}.dp)) } }`
        : `CircularProgressIndicator(modifier = ${loaderMod})`,
    ];
  }

  if (node.type === "ProgressBar") {
    const mod = buildModifierExpr(node.style, modOpts);
    const valArg = node.props.determinate
      ? `progress = { ${kotlinFloat(normalizeProgress(node.props.value))} }, `
      : "";
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

function emitDropdownMenu(
  ctx: ScreenGenContext,
  node: NodeOfType<"DropdownMenu">,
  scope: ChildScope,
): string[] {
  const mod = buildModifierExpr(node.style, childModOpts(scope));
  const options = node.props.options.length
    ? node.props.options
    : [{ value: "default", label: "Default" }];
  const { valueExpr, assignExpr } = resolveBoundState(
    ctx,
    node,
    toCamelCase(node.props.label || "dropdownValue"),
    kotlinString(node.props.selectedValue || options[0].value),
  );
  const expVar = nextStateVar(ctx, toCamelCase(node.props.label || "dropdown") + "Expanded");
  ctx.stateDecls.push(`var ${expVar} by remember { mutableStateOf(false) }`);
  const actionExtra = emitActionBody(ctx, node, scope);
  const tfFn = node.props.variant === "filled" ? "TextField" : "OutlinedTextField";

  const itemsLines = options.flatMap((opt) => {
    const valLit = kotlinString(opt.value);
    const clickBody = `${assignExpr(valLit)}; ${expVar} = false${actionExtra ? `; ${actionExtra}` : ""}`;
    return [
      "        DropdownMenuItem(",
      `            text = { Text(${kotlinString(opt.label)}) },`,
      `            onClick = { ${clickBody} },`,
      "        )",
    ];
  });

  return [
    `ExposedDropdownMenuBox(expanded = ${expVar}, onExpandedChange = { ${expVar} = !${expVar} }, modifier = ${mod}) {`,
    `    ${tfFn}(`,
    `        value = ${valueExpr},`,
    "        onValueChange = {},",
    "        readOnly = true,",
    `        label = { Text(${kotlinString(node.props.label)}) },`,
    `        placeholder = { Text(${kotlinString(node.props.placeholder)}) },`,
    `        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = ${expVar}) },`,
    "        modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),",
    "    )",
    `    ExposedDropdownMenu(expanded = ${expVar}, onDismissRequest = { ${expVar} = false }) {`,
    ...itemsLines,
    "    }",
    "}",
  ];
}

function emitRadioGroup(
  ctx: ScreenGenContext,
  node: NodeOfType<"RadioGroup">,
  scope: ChildScope,
): string[] {
  ctx.needsSelection = true;
  const mod = buildModifierExpr(node.style, childModOpts(scope));
  const options = node.props.options.length
    ? node.props.options
    : [{ value: "opt1", label: "Option 1" }];
  const { valueExpr, assignExpr } = resolveBoundState(
    ctx,
    node,
    toCamelCase(node.props.label || "radioChoice"),
    kotlinString(node.props.selectedValue || options[0].value),
  );
  const actionExtra = emitActionBody(ctx, node, scope);

  return [
    `Column(modifier = ${mod}) {`,
    ...(node.props.label
      ? [`    Text(${kotlinString(node.props.label)}, style = MaterialTheme.typography.labelLarge)`]
      : []),
    ...options.flatMap((opt) => {
      const valLit = kotlinString(opt.value);
      const clickBody = actionExtra ? `${assignExpr(valLit)}; ${actionExtra}` : assignExpr(valLit);
      return [
        `    Row(`,
        `        modifier = Modifier.fillMaxWidth().selectable(selected = ${valueExpr} == ${valLit}, onClick = { ${clickBody} }, role = Role.RadioButton).padding(vertical = 4.dp),`,
        "        verticalAlignment = Alignment.CenterVertically,",
        "    ) {",
        `        RadioButton(selected = ${valueExpr} == ${valLit}, onClick = null)`,
        "        Spacer(Modifier.width(8.dp))",
        `        Text(${kotlinString(opt.label)}, style = MaterialTheme.typography.bodyMedium)`,
        "    }",
      ];
    }),
    "}",
  ];
}

function emitTabs(
  ctx: ScreenGenContext,
  node: NodeOfType<"Tabs">,
  scope: ChildScope,
): string[] {
  const mod = buildModifierExpr(node.style, childModOpts(scope));
  const options = node.props.options.length
    ? node.props.options
    : [{ value: "tab1", label: "Tab 1" }];
  const { valueExpr, assignExpr } = resolveBoundState(
    ctx,
    node,
    toCamelCase(node.name || "selectedTab"),
    kotlinString(node.props.selectedValue || options[0].value),
  );
  const actionExtra = emitActionBody(ctx, node, scope);
  const indexExpr = `listOf(${options.map((o) => kotlinString(o.value)).join(", ")}).indexOf(${valueExpr}).coerceAtLeast(0)`;
  const fn = node.props.variant === "secondary" ? "SecondaryTabRow" : "PrimaryTabRow";

  return [
    `${fn}(selectedTabIndex = ${indexExpr}, modifier = ${mod}) {`,
    ...options.flatMap((opt) => {
      const valLit = kotlinString(opt.value);
      const clickBody = actionExtra ? `${assignExpr(valLit)}; ${actionExtra}` : assignExpr(valLit);
      return [
        "    Tab(",
        `        selected = ${valueExpr} == ${valLit},`,
        `        onClick = { ${clickBody} },`,
        ...(opt.icon ? [`        icon = { Icon(${toMaterialIconRef(opt.icon)}, contentDescription = null) },`] : []),
        `        text = { Text(${kotlinString(opt.label)}) },`,
        "    )",
      ];
    }),
    "}",
  ];
}

function registerOverlayBlock(
  ctx: ScreenGenContext,
  node: ComponentNode,
  scope: ChildScope,
): string[] {
  ctx.hasOverlayState = true;
  if (node.type === "AlertDialog") {
    const confirmStmts = actionStatements(
      node.props.confirmAction,
      ctx.routeMap,
      (t) => recordBrokenNav(ctx, node.id, t),
      actionOpts(ctx, scope),
    );
    const bodyStmts =
      confirmStmts.includes("activeOverlayId = null") ||
      confirmStmts.some((s) => s.startsWith("activeOverlayId = "))
        ? confirmStmts
        : [...confirmStmts, "activeOverlayId = null"];
    ctx.overlayBlocks.push([
      `if (activeOverlayId == ${kotlinString(node.id)}) {`,
      "    AlertDialog(",
      "        onDismissRequest = { activeOverlayId = null },",
      ...(node.props.icon
        ? [`        icon = { Icon(${toMaterialIconRef(node.props.icon)}, contentDescription = null) },`]
        : []),
      `        title = { Text(${kotlinTemplateString(node.props.title, ctx.hasAppState, scope.inItemScope)}) },`,
      `        text = { Text(${kotlinTemplateString(node.props.message, ctx.hasAppState, scope.inItemScope)}) },`,
      ...(node.props.dismissLabel
        ? [
            `        dismissButton = { TextButton(onClick = { activeOverlayId = null }) { Text(${kotlinString(node.props.dismissLabel)}) } },`,
          ]
        : []),
      `        confirmButton = { Button(onClick = { ${bodyStmts.join("; ")} }) { Text(${kotlinString(node.props.confirmLabel)}) } },`,
      "    )",
      "}",
    ]);
    return [];
  }

  if (node.type === "ModalBottomSheet") {
    const children = emitContainerChildren(ctx, node, {
      parentKind: "column",
      hasVerticalScrollAncestor: false,
      inItemScope: scope.inItemScope,
      itemCollectionKey: scope.itemCollectionKey,
    });
    ctx.overlayBlocks.push([
      `if (activeOverlayId == ${kotlinString(node.id)}) {`,
      "    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)",
      "    ModalBottomSheet(",
      "        onDismissRequest = { activeOverlayId = null },",
      "        sheetState = sheetState,",
      "    ) {",
      "        Column(",
      "            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),",
      "            verticalArrangement = Arrangement.spacedBy(12.dp),",
      "        ) {",
      ...(node.props.title
        ? [`            Text(${kotlinTemplateString(node.props.title, ctx.hasAppState, scope.inItemScope)}, style = MaterialTheme.typography.titleMedium)`]
        : []),
      ...indentLines(children, 12),
      "        }",
      "    }",
      "}",
    ]);
    return [];
  }
  return [];
}

function emitDataList(
  ctx: ScreenGenContext,
  node: NodeOfType<"DataList">,
  scope: ChildScope,
): string[] {
  const mod = buildModifierExpr(node.style, childModOpts(scope));
  if (!ctx.hasAppState || !node.props.collectionKey) {
    return [
      `OutlinedCard(modifier = ${mod}) {`,
      '    Column(modifier = Modifier.padding(16.dp)) {',
      `        Text(${kotlinString(node.props.emptyTitle)}, style = MaterialTheme.typography.titleMedium)`,
      ...(node.props.emptySubtitle
        ? [`        Text(${kotlinString(node.props.emptySubtitle)}, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)`]
        : []),
      "    }",
      "}",
    ];
  }

  const colKey = node.props.collectionKey;
  const colPascal = toPascalCase(colKey, "Items");
  const listVar = `items_${toCamelCase(node.id, "list")}`;

  const qArg =
    node.props.searchStateKey && ctx.appStateConfig?.variables.some((v) => v.key === node.props.searchStateKey)
      ? `appState.${toCamelCase(node.props.searchStateKey)}`
      : '""';
  const fArg =
    node.props.filterStateKey && ctx.appStateConfig?.variables.some((v) => v.key === node.props.filterStateKey)
      ? `appState.${toCamelCase(node.props.filterStateKey)}`
      : '"all"';
  const sArg =
    node.props.sortStateKey && ctx.appStateConfig?.variables.some((v) => v.key === node.props.sortStateKey)
      ? `appState.${toCamelCase(node.props.sortStateKey)}`
      : '"newest"';

  const itemChildren = emitContainerChildren(ctx, node, {
    parentKind: "column",
    hasVerticalScrollAncestor: scope.hasVerticalScrollAncestor,
    inItemScope: true,
    itemCollectionKey: colKey,
  });

  const useLazyColumn = !scope.hasVerticalScrollAncestor || typeof node.style.height === "number";
  if (useLazyColumn) ctx.needsLazyList = true;

  const emptyBlock = [
    `    OutlinedCard(modifier = ${mod}) {`,
    "        Column(modifier = Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {",
    `            Text(${kotlinString(node.props.emptyTitle)}, style = MaterialTheme.typography.titleMedium)`,
    ...(node.props.emptySubtitle
      ? [`            Text(${kotlinString(node.props.emptySubtitle)}, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)`]
      : []),
    "        }",
    "    }",
  ];

  const loopBlock = useLazyColumn
    ? [
        `    LazyColumn(modifier = ${mod}, verticalArrangement = Arrangement.spacedBy(${node.props.gap}.dp)) {`,
        `        items(${listVar}, key = { it.id }) { item ->`,
        ...indentLines(itemChildren, 12),
        "        }",
        "    }",
      ]
    : [
        `    Column(modifier = ${mod}, verticalArrangement = Arrangement.spacedBy(${node.props.gap}.dp)) {`,
        `        for (item in ${listVar}) {`,
        "            key(item.id) {",
        ...indentLines(itemChildren, 16),
        "            }",
        "        }",
        "    }",
      ];

  return [
    `val ${listVar} = appState.query${colPascal}(searchQuery = ${qArg}, filterValue = ${fArg}, sortBy = ${sArg})`,
    `if (${listVar}.isEmpty()) {`,
    ...emptyBlock,
    "} else {",
    ...loopBlock,
    "}",
  ];
}

function emitNode(ctx: ScreenGenContext, nodeId: string, scope: ChildScope): string[] {
  const node = ctx.screen.nodes[nodeId];
  if (!node) return [];

  if (OVERLAY_TYPES.has(node.type)) {
    return registerOverlayBlock(ctx, node, scope);
  }

  const lines = emitNodeBody(ctx, node, scope);
  const condExpr = ctx.hasAppState
    ? visibilityConditionExpr(node.visibleWhen, ctx.variableTypes)
    : null;
  if (condExpr && lines.length > 0) {
    return [`if (${condExpr}) {`, ...indentLines(lines, 4), "}"];
  }
  return lines;
}

function emitNodeBody(ctx: ScreenGenContext, node: ComponentNode, scope: ChildScope): string[] {
  const modOpts = childModOpts(scope);

  switch (node.type) {
    case "TopAppBar":
      return emitTopAppBar(ctx, node, scope);
    case "FloatingActionButton":
      return emitFab(ctx, node, scope);
    case "SearchBar":
      return emitSearchBar(ctx, node, scope);
    case "SegmentedButton":
      return emitSegmentedButton(ctx, node, scope);
    case "DataList":
      return emitDataList(ctx, node, scope);
    case "DropdownMenu":
      return emitDropdownMenu(ctx, node, scope);
    case "RadioGroup":
      return emitRadioGroup(ctx, node, scope);
    case "Tabs":
      return emitTabs(ctx, node, scope);
    case "AlertDialog":
    case "ModalBottomSheet":
      return [];
    case "Column": {
      const gap = node.props.connected ? Math.min(node.props.gap, 3) : node.props.gap;
      const hasFiniteHeight = typeof node.style.height === "number";
      const shouldScroll =
        node.props.scrollable && (!scope.hasVerticalScrollAncestor || hasFiniteHeight);
      if (node.props.scrollable && scope.hasVerticalScrollAncestor && !hasFiniteHeight) {
        if (!ctx.reportedNestedScrollWarning) {
          ctx.reportedNestedScrollWarning = true;
          ctx.diagnostics.push({
            severity: "info",
            screenId: ctx.screen.id,
            nodeId: node.id,
            message: `Skipped nested verticalScroll() on Column in "${ctx.screen.name}" because the parent screen already scrolls vertically (set an explicit dp height to enable nested scrolling).`,
          });
        }
      }
      const extra: string[] = [];
      if (shouldScroll) extra.push(".verticalScroll(rememberScrollState())");
      if (node.action && node.action.type !== "none") {
        extra.push(`.clickable ${emitActionLambda(ctx, node, scope)}`);
      }
      const mod = buildModifierExpr(node.style, childModOpts(scope, { extra }));
      const children = emitContainerChildren(ctx, node, {
        parentKind: "column",
        hasVerticalScrollAncestor: scope.hasVerticalScrollAncestor || shouldScroll,
        inItemScope: scope.inItemScope,
        itemCollectionKey: scope.itemCollectionKey,
      });
      return [
        ...(node.props.connected ? ["// Connected M3 group container"] : []),
        `Column(modifier = ${mod}, verticalArrangement = ${vArrExpr(node.props.verticalArrangement, gap)}, horizontalAlignment = ${hAlignExpr(node.props.horizontalAlignment)}) {`,
        ...indentLines(children, 4),
        "}",
      ];
    }
    case "Row": {
      const gap = node.props.connected ? Math.min(node.props.gap, 3) : node.props.gap;
      const effectiveStyle =
        node.props.horizontalArrangement === "spaceBetween" &&
        scope.parentKind !== "flowRow" &&
        (!node.style.width || node.style.width === "wrap")
          ? { ...node.style, width: "fill" as const }
          : node.style;
      const mod = buildModifierExpr(effectiveStyle, modOpts);
      if (node.props.wrap) {
        ctx.needsExperimentalLayout = true;
        const children = emitContainerChildren(ctx, node, {
          parentKind: "flowRow",
          hasVerticalScrollAncestor: scope.hasVerticalScrollAncestor,
          inItemScope: scope.inItemScope,
          itemCollectionKey: scope.itemCollectionKey,
          flowVerticalAlign: node.props.verticalAlignment,
        });
        return [
          ...(node.props.connected ? ["// Connected M3 action group"] : []),
          `FlowRow(modifier = ${mod}, horizontalArrangement = ${hArrExpr(node.props.horizontalArrangement, gap)}, verticalArrangement = Arrangement.spacedBy(${gap}.dp)) {`,
          ...indentLines(children, 4),
          "}",
        ];
      }
      const children = emitContainerChildren(ctx, node, {
        parentKind: "row",
        hasVerticalScrollAncestor: scope.hasVerticalScrollAncestor,
        inItemScope: scope.inItemScope,
        itemCollectionKey: scope.itemCollectionKey,
      });
      return [
        ...(node.props.connected ? ["// Connected M3 action group"] : []),
        `Row(modifier = ${mod}, horizontalArrangement = ${hArrExpr(node.props.horizontalArrangement, gap)}, verticalAlignment = ${vAlignExpr(node.props.verticalAlignment)}) {`,
        ...indentLines(children, 4),
        "}",
      ];
    }
    case "Box": {
      const mod = buildModifierExpr(node.style, modOpts);
      const children = emitContainerChildren(ctx, node, {
        parentKind: "box",
        hasVerticalScrollAncestor: scope.hasVerticalScrollAncestor,
        inItemScope: scope.inItemScope,
        itemCollectionKey: scope.itemCollectionKey,
      });
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
      const mod = buildModifierExpr(
        { ...node.style, padding: undefined },
        childModOpts(scope, { skipBackground: true }),
      );
      const innerPad = node.style.padding;
      const padMod = innerPad
        ? `Modifier.padding(start = ${innerPad.left}.dp, top = ${innerPad.top}.dp, end = ${innerPad.right}.dp, bottom = ${innerPad.bottom}.dp)`
        : "Modifier.padding(16.dp)";
      const args = [`modifier = ${mod}`];
      if (node.style.backgroundToken && node.style.backgroundToken !== "transparent") {
        args.push(`colors = CardDefaults.cardColors(containerColor = ${colorTokenExpr(node.style.backgroundToken)})`);
      }
      if (node.action && node.action.type !== "none") {
        args.push(`onClick = ${emitActionLambda(ctx, node, scope)}`);
      }
      const children = emitContainerChildren(ctx, node, {
        parentKind: "column",
        hasVerticalScrollAncestor: scope.hasVerticalScrollAncestor,
        inItemScope: scope.inItemScope,
        itemCollectionKey: scope.itemCollectionKey,
      });
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
      const mod = buildModifierExpr(node.style, modOpts);
      const txtExpr = kotlinTemplateString(node.props.text, ctx.hasAppState, scope.inItemScope);
      return [
        `Text(text = ${txtExpr}, modifier = ${mod}, style = MaterialTheme.typography.${node.props.role}, color = ${colorTokenExpr(node.props.colorToken)}, textAlign = ${alignMap[node.props.align]}${maxLinesArg})`,
      ];
    }
    case "Icon": {
      const iconMod = buildModifierExpr(node.style, {
        ...modOpts,
        extra: [`.size(${node.props.size}.dp)`],
      });
      return [
        `Icon(${toMaterialIconRef(node.props.name)}, contentDescription = null, modifier = ${iconMod}, tint = ${colorTokenExpr(node.props.colorToken)})`,
      ];
    }
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
        ...modOpts,
        extra: [ratio, shapeMod, ".background(MaterialTheme.colorScheme.surfaceVariant)"].filter(Boolean),
      });
      return [
        `// Async image source: ${node.props.src} (wire Coil AsyncImage for network loading)`,
        `Box(modifier = ${mod}, contentAlignment = Alignment.Center) {`,
        `    Icon(Icons.Rounded.Image, contentDescription = ${kotlinString(node.props.alt)}, tint = MaterialTheme.colorScheme.onSurfaceVariant)`,
        "}",
      ];
    }
    case "Spacer": {
      const spacerMod = buildModifierExpr(node.style, {
        ...modOpts,
        extra: [`.size(${node.props.size}.dp)`],
      });
      return [`Spacer(modifier = ${spacerMod})`];
    }
    case "Divider": {
      const dividerMod = buildModifierExpr(node.style, {
        ...modOpts,
        extra: node.props.inset ? [".padding(horizontal = 16.dp)"] : undefined,
      });
      return [`HorizontalDivider(modifier = ${dividerMod}, thickness = ${node.props.thickness}.dp)`];
    }
    case "Badge": {
      const bg = colorTokenExpr(node.props.colorRole);
      const badgeMod = buildModifierExpr(node.style, modOpts);
      const modArg = badgeMod === "Modifier" ? "" : `modifier = ${badgeMod}, `;
      const lblExpr = kotlinTemplateString(node.props.label, ctx.hasAppState, scope.inItemScope);
      return [`Badge(${modArg}containerColor = ${bg}) { Text(${lblExpr}) }`];
    }
    case "Button":
      return emitButton(ctx, node, scope);
    case "IconButton":
    case "TextField":
    case "Switch":
    case "Checkbox":
    case "Slider":
    case "Chip":
      return emitInputControl(ctx, node, scope);
    case "ListItem":
      return emitListItem(ctx, node, scope);
    case "LoadingIndicator":
    case "ProgressBar":
      return emitProgressOrLoader(ctx, node, scope);
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
  appStateConfig?: AppStateConfig,
): GeneratedKotlinFile {
  const hasAppState = Boolean(
    appStateConfig && (appStateConfig.variables.length > 0 || appStateConfig.collections.length > 0),
  );
  const variableDefaults = new Map<string, string | boolean | number>();
  const variableTypes = new Map<string, "string" | "boolean" | "number">();
  for (const v of appStateConfig?.variables ?? []) {
    variableDefaults.set(v.key, v.defaultValue);
    variableTypes.set(v.key, v.type);
  }
  const collectionFieldTypes = new Map<string, Map<string, "string" | "boolean" | "number">>();
  for (const c of appStateConfig?.collections ?? []) {
    const fMap = new Map<string, "string" | "boolean" | "number">();
    for (const f of c.fields) fMap.set(f.key, f.type);
    collectionFieldTypes.set(c.key, fMap);
  }
  const overlayIds = new Set(
    Object.values(screen.nodes)
      .filter((n) => OVERLAY_TYPES.has(n.type))
      .map((n) => n.id),
  );

  const ctx: ScreenGenContext = {
    screen,
    routeMap,
    m3Expressive,
    hasAppState,
    appStateConfig,
    variableDefaults,
    variableTypes,
    collectionFieldTypes,
    overlayIds,
    overlayBlocks: [],
    hasOverlayState: overlayIds.size > 0,
    stateDecls: [],
    stateCounter: {},
    diagnostics,
    needsExperimentalLayout: false,
    needsLazyList: false,
    needsSelection: false,
    reportedNestedScrollWarning: false,
  };

  const bodyNode = screen.nodes[screen.slots.bodyId];
  const rootScope: ChildScope = {
    parentKind: "column",
    hasVerticalScrollAncestor: true,
    inItemScope: false,
  };
  const bodyChildren = bodyNode ? emitContainerChildren(ctx, bodyNode, rootScope) : [];
  const topBarLines = screen.slots.topBarId
    ? emitNode(ctx, screen.slots.topBarId, {
        parentKind: "box",
        hasVerticalScrollAncestor: false,
        inItemScope: false,
      })
    : [];
  const fabLines = screen.slots.fabId
    ? emitNode(ctx, screen.slots.fabId, {
        parentKind: "box",
        hasVerticalScrollAncestor: false,
        inItemScope: false,
      })
    : [];

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
    ...(ctx.needsLazyList
      ? [
          "import androidx.compose.foundation.lazy.LazyColumn",
          "import androidx.compose.foundation.lazy.items",
        ]
      : []),
    "import androidx.compose.foundation.rememberScrollState",
    ...(ctx.needsSelection ? ["import androidx.compose.foundation.selection.selectable"] : []),
    "import androidx.compose.foundation.shape.CircleShape",
    "import androidx.compose.foundation.shape.RoundedCornerShape",
    "import androidx.compose.foundation.verticalScroll",
    "import androidx.compose.material.icons.Icons",
    "import androidx.compose.material.icons.automirrored.rounded.*",
    "import androidx.compose.material.icons.rounded.*",
    "import androidx.compose.material3.*",
    "import androidx.compose.runtime.*",
    "import androidx.compose.ui.Alignment",
    "import androidx.compose.ui.Modifier",
    "import androidx.compose.ui.draw.clip",
    "import androidx.compose.ui.graphics.Color",
    "import androidx.compose.ui.platform.LocalUriHandler",
    ...(ctx.needsSelection ? ["import androidx.compose.ui.semantics.Role"] : []),
    "import androidx.compose.ui.text.style.TextAlign",
    "import androidx.compose.ui.unit.dp",
    ...(hasAppState ? [`import ${pkg}.ui.state.AppStateStore`] : []),
    "",
    `@OptIn(${optIns.join(", ")})`,
    "@Composable",
    `fun ${composableName}(`,
    ...(hasAppState ? ["    appState: AppStateStore,"] : []),
    "    onNavigate: (String) -> Unit = {},",
    "    onNavigateBack: () -> Unit = {},",
    "    onShowSnackbar: (String) -> Unit = {},",
    "    bottomBar: @Composable () -> Unit = {},",
    "    snackbarHost: @Composable () -> Unit = {},",
    ") {",
    "    val uriHandler = LocalUriHandler.current",
    ...(ctx.hasOverlayState ? ["    var activeOverlayId by remember { mutableStateOf<String?>(null) }"] : []),
    ...indentLines(ctx.stateDecls, 4),
    ...(ctx.stateDecls.length > 0 || ctx.hasOverlayState ? [""] : []),
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
    "        Column(",
    "            modifier = Modifier",
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
    ...(ctx.overlayBlocks.length > 0
      ? ["", ...ctx.overlayBlocks.flatMap((blk) => indentLines(blk, 4))]
      : []),
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
