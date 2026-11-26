import { useState, type CSSProperties, type ReactNode } from "react";
import { createId } from "@/ast/factory";
import { moveNode } from "@/ast/operations";
import {
  OVERLAY_TYPES,
  type ComponentNode,
  type SegmentedOption,
  type TopAppBarActionItem,
  type TransitionType,
  type UserAction,
  type VisibilityCondition,
} from "@/ast/types";
import { useProjectStore } from "@/store/useProjectStore";
import { useM3Theme } from "@/theme/ThemeContext";
import type { ColorTokenKey, TypeRole } from "@/theme/types";
import { Icon } from "../Icon";
import { IconPickerModal } from "./IconPickerModal";

const COLOR_TOKEN_OPTIONS: { key: ColorTokenKey; label: string }[] = [
  { key: "onSurface", label: "On Surface" },
  { key: "onSurfaceVariant", label: "On Surface Variant" },
  { key: "primary", label: "Primary" },
  { key: "onPrimary", label: "On Primary" },
  { key: "onPrimaryContainer", label: "On Primary Container" },
  { key: "onSecondaryContainer", label: "On Secondary Container" },
  { key: "surface", label: "Surface" },
  { key: "surfaceContainerLow", label: "Surface Low" },
  { key: "surfaceContainerHighest", label: "Surface Highest" },
  { key: "primaryContainer", label: "Primary Container" },
  { key: "secondaryContainer", label: "Secondary Container" },
  { key: "tertiaryContainer", label: "Tertiary Container" },
  { key: "error", label: "Error" },
];

const TYPE_ROLE_OPTIONS: TypeRole[] = [
  "displaySmall",
  "headlineLarge",
  "headlineMedium",
  "headlineSmall",
  "titleLarge",
  "titleMedium",
  "titleSmall",
  "bodyLarge",
  "bodyMedium",
  "bodySmall",
  "labelLarge",
  "labelMedium",
  "labelSmall",
];

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  const { palette } = useM3Theme();
  return (
    <label className="block space-y-1">
      <span
        className="block text-[11px] font-semibold"
        style={{ color: palette.onSurfaceVariant }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function IconField({
  label,
  value,
  placeholder,
  inputStyle,
  testId = "icon-picker-trigger",
  onChange,
  onOpenPicker,
}: {
  label: string;
  value: string | undefined;
  placeholder?: string;
  inputStyle: CSSProperties;
  testId?: string;
  onChange: (val: string | undefined) => void;
  onOpenPicker: () => void;
}) {
  const { palette, shapes } = useM3Theme();
  return (
    <div className="space-y-1">
      <span
        className="block text-[11px] font-semibold"
        style={{ color: palette.onSurfaceVariant }}
      >
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={placeholder ?? "e.g. star"}
          className="flex-1 min-w-0 px-2.5 py-1.5 text-xs outline-none"
          style={inputStyle}
        />
        <button
          type="button"
          data-testid={testId}
          onClick={onOpenPicker}
          className="m3-press flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold border-0 cursor-pointer shrink-0"
          style={{
            borderRadius: shapes.small,
            backgroundColor: palette.secondaryContainer,
            color: palette.onSecondaryContainer,
          }}
          title="Browse Material Symbols"
        >
          <Icon name={value || "apps"} size={15} />
          <span>Pick</span>
        </button>
      </div>
    </div>
  );
}

function formatKeyValuePairs(map: Record<string, string> | undefined): string {
  return Object.entries(map ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
}

function parseKeyValuePairs(raw: string): Record<string, string> {
  const nextMap: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const [k, v] = part.split("=").map((s) => s.trim());
    if (k && v) nextMap[k] = v;
  }
  return nextMap;
}

function OptionsListEditor({
  options,
  inputStyle,
  onChange,
}: {
  options: SegmentedOption[];
  inputStyle: CSSProperties;
  onChange: (next: SegmentedOption[]) => void;
}) {
  const { palette } = useM3Theme();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-semibold" style={{ color: palette.onSurfaceVariant }}>
          Options ({options.length})
        </span>
        <button
          type="button"
          onClick={() =>
            onChange([...options, { value: `opt${options.length + 1}`, label: "Option" }])
          }
          className="text-[11px] font-semibold border-0 bg-transparent cursor-pointer"
          style={{ color: palette.primary }}
        >
          + Add
        </button>
      </div>
      {options.map((opt, idx) => (
        <div key={`${opt.value}-${idx}`} className="flex items-center gap-1.5">
          <input
            type="text"
            aria-label={`Option ${idx + 1} Value`}
            value={opt.value}
            onChange={(e) =>
              onChange(options.map((o, i) => (i === idx ? { ...o, value: e.target.value } : o)))
            }
            className="w-20 px-2 py-1 text-xs font-mono outline-none"
            style={inputStyle}
          />
          <input
            type="text"
            aria-label={`Option ${idx + 1} Label`}
            value={opt.label}
            onChange={(e) =>
              onChange(options.map((o, i) => (i === idx ? { ...o, label: e.target.value } : o)))
            }
            className="flex-1 min-w-0 px-2 py-1 text-xs outline-none"
            style={inputStyle}
          />
          {options.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(options.filter((_, i) => i !== idx))}
              className="p-1 border-0 bg-transparent cursor-pointer"
              style={{ color: palette.error }}
              title="Remove option"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function PropertiesInspector({ onSwitchToTheme }: { onSwitchToTheme: () => void }) {
  const { palette, shapes } = useM3Theme();
  const project = useProjectStore((s) => s.project);
  const activeScreenId = useProjectStore((s) => s.activeScreenId);
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const commit = useProjectStore((s) => s.commit);

  const selectNode = useProjectStore((s) => s.selectNode);
  const duplicateNode = useProjectStore((s) => s.duplicateNode);
  const removeNode = useProjectStore((s) => s.removeNode);
  const updateNodeProps = useProjectStore((s) => s.updateNodeProps);
  const updateNodeStyle = useProjectStore((s) => s.updateNodeStyle);
  const updateNodeAction = useProjectStore((s) => s.updateNodeAction);
  const updateNodeBindings = useProjectStore((s) => s.updateNodeBindings);
  const updateNodeVisibility = useProjectStore((s) => s.updateNodeVisibility);

  const [iconPickerTarget, setIconPickerTarget] = useState<{
    propKey: string;
    value?: string;
    allowEmpty: boolean;
  } | null>(null);

  const activeScreen =
    project.screens.find((s) => s.id === activeScreenId) ?? project.screens[0];
  const node: ComponentNode | undefined =
    selectedNodeId && activeScreen ? activeScreen.nodes[selectedNodeId] : undefined;

  if (!node || !activeScreen) {
    return (
      <div
        data-testid="properties-inspector"
        className="h-full flex flex-col items-center justify-center p-6 text-center"
        style={{ color: palette.onSurfaceVariant }}
      >
        <Icon name="touch_app" size={32} color={palette.primary} />
        <div className="mt-2 text-sm font-semibold" style={{ color: palette.onSurface }}>
          No component selected
        </div>
        <p className="text-xs mt-1 max-w-[220px]">
          Click any component on the phone canvas or in the AST Tree to edit its properties.
        </p>
        <button
          type="button"
          onClick={onSwitchToTheme}
          className="m3-press mt-4 px-4 py-2 text-xs font-semibold border-0 cursor-pointer"
          style={{
            borderRadius: shapes.full,
            backgroundColor: palette.secondaryContainer,
            color: palette.onSecondaryContainer,
          }}
        >
          Open Theme &amp; System
        </button>
      </div>
    );
  }

  const isBodyRoot = node.id === activeScreen.slots.bodyId;
  const isSlotRoot =
    isBodyRoot ||
    node.id === activeScreen.slots.topBarId ||
    node.id === activeScreen.slots.fabId;

  const parent = node.parentId ? activeScreen.nodes[node.parentId] : undefined;
  const indexInParent = parent ? parent.childIds.indexOf(node.id) : -1;
  const canMoveUp = Boolean(parent && indexInParent > 0);
  const canMoveDown = Boolean(
    parent && indexInParent !== -1 && indexInParent < parent.childIds.length - 1,
  );

  const reorderInParent = (delta: -1 | 1) => {
    if (!parent || indexInParent === -1) return;
    const targetIndex = delta === -1 ? indexInParent - 1 : indexInParent + 2;
    commit((proj) => ({
      ...proj,
      screens: proj.screens.map((scr) =>
        scr.id === activeScreen.id ? moveNode(scr, node.id, parent.id, targetIndex) : scr,
      ),
    }));
  };

  const inputStyle: CSSProperties = {
    backgroundColor: palette.surfaceContainer,
    color: palette.onSurface,
    border: `1px solid ${palette.outlineVariant}`,
    borderRadius: shapes.small,
  };

  const currentAction: UserAction = node.action ?? { type: "none" };

  return (
    <div
      data-testid="properties-inspector"
      className="flex flex-col h-full"
      style={{ color: palette.onSurface }}
    >
      {/* Inspector Action Header */}
      <div
        className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2"
        style={{ borderColor: palette.outlineVariant }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[11px] font-bold px-2.5 py-0.5 truncate"
            style={{
              borderRadius: shapes.full,
              backgroundColor: palette.primaryContainer,
              color: palette.onPrimaryContainer,
            }}
          >
            {node.type}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isSlotRoot && (
            <>
              <button
                type="button"
                disabled={!canMoveUp}
                onClick={() => reorderInParent(-1)}
                className="p-1.5 border-0 bg-transparent cursor-pointer disabled:opacity-30"
                style={{ color: palette.onSurfaceVariant }}
                title="Move up"
              >
                <Icon name="arrow_upward" size={16} />
              </button>
              <button
                type="button"
                disabled={!canMoveDown}
                onClick={() => reorderInParent(1)}
                className="p-1.5 border-0 bg-transparent cursor-pointer disabled:opacity-30"
                style={{ color: palette.onSurfaceVariant }}
                title="Move down"
              >
                <Icon name="arrow_downward" size={16} />
              </button>
              <button
                type="button"
                onClick={() => duplicateNode(node.id)}
                className="p-1.5 border-0 bg-transparent cursor-pointer"
                style={{ color: palette.onSurfaceVariant }}
                title="Duplicate component"
              >
                <Icon name="content_copy" size={16} />
              </button>
            </>
          )}
          {!isBodyRoot && (
            <button
              type="button"
              onClick={() => removeNode(node.id)}
              className="p-1.5 border-0 bg-transparent cursor-pointer"
              style={{ color: palette.error }}
              title="Delete component"
            >
              <Icon name="delete" size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => selectNode(null)}
            className="p-1.5 border-0 bg-transparent cursor-pointer"
            style={{ color: palette.onSurfaceVariant }}
            title="Clear selection"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable Inspector Form */}
      <div className="no-scrollbar flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
        {node.type === "Button" && (
          <div className="space-y-3">
            <FieldRow label="Button Label">
              <input
                aria-label="Button Label"
                type="text"
                value={node.props.label}
                onChange={(e) => updateNodeProps(node.id, { label: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Button Variant">
              <select
                aria-label="Button Variant"
                value={node.props.variant}
                onChange={(e) => updateNodeProps(node.id, { variant: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="filled">Filled</option>
                <option value="tonal">Tonal</option>
                <option value="elevated">Elevated</option>
                <option value="outlined">Outlined</option>
                <option value="text">Text</option>
              </select>
            </FieldRow>
            <IconField
              label="Leading Icon"
              value={node.props.icon}
              placeholder="e.g. add, explore"
              inputStyle={inputStyle}
              onChange={(icon) => updateNodeProps(node.id, { icon })}
              onOpenPicker={() =>
                setIconPickerTarget({ propKey: "icon", value: node.props.icon, allowEmpty: true })
              }
            />
            <label className="flex items-center justify-between py-1">
              <span className="font-semibold">Enabled</span>
              <input
                type="checkbox"
                checked={node.props.enabled}
                onChange={(e) => updateNodeProps(node.id, { enabled: e.target.checked })}
              />
            </label>
          </div>
        )}

        {node.type === "IconButton" && (
          <div className="space-y-3">
            <IconField
              label="Icon"
              value={node.props.icon}
              inputStyle={inputStyle}
              onChange={(icon) => updateNodeProps(node.id, { icon: icon ?? "favorite" })}
              onOpenPicker={() =>
                setIconPickerTarget({ propKey: "icon", value: node.props.icon, allowEmpty: false })
              }
            />
            <FieldRow label="Variant">
              <select
                value={node.props.variant}
                onChange={(e) => updateNodeProps(node.id, { variant: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="standard">Standard</option>
                <option value="filled">Filled</option>
                <option value="tonal">Tonal</option>
                <option value="outlined">Outlined</option>
              </select>
            </FieldRow>
            <label className="flex items-center justify-between py-1">
              <span className="font-semibold">Toggleable</span>
              <input
                type="checkbox"
                checked={node.props.toggleable}
                onChange={(e) => updateNodeProps(node.id, { toggleable: e.target.checked })}
              />
            </label>
          </div>
        )}

        {node.type === "Text" && (
          <div className="space-y-3">
            <FieldRow label="Text Content">
              <textarea
                aria-label="Text Content"
                rows={3}
                value={node.props.text}
                onChange={(e) => updateNodeProps(node.id, { text: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none resize-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Typography Role">
              <select
                aria-label="Typography Role"
                value={node.props.role}
                onChange={(e) => updateNodeProps(node.id, { role: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                {TYPE_ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Color Token">
              <select
                value={node.props.colorToken}
                onChange={(e) => updateNodeProps(node.id, { colorToken: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                {COLOR_TOKEN_OPTIONS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Alignment">
              <select
                value={node.props.align}
                onChange={(e) => updateNodeProps(node.id, { align: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </FieldRow>
          </div>
        )}

        {node.type === "TopAppBar" && (
          <div className="space-y-3">
            <FieldRow label="Title">
              <input
                aria-label="TopBar Title"
                type="text"
                value={node.props.title}
                onChange={(e) => updateNodeProps(node.id, { title: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Subtitle">
              <input
                type="text"
                value={node.props.subtitle ?? ""}
                onChange={(e) =>
                  updateNodeProps(node.id, { subtitle: e.target.value || undefined })
                }
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Variant">
              <select
                value={node.props.variant}
                onChange={(e) => updateNodeProps(node.id, { variant: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="small">Small</option>
                <option value="centerAligned">Center Aligned</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </FieldRow>
            <IconField
              label="Navigation Icon"
              value={node.props.navigationIcon}
              placeholder="e.g. menu, arrow_back"
              inputStyle={inputStyle}
              onChange={(navigationIcon) => updateNodeProps(node.id, { navigationIcon })}
              onOpenPicker={() =>
                setIconPickerTarget({
                  propKey: "navigationIcon",
                  value: node.props.navigationIcon,
                  allowEmpty: true,
                })
              }
            />
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: palette.onSurfaceVariant }}>
                  Action Icons ({node.props.actions.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextActions: TopAppBarActionItem[] = [
                      ...node.props.actions,
                      {
                        id: createId("tbact"),
                        icon: "settings",
                        label: "Action",
                        action: { type: "showSnackbar", message: "TopBar action tapped" },
                      },
                    ];
                    updateNodeProps(node.id, { actions: nextActions });
                  }}
                  className="text-[11px] font-semibold border-0 bg-transparent cursor-pointer"
                  style={{ color: palette.primary }}
                >
                  + Add Action
                </button>
              </div>
              {node.props.actions.map((act, idx) => (
                <div
                  key={act.id}
                  className="p-2 space-y-1.5 border"
                  style={{
                    borderRadius: shapes.small,
                    borderColor: palette.outlineVariant,
                    backgroundColor: palette.surfaceContainerLowest,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      aria-label={`Action ${idx + 1} Icon`}
                      value={act.icon}
                      placeholder="icon"
                      onChange={(e) => {
                        const next = node.props.actions.map((item, i) =>
                          i === idx ? { ...item, icon: e.target.value } : item,
                        );
                        updateNodeProps(node.id, { actions: next });
                      }}
                      className="w-24 px-2 py-1 text-xs font-mono outline-none"
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      aria-label={`Action ${idx + 1} Label`}
                      value={act.label}
                      placeholder="Label"
                      onChange={(e) => {
                        const next = node.props.actions.map((item, i) =>
                          i === idx ? { ...item, label: e.target.value } : item,
                        );
                        updateNodeProps(node.id, { actions: next });
                      }}
                      className="flex-1 min-w-0 px-2 py-1 text-xs outline-none"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateNodeProps(node.id, {
                          actions: node.props.actions.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-1 border-0 bg-transparent cursor-pointer"
                      style={{ color: palette.error }}
                      title="Remove TopBar action"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                  <select
                    aria-label={`Action ${idx + 1} Trigger`}
                    value={act.action?.type ?? "none"}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      let nextAct: UserAction = { type: "none" };
                      if (nextType === "navigate") {
                        nextAct = {
                          type: "navigate",
                          targetScreenId: project.screens[0]?.id ?? "",
                          transition: "slide",
                        };
                      } else if (nextType === "showSnackbar") {
                        nextAct = { type: "showSnackbar", message: act.label || "Action tapped" };
                      } else if (nextType === "openOverlay") {
                        const firstOv = Object.values(activeScreen.nodes).find((n) =>
                          OVERLAY_TYPES.has(n.type),
                        );
                        nextAct = { type: "openOverlay", targetNodeId: firstOv?.id ?? "" };
                      }
                      const next = node.props.actions.map((item, i) =>
                        i === idx ? { ...item, action: nextAct } : item,
                      );
                      updateNodeProps(node.id, { actions: next });
                    }}
                    className="w-full px-2 py-1 text-[11px] outline-none"
                    style={inputStyle}
                  >
                    <option value="none">No Action</option>
                    <option value="showSnackbar">Show Snackbar</option>
                    <option value="navigate">Navigate to Screen</option>
                    <option value="openOverlay">Open Overlay</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {node.type === "FloatingActionButton" && (
          <div className="space-y-3">
            <FieldRow label="FAB Variant">
              <select
                value={node.props.variant}
                onChange={(e) => updateNodeProps(node.id, { variant: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="standard">Standard</option>
                <option value="small">Small</option>
                <option value="large">Large</option>
                <option value="extended">Extended</option>
              </select>
            </FieldRow>
            <IconField
              label="Icon"
              value={node.props.icon}
              inputStyle={inputStyle}
              onChange={(icon) => updateNodeProps(node.id, { icon: icon ?? "add" })}
              onOpenPicker={() =>
                setIconPickerTarget({ propKey: "icon", value: node.props.icon, allowEmpty: false })
              }
            />
            {node.props.variant === "extended" && (
              <FieldRow label="Label">
                <input
                  type="text"
                  value={node.props.label ?? ""}
                  onChange={(e) => updateNodeProps(node.id, { label: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs outline-none"
                  style={inputStyle}
                />
              </FieldRow>
            )}
            <FieldRow label="Color Role">
              <select
                value={node.props.colorRole}
                onChange={(e) => updateNodeProps(node.id, { colorRole: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="primaryContainer">Primary Container</option>
                <option value="secondaryContainer">Secondary Container</option>
                <option value="tertiaryContainer">Tertiary Container</option>
                <option value="primary">Primary</option>
              </select>
            </FieldRow>
          </div>
        )}

        {node.type === "TextField" && (
          <div className="space-y-3">
            <FieldRow label="Label">
              <input
                type="text"
                value={node.props.label}
                onChange={(e) => updateNodeProps(node.id, { label: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Placeholder">
              <input
                type="text"
                value={node.props.placeholder}
                onChange={(e) => updateNodeProps(node.id, { placeholder: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Variant">
              <select
                value={node.props.variant}
                onChange={(e) => updateNodeProps(node.id, { variant: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="outlined">Outlined</option>
                <option value="filled">Filled</option>
              </select>
            </FieldRow>
            <IconField
              label="Leading Icon"
              value={node.props.leadingIcon}
              inputStyle={inputStyle}
              onChange={(leadingIcon) => updateNodeProps(node.id, { leadingIcon })}
              onOpenPicker={() =>
                setIconPickerTarget({
                  propKey: "leadingIcon",
                  value: node.props.leadingIcon,
                  allowEmpty: true,
                })
              }
            />
            <FieldRow label="Supporting Text">
              <input
                type="text"
                value={node.props.supportingText ?? ""}
                onChange={(e) =>
                  updateNodeProps(node.id, { supportingText: e.target.value || undefined })
                }
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
          </div>
        )}

        {node.type === "Card" && (
          <div className="space-y-3">
            <FieldRow label="Card Variant">
              <select
                value={node.props.variant}
                onChange={(e) => updateNodeProps(node.id, { variant: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="filled">Filled</option>
                <option value="elevated">Elevated</option>
                <option value="outlined">Outlined</option>
              </select>
            </FieldRow>
            <FieldRow label="Inner Gap (dp)">
              <input
                type="number"
                min={0}
                max={48}
                value={node.props.gap}
                onChange={(e) => updateNodeProps(node.id, { gap: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
          </div>
        )}

        {node.type === "Box" && (
          <FieldRow label="Content Alignment">
            <select
              value={node.props.contentAlignment}
              onChange={(e) => updateNodeProps(node.id, { contentAlignment: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs outline-none"
              style={inputStyle}
            >
              <option value="center">Center</option>
              <option value="topStart">Top Start</option>
              <option value="topEnd">Top End</option>
              <option value="bottomStart">Bottom Start</option>
              <option value="bottomEnd">Bottom End</option>
            </select>
          </FieldRow>
        )}

        {node.type === "Column" && (
          <div className="space-y-3">
            <FieldRow label="Spacing Gap (dp)">
              <input
                type="number"
                min={0}
                max={48}
                value={node.props.gap}
                onChange={(e) => updateNodeProps(node.id, { gap: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Horizontal Alignment">
              <select
                value={node.props.horizontalAlignment}
                onChange={(e) => updateNodeProps(node.id, { horizontalAlignment: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="start">Start</option>
                <option value="center">Center</option>
                <option value="end">End</option>
              </select>
            </FieldRow>
            <label className="flex items-center justify-between py-1">
              <span className="font-semibold">Scrollable</span>
              <input
                type="checkbox"
                checked={node.props.scrollable}
                onChange={(e) => updateNodeProps(node.id, { scrollable: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between py-1">
              <span className="font-semibold">M3E Connected Group</span>
              <input
                type="checkbox"
                checked={node.props.connected}
                onChange={(e) => updateNodeProps(node.id, { connected: e.target.checked })}
              />
            </label>
          </div>
        )}

        {node.type === "Row" && (
          <div className="space-y-3">
            <FieldRow label="Spacing Gap (dp)">
              <input
                type="number"
                min={0}
                max={48}
                value={node.props.gap}
                onChange={(e) => updateNodeProps(node.id, { gap: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Arrangement">
              <select
                value={node.props.horizontalArrangement}
                onChange={(e) =>
                  updateNodeProps(node.id, { horizontalArrangement: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="start">Start</option>
                <option value="center">Center</option>
                <option value="end">End</option>
                <option value="spaceBetween">Space Between</option>
              </select>
            </FieldRow>
            <label className="flex items-center justify-between py-1">
              <span className="font-semibold">Wrap Items</span>
              <input
                type="checkbox"
                checked={node.props.wrap}
                onChange={(e) => updateNodeProps(node.id, { wrap: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between py-1">
              <span className="font-semibold">M3E Connected Group</span>
              <input
                type="checkbox"
                checked={node.props.connected}
                onChange={(e) => updateNodeProps(node.id, { connected: e.target.checked })}
              />
            </label>
          </div>
        )}

        {node.type === "ListItem" && (
          <div className="space-y-3">
            <FieldRow label="Headline">
              <input
                type="text"
                value={node.props.headline}
                onChange={(e) => updateNodeProps(node.id, { headline: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Supporting Text">
              <input
                type="text"
                value={node.props.supportingText ?? ""}
                onChange={(e) =>
                  updateNodeProps(node.id, { supportingText: e.target.value || undefined })
                }
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Leading Style">
              <select
                value={node.props.leadingStyle}
                onChange={(e) => updateNodeProps(node.id, { leadingStyle: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="avatar">Avatar Circle</option>
                <option value="icon">Plain Icon</option>
                <option value="none">None</option>
              </select>
            </FieldRow>
            {node.props.leadingStyle !== "none" && (
              <IconField
                label="Leading Icon"
                value={node.props.leadingIcon}
                inputStyle={inputStyle}
                onChange={(leadingIcon) => updateNodeProps(node.id, { leadingIcon })}
                onOpenPicker={() =>
                  setIconPickerTarget({
                    propKey: "leadingIcon",
                    value: node.props.leadingIcon,
                    allowEmpty: true,
                  })
                }
              />
            )}
            <FieldRow label="Trailing Control">
              <select
                value={node.props.trailingType}
                onChange={(e) => updateNodeProps(node.id, { trailingType: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="none">None</option>
                <option value="icon">Icon</option>
                <option value="switch">Switch</option>
                <option value="checkbox">Checkbox</option>
              </select>
            </FieldRow>
            {(node.props.trailingType === "switch" || node.props.trailingType === "checkbox") && (
              <label className="flex items-center justify-between py-1">
                <span className="font-semibold">Checked</span>
                <input
                  type="checkbox"
                  checked={Boolean(node.props.checked)}
                  onChange={(e) => updateNodeProps(node.id, { checked: e.target.checked })}
                />
              </label>
            )}
          </div>
        )}

        {(node.type === "Switch" || node.type === "Checkbox" || node.type === "Chip") && (
          <div className="space-y-3">
            <FieldRow label="Label">
              <input
                type="text"
                value={node.props.label}
                onChange={(e) => updateNodeProps(node.id, { label: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            {node.type === "Chip" && (
              <IconField
                label="Chip Icon"
                value={node.props.icon}
                inputStyle={inputStyle}
                onChange={(icon) => updateNodeProps(node.id, { icon })}
                onOpenPicker={() =>
                  setIconPickerTarget({ propKey: "icon", value: node.props.icon, allowEmpty: true })
                }
              />
            )}
            <label className="flex items-center justify-between py-1">
              <span className="font-semibold">
                {node.type === "Chip" ? "Selected" : "Checked"}
              </span>
              <input
                type="checkbox"
                checked={node.type === "Chip" ? node.props.selected : node.props.checked}
                onChange={(e) =>
                  updateNodeProps(
                    node.id,
                    node.type === "Chip"
                      ? { selected: e.target.checked }
                      : { checked: e.target.checked },
                  )
                }
              />
            </label>
          </div>
        )}

        {node.type === "Slider" && (
          <div className="space-y-3">
            <FieldRow label="Label">
              <input
                type="text"
                value={node.props.label}
                onChange={(e) => updateNodeProps(node.id, { label: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label={`Default Value (${node.props.value})`}>
              <input
                type="range"
                min={node.props.min}
                max={node.props.max}
                value={node.props.value}
                onChange={(e) => updateNodeProps(node.id, { value: Number(e.target.value) })}
                className="w-full"
              />
            </FieldRow>
          </div>
        )}

        {node.type === "Image" && (
          <div className="space-y-3">
            <FieldRow label="Image URL">
              <input
                type="text"
                value={node.props.src}
                onChange={(e) => updateNodeProps(node.id, { src: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Alt Text">
              <input
                type="text"
                value={node.props.alt}
                onChange={(e) => updateNodeProps(node.id, { alt: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Aspect Ratio">
              <select
                aria-label="Aspect Ratio"
                value={node.props.aspectRatio}
                onChange={(e) => updateNodeProps(node.id, { aspectRatio: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="16:9">16:9 Wide</option>
                <option value="4:3">4:3 Standard</option>
                <option value="1:1">1:1 Square</option>
                <option value="auto">Auto</option>
              </select>
            </FieldRow>
            <FieldRow label="Shape">
              <select
                value={node.props.shape}
                onChange={(e) => updateNodeProps(node.id, { shape: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="rounded">Rounded</option>
                <option value="circle">Circle</option>
                <option value="square">Square</option>
              </select>
            </FieldRow>
            <FieldRow label="Content Scale">
              <select
                value={node.props.contentScale}
                onChange={(e) => updateNodeProps(node.id, { contentScale: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="cover">Cover (Crop)</option>
                <option value="contain">Contain (Fit)</option>
              </select>
            </FieldRow>
          </div>
        )}

        {node.type === "ProgressBar" && (
          <div className="space-y-3">
            <label className="flex items-center justify-between py-1">
              <span className="font-semibold">Determinate</span>
              <input
                aria-label="Determinate"
                type="checkbox"
                checked={node.props.determinate}
                onChange={(e) => updateNodeProps(node.id, { determinate: e.target.checked })}
              />
            </label>
            {node.props.determinate && (
              <FieldRow label={`Progress (${node.props.value}%)`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={node.props.value}
                  onChange={(e) => updateNodeProps(node.id, { value: Number(e.target.value) })}
                  className="w-full"
                />
              </FieldRow>
            )}
            <label className="flex items-center justify-between py-1">
              <span className="font-semibold">Wavy Expressive</span>
              <input
                aria-label="Wavy Expressive"
                type="checkbox"
                checked={node.props.wavy}
                onChange={(e) => updateNodeProps(node.id, { wavy: e.target.checked })}
              />
            </label>
          </div>
        )}

        {node.type === "LoadingIndicator" && (
          <div className="space-y-3">
            <FieldRow label="Size (dp)">
              <input
                type="number"
                min={24}
                max={96}
                value={node.props.size}
                onChange={(e) => updateNodeProps(node.id, { size: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <label className="flex items-center justify-between py-1">
              <span className="font-semibold">Contained Circle</span>
              <input
                aria-label="Contained"
                type="checkbox"
                checked={node.props.contained}
                onChange={(e) => updateNodeProps(node.id, { contained: e.target.checked })}
              />
            </label>
          </div>
        )}

        {node.type === "Divider" && (
          <div className="space-y-3">
            <FieldRow label="Thickness (dp)">
              <input
                type="number"
                min={1}
                max={8}
                value={node.props.thickness}
                onChange={(e) => updateNodeProps(node.id, { thickness: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <label className="flex items-center justify-between py-1">
              <span className="font-semibold">16dp Inset</span>
              <input
                type="checkbox"
                checked={node.props.inset}
                onChange={(e) => updateNodeProps(node.id, { inset: e.target.checked })}
              />
            </label>
          </div>
        )}

        {node.type === "Badge" && (
          <div className="space-y-3">
            <FieldRow label="Badge Text">
              <input
                type="text"
                value={node.props.label}
                onChange={(e) => updateNodeProps(node.id, { label: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Color Role">
              <select
                value={node.props.colorRole}
                onChange={(e) => updateNodeProps(node.id, { colorRole: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="error">Error</option>
                <option value="primary">Primary</option>
                <option value="tertiaryContainer">Tertiary Container</option>
              </select>
            </FieldRow>
          </div>
        )}

        {node.type === "Spacer" && (
          <FieldRow label="Height (dp)">
            <input
              type="number"
              min={4}
              max={120}
              value={node.props.size}
              onChange={(e) => updateNodeProps(node.id, { size: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 text-xs outline-none"
              style={inputStyle}
            />
          </FieldRow>
        )}

        {node.type === "Icon" && (
          <div className="space-y-3">
            <IconField
              label="Material Symbol"
              value={node.props.name}
              inputStyle={inputStyle}
              onChange={(name) => updateNodeProps(node.id, { name: name ?? "star" })}
              onOpenPicker={() =>
                setIconPickerTarget({ propKey: "name", value: node.props.name, allowEmpty: false })
              }
            />
            <FieldRow label="Size (dp)">
              <input
                type="number"
                min={16}
                max={96}
                value={node.props.size}
                onChange={(e) => updateNodeProps(node.id, { size: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <label className="flex items-center justify-between py-1">
              <span className="font-semibold">Filled Glyph</span>
              <input
                type="checkbox"
                checked={node.props.fill}
                onChange={(e) => updateNodeProps(node.id, { fill: e.target.checked })}
              />
            </label>
          </div>
        )}

        {node.type === "SearchBar" && (
          <div className="space-y-3">
            <FieldRow label="Placeholder">
              <input
                type="text"
                value={node.props.placeholder}
                onChange={(e) => updateNodeProps(node.id, { placeholder: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Default Text">
              <input
                type="text"
                value={node.props.value}
                onChange={(e) => updateNodeProps(node.id, { value: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <IconField
              label="Leading Icon"
              value={node.props.leadingIcon}
              inputStyle={inputStyle}
              onChange={(leadingIcon) => updateNodeProps(node.id, { leadingIcon: leadingIcon ?? "search" })}
              onOpenPicker={() =>
                setIconPickerTarget({
                  propKey: "leadingIcon",
                  value: node.props.leadingIcon,
                  allowEmpty: false,
                })
              }
            />
            <label className="flex items-center justify-between py-1">
              <span className="font-semibold">Show Clear Button</span>
              <input
                type="checkbox"
                checked={node.props.showClearButton}
                onChange={(e) => updateNodeProps(node.id, { showClearButton: e.target.checked })}
              />
            </label>
          </div>
        )}

        {node.type === "SegmentedButton" && (
          <div className="space-y-3">
            <FieldRow label="Selected Value">
              <input
                type="text"
                value={node.props.selectedValue}
                onChange={(e) => updateNodeProps(node.id, { selectedValue: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <OptionsListEditor
              options={node.props.options}
              inputStyle={inputStyle}
              onChange={(options) => updateNodeProps(node.id, { options })}
            />
          </div>
        )}

        {node.type === "DataList" && (
          <div className="space-y-3">
            <FieldRow label="Collection Key">
              <input
                type="text"
                value={node.props.collectionKey}
                onChange={(e) => updateNodeProps(node.id, { collectionKey: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Search Variable Key">
              <input
                type="text"
                value={node.props.searchStateKey ?? ""}
                onChange={(e) =>
                  updateNodeProps(node.id, { searchStateKey: e.target.value || undefined })
                }
                placeholder="e.g. searchQuery"
                className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Search Fields (comma-separated)">
              <input
                type="text"
                value={node.props.searchFields.join(", ")}
                onChange={(e) =>
                  updateNodeProps(node.id, {
                    searchFields: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="Filter Field">
                <input
                  type="text"
                  value={node.props.filterField ?? ""}
                  onChange={(e) =>
                    updateNodeProps(node.id, { filterField: e.target.value || undefined })
                  }
                  placeholder="e.g. completed"
                  className="w-full px-2 py-1 text-xs font-mono outline-none"
                  style={inputStyle}
                />
              </FieldRow>
              <FieldRow label="Filter Var Key">
                <input
                  type="text"
                  value={node.props.filterStateKey ?? ""}
                  onChange={(e) =>
                    updateNodeProps(node.id, { filterStateKey: e.target.value || undefined })
                  }
                  placeholder="e.g. filterStatus"
                  className="w-full px-2 py-1 text-xs font-mono outline-none"
                  style={inputStyle}
                />
              </FieldRow>
            </div>
            <FieldRow label="Sort Variable Key">
              <input
                type="text"
                value={node.props.sortStateKey ?? ""}
                onChange={(e) =>
                  updateNodeProps(node.id, { sortStateKey: e.target.value || undefined })
                }
                placeholder="e.g. sortOrder"
                className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Empty Title">
              <input
                type="text"
                value={node.props.emptyTitle}
                onChange={(e) => updateNodeProps(node.id, { emptyTitle: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
          </div>
        )}

        {node.type === "DropdownMenu" && (
          <div className="space-y-3">
            <FieldRow label="Label">
              <input
                type="text"
                value={node.props.label}
                onChange={(e) => updateNodeProps(node.id, { label: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Placeholder">
              <input
                type="text"
                value={node.props.placeholder}
                onChange={(e) => updateNodeProps(node.id, { placeholder: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="Variant">
                <select
                  value={node.props.variant}
                  onChange={(e) => updateNodeProps(node.id, { variant: e.target.value })}
                  className="w-full px-2 py-1 text-xs outline-none"
                  style={inputStyle}
                >
                  <option value="outlined">Outlined</option>
                  <option value="filled">Filled</option>
                </select>
              </FieldRow>
              <FieldRow label="Default Value">
                <input
                  type="text"
                  value={node.props.selectedValue}
                  onChange={(e) => updateNodeProps(node.id, { selectedValue: e.target.value })}
                  className="w-full px-2 py-1 text-xs font-mono outline-none"
                  style={inputStyle}
                />
              </FieldRow>
            </div>
            <OptionsListEditor
              options={node.props.options}
              inputStyle={inputStyle}
              onChange={(options) => updateNodeProps(node.id, { options })}
            />
          </div>
        )}

        {node.type === "RadioGroup" && (
          <div className="space-y-3">
            <FieldRow label="Group Label">
              <input
                type="text"
                value={node.props.label}
                onChange={(e) => updateNodeProps(node.id, { label: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Selected Value">
              <input
                type="text"
                value={node.props.selectedValue}
                onChange={(e) => updateNodeProps(node.id, { selectedValue: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <OptionsListEditor
              options={node.props.options}
              inputStyle={inputStyle}
              onChange={(options) => updateNodeProps(node.id, { options })}
            />
          </div>
        )}

        {node.type === "Tabs" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="Variant">
                <select
                  value={node.props.variant}
                  onChange={(e) => updateNodeProps(node.id, { variant: e.target.value })}
                  className="w-full px-2 py-1 text-xs outline-none"
                  style={inputStyle}
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                </select>
              </FieldRow>
              <FieldRow label="Default Tab">
                <input
                  type="text"
                  value={node.props.selectedValue}
                  onChange={(e) => updateNodeProps(node.id, { selectedValue: e.target.value })}
                  className="w-full px-2 py-1 text-xs font-mono outline-none"
                  style={inputStyle}
                />
              </FieldRow>
            </div>
            <OptionsListEditor
              options={node.props.options}
              inputStyle={inputStyle}
              onChange={(options) => updateNodeProps(node.id, { options })}
            />
          </div>
        )}

        {node.type === "AlertDialog" && (
          <div className="space-y-3">
            <FieldRow label="Dialog Title">
              <input
                type="text"
                value={node.props.title}
                onChange={(e) => updateNodeProps(node.id, { title: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Message Body">
              <textarea
                rows={2}
                value={node.props.message}
                onChange={(e) => updateNodeProps(node.id, { message: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs outline-none resize-y"
                style={inputStyle}
              />
            </FieldRow>
            <IconField
              label="Dialog Icon"
              value={node.props.icon}
              inputStyle={inputStyle}
              onChange={(icon) => updateNodeProps(node.id, { icon })}
              onOpenPicker={() =>
                setIconPickerTarget({
                  propKey: "icon",
                  value: node.props.icon,
                  allowEmpty: true,
                })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="Confirm Label">
                <input
                  type="text"
                  value={node.props.confirmLabel}
                  onChange={(e) => updateNodeProps(node.id, { confirmLabel: e.target.value })}
                  className="w-full px-2 py-1 text-xs outline-none"
                  style={inputStyle}
                />
              </FieldRow>
              <FieldRow label="Dismiss Label">
                <input
                  type="text"
                  value={node.props.dismissLabel ?? ""}
                  onChange={(e) =>
                    updateNodeProps(node.id, { dismissLabel: e.target.value || undefined })
                  }
                  className="w-full px-2 py-1 text-xs outline-none"
                  style={inputStyle}
                />
              </FieldRow>
            </div>
            <FieldRow label="Confirm Action">
              <select
                aria-label="Dialog Confirm Action"
                value={node.props.confirmAction?.type ?? "dismissOverlay"}
                onChange={(e) => {
                  const t = e.target.value;
                  const firstCol = project.state?.collections[0]?.key ?? "todos";
                  if (t === "deleteItem") {
                    updateNodeProps(node.id, {
                      confirmAction: {
                        type: "deleteItem",
                        collectionKey: firstCol,
                        idStateKey: "editingId",
                        navigateBackAfter: true,
                        snackbarMessage: "Deleted!",
                      },
                    });
                  } else if (t === "showSnackbar") {
                    updateNodeProps(node.id, {
                      confirmAction: { type: "showSnackbar", message: "Confirmed!" },
                    });
                  } else {
                    updateNodeProps(node.id, {
                      confirmAction: { type: "dismissOverlay" },
                    });
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="dismissOverlay">Dismiss Dialog</option>
                <option value="showSnackbar">Show Snackbar &amp; Dismiss</option>
                <option value="deleteItem">Delete Item &amp; Dismiss</option>
              </select>
            </FieldRow>
          </div>
        )}

        {node.type === "ModalBottomSheet" && (
          <div className="space-y-3">
            <FieldRow label="Sheet Title">
              <input
                type="text"
                value={node.props.title ?? ""}
                onChange={(e) => updateNodeProps(node.id, { title: e.target.value || undefined })}
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <label className="flex items-center justify-between py-1">
              <span className="font-semibold">Show Drag Handle</span>
              <input
                type="checkbox"
                checked={node.props.dragHandle}
                onChange={(e) => updateNodeProps(node.id, { dragHandle: e.target.checked })}
              />
            </label>
          </div>
        )}

        {/* Style & Layout Section */}
        <div
          className="pt-3 border-t space-y-3"
          style={{ borderColor: palette.outlineVariant }}
        >
          <div
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: palette.onSurfaceVariant }}
          >
            Layout &amp; Surface
          </div>
          <FieldRow label="Width">
            <select
              value={typeof node.style.width === "number" ? "wrap" : node.style.width ?? "wrap"}
              onChange={(e) =>
                updateNodeStyle(node.id, { width: e.target.value as "wrap" | "fill" })
              }
              className="w-full px-2.5 py-1.5 text-xs outline-none"
              style={inputStyle}
            >
              <option value="wrap">Wrap Content</option>
              <option value="fill">Fill Width</option>
            </select>
          </FieldRow>
          <div className="grid grid-cols-3 gap-2">
            <FieldRow label="Height (dp)">
              <input
                type="number"
                min={0}
                placeholder="auto"
                value={typeof node.style.height === "number" ? node.style.height : ""}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  updateNodeStyle(node.id, { height: raw ? Number(raw) : undefined });
                }}
                className="w-full px-2 py-1 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Padding (dp)">
              <input
                type="number"
                min={0}
                max={64}
                value={node.style.padding?.top ?? ""}
                placeholder="auto"
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  if (!raw) {
                    updateNodeStyle(node.id, { padding: undefined });
                  } else {
                    const v = Math.max(0, Number(raw) || 0);
                    updateNodeStyle(node.id, { padding: { top: v, right: v, bottom: v, left: v } });
                  }
                }}
                className="w-full px-2 py-1 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Radius (dp)">
              <input
                type="number"
                min={0}
                max={48}
                placeholder="auto"
                value={node.style.cornerRadius ?? ""}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  updateNodeStyle(node.id, { cornerRadius: raw ? Number(raw) : undefined });
                }}
                className="w-full px-2 py-1 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
          </div>
          <FieldRow label="Background Token">
            <select
              value={node.style.backgroundToken ?? "transparent"}
              onChange={(e) =>
                updateNodeStyle(node.id, {
                  backgroundToken: e.target.value as ColorTokenKey | "transparent",
                })
              }
              className="w-full px-2.5 py-1.5 text-xs outline-none"
              style={inputStyle}
            >
              <option value="transparent">Default / Transparent</option>
              {COLOR_TOKEN_OPTIONS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </FieldRow>
        </div>

        {/* Data Binding Section */}
        <div
          className="pt-3 border-t space-y-3"
          style={{ borderColor: palette.outlineVariant }}
        >
          <div
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: palette.onSurfaceVariant }}
          >
            Data Binding
          </div>
          <FieldRow label="State Variable Key">
            <select
              aria-label="Bound State Variable"
              value={node.bindings?.stateKey ?? ""}
              onChange={(e) => {
                const stateKey = e.target.value || undefined;
                const itemField = node.bindings?.itemField;
                updateNodeBindings(
                  node.id,
                  stateKey || itemField
                    ? { ...(stateKey ? { stateKey } : {}), ...(itemField ? { itemField } : {}) }
                    : undefined,
                );
              }}
              className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
              style={inputStyle}
            >
              <option value="">Unbound</option>
              {(project.state?.variables ?? []).map((v) => (
                <option key={v.key} value={v.key}>
                  {v.key} ({v.type})
                </option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="DataList Item Field">
            <input
              type="text"
              placeholder="e.g. completed"
              value={node.bindings?.itemField ?? ""}
              onChange={(e) => {
                const itemField = e.target.value.trim() || undefined;
                const stateKey = node.bindings?.stateKey;
                updateNodeBindings(
                  node.id,
                  stateKey || itemField
                    ? { ...(stateKey ? { stateKey } : {}), ...(itemField ? { itemField } : {}) }
                    : undefined,
                );
              }}
              className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
              style={inputStyle}
            />
          </FieldRow>
        </div>

        {/* Conditional Visibility Section */}
        <div
          className="pt-3 border-t space-y-2.5"
          style={{ borderColor: palette.outlineVariant }}
        >
          <div
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: palette.onSurfaceVariant }}
          >
            Conditional Visibility
          </div>
          <FieldRow label="Show When State Variable">
            <select
              aria-label="Visibility State Variable"
              value={node.visibleWhen?.stateKey ?? ""}
              onChange={(e) => {
                const stateKey = e.target.value;
                updateNodeVisibility(
                  node.id,
                  stateKey
                    ? {
                        stateKey,
                        operator: node.visibleWhen?.operator ?? "truthy",
                        value: node.visibleWhen?.value,
                      }
                    : undefined,
                );
              }}
              className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
              style={inputStyle}
            >
              <option value="">Always Visible</option>
              {(project.state?.variables ?? []).map((v) => (
                <option key={v.key} value={v.key}>
                  {v.key} ({v.type})
                </option>
              ))}
            </select>
          </FieldRow>
          {node.visibleWhen?.stateKey && (
            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="Condition">
                <select
                  aria-label="Visibility Operator"
                  value={node.visibleWhen.operator}
                  onChange={(e) =>
                    updateNodeVisibility(node.id, {
                      ...node.visibleWhen!,
                      operator: e.target.value as VisibilityCondition["operator"],
                    })
                  }
                  className="w-full px-2 py-1 text-xs outline-none"
                  style={inputStyle}
                >
                  <option value="truthy">Is Truthy</option>
                  <option value="falsy">Is Falsy</option>
                  <option value="equals">Equals</option>
                  <option value="notEquals">Not Equals</option>
                </select>
              </FieldRow>
              {(node.visibleWhen.operator === "equals" ||
                node.visibleWhen.operator === "notEquals") && (
                <FieldRow label="Match Value">
                  <input
                    type="text"
                    aria-label="Visibility Match Value"
                    value={node.visibleWhen.value ?? ""}
                    onChange={(e) =>
                      updateNodeVisibility(node.id, {
                        ...node.visibleWhen!,
                        value: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1 text-xs outline-none"
                    style={inputStyle}
                  />
                </FieldRow>
              )}
            </div>
          )}
        </div>

        {/* Click Action Section */}
        <div
          className="pt-3 border-t space-y-3"
          style={{ borderColor: palette.outlineVariant }}
        >
          <div
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: palette.onSurfaceVariant }}
          >
            Interaction Action
          </div>
          <FieldRow label="On Tap">
            <select
              value={currentAction.type}
              onChange={(e) => {
                const nextType = e.target.value as UserAction["type"];
                const firstCol = project.state?.collections[0]?.key ?? "todos";
                const firstVar = project.state?.variables[0]?.key ?? "";
                if (nextType === "none") updateNodeAction(node.id, { type: "none" });
                else if (nextType === "navigateBack")
                  updateNodeAction(node.id, { type: "navigateBack" });
                else if (nextType === "navigate")
                  updateNodeAction(node.id, {
                    type: "navigate",
                    targetScreenId: project.screens[0]?.id ?? "",
                    transition: "slide",
                  });
                else if (nextType === "showSnackbar")
                  updateNodeAction(node.id, {
                    type: "showSnackbar",
                    message: "Action triggered!",
                  });
                else if (nextType === "openUrl")
                  updateNodeAction(node.id, {
                    type: "openUrl",
                    url: "https://developer.android.com",
                  });
                else if (nextType === "toggleState")
                  updateNodeAction(node.id, { type: "toggleState", stateKey: firstVar });
                else if (nextType === "setState")
                  updateNodeAction(node.id, { type: "setState", stateKey: firstVar, value: "" });
                else if (nextType === "createItem")
                  updateNodeAction(node.id, {
                    type: "createItem",
                    collectionKey: firstCol,
                    fieldFromState: { title: "quickTitle" },
                    clearStateKeys: ["quickTitle"],
                    snackbarMessage: "Item created",
                  });
                else if (nextType === "selectItem")
                  updateNodeAction(node.id, {
                    type: "selectItem",
                    collectionKey: firstCol,
                    targetStateKey: "editingId",
                    targetScreenId: project.screens[1]?.id ?? project.screens[0]?.id,
                    transition: "slide",
                  });
                else if (nextType === "updateItem")
                  updateNodeAction(node.id, {
                    type: "updateItem",
                    collectionKey: firstCol,
                    idStateKey: "editingId",
                    fieldFromState: { title: "draftTitle" },
                    createIfMissing: true,
                    navigateBackAfter: true,
                  });
                else if (nextType === "toggleItemField")
                  updateNodeAction(node.id, {
                    type: "toggleItemField",
                    collectionKey: firstCol,
                    field: "completed",
                  });
                else if (nextType === "deleteItem")
                  updateNodeAction(node.id, {
                    type: "deleteItem",
                    collectionKey: firstCol,
                    snackbarMessage: "Item deleted",
                  });
                else if (nextType === "openOverlay") {
                  const firstOv = Object.values(activeScreen.nodes).find((n) =>
                    OVERLAY_TYPES.has(n.type),
                  );
                  updateNodeAction(node.id, {
                    type: "openOverlay",
                    targetNodeId: firstOv?.id ?? "",
                  });
                } else if (nextType === "dismissOverlay")
                  updateNodeAction(node.id, { type: "dismissOverlay" });
              }}
              className="w-full px-2.5 py-1.5 text-xs outline-none"
              style={inputStyle}
            >
              <option value="none">None</option>
              <option value="navigate">Navigate to Screen</option>
              <option value="navigateBack">Navigate Back</option>
              <option value="showSnackbar">Show Snackbar</option>
              <option value="openUrl">Open URL</option>
              <option value="openOverlay">Open Dialog / Sheet</option>
              <option value="dismissOverlay">Dismiss Active Overlay</option>
              <option value="toggleState">Toggle State Variable</option>
              <option value="setState">Set State Variable</option>
              <option value="createItem">Create Collection Item</option>
              <option value="selectItem">Select Item &amp; Edit</option>
              <option value="updateItem">Update Collection Item</option>
              <option value="toggleItemField">Toggle Item Field</option>
              <option value="deleteItem">Delete Collection Item</option>
            </select>
          </FieldRow>

          {currentAction.type === "openOverlay" && (
            <FieldRow label="Target Overlay (on current screen)">
              <select
                aria-label="Target Overlay"
                value={currentAction.targetNodeId}
                onChange={(e) =>
                  updateNodeAction(node.id, {
                    ...currentAction,
                    targetNodeId: e.target.value,
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              >
                <option value="">Select overlay node...</option>
                {Object.values(activeScreen.nodes)
                  .filter((n) => OVERLAY_TYPES.has(n.type))
                  .map((ov) => (
                    <option key={ov.id} value={ov.id}>
                      {ov.name || ov.type} ({ov.id})
                    </option>
                  ))}
              </select>
            </FieldRow>
          )}

          {currentAction.type === "navigate" && (
            <>
              <FieldRow label="Destination Screen">
                <select
                  value={currentAction.targetScreenId}
                  onChange={(e) =>
                    updateNodeAction(node.id, {
                      ...currentAction,
                      targetScreenId: e.target.value,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs outline-none"
                  style={inputStyle}
                >
                  {project.screens.map((scr) => (
                    <option key={scr.id} value={scr.id}>
                      {scr.name}
                    </option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Transition">
                <select
                  value={currentAction.transition}
                  onChange={(e) =>
                    updateNodeAction(node.id, {
                      ...currentAction,
                      transition: e.target.value as TransitionType,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs outline-none"
                  style={inputStyle}
                >
                  <option value="slide">Slide</option>
                  <option value="fade">Fade</option>
                  <option value="expand">Expand</option>
                  <option value="none">None</option>
                </select>
              </FieldRow>
            </>
          )}

          {currentAction.type === "showSnackbar" && (
            <FieldRow label="Snackbar Message">
              <input
                type="text"
                value={currentAction.message}
                onChange={(e) =>
                  updateNodeAction(node.id, { ...currentAction, message: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
          )}

          {(currentAction.type === "toggleState" || currentAction.type === "setState") && (
            <FieldRow label="State Variable Key">
              <input
                type="text"
                value={currentAction.stateKey ?? ""}
                onChange={(e) =>
                  updateNodeAction(node.id, { ...currentAction, stateKey: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
                style={inputStyle}
              />
            </FieldRow>
          )}

          {currentAction.type === "setState" && (
            <FieldRow label="Value">
              <input
                type="text"
                value={String(currentAction.value)}
                onChange={(e) =>
                  updateNodeAction(node.id, { ...currentAction, value: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs outline-none"
                style={inputStyle}
              />
            </FieldRow>
          )}

          {(currentAction.type === "createItem" ||
            currentAction.type === "selectItem" ||
            currentAction.type === "updateItem" ||
            currentAction.type === "toggleItemField" ||
            currentAction.type === "deleteItem") && (
            <FieldRow label="Collection Key">
              <input
                type="text"
                value={currentAction.collectionKey}
                onChange={(e) =>
                  updateNodeAction(node.id, { ...currentAction, collectionKey: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
                style={inputStyle}
              />
            </FieldRow>
          )}

          {currentAction.type === "toggleItemField" && (
            <FieldRow label="Boolean Field Key">
              <input
                type="text"
                value={currentAction.field}
                onChange={(e) =>
                  updateNodeAction(node.id, { ...currentAction, field: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
                style={inputStyle}
              />
            </FieldRow>
          )}

          {(currentAction.type === "createItem" || currentAction.type === "updateItem") && (
            <>
              <FieldRow label="Field Map (field=stateKey, ...)">
                <input
                  type="text"
                  value={formatKeyValuePairs(currentAction.fieldFromState)}
                  onChange={(e) =>
                    updateNodeAction(node.id, {
                      ...currentAction,
                      fieldFromState: parseKeyValuePairs(e.target.value),
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
                  style={inputStyle}
                />
              </FieldRow>
              <FieldRow label="Clear State Keys After">
                <input
                  type="text"
                  placeholder="quickTitle, draftTitle"
                  value={(currentAction.clearStateKeys ?? []).join(", ")}
                  onChange={(e) =>
                    updateNodeAction(node.id, {
                      ...currentAction,
                      clearStateKeys: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
                  style={inputStyle}
                />
              </FieldRow>
            </>
          )}

          {(currentAction.type === "updateItem" || currentAction.type === "deleteItem") && (
            <FieldRow label="Selected ID Variable Key">
              <input
                type="text"
                placeholder="editingId (blank uses row item)"
                value={currentAction.idStateKey ?? ""}
                onChange={(e) =>
                  updateNodeAction(node.id, {
                    ...currentAction,
                    idStateKey: e.target.value.trim() || undefined,
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
                style={inputStyle}
              />
            </FieldRow>
          )}

          {currentAction.type === "selectItem" && (
            <>
              <FieldRow label="Target ID Variable Key">
                <input
                  type="text"
                  value={currentAction.targetStateKey}
                  onChange={(e) =>
                    updateNodeAction(node.id, { ...currentAction, targetStateKey: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
                  style={inputStyle}
                />
              </FieldRow>
              <FieldRow label="Navigate Screen (optional)">
                <select
                  aria-label="Select Item Target Screen"
                  value={currentAction.targetScreenId ?? ""}
                  onChange={(e) =>
                    updateNodeAction(node.id, {
                      ...currentAction,
                      targetScreenId: e.target.value || undefined,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs outline-none"
                  style={inputStyle}
                >
                  <option value="">Stay on current screen</option>
                  {project.screens.map((scr) => (
                    <option key={scr.id} value={scr.id}>
                      {scr.name}
                    </option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Populate State (stateKey=field, ...)">
                <input
                  type="text"
                  value={formatKeyValuePairs(currentAction.populateState)}
                  onChange={(e) =>
                    updateNodeAction(node.id, {
                      ...currentAction,
                      populateState: parseKeyValuePairs(e.target.value),
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono outline-none"
                  style={inputStyle}
                />
              </FieldRow>
            </>
          )}

          {(currentAction.type === "createItem" ||
            currentAction.type === "updateItem" ||
            currentAction.type === "deleteItem") && (
            <label className="flex items-center justify-between py-1">
              <span className="font-semibold">Navigate Back After</span>
              <input
                type="checkbox"
                checked={Boolean(currentAction.navigateBackAfter)}
                onChange={(e) =>
                  updateNodeAction(node.id, {
                    ...currentAction,
                    navigateBackAfter: e.target.checked,
                  })
                }
              />
            </label>
          )}
        </div>
      </div>

      <IconPickerModal
        open={Boolean(iconPickerTarget)}
        value={iconPickerTarget?.value}
        onSelect={(iconName) => {
          if (!iconPickerTarget) return;
          updateNodeProps(node.id, {
            [iconPickerTarget.propKey]:
              iconName ?? (iconPickerTarget.allowEmpty ? undefined : iconPickerTarget.value),
          });
        }}
        onClose={() => setIconPickerTarget(null)}
      />
    </div>
  );
}
