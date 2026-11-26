import type { ComponentType } from "@/ast/types";

export type PaletteCategory =
  | "layout"
  | "actions"
  | "navigation"
  | "inputs"
  | "display"
  | "overlays"
  | "feedback";

export interface PalettePartMeta {
  type: ComponentType;
  label: string;
  description: string;
  icon: string;
  category: PaletteCategory;
  targetSlot: "topBarId" | "fabId" | "body";
}

export const PALETTE_CATEGORIES: { key: PaletteCategory; label: string; icon: string }[] = [
  { key: "layout", label: "Layout & Containment", icon: "dashboard" },
  { key: "actions", label: "Actions & Buttons", icon: "touch_app" },
  { key: "navigation", label: "Navigation & Chrome", icon: "toolbar" },
  { key: "inputs", label: "Inputs & Selection", icon: "toggle_on" },
  { key: "display", label: "Display & Content", icon: "notes" },
  { key: "overlays", label: "Overlays & Dialogs", icon: "layers" },
  { key: "feedback", label: "Progress & M3E", icon: "progress_activity" },
];

export const PALETTE_PARTS: PalettePartMeta[] = [
  // Layout & Containment
  {
    type: "Column",
    label: "Column",
    description: "Vertical flex container",
    icon: "view_agenda",
    category: "layout",
    targetSlot: "body",
  },
  {
    type: "Row",
    label: "Row",
    description: "Horizontal flex & button group",
    icon: "view_column",
    category: "layout",
    targetSlot: "body",
  },
  {
    type: "Box",
    label: "Box",
    description: "Overlay & aligned container",
    icon: "check_box_outline_blank",
    category: "layout",
    targetSlot: "body",
  },
  {
    type: "Card",
    label: "Card",
    description: "Elevated, filled, or outlined",
    icon: "crop_landscape",
    category: "layout",
    targetSlot: "body",
  },
  {
    type: "ListItem",
    label: "List Item",
    description: "Headline, supporting & trailing",
    icon: "list",
    category: "layout",
    targetSlot: "body",
  },
  {
    type: "DataList",
    label: "Data List",
    description: "Collection repeater with search & sort",
    icon: "view_list",
    category: "layout",
    targetSlot: "body",
  },
  {
    type: "Spacer",
    label: "Spacer",
    description: "Vertical spacing dp gap",
    icon: "height",
    category: "layout",
    targetSlot: "body",
  },
  {
    type: "Divider",
    label: "Divider",
    description: "Full or inset hairline",
    icon: "horizontal_rule",
    category: "layout",
    targetSlot: "body",
  },

  // Actions
  {
    type: "Button",
    label: "Button",
    description: "Filled, tonal, outlined, text",
    icon: "smart_button",
    category: "actions",
    targetSlot: "body",
  },
  {
    type: "IconButton",
    label: "Icon Button",
    description: "Circular M3 icon trigger",
    icon: "radio_button_checked",
    category: "actions",
    targetSlot: "body",
  },
  {
    type: "Chip",
    label: "Chip",
    description: "Filter, assist, or input chip",
    icon: "label",
    category: "actions",
    targetSlot: "body",
  },
  {
    type: "SegmentedButton",
    label: "Segmented",
    description: "Single-choice filter & sort pills",
    icon: "view_week",
    category: "actions",
    targetSlot: "body",
  },

  // Navigation & Chrome
  {
    type: "TopAppBar",
    label: "Top App Bar",
    description: "Scaffold topBar slot",
    icon: "toolbar",
    category: "navigation",
    targetSlot: "topBarId",
  },
  {
    type: "FloatingActionButton",
    label: "FAB",
    description: "Scaffold floatingActionButton",
    icon: "add_circle",
    category: "navigation",
    targetSlot: "fabId",
  },
  {
    type: "Tabs",
    label: "Tabs",
    description: "Primary or secondary M3 tab bar",
    icon: "tab",
    category: "navigation",
    targetSlot: "body",
  },

  // Inputs
  {
    type: "SearchBar",
    label: "Search Bar",
    description: "M3 pill search with clear button",
    icon: "search",
    category: "inputs",
    targetSlot: "body",
  },
  {
    type: "TextField",
    label: "Text Field",
    description: "Outlined or filled text input",
    icon: "input",
    category: "inputs",
    targetSlot: "body",
  },
  {
    type: "Switch",
    label: "Switch",
    description: "M3 thumb toggle switch",
    icon: "toggle_on",
    category: "inputs",
    targetSlot: "body",
  },
  {
    type: "Checkbox",
    label: "Checkbox",
    description: "Boolean checkbox with label",
    icon: "check_box",
    category: "inputs",
    targetSlot: "body",
  },
  {
    type: "Slider",
    label: "Slider",
    description: "Continuous tonal slider",
    icon: "tune",
    category: "inputs",
    targetSlot: "body",
  },
  {
    type: "DropdownMenu",
    label: "Dropdown",
    description: "Exposed dropdown menu select",
    icon: "arrow_drop_down_circle",
    category: "inputs",
    targetSlot: "body",
  },
  {
    type: "RadioGroup",
    label: "Radio Group",
    description: "Single-choice radio button list",
    icon: "radio_button_checked",
    category: "inputs",
    targetSlot: "body",
  },

  // Display
  {
    type: "Text",
    label: "Text",
    description: "Material 3 typography scale",
    icon: "title",
    category: "display",
    targetSlot: "body",
  },
  {
    type: "Icon",
    label: "Icon",
    description: "Material Symbol vector icon",
    icon: "star",
    category: "display",
    targetSlot: "body",
  },
  {
    type: "Image",
    label: "Image",
    description: "Media with aspect & shape crop",
    icon: "image",
    category: "display",
    targetSlot: "body",
  },
  {
    type: "Badge",
    label: "Badge",
    description: "Status & label pill badge",
    icon: "new_releases",
    category: "display",
    targetSlot: "body",
  },

  // Overlays & Dialogs
  {
    type: "AlertDialog",
    label: "Alert Dialog",
    description: "M3 confirmation & prompt modal",
    icon: "warning",
    category: "overlays",
    targetSlot: "body",
  },
  {
    type: "ModalBottomSheet",
    label: "Bottom Sheet",
    description: "Draggable modal sheet container",
    icon: "bottom_sheets",
    category: "overlays",
    targetSlot: "body",
  },

  // Feedback / M3E
  {
    type: "LoadingIndicator",
    label: "M3E Loader",
    description: "Shape-morphing loading indicator",
    icon: "motion_photos_on",
    category: "feedback",
    targetSlot: "body",
  },
  {
    type: "ProgressBar",
    label: "Progress Bar",
    description: "Flat or wavy linear progress",
    icon: "linear_scale",
    category: "feedback",
    targetSlot: "body",
  },
];
