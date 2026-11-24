import { useMemo, type CSSProperties, type MouseEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CONTAINER_TYPES, type ComponentNode, type ScreenNode } from "@/ast/types";
import { usePreviewStore } from "@/store/usePreviewStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useM3Theme } from "@/theme/ThemeContext";
import type { ColorTokenKey, M3Palette } from "@/theme/types";
import { Icon } from "../Icon";
import { M3LinearProgress, M3LoadingIndicator } from "./M3LoadingIndicator";

interface M3NodeRendererProps {
  screen: ScreenNode;
  nodeId: string;
  connectedInfo?: { index: number; total: number; axis: "row" | "column" };
}

function getPaddingCss(node: ComponentNode): string | undefined {
  const p = node.style.padding;
  if (!p) return undefined;
  return `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
}

function getMarginCss(node: ComponentNode): string | undefined {
  const m = node.style.margin;
  if (!m) return undefined;
  return `${m.top}px ${m.right}px ${m.bottom}px ${m.left}px`;
}

function getWidthStyle(node: ComponentNode): CSSProperties {
  const w = node.style.width;
  if (w === "fill") return { width: "100%", flex: "1 1 0%" };
  if (typeof w === "number") return { width: `${w}px` };
  return {};
}

function resolveBg(
  token: ColorTokenKey | "transparent" | undefined,
  palette: M3Palette,
): string | undefined {
  if (!token || token === "transparent") return undefined;
  return palette[token];
}

export function M3NodeRenderer({ screen, nodeId, connectedInfo }: M3NodeRendererProps) {
  const { palette, shapes, spacing, scaleR, typeStyle } = useM3Theme();
  const project = useProjectStore((s) => s.project);
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const selectNode = useProjectStore((s) => s.selectNode);
  const editorMode = useProjectStore((s) => s.editorMode);

  const previewValues = usePreviewStore((s) => s.values);
  const setPreviewValue = usePreviewStore((s) => s.setValue);
  const executeAction = usePreviewStore((s) => s.executeAction);

  const availableScreenIds = useMemo(
    () => new Set(project.screens.map((s) => s.id)),
    [project.screens],
  );

  const node = screen.nodes[nodeId];
  const isBodyRoot = Boolean(node && node.id === screen.slots.bodyId);
  const isSlotRoot = Boolean(
    node &&
      (isBodyRoot ||
        node.id === screen.slots.topBarId ||
        node.id === screen.slots.fabId),
  );
  const isContainer = Boolean(node && CONTAINER_TYPES.has(node.type));
  const isPreview = editorMode === "preview";

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition: sortTransition,
    isDragging,
  } = useSortable({
    id: `canvas:${nodeId}`,
    disabled: isPreview || isSlotRoot,
    data: {
      source: "canvas",
      nodeId,
      parentId: node?.parentId ?? null,
    },
  });

  const { setNodeRef: setDropRef, isOver: isContainerOver } = useDroppable({
    id: `container:${nodeId}`,
    disabled: isPreview || !isContainer,
    data: {
      targetType: "container",
      containerId: nodeId,
    },
  });

  const setMergedRef = (el: HTMLElement | null) => {
    setSortableRef(el);
    if (isContainer) setDropRef(el);
  };

  if (!node) return null;

  const isSelected = !isPreview && selectedNodeId === node.id;

  const handleNodeClick = (e: MouseEvent) => {
    if (isPreview) {
      if (node.action && node.action.type !== "none") {
        e.stopPropagation();
        executeAction(node.action, availableScreenIds);
      }
      return;
    }
    e.stopPropagation();
    selectNode(node.id);
  };

  const dndTransformStyle: CSSProperties =
    !isSlotRoot && !isPreview
      ? {
          transform: CSS.Translate.toString(transform),
          transition: sortTransition,
          opacity: isDragging ? 0.4 : 1,
        }
      : {};

  const selectionRingStyle: CSSProperties =
    !isPreview && !isBodyRoot
      ? {
          outline: isContainerOver
            ? `2px dashed ${palette.primary}`
            : isSelected
              ? `2px solid ${palette.primary}`
              : undefined,
          outlineOffset: isSelected || isContainerOver ? "2px" : undefined,
        }
      : !isPreview && isBodyRoot && isContainerOver
        ? {
            backgroundColor: `${palette.primaryContainer}28`,
          }
        : {};

  const isNativeButton =
    node.type === "Button" ||
    node.type === "IconButton" ||
    node.type === "FloatingActionButton";
  const { role: _dndRole, ...restDndAttributes } = attributes;
  const dragProps =
    !isSlotRoot && !isPreview
      ? {
          ...restDndAttributes,
          ...(isNativeButton ? {} : { role: undefined }),
          ...listeners,
        }
      : {};

  const commonAttrs = {
    "data-node-id": node.id,
    "data-node-type": node.type,
    "data-selected": isSelected ? "true" : "false",
    ...dragProps,
  };

  const renderConnectedRadius = (defaultR: number | string) => {
    if (!connectedInfo || connectedInfo.total <= 1) return defaultR;
    const { index, total, axis } = connectedInfo;
    const outer = shapes.full;
    const inner = shapes.small;
    const isFirst = index === 0;
    const isLast = index === total - 1;
    if (axis === "row") {
      return `${isFirst ? outer : inner}px ${isLast ? outer : inner}px ${isLast ? outer : inner}px ${isFirst ? outer : inner}px`;
    }
    const cardOuter = shapes.large;
    const cardInner = shapes.extraSmall;
    return `${isFirst ? cardOuter : cardInner}px ${isFirst ? cardOuter : cardInner}px ${isLast ? cardOuter : cardInner}px ${isLast ? cardOuter : cardInner}px`;
  };

  switch (node.type) {
    case "TopAppBar": {
      const { variant, title, subtitle, navigationIcon, navigationAction, actions } = node.props;
      const isLarge = variant === "large" || variant === "medium";
      const isCentered = variant === "centerAligned";
      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          data-testid="scaffold-topbar"
          onClick={handleNodeClick}
          className={`px-4 py-2.5 shrink-0 transition-all ${!isPreview ? "cursor-pointer" : ""}`}
          style={{
            backgroundColor: resolveBg(node.style.backgroundToken, palette) ?? palette.surface,
            color: palette.onSurface,
            ...selectionRingStyle,
          }}
        >
          <div className="flex items-center justify-between gap-2 min-h-[40px]">
            <div className="flex items-center gap-2 min-w-0">
              {navigationIcon &&
                (isPreview ? (
                  <button
                    type="button"
                    data-testid="topbar-nav-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      executeAction(navigationAction, availableScreenIds);
                    }}
                    className="m3-press w-9 h-9 flex items-center justify-center shrink-0 border-0 cursor-pointer"
                    style={{
                      borderRadius: shapes.full,
                      backgroundColor: palette.surfaceContainerHigh,
                      color: palette.onSurface,
                    }}
                    aria-label="Navigate"
                  >
                    <Icon name={navigationIcon} size={20} />
                  </button>
                ) : (
                  <span
                    className="w-9 h-9 flex items-center justify-center shrink-0"
                    style={{
                      borderRadius: shapes.full,
                      backgroundColor: palette.surfaceContainerHigh,
                      color: palette.onSurface,
                    }}
                  >
                    <Icon name={navigationIcon} size={20} />
                  </span>
                ))}
              {!isLarge && !isCentered && (
                <div className="min-w-0">
                  <div className="truncate" style={typeStyle("titleLarge")}>
                    {title}
                  </div>
                  {subtitle && (
                    <div
                      className="truncate"
                      style={{ ...typeStyle("labelSmall"), color: palette.onSurfaceVariant }}
                    >
                      {subtitle}
                    </div>
                  )}
                </div>
              )}
            </div>

            {isCentered && (
              <div className="text-center truncate flex-1" style={typeStyle("titleLarge")}>
                {title}
              </div>
            )}

            <div className="flex items-center gap-1 shrink-0">
              {actions.map((act) =>
                isPreview ? (
                  <button
                    key={act.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      executeAction(act.action, availableScreenIds);
                    }}
                    className="m3-press w-9 h-9 flex items-center justify-center border-0 cursor-pointer"
                    style={{
                      borderRadius: shapes.full,
                      backgroundColor: palette.surfaceContainerHigh,
                      color: palette.onSurfaceVariant,
                    }}
                    title={act.label}
                    aria-label={act.label}
                  >
                    <Icon name={act.icon} size={20} />
                  </button>
                ) : (
                  <span
                    key={act.id}
                    className="w-9 h-9 flex items-center justify-center"
                    style={{
                      borderRadius: shapes.full,
                      backgroundColor: palette.surfaceContainerHigh,
                      color: palette.onSurfaceVariant,
                    }}
                    title={act.label}
                  >
                    <Icon name={act.icon} size={20} />
                  </span>
                ),
              )}
            </div>
          </div>

          {isLarge && (
            <div className="pt-2 pb-1">
              <div
                className="truncate"
                style={typeStyle(variant === "large" ? "headlineMedium" : "headlineSmall")}
              >
                {title}
              </div>
              {subtitle && (
                <div style={{ ...typeStyle("bodySmall"), color: palette.onSurfaceVariant }}>
                  {subtitle}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    case "FloatingActionButton": {
      const { variant, icon, label, colorRole } = node.props;
      const bg = palette[colorRole] ?? palette.primaryContainer;
      const fg =
        colorRole === "primary"
          ? palette.onPrimary
          : colorRole === "secondaryContainer"
            ? palette.onSecondaryContainer
            : colorRole === "tertiaryContainer"
              ? palette.onTertiaryContainer
              : palette.onPrimaryContainer;
      const sizePx = variant === "small" ? 40 : variant === "large" ? 72 : 56;
      const fabRadius = variant === "small" ? shapes.medium : shapes.large;

      return (
        <button
          ref={setMergedRef}
          {...commonAttrs}
          type="button"
          onClick={handleNodeClick}
          className="m3-press flex items-center justify-center gap-2 border-0 cursor-pointer shadow-lg"
          style={{
            height: sizePx,
            minWidth: sizePx,
            padding: variant === "extended" ? "0 18px" : "0",
            borderRadius: fabRadius,
            backgroundColor: bg,
            color: fg,
            ...typeStyle("labelLarge"),
            ...selectionRingStyle,
          }}
        >
          <Icon name={icon} size={variant === "large" ? 28 : 22} />
          {variant === "extended" && label && <span>{label}</span>}
        </button>
      );
    }

    case "Column": {
      const { gap, scrollable, horizontalAlignment, verticalArrangement, connected } = node.props;
      const alignMap = { start: "flex-start", center: "center", end: "flex-end" } as const;
      const justifyMap = {
        top: "flex-start",
        center: "center",
        bottom: "flex-end",
        spaceBetween: "space-between",
      } as const;
      const pad = isBodyRoot ? `${spacing.screenMargin}px` : getPaddingCss(node);

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          data-testid={isBodyRoot ? "scaffold-body" : undefined}
          onClick={
            isBodyRoot
              ? (e) => {
                  if (isPreview) return;
                  e.stopPropagation();
                  selectNode(null);
                }
              : handleNodeClick
          }
          className={`flex flex-col ${isBodyRoot && scrollable ? "no-scrollbar flex-1 overflow-y-auto" : ""}`}
          style={{
            gap: connected ? 3 : gap ?? spacing.itemGap,
            alignItems: alignMap[horizontalAlignment] ?? "stretch",
            justifyContent: justifyMap[verticalArrangement] ?? "flex-start",
            padding: pad,
            margin: getMarginCss(node),
            width: node.style.width === "fill" ? "100%" : undefined,
            backgroundColor: resolveBg(node.style.backgroundToken, palette),
            borderRadius: node.style.cornerRadius,
            ...dndTransformStyle,
            ...selectionRingStyle,
          }}
        >
          {node.childIds.length === 0 && isBodyRoot && !isPreview ? (
            <div
              className="flex-1 min-h-[200px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed"
              style={{
                borderRadius: shapes.large,
                borderColor: palette.outlineVariant,
                color: palette.onSurfaceVariant,
              }}
            >
              <Icon name="add_circle_outline" size={28} color={palette.primary} />
              <div className="mt-2 text-xs font-semibold">Empty Screen Body</div>
              <div className="text-[11px] opacity-75 mt-0.5">
                Drag parts from the Parts palette or use Quick Add above
              </div>
            </div>
          ) : (
            <SortableContext
              items={node.childIds.map((cid) => `canvas:${cid}`)}
              strategy={verticalListSortingStrategy}
            >
              {node.childIds.map((cid, idx) => (
                <M3NodeRenderer
                  key={cid}
                  screen={screen}
                  nodeId={cid}
                  connectedInfo={
                    connected
                      ? { index: idx, total: node.childIds.length, axis: "column" }
                      : undefined
                  }
                />
              ))}
            </SortableContext>
          )}
        </div>
      );
    }

    case "Row": {
      const { gap, verticalAlignment, horizontalArrangement, wrap, connected } = node.props;
      const alignMap = { top: "flex-start", center: "center", bottom: "flex-end" } as const;
      const justifyMap = {
        start: "flex-start",
        center: "center",
        end: "flex-end",
        spaceBetween: "space-between",
      } as const;

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className={`flex flex-row min-h-[32px] ${!isPreview ? "cursor-pointer" : ""}`}
          style={{
            width: node.style.width === "fill" ? "100%" : undefined,
            gap: connected ? 3 : gap ?? spacing.itemGap,
            alignItems: alignMap[verticalAlignment],
            justifyContent: justifyMap[horizontalArrangement],
            flexWrap: wrap ? "wrap" : "nowrap",
            padding: getPaddingCss(node),
            margin: getMarginCss(node),
            backgroundColor: resolveBg(node.style.backgroundToken, palette),
            borderRadius: node.style.cornerRadius,
            ...dndTransformStyle,
            ...selectionRingStyle,
          }}
        >
          <SortableContext
            items={node.childIds.map((cid) => `canvas:${cid}`)}
            strategy={horizontalListSortingStrategy}
          >
            {node.childIds.map((cid, idx) => (
              <M3NodeRenderer
                key={cid}
                screen={screen}
                nodeId={cid}
                connectedInfo={
                  connected
                    ? { index: idx, total: node.childIds.length, axis: "row" }
                    : undefined
                }
              />
            ))}
          </SortableContext>
        </div>
      );
    }

    case "Box": {
      const align = node.props.contentAlignment;
      const map: Record<typeof align, CSSProperties> = {
        center: { alignItems: "center", justifyContent: "center" },
        topStart: { alignItems: "flex-start", justifyContent: "flex-start" },
        topEnd: { alignItems: "flex-start", justifyContent: "flex-end" },
        bottomStart: { alignItems: "flex-end", justifyContent: "flex-start" },
        bottomEnd: { alignItems: "flex-end", justifyContent: "flex-end" },
      };
      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className={`flex relative min-h-[40px] ${!isPreview ? "cursor-pointer" : ""}`}
          style={{
            width: node.style.width === "fill" ? "100%" : undefined,
            padding: getPaddingCss(node),
            backgroundColor: resolveBg(node.style.backgroundToken, palette),
            borderRadius: node.style.cornerRadius ?? shapes.medium,
            ...map[align],
            ...dndTransformStyle,
            ...selectionRingStyle,
          }}
        >
          <SortableContext
            items={node.childIds.map((cid) => `canvas:${cid}`)}
            strategy={verticalListSortingStrategy}
          >
            {node.childIds.map((cid) => (
              <M3NodeRenderer key={cid} screen={screen} nodeId={cid} />
            ))}
          </SortableContext>
        </div>
      );
    }

    case "Card": {
      const { variant, gap } = node.props;
      const defaultBg =
        variant === "elevated"
          ? palette.surfaceContainerLow
          : variant === "outlined"
            ? palette.surface
            : palette.surfaceContainerHighest;
      const bg = resolveBg(node.style.backgroundToken, palette) ?? defaultBg;
      const shadow =
        variant === "elevated"
          ? "0 2px 6px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)"
          : undefined;
      const border = variant === "outlined" ? `1px solid ${palette.outlineVariant}` : undefined;

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className={`flex flex-col transition-colors ${!isPreview || node.action ? "cursor-pointer" : ""}`}
          style={{
            width: node.style.width === "fill" ? "100%" : undefined,
            gap: gap ?? spacing.itemGap,
            padding: getPaddingCss(node) ?? `${spacing.cardPadding}px`,
            margin: getMarginCss(node),
            backgroundColor: bg,
            border,
            boxShadow: shadow,
            borderRadius: renderConnectedRadius(
              node.style.cornerRadius ?? shapes.large,
            ),
            ...dndTransformStyle,
            ...selectionRingStyle,
          }}
        >
          <SortableContext
            items={node.childIds.map((cid) => `canvas:${cid}`)}
            strategy={verticalListSortingStrategy}
          >
            {node.childIds.map((cid) => (
              <M3NodeRenderer key={cid} screen={screen} nodeId={cid} />
            ))}
          </SortableContext>
        </div>
      );
    }

    case "Text": {
      const { text, role, colorToken, align } = node.props;
      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className={!isPreview || node.action ? "cursor-pointer" : ""}
          style={{
            ...typeStyle(role),
            color: palette[colorToken] ?? palette.onSurface,
            textAlign: align,
            width: node.style.width === "fill" ? "100%" : undefined,
            ...dndTransformStyle,
            ...selectionRingStyle,
          }}
        >
          {text}
        </div>
      );
    }

    case "Icon": {
      const { name, size, fill, colorToken } = node.props;
      return (
        <span
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className={`inline-flex items-center justify-center shrink-0 ${!isPreview || node.action ? "cursor-pointer" : ""}`}
          style={{ ...dndTransformStyle, ...selectionRingStyle }}
        >
          <Icon name={name} size={size} fill={fill} color={palette[colorToken]} />
        </span>
      );
    }

    case "Badge": {
      const { label, colorRole } = node.props;
      const bg = palette[colorRole] ?? palette.error;
      const fg =
        colorRole === "primary"
          ? palette.onPrimary
          : colorRole === "tertiaryContainer"
            ? palette.onTertiaryContainer
            : palette.onError;
      return (
        <span
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className={`inline-flex items-center self-start px-2.5 py-0.5 ${!isPreview ? "cursor-pointer" : ""}`}
          style={{
            ...typeStyle("labelSmall"),
            borderRadius: shapes.full,
            backgroundColor: bg,
            color: fg,
            ...dndTransformStyle,
            ...selectionRingStyle,
          }}
        >
          {label}
        </span>
      );
    }

    case "Button": {
      const { label, variant, icon, enabled } = node.props;
      const styleByVariant: Record<typeof variant, CSSProperties> = {
        filled: { backgroundColor: palette.primary, color: palette.onPrimary, border: "none" },
        tonal: {
          backgroundColor: palette.secondaryContainer,
          color: palette.onSecondaryContainer,
          border: "none",
        },
        elevated: {
          backgroundColor: palette.surfaceContainerLow,
          color: palette.primary,
          border: "none",
          boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
        },
        outlined: {
          backgroundColor: "transparent",
          color: palette.primary,
          border: `1px solid ${palette.outline}`,
        },
        text: {
          backgroundColor: "transparent",
          color: palette.primary,
          border: "none",
        },
      };

      return (
        <button
          ref={setMergedRef}
          {...commonAttrs}
          type="button"
          onClick={handleNodeClick}
          disabled={!enabled}
          className="m3-press inline-flex items-center justify-center gap-1.5 px-4 cursor-pointer disabled:opacity-45"
          style={{
            height: spacing.controlHeight - 2,
            borderRadius: renderConnectedRadius(
              node.style.cornerRadius ?? shapes.full,
            ),
            ...styleByVariant[variant],
            ...typeStyle("labelLarge"),
            ...getWidthStyle(node),
            ...dndTransformStyle,
            ...selectionRingStyle,
          }}
        >
          {icon && <Icon name={icon} size={18} />}
          <span className="truncate">{label}</span>
        </button>
      );
    }

    case "IconButton": {
      const { icon, variant, toggleable, selectedIcon } = node.props;
      const activeToggle = isPreview && toggleable && Boolean(previewValues[node.id]);
      const styles: Record<typeof variant, CSSProperties> = {
        standard: {
          backgroundColor: activeToggle ? palette.primaryContainer : "transparent",
          color: activeToggle ? palette.onPrimaryContainer : palette.onSurfaceVariant,
          border: "none",
        },
        filled: { backgroundColor: palette.primary, color: palette.onPrimary, border: "none" },
        tonal: {
          backgroundColor: activeToggle ? palette.primary : palette.secondaryContainer,
          color: activeToggle ? palette.onPrimary : palette.onSecondaryContainer,
          border: "none",
        },
        outlined: {
          backgroundColor: activeToggle ? palette.inverseSurface : "transparent",
          color: activeToggle ? palette.inverseOnSurface : palette.onSurfaceVariant,
          border: `1px solid ${palette.outline}`,
        },
      };
      return (
        <button
          ref={setMergedRef}
          {...commonAttrs}
          type="button"
          onClick={(e) => {
            if (isPreview) {
              e.stopPropagation();
              if (toggleable) setPreviewValue(node.id, !activeToggle);
              executeAction(node.action, availableScreenIds);
              return;
            }
            handleNodeClick(e);
          }}
          className="m3-press w-10 h-10 flex items-center justify-center cursor-pointer"
          style={{
            borderRadius: shapes.full,
            ...styles[variant],
            ...dndTransformStyle,
            ...selectionRingStyle,
          }}
        >
          <Icon name={activeToggle && selectedIcon ? selectedIcon : icon} size={20} fill={activeToggle} />
        </button>
      );
    }

    case "TextField": {
      const { label, placeholder, value, variant, leadingIcon, trailingIcon, supportingText } =
        node.props;
      const isFilled = variant === "filled";
      const liveValue =
        isPreview && typeof previewValues[node.id] === "string"
          ? (previewValues[node.id] as string)
          : value;

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className="w-full cursor-pointer"
          style={{ ...dndTransformStyle, ...selectionRingStyle }}
        >
          <div
            className="px-3.5 py-2 flex items-center gap-2.5"
            style={{
              backgroundColor: isFilled ? palette.surfaceContainerHighest : palette.surface,
              borderRadius: isFilled
                ? `${shapes.extraSmall}px ${shapes.extraSmall}px 0 0`
                : shapes.small,
              border: isFilled ? "none" : `1px solid ${palette.outline}`,
              borderBottom: isFilled ? `2px solid ${palette.primary}` : `1px solid ${palette.outline}`,
            }}
          >
            {leadingIcon && (
              <Icon name={leadingIcon} size={18} color={palette.onSurfaceVariant} />
            )}
            <div className="flex-1 min-w-0">
              <div style={{ ...typeStyle("labelSmall"), color: palette.primary }}>{label}</div>
              {isPreview ? (
                <input
                  type="text"
                  aria-label={label}
                  value={liveValue}
                  placeholder={placeholder}
                  onChange={(e) => setPreviewValue(node.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-transparent outline-none border-0 p-0"
                  style={{
                    ...typeStyle("bodyMedium"),
                    color: palette.onSurface,
                  }}
                />
              ) : (
                <div
                  className="truncate"
                  style={{
                    ...typeStyle("bodyMedium"),
                    color: value ? palette.onSurface : palette.onSurfaceVariant,
                  }}
                >
                  {value || placeholder}
                </div>
              )}
            </div>
            {trailingIcon && (
              <Icon name={trailingIcon} size={18} color={palette.onSurfaceVariant} />
            )}
          </div>
          {supportingText && (
            <div
              className="px-3.5 pt-1"
              style={{ ...typeStyle("bodySmall"), color: palette.onSurfaceVariant }}
            >
              {supportingText}
            </div>
          )}
        </div>
      );
    }

    case "Switch": {
      const { label, checked, showCheckIcon } = node.props;
      const isChecked =
        isPreview && typeof previewValues[node.id] === "boolean"
          ? (previewValues[node.id] as boolean)
          : checked;

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={(e) => {
            if (isPreview) {
              e.stopPropagation();
              setPreviewValue(node.id, !isChecked);
              return;
            }
            handleNodeClick(e);
          }}
          className="w-full flex items-center justify-between gap-3 py-1 cursor-pointer"
          style={{ ...dndTransformStyle, ...selectionRingStyle }}
        >
          <span style={typeStyle("bodyMedium")}>{label}</span>
          <span
            role="switch"
            aria-checked={isChecked}
            className="w-12 h-7 rounded-full p-1 flex items-center shrink-0 transition-colors"
            style={{
              backgroundColor: isChecked ? palette.primary : palette.surfaceContainerHighest,
              justifyContent: isChecked ? "flex-end" : "flex-start",
              border: isChecked ? "none" : `2px solid ${palette.outline}`,
            }}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: isChecked ? palette.onPrimary : palette.outline,
                color: palette.primary,
              }}
            >
              {isChecked && showCheckIcon && <Icon name="check" size={13} />}
            </span>
          </span>
        </div>
      );
    }

    case "Checkbox": {
      const { label, checked } = node.props;
      const isChecked =
        isPreview && typeof previewValues[node.id] === "boolean"
          ? (previewValues[node.id] as boolean)
          : checked;

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={(e) => {
            if (isPreview) {
              e.stopPropagation();
              setPreviewValue(node.id, !isChecked);
              return;
            }
            handleNodeClick(e);
          }}
          className="flex items-center gap-2.5 py-1 cursor-pointer"
          style={{ ...dndTransformStyle, ...selectionRingStyle }}
        >
          <span
            role="checkbox"
            aria-checked={isChecked}
            className="w-5 h-5 flex items-center justify-center shrink-0 transition-colors"
            style={{
              borderRadius: shapes.extraSmall,
              backgroundColor: isChecked ? palette.primary : "transparent",
              border: isChecked ? "none" : `2px solid ${palette.outline}`,
              color: palette.onPrimary,
            }}
          >
            {isChecked && <Icon name="check" size={15} />}
          </span>
          <span style={typeStyle("bodyMedium")}>{label}</span>
        </div>
      );
    }

    case "Slider": {
      const { label, value, min, max } = node.props;
      const liveVal =
        isPreview && typeof previewValues[node.id] === "number"
          ? (previewValues[node.id] as number)
          : value;
      const pct = Math.max(0, Math.min(100, ((liveVal - min) / Math.max(1, max - min)) * 100));

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className="w-full space-y-1 cursor-pointer"
          style={{ ...dndTransformStyle, ...selectionRingStyle }}
        >
          <div className="flex items-center justify-between">
            <span style={typeStyle("labelMedium")}>{label}</span>
            <span style={{ ...typeStyle("labelMedium"), color: palette.primary }}>{liveVal}</span>
          </div>
          {isPreview ? (
            <input
              type="range"
              aria-label={label}
              min={min}
              max={max}
              value={liveVal}
              onChange={(e) => setPreviewValue(node.id, Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              className="m3-range"
              style={
                {
                  "--track": palette.secondaryContainer,
                  "--thumb": palette.primary,
                } as CSSProperties
              }
            />
          ) : (
            <div
              className="relative h-2.5 rounded-full overflow-hidden"
              style={{ backgroundColor: palette.secondaryContainer }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: palette.primary }}
              />
            </div>
          )}
        </div>
      );
    }

    case "Chip": {
      const { label, icon, selected } = node.props;
      const isSelectedChip =
        isPreview && typeof previewValues[node.id] === "boolean"
          ? (previewValues[node.id] as boolean)
          : selected;

      return (
        <span
          ref={setMergedRef}
          {...commonAttrs}
          onClick={(e) => {
            if (isPreview) {
              e.stopPropagation();
              setPreviewValue(node.id, !isSelectedChip);
              executeAction(node.action, availableScreenIds);
              return;
            }
            handleNodeClick(e);
          }}
          className="inline-flex items-center gap-1.5 px-3 h-8 cursor-pointer transition-colors"
          style={{
            borderRadius: shapes.small,
            backgroundColor: isSelectedChip ? palette.secondaryContainer : "transparent",
            color: isSelectedChip ? palette.onSecondaryContainer : palette.onSurfaceVariant,
            border: isSelectedChip ? "none" : `1px solid ${palette.outline}`,
            ...typeStyle("labelLarge"),
            ...dndTransformStyle,
            ...selectionRingStyle,
          }}
        >
          {(isSelectedChip || icon) && (
            <Icon name={isSelectedChip ? "check" : icon!} size={16} />
          )}
          <span>{label}</span>
        </span>
      );
    }

    case "ListItem": {
      const {
        headline,
        supportingText,
        overlineText,
        leadingIcon,
        leadingStyle,
        trailingType,
        trailingIcon,
        checked,
      } = node.props;
      const isChecked =
        isPreview && typeof previewValues[node.id] === "boolean"
          ? (previewValues[node.id] as boolean)
          : Boolean(checked);

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={(e) => {
            if (isPreview) {
              e.stopPropagation();
              if (trailingType === "switch" || trailingType === "checkbox") {
                setPreviewValue(node.id, !isChecked);
              }
              executeAction(node.action, availableScreenIds);
              return;
            }
            handleNodeClick(e);
          }}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer"
          style={{
            borderRadius: renderConnectedRadius(shapes.medium),
            backgroundColor: connectedInfo
              ? palette.surfaceContainerHigh
              : resolveBg(node.style.backgroundToken, palette) ?? "transparent",
            ...dndTransformStyle,
            ...selectionRingStyle,
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {leadingStyle !== "none" && leadingIcon && (
              <div
                className="w-10 h-10 shrink-0 flex items-center justify-center"
                style={{
                  borderRadius: leadingStyle === "avatar" ? shapes.full : shapes.small,
                  backgroundColor:
                    leadingStyle === "avatar" ? palette.primaryContainer : "transparent",
                  color:
                    leadingStyle === "avatar"
                      ? palette.onPrimaryContainer
                      : palette.onSurfaceVariant,
                }}
              >
                <Icon name={leadingIcon} size={20} fill={leadingStyle === "avatar"} />
              </div>
            )}
            <div className="min-w-0">
              {overlineText && (
                <div
                  className="truncate"
                  style={{ ...typeStyle("labelSmall"), color: palette.onSurfaceVariant }}
                >
                  {overlineText}
                </div>
              )}
              <div className="truncate" style={typeStyle("bodyLarge")}>
                {headline}
              </div>
              {supportingText && (
                <div
                  className="truncate"
                  style={{ ...typeStyle("bodyMedium"), color: palette.onSurfaceVariant }}
                >
                  {supportingText}
                </div>
              )}
            </div>
          </div>

          {trailingType === "icon" && trailingIcon && (
            <Icon name={trailingIcon} size={20} color={palette.onSurfaceVariant} />
          )}
          {trailingType === "switch" && (
            <span
              role="switch"
              aria-checked={isChecked}
              className="w-11 h-6 rounded-full p-0.5 flex items-center shrink-0 transition-colors"
              style={{
                backgroundColor: isChecked ? palette.primary : palette.surfaceContainerHighest,
                justifyContent: isChecked ? "flex-end" : "flex-start",
                border: isChecked ? "none" : `2px solid ${palette.outline}`,
              }}
            >
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: isChecked ? palette.onPrimary : palette.outline }}
              />
            </span>
          )}
          {trailingType === "checkbox" && (
            <span
              role="checkbox"
              aria-checked={isChecked}
              className="w-5 h-5 flex items-center justify-center shrink-0 transition-colors"
              style={{
                borderRadius: shapes.extraSmall,
                backgroundColor: isChecked ? palette.primary : "transparent",
                border: isChecked ? "none" : `2px solid ${palette.outline}`,
                color: palette.onPrimary,
              }}
            >
              {isChecked && <Icon name="check" size={14} />}
            </span>
          )}
        </div>
      );
    }

    case "Image": {
      const { src, alt, aspectRatio, contentScale, shape } = node.props;
      const radius =
        shape === "circle" ? 9999 : shape === "square" ? 0 : scaleR(16);
      const ratioMap = {
        "16:9": "16 / 9",
        "4:3": "4 / 3",
        "1:1": "1 / 1",
        auto: undefined,
      } as const;
      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className={`w-full overflow-hidden ${!isPreview || node.action ? "cursor-pointer" : ""}`}
          style={{
            borderRadius: radius,
            aspectRatio: ratioMap[aspectRatio],
            backgroundColor: palette.surfaceContainerHigh,
            ...dndTransformStyle,
            ...selectionRingStyle,
          }}
        >
          <img
            src={src}
            alt={alt}
            className="w-full h-full block"
            style={{ objectFit: contentScale }}
          />
        </div>
      );
    }

    case "Spacer":
      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className={`w-full shrink-0 ${!isPreview ? "cursor-pointer" : ""}`}
          style={{
            height: node.props.size,
            ...dndTransformStyle,
            ...selectionRingStyle,
          }}
        />
      );

    case "Divider":
      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className={`w-full py-1 ${!isPreview ? "cursor-pointer" : ""}`}
          style={{ ...dndTransformStyle, ...selectionRingStyle }}
        >
          <div
            style={{
              height: node.props.thickness,
              marginLeft: node.props.inset ? 16 : 0,
              backgroundColor: palette.outlineVariant,
            }}
          />
        </div>
      );

    case "LoadingIndicator":
      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className={`inline-flex items-center justify-center ${!isPreview ? "cursor-pointer" : ""}`}
          style={{ ...dndTransformStyle, ...selectionRingStyle }}
        >
          <M3LoadingIndicator
            size={node.props.size}
            color={palette.primary}
            contained={node.props.contained}
            containerColor={palette.primaryContainer}
          />
        </div>
      );

    case "ProgressBar": {
      const { determinate, value, wavy } = node.props;
      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className={`w-full py-1 ${!isPreview ? "cursor-pointer" : ""}`}
          style={{ ...dndTransformStyle, ...selectionRingStyle }}
        >
          <M3LinearProgress
            width={280}
            color={palette.primary}
            trackColor={palette.secondaryContainer}
            wavy={wavy}
            value={determinate ? value / 100 : undefined}
          />
        </div>
      );
    }

    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
}

export function isNodeContainer(node: ComponentNode | undefined): boolean {
  return Boolean(node && CONTAINER_TYPES.has(node.type));
}
