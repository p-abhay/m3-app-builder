import type {
  ComponentNode,
  ComponentStyle,
  ComponentType,
  NodeBindings,
  NodeOfType,
  NodePropsMap,
  ScreenNode,
  SpacingBox,
  UserAction,
} from "./types.ts";

let fallbackCounter = 0;

export function createId(prefix = "node"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  fallbackCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${fallbackCounter.toString(36)}`;
}

export const uniformSpacing = (v: number): SpacingBox => ({
  top: v,
  right: v,
  bottom: v,
  left: v,
});

export const defaultPropsMap: { [K in ComponentType]: () => NodePropsMap[K] } = {
  Column: () => ({
    gap: 12,
    scrollable: true,
    horizontalAlignment: "start",
    verticalArrangement: "top",
    connected: false,
  }),
  Row: () => ({
    gap: 8,
    verticalAlignment: "center",
    horizontalArrangement: "start",
    wrap: false,
    connected: false,
  }),
  Box: () => ({
    contentAlignment: "center",
  }),
  Card: () => ({
    variant: "filled",
    gap: 10,
  }),
  TopAppBar: () => ({
    variant: "small",
    title: "Screen Title",
    navigationIcon: "arrow_back",
    navigationAction: { type: "navigateBack" },
    actions: [],
  }),
  FloatingActionButton: () => ({
    variant: "extended",
    icon: "add",
    label: "Create",
    colorRole: "primaryContainer",
  }),
  Text: () => ({
    text: "Headline text",
    role: "bodyLarge",
    colorToken: "onSurface",
    align: "left",
  }),
  Icon: () => ({
    name: "star",
    size: 24,
    fill: false,
    colorToken: "primary",
  }),
  Image: () => ({
    src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    alt: "Sample artwork",
    aspectRatio: "16:9",
    contentScale: "cover",
    shape: "rounded",
  }),
  Spacer: () => ({
    size: 16,
  }),
  Divider: () => ({
    thickness: 1,
    inset: false,
  }),
  Badge: () => ({
    label: "New",
    colorRole: "error",
  }),
  Button: () => ({
    label: "Continue",
    variant: "filled",
    enabled: true,
  }),
  IconButton: () => ({
    icon: "favorite",
    variant: "tonal",
    toggleable: true,
    selectedIcon: "favorite",
  }),
  TextField: () => ({
    label: "Email address",
    placeholder: "you@example.com",
    value: "",
    variant: "outlined",
    leadingIcon: "mail",
  }),
  Switch: () => ({
    label: "Enable notifications",
    checked: true,
    showCheckIcon: true,
  }),
  Checkbox: () => ({
    label: "Agree to terms",
    checked: false,
  }),
  Slider: () => ({
    label: "Volume",
    value: 60,
    min: 0,
    max: 100,
  }),
  Chip: () => ({
    label: "Filter",
    variant: "filter",
    icon: "tune",
    selected: false,
  }),
  ListItem: () => ({
    headline: "List item",
    supportingText: "Secondary supporting line",
    leadingIcon: "inbox",
    leadingStyle: "avatar",
    trailingType: "icon",
    trailingIcon: "chevron_right",
  }),
  LoadingIndicator: () => ({
    size: 48,
    contained: true,
  }),
  ProgressBar: () => ({
    variant: "linear",
    determinate: true,
    value: 65,
    wavy: true,
  }),
  SearchBar: () => ({
    placeholder: "Search tasks...",
    value: "",
    leadingIcon: "search",
    showClearButton: true,
  }),
  SegmentedButton: () => ({
    options: [
      { value: "all", label: "All" },
      { value: "active", label: "Active" },
      { value: "done", label: "Done" },
    ],
    selectedValue: "all",
  }),
  DataList: () => ({
    collectionKey: "todos",
    searchFields: ["title", "notes"],
    gap: 8,
    emptyTitle: "No items match your filter",
    emptySubtitle: "Try clearing search or adding a new item.",
  }),
};

export function createDefaultStyle(type: ComponentType): ComponentStyle {
  switch (type) {
    case "Column":
      return { width: "fill", padding: uniformSpacing(16) };
    case "Row":
      return { width: "fill" };
    case "Box":
      return { width: "fill" };
    case "Card":
      return { width: "fill", padding: uniformSpacing(16) };
    case "TextField":
    case "SearchBar":
    case "SegmentedButton":
    case "DataList":
    case "ListItem":
    case "Divider":
    case "Image":
    case "ProgressBar":
      return { width: "fill" };
    default:
      return { width: "wrap" };
  }
}

export interface CreateNodeOptions<K extends ComponentType> {
  id?: string;
  name?: string;
  parentId?: string | null;
  props?: Partial<NodePropsMap[K]>;
  style?: Partial<ComponentStyle>;
  action?: UserAction;
  bindings?: NodeBindings;
}

export function createNode<K extends ComponentType>(
  type: K,
  opts: CreateNodeOptions<K> = {},
): NodeOfType<K> {
  const baseProps = defaultPropsMap[type]();
  const baseStyle = createDefaultStyle(type);
  return {
    id: opts.id ?? createId(type.toLowerCase()),
    type,
    name: opts.name,
    parentId: opts.parentId ?? null,
    childIds: [],
    style: { ...baseStyle, ...(opts.style ?? {}) },
    props: { ...baseProps, ...(opts.props ?? {}) },
    action: opts.action,
    ...(opts.bindings ? { bindings: opts.bindings } : {}),
  } as unknown as NodeOfType<K>;
}

export interface BlueprintNode {
  type: ComponentType;
  id?: string;
  name?: string;
  props?: Record<string, unknown>;
  style?: Partial<ComponentStyle>;
  action?: UserAction;
  bindings?: NodeBindings;
  children?: BlueprintNode[];
}

export function materializeBlueprint(
  blueprint: BlueprintNode,
  parentId: string | null,
  nodes: Record<string, ComponentNode>,
): string {
  const node = createNode(blueprint.type, {
    id: blueprint.id,
    name: blueprint.name,
    parentId,
    props: blueprint.props as never,
    style: blueprint.style,
    action: blueprint.action,
    bindings: blueprint.bindings,
  });
  nodes[node.id] = node;
  if (blueprint.children?.length) {
    node.childIds = blueprint.children.map((child) =>
      materializeBlueprint(child, node.id, nodes),
    );
  }
  return node.id;
}

export function createBlankScreen(
  name: string,
  route: string,
  opts?: {
    id?: string;
    showBottomNav?: boolean;
    withTopBar?: boolean;
    topBarProps?: Partial<NodePropsMap["TopAppBar"]>;
    bodyChildren?: BlueprintNode[];
    fab?: BlueprintNode;
  },
): ScreenNode {
  const nodes: Record<string, ComponentNode> = {};
  const bodyId = materializeBlueprint(
    {
      type: "Column",
      name: "Screen Body",
      style: { width: "fill", height: "fill", padding: uniformSpacing(16) },
      props: {
        gap: 14,
        scrollable: true,
        horizontalAlignment: "start",
        verticalArrangement: "top",
        connected: false,
      },
      children: opts?.bodyChildren ?? [],
    },
    null,
    nodes,
  );

  let topBarId: string | undefined;
  if (opts?.withTopBar !== false) {
    topBarId = materializeBlueprint(
      {
        type: "TopAppBar",
        name: "Top App Bar",
        props: {
          title: name,
          navigationIcon: undefined,
          actions: [],
          ...(opts?.topBarProps ?? {}),
        },
      },
      null,
      nodes,
    );
  }

  let fabId: string | undefined;
  if (opts?.fab) {
    fabId = materializeBlueprint(opts.fab, null, nodes);
  }

  return {
    id: opts?.id ?? createId("scr"),
    name,
    route,
    showBottomNav: opts?.showBottomNav ?? true,
    backgroundToken: "surface",
    slots: {
      topBarId,
      fabId,
      bodyId,
    },
    nodes,
  };
}
