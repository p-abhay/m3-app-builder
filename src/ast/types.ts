import type { AppThemeConfig, ColorTokenKey, TypeRole } from "../theme/types.ts";

export type ComponentType =
  // Containers
  | "Column"
  | "Row"
  | "Box"
  | "Card"
  // Scaffold chrome / slots
  | "TopAppBar"
  | "FloatingActionButton"
  // Content & display
  | "Text"
  | "Icon"
  | "Image"
  | "Spacer"
  | "Divider"
  | "Badge"
  // Inputs & interactive
  | "Button"
  | "IconButton"
  | "TextField"
  | "Switch"
  | "Checkbox"
  | "Slider"
  | "Chip"
  | "ListItem"
  // Progress & M3E feedback
  | "LoadingIndicator"
  | "ProgressBar";

export const CONTAINER_TYPES: ReadonlySet<ComponentType> = new Set([
  "Column",
  "Row",
  "Box",
  "Card",
]);

export type SpacingBox = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export interface ComponentStyle {
  width?: "wrap" | "fill" | number;
  height?: "wrap" | "fill" | number;
  padding?: SpacingBox;
  margin?: SpacingBox;
  backgroundToken?: ColorTokenKey | "transparent";
  cornerRadius?: number;
  alignSelf?: "auto" | "start" | "center" | "end" | "stretch";
}

export type TransitionType = "slide" | "fade" | "expand" | "none";

export type UserAction =
  | { type: "none" }
  | { type: "navigate"; targetScreenId: string; transition: TransitionType }
  | { type: "navigateBack" }
  | { type: "openUrl"; url: string }
  | { type: "showSnackbar"; message: string }
  | { type: "toggleState"; stateKey?: string };

export interface TopAppBarActionItem {
  id: string;
  icon: string;
  label: string;
  action?: UserAction;
}

export interface NodePropsMap {
  Column: {
    gap: number;
    scrollable: boolean;
    horizontalAlignment: "start" | "center" | "end";
    verticalArrangement: "top" | "center" | "bottom" | "spaceBetween";
    connected: boolean;
  };
  Row: {
    gap: number;
    verticalAlignment: "top" | "center" | "bottom";
    horizontalArrangement: "start" | "center" | "end" | "spaceBetween";
    wrap: boolean;
    connected: boolean;
  };
  Box: {
    contentAlignment: "topStart" | "center" | "bottomEnd" | "bottomStart" | "topEnd";
  };
  Card: {
    variant: "elevated" | "filled" | "outlined";
    gap: number;
  };
  TopAppBar: {
    variant: "small" | "centerAligned" | "medium" | "large";
    title: string;
    subtitle?: string;
    navigationIcon?: string;
    navigationAction?: UserAction;
    actions: TopAppBarActionItem[];
  };
  FloatingActionButton: {
    variant: "standard" | "small" | "large" | "extended";
    icon: string;
    label?: string;
    colorRole: "primaryContainer" | "secondaryContainer" | "tertiaryContainer" | "primary";
  };
  Text: {
    text: string;
    role: TypeRole;
    colorToken: ColorTokenKey;
    align: "left" | "center" | "right";
    maxLines?: number;
  };
  Icon: {
    name: string;
    size: number;
    fill: boolean;
    colorToken: ColorTokenKey;
  };
  Image: {
    src: string;
    alt: string;
    aspectRatio: "16:9" | "4:3" | "1:1" | "auto";
    contentScale: "cover" | "contain";
    shape: "rounded" | "circle" | "square";
  };
  Spacer: {
    size: number;
  };
  Divider: {
    thickness: number;
    inset: boolean;
  };
  Badge: {
    label: string;
    colorRole: "error" | "primary" | "tertiaryContainer";
  };
  Button: {
    label: string;
    variant: "filled" | "tonal" | "elevated" | "outlined" | "text";
    icon?: string;
    enabled: boolean;
  };
  IconButton: {
    icon: string;
    variant: "standard" | "filled" | "tonal" | "outlined";
    toggleable: boolean;
    selectedIcon?: string;
  };
  TextField: {
    label: string;
    placeholder: string;
    value: string;
    variant: "filled" | "outlined";
    leadingIcon?: string;
    trailingIcon?: string;
    supportingText?: string;
  };
  Switch: {
    label: string;
    checked: boolean;
    showCheckIcon: boolean;
  };
  Checkbox: {
    label: string;
    checked: boolean;
  };
  Slider: {
    label: string;
    value: number;
    min: number;
    max: number;
  };
  Chip: {
    label: string;
    variant: "assist" | "filter" | "input" | "suggestion";
    icon?: string;
    selected: boolean;
  };
  ListItem: {
    headline: string;
    supportingText?: string;
    overlineText?: string;
    leadingIcon?: string;
    leadingStyle: "icon" | "avatar" | "none";
    trailingType: "none" | "icon" | "switch" | "checkbox";
    trailingIcon?: string;
    checked?: boolean;
  };
  LoadingIndicator: {
    size: number;
    contained: boolean;
  };
  ProgressBar: {
    variant: "linear" | "circular";
    determinate: boolean;
    value: number;
    wavy: boolean;
  };
}

export type ComponentNode = {
  [K in ComponentType]: {
    id: string;
    type: K;
    name?: string;
    parentId: string | null;
    childIds: string[];
    style: ComponentStyle;
    props: NodePropsMap[K];
    action?: UserAction;
  };
}[ComponentType];

export type NodeOfType<K extends ComponentType> = Extract<ComponentNode, { type: K }>;

export interface NavDestination {
  id: string;
  label: string;
  icon: string;
  activeIcon?: string;
  targetScreenId: string;
}

export interface SharedBottomNav {
  enabled: boolean;
  destinations: NavDestination[];
}

export interface ScreenSlots {
  topBarId?: string;
  fabId?: string;
  bodyId: string;
}

export interface ScreenNode {
  id: string;
  name: string;
  route: string;
  showBottomNav: boolean;
  backgroundToken?: ColorTokenKey;
  slots: ScreenSlots;
  nodes: Record<string, ComponentNode>;
}

export interface AppProject {
  schemaVersion: 1;
  id: string;
  name: string;
  packageName: string;
  theme: AppThemeConfig;
  bottomNav: SharedBottomNav;
  screens: ScreenNode[];
  initialScreenId: string;
}
