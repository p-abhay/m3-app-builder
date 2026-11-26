import { createContext, useContext, useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { evaluateVisibility, queryCollection, resolveTemplateString } from "@/ast/state";
import {
  CONTAINER_TYPES,
  OVERLAY_TYPES,
  type CollectionRecord,
  type ComponentNode,
  type ScreenNode,
} from "@/ast/types";
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
  forceRenderOverlay?: boolean;
}

interface ItemScope {
  collectionKey: string;
  item: CollectionRecord & { id: string };
}

const ItemScopeContext = createContext<ItemScope | null>(null);

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

function getAlignSelfStyle(node: ComponentNode): CSSProperties {
  const align = node.style.alignSelf;
  if (!align || align === "auto") return {};
  if (align === "stretch") return { alignSelf: "stretch" };
  const map = { start: "flex-start", center: "center", end: "flex-end" } as const;
  return { alignSelf: map[align] };
}

function resolveBg(
  token: ColorTokenKey | "transparent" | undefined,
  palette: M3Palette,
): string | undefined {
  if (!token || token === "transparent") return undefined;
  return palette[token];
}

export function M3NodeRenderer({
  screen,
  nodeId,
  connectedInfo,
  forceRenderOverlay = false,
}: M3NodeRendererProps) {
  const { palette, shapes, spacing, scaleR, typeStyle } = useM3Theme();
  const project = useProjectStore((s) => s.project);
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const selectNode = useProjectStore((s) => s.selectNode);
  const editorMode = useProjectStore((s) => s.editorMode);

  const previewValues = usePreviewStore((s) => s.values);
  const previewCollections = usePreviewStore((s) => s.collections);
  const setPreviewValue = usePreviewStore((s) => s.setValue);
  const executeAction = usePreviewStore((s) => s.executeAction);
  const dismissOverlay = usePreviewStore((s) => s.dismissOverlay);
  const [menuOpen, setMenuOpen] = useState(false);
  const itemScope = useContext(ItemScopeContext);
  const itemCtx = itemScope
    ? { collectionKey: itemScope.collectionKey, item: itemScope.item }
    : undefined;

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

  // Hide overlays inline in Preview (rendered via DevicePreview modal scrim unless forceRenderOverlay)
  if (isPreview && OVERLAY_TYPES.has(node.type) && !forceRenderOverlay) {
    return null;
  }

  const defaultVars: Record<string, unknown> = {};
  for (const v of project.state?.variables ?? []) {
    defaultVars[v.key] = v.defaultValue;
  }
  const matchesCondition = evaluateVisibility(
    node.visibleWhen,
    isPreview ? previewValues : defaultVars,
    defaultVars,
  );
  if (isPreview && !matchesCondition) {
    return null;
  }

  const isSelected = !isPreview && selectedNodeId === node.id;
  const scopedKey = itemScope ? `${node.id}::${itemScope.item.id}` : node.id;

  const resolveStr = (raw: string): string => {
    if (!raw.includes("{{")) return raw;
    return resolveTemplateString(
      raw,
      isPreview ? previewValues : {},
      isPreview ? previewCollections : {},
      itemScope?.item,
    );
  };

  const readBoundString = (fallback: string): string => {
    if (isPreview) {
      if (node.bindings?.itemField && itemScope) {
        return String(itemScope.item[node.bindings.itemField] ?? fallback);
      }
      if (node.bindings?.stateKey && node.bindings.stateKey in previewValues) {
        return String(previewValues[node.bindings.stateKey] ?? "");
      }
      if (typeof previewValues[scopedKey] === "string") {
        return previewValues[scopedKey] as string;
      }
    } else if (node.bindings?.itemField && itemScope) {
      return String(itemScope.item[node.bindings.itemField] ?? fallback);
    }
    return fallback;
  };

  const readBoundBool = (fallback: boolean): boolean => {
    if (isPreview) {
      if (node.bindings?.itemField && itemScope) {
        return Boolean(itemScope.item[node.bindings.itemField]);
      }
      if (node.bindings?.stateKey && node.bindings.stateKey in previewValues) {
        return Boolean(previewValues[node.bindings.stateKey]);
      }
      if (typeof previewValues[scopedKey] === "boolean") {
        return previewValues[scopedKey] as boolean;
      }
    } else if (node.bindings?.itemField && itemScope) {
      return Boolean(itemScope.item[node.bindings.itemField]);
    }
    return fallback;
  };

  const readBoundNumber = (fallback: number): number => {
    if (isPreview) {
      if (node.bindings?.itemField && itemScope) {
        const n = Number(itemScope.item[node.bindings.itemField]);
        if (!Number.isNaN(n)) return n;
      }
      if (node.bindings?.stateKey && node.bindings.stateKey in previewValues) {
        const n = Number(previewValues[node.bindings.stateKey]);
        if (!Number.isNaN(n)) return n;
      }
      if (typeof previewValues[scopedKey] === "number") {
        return previewValues[scopedKey] as number;
      }
    }
    return fallback;
  };

  const writeBoundValue = (val: string | boolean | number) => {
    if (node.bindings?.stateKey) {
      setPreviewValue(node.bindings.stateKey, val);
    } else {
      setPreviewValue(scopedKey, val);
    }
  };

  const triggerBoundToggle = (current: boolean) => {
    if (node.bindings?.itemField && itemScope) {
      if (node.action?.type === "toggleItemField") {
        executeAction(node.action, availableScreenIds, itemCtx);
        return;
      }
      executeAction(
        {
          type: "toggleItemField",
          collectionKey: itemScope.collectionKey,
          field: node.bindings.itemField,
        },
        availableScreenIds,
        itemCtx,
      );
      if (node.action && node.action.type !== "none") {
        executeAction(node.action, availableScreenIds, itemCtx);
      }
      return;
    }
    writeBoundValue(!current);
    if (node.action && node.action.type !== "none") {
      executeAction(node.action, availableScreenIds, itemCtx);
    }
  };

  const handleNodeClick = (e: MouseEvent) => {
    if (isPreview) {
      if (node.action && node.action.type !== "none") {
        e.stopPropagation();
        executeAction(node.action, availableScreenIds, itemCtx);
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
          opacity: isDragging ? 0.4 : !matchesCondition && node.visibleWhen ? 0.55 : 1,
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

  const alignSelfStyle = !isBodyRoot ? getAlignSelfStyle(node) : {};
  const nodeFrameStyle: CSSProperties = {
    ...alignSelfStyle,
    ...dndTransformStyle,
    ...selectionRingStyle,
  };

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
      const resolvedTitle = resolveStr(title);
      const resolvedSubtitle = subtitle ? resolveStr(subtitle) : undefined;
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
                      executeAction(navigationAction, availableScreenIds, itemCtx);
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
                    {resolvedTitle}
                  </div>
                  {resolvedSubtitle && (
                    <div
                      className="truncate"
                      style={{ ...typeStyle("labelSmall"), color: palette.onSurfaceVariant }}
                    >
                      {resolvedSubtitle}
                    </div>
                  )}
                </div>
              )}
            </div>

            {isCentered && (
              <div className="text-center truncate flex-1" style={typeStyle("titleLarge")}>
                {resolvedTitle}
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
                      executeAction(act.action, availableScreenIds, itemCtx);
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
                {resolvedTitle}
              </div>
              {resolvedSubtitle && (
                <div style={{ ...typeStyle("bodySmall"), color: palette.onSurfaceVariant }}>
                  {resolvedSubtitle}
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
          className={`flex flex-col ${isBodyRoot && scrollable ? "no-scrollbar flex-1 overflow-y-auto" : ""} ${!isBodyRoot && (!isPreview || (node.action && node.action.type !== "none")) ? "cursor-pointer" : ""}`}
          style={{
            gap: connected ? 3 : gap ?? spacing.itemGap,
            alignItems: alignMap[horizontalAlignment] ?? "stretch",
            justifyContent: justifyMap[verticalArrangement] ?? "flex-start",
            padding: pad,
            margin: getMarginCss(node),
            width: node.style.width === "fill" ? "100%" : undefined,
            backgroundColor: resolveBg(node.style.backgroundToken, palette),
            borderRadius: node.style.cornerRadius,
            ...nodeFrameStyle,
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
            ...nodeFrameStyle,
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
            ...nodeFrameStyle,
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
            ...nodeFrameStyle,
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
            ...nodeFrameStyle,
          }}
        >
          {resolveStr(text)}
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
          style={nodeFrameStyle}
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
          className={`inline-flex items-center px-2.5 py-0.5 ${!isPreview ? "cursor-pointer" : ""}`}
          style={{
            ...typeStyle("labelSmall"),
            borderRadius: shapes.full,
            backgroundColor: bg,
            color: fg,
            alignSelf: "flex-start",
            ...nodeFrameStyle,
          }}
        >
          {resolveStr(label)}
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
            ...nodeFrameStyle,
          }}
        >
          {icon && <Icon name={icon} size={18} />}
          <span className="truncate">{resolveStr(label)}</span>
        </button>
      );
    }

    case "IconButton": {
      const { icon, variant, toggleable, selectedIcon } = node.props;
      const activeToggle = isPreview && toggleable && Boolean(previewValues[scopedKey]);
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
              if (toggleable) setPreviewValue(scopedKey, !activeToggle);
              executeAction(node.action, availableScreenIds, itemCtx);
              return;
            }
            handleNodeClick(e);
          }}
          className="m3-press w-10 h-10 flex items-center justify-center cursor-pointer"
          style={{
            borderRadius: shapes.full,
            ...styles[variant],
            ...nodeFrameStyle,
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
      const liveValue = readBoundString(value);

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className={`${node.style.width === "fill" ? "w-full " : ""}cursor-pointer`}
          style={nodeFrameStyle}
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
                  onChange={(e) => writeBoundValue(e.target.value)}
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
              {resolveStr(supportingText)}
            </div>
          )}
        </div>
      );
    }

    case "Switch": {
      const { label, checked, showCheckIcon } = node.props;
      const isChecked = readBoundBool(checked);
      const switchFill =
        !node.style.alignSelf ||
        node.style.alignSelf === "auto" ||
        node.style.alignSelf === "stretch" ||
        node.style.width === "fill";

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={(e) => {
            if (isPreview) {
              e.stopPropagation();
              triggerBoundToggle(isChecked);
              return;
            }
            handleNodeClick(e);
          }}
          className={`${switchFill ? "w-full " : ""}flex items-center justify-between gap-3 py-1 cursor-pointer`}
          style={nodeFrameStyle}
        >
          <span style={typeStyle("bodyMedium")}>{resolveStr(label)}</span>
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
      const isChecked = readBoundBool(checked);

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={(e) => {
            if (isPreview) {
              e.stopPropagation();
              triggerBoundToggle(isChecked);
              return;
            }
            handleNodeClick(e);
          }}
          className="flex items-center gap-2.5 py-1 cursor-pointer"
          style={nodeFrameStyle}
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
          {label && <span style={typeStyle("bodyMedium")}>{resolveStr(label)}</span>}
        </div>
      );
    }

    case "Slider": {
      const { label, value, min, max } = node.props;
      const liveVal = readBoundNumber(value);
      const pct = Math.max(0, Math.min(100, ((liveVal - min) / Math.max(1, max - min)) * 100));
      const sliderFill =
        !node.style.alignSelf ||
        node.style.alignSelf === "auto" ||
        node.style.alignSelf === "stretch" ||
        node.style.width === "fill";

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className={`${sliderFill ? "w-full " : ""}space-y-1 cursor-pointer`}
          style={nodeFrameStyle}
        >
          <div className="flex items-center justify-between">
            <span style={typeStyle("labelMedium")}>{resolveStr(label)}</span>
            <span style={{ ...typeStyle("labelMedium"), color: palette.primary }}>{liveVal}</span>
          </div>
          {isPreview ? (
            <input
              type="range"
              aria-label={label}
              min={min}
              max={max}
              value={liveVal}
              onChange={(e) => writeBoundValue(Number(e.target.value))}
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
      const isSelectedChip = readBoundBool(selected);

      return (
        <span
          ref={setMergedRef}
          {...commonAttrs}
          onClick={(e) => {
            if (isPreview) {
              e.stopPropagation();
              triggerBoundToggle(isSelectedChip);
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
            ...nodeFrameStyle,
          }}
        >
          {(isSelectedChip || icon) && (
            <Icon name={isSelectedChip ? "check" : icon!} size={16} />
          )}
          <span>{resolveStr(label)}</span>
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
      const isChecked = readBoundBool(Boolean(checked));
      const resolvedHeadline = resolveStr(headline);
      const resolvedSupporting = supportingText ? resolveStr(supportingText) : undefined;
      const resolvedOverline = overlineText ? resolveStr(overlineText) : undefined;

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={(e) => {
            if (isPreview) {
              e.stopPropagation();
              if (trailingType === "switch" || trailingType === "checkbox") {
                triggerBoundToggle(isChecked);
              } else {
                executeAction(node.action, availableScreenIds, itemCtx);
              }
              return;
            }
            handleNodeClick(e);
          }}
          className={`${node.style.width === "fill" ? "w-full " : ""}flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer`}
          style={{
            borderRadius: renderConnectedRadius(shapes.medium),
            backgroundColor: connectedInfo
              ? palette.surfaceContainerHigh
              : resolveBg(node.style.backgroundToken, palette) ?? "transparent",
            ...nodeFrameStyle,
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
              {resolvedOverline && (
                <div
                  className="truncate"
                  style={{ ...typeStyle("labelSmall"), color: palette.onSurfaceVariant }}
                >
                  {resolvedOverline}
                </div>
              )}
              <div className="truncate" style={typeStyle("bodyLarge")}>
                {resolvedHeadline}
              </div>
              {resolvedSupporting && (
                <div
                  className="truncate"
                  style={{ ...typeStyle("bodyMedium"), color: palette.onSurfaceVariant }}
                >
                  {resolvedSupporting}
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
          className={`${node.style.width === "fill" ? "w-full " : ""}overflow-hidden ${!isPreview || node.action ? "cursor-pointer" : ""}`}
          style={{
            borderRadius: radius,
            aspectRatio: ratioMap[aspectRatio],
            backgroundColor: palette.surfaceContainerHigh,
            ...nodeFrameStyle,
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
            ...nodeFrameStyle,
          }}
        />
      );

    case "Divider":
      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className={`${node.style.width === "fill" ? "w-full " : ""}py-1 ${!isPreview ? "cursor-pointer" : ""}`}
          style={nodeFrameStyle}
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
          style={nodeFrameStyle}
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
          className={`${node.style.width === "fill" ? "w-full " : ""}py-1 ${!isPreview ? "cursor-pointer" : ""}`}
          style={nodeFrameStyle}
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

    case "SearchBar": {
      const { placeholder, value, leadingIcon, showClearButton, trailingIcon, trailingAction } =
        node.props;
      const liveQuery = readBoundString(value);

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className={`flex items-center gap-2.5 px-4 h-12 ${!isPreview ? "cursor-pointer" : ""}`}
          style={{
            width: node.style.width === "fill" ? "100%" : undefined,
            borderRadius: shapes.full,
            backgroundColor: resolveBg(node.style.backgroundToken, palette) ?? palette.surfaceContainerHigh,
            color: palette.onSurface,
            ...nodeFrameStyle,
          }}
        >
          <Icon name={leadingIcon || "search"} size={20} color={palette.onSurfaceVariant} />
          {isPreview ? (
            <input
              type="text"
              aria-label={placeholder || "Search"}
              placeholder={placeholder}
              value={liveQuery}
              onChange={(e) => writeBoundValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-transparent outline-none border-0 p-0"
              style={{
                ...typeStyle("bodyLarge"),
                color: palette.onSurface,
              }}
            />
          ) : (
            <span
              className="flex-1 min-w-0 truncate"
              style={{
                ...typeStyle("bodyLarge"),
                color: value ? palette.onSurface : palette.onSurfaceVariant,
              }}
            >
              {value || placeholder}
            </span>
          )}
          {isPreview && showClearButton && liveQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={(e) => {
                e.stopPropagation();
                writeBoundValue("");
              }}
              className="w-7 h-7 flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0"
              style={{ borderRadius: shapes.full, color: palette.onSurfaceVariant }}
            >
              <Icon name="close" size={18} />
            </button>
          )}
          {trailingIcon &&
            (isPreview ? (
              <button
                type="button"
                aria-label="Search action"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAction(trailingAction, availableScreenIds, itemCtx);
                }}
                className="w-7 h-7 flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0"
                style={{ borderRadius: shapes.full, color: palette.onSurfaceVariant }}
              >
                <Icon name={trailingIcon} size={18} />
              </button>
            ) : (
              <Icon name={trailingIcon} size={18} color={palette.onSurfaceVariant} />
            ))}
        </div>
      );
    }

    case "SegmentedButton": {
      const { options, selectedValue } = node.props;
      const currentSelected = readBoundString(selectedValue);

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          role="group"
          className={`flex items-stretch overflow-hidden ${!isPreview ? "cursor-pointer" : ""}`}
          style={{
            width: node.style.width === "fill" ? "100%" : undefined,
            height: 36,
            borderRadius: shapes.full,
            border: `1px solid ${palette.outline}`,
            ...nodeFrameStyle,
          }}
        >
          {options.map((opt, idx) => {
            const active = currentSelected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={(e) => {
                  if (isPreview) {
                    e.stopPropagation();
                    writeBoundValue(opt.value);
                    if (node.action && node.action.type !== "none") {
                      executeAction(node.action, availableScreenIds, itemCtx);
                    }
                    return;
                  }
                  handleNodeClick(e);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 border-0 cursor-pointer transition-colors min-w-0"
                style={{
                  ...typeStyle("labelLarge"),
                  backgroundColor: active ? palette.secondaryContainer : "transparent",
                  color: active ? palette.onSecondaryContainer : palette.onSurface,
                  borderRight:
                    idx < options.length - 1 ? `1px solid ${palette.outline}` : "none",
                }}
              >
                {(active || opt.icon) && (
                  <Icon name={active ? "check" : opt.icon!} size={15} />
                )}
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      );
    }

    case "DataList": {
      const {
        collectionKey,
        searchStateKey,
        searchFields,
        filterField,
        filterStateKey,
        sortStateKey,
        gap,
        emptyTitle,
        emptySubtitle,
      } = node.props;
      const colSchema = project.state?.collections.find((c) => c.key === collectionKey);

      if (isPreview) {
        const rawItems = previewCollections[collectionKey] ?? [];
        const filtered = queryCollection(rawItems, {
          searchQuery: searchStateKey ? String(previewValues[searchStateKey] ?? "") : "",
          searchFields,
          filterField,
          filterValue: filterStateKey ? String(previewValues[filterStateKey] ?? "") : "",
          sortBy: sortStateKey ? String(previewValues[sortStateKey] ?? "") : "",
        });

        return (
          <div
            ref={setMergedRef}
            {...commonAttrs}
            onClick={handleNodeClick}
            className="flex flex-col"
            style={{
              width: node.style.width === "fill" ? "100%" : undefined,
              gap: gap ?? spacing.itemGap,
              padding: getPaddingCss(node),
              backgroundColor: resolveBg(node.style.backgroundToken, palette),
              borderRadius: node.style.cornerRadius,
              ...alignSelfStyle,
            }}
          >
            {filtered.length === 0 ? (
              <div
                className="p-5 flex flex-col items-center justify-center text-center border border-dashed"
                style={{
                  borderRadius: shapes.large,
                  borderColor: palette.outlineVariant,
                  color: palette.onSurfaceVariant,
                }}
              >
                <Icon name="inbox" size={26} />
                <div className="mt-1.5" style={typeStyle("titleSmall")}>
                  {emptyTitle || "No items"}
                </div>
                {emptySubtitle && (
                  <div className="mt-0.5 opacity-80" style={typeStyle("bodySmall")}>
                    {emptySubtitle}
                  </div>
                )}
              </div>
            ) : (
              filtered.map((item) => (
                <ItemScopeContext.Provider
                  key={item.id}
                  value={{ collectionKey, item }}
                >
                  {node.childIds.map((cid) => (
                    <M3NodeRenderer
                      key={`${item.id}:${cid}`}
                      screen={screen}
                      nodeId={cid}
                    />
                  ))}
                </ItemScopeContext.Provider>
              ))
            )}
          </div>
        );
      }

      const sampleItem = colSchema?.initialItems[0] ?? null;
      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          className="flex flex-col cursor-pointer"
          style={{
            width: node.style.width === "fill" ? "100%" : undefined,
            gap: gap ?? spacing.itemGap,
            padding: getPaddingCss(node) ?? "6px",
            backgroundColor:
              resolveBg(node.style.backgroundToken, palette) ??
              `${palette.surfaceContainerLow}80`,
            borderRadius: node.style.cornerRadius ?? shapes.medium,
            ...nodeFrameStyle,
          }}
        >
          <div
            className="flex items-center justify-between text-[10px] font-semibold px-1"
            style={{ color: palette.primary }}
          >
            <span>DataList • {collectionKey}</span>
            <span style={{ color: palette.onSurfaceVariant }}>
              {colSchema ? `${colSchema.initialItems.length} seed` : "collection"}
            </span>
          </div>
          {node.childIds.length === 0 ? (
            <div
              className="min-h-[84px] flex flex-col items-center justify-center text-center p-3 border border-dashed"
              style={{
                borderRadius: shapes.medium,
                borderColor: palette.outlineVariant,
                color: palette.onSurfaceVariant,
              }}
            >
              <Icon name="view_list" size={20} />
              <span className="text-[11px] font-medium mt-1">
                Drop a Card or ListItem item template
              </span>
            </div>
          ) : (
            <ItemScopeContext.Provider
              value={sampleItem ? { collectionKey, item: sampleItem } : null}
            >
              <SortableContext
                items={node.childIds.map((cid) => `canvas:${cid}`)}
                strategy={verticalListSortingStrategy}
              >
                {node.childIds.map((cid) => (
                  <M3NodeRenderer key={cid} screen={screen} nodeId={cid} />
                ))}
              </SortableContext>
            </ItemScopeContext.Provider>
          )}
        </div>
      );
    }

    case "DropdownMenu": {
      const { label, options, selectedValue, placeholder, variant } = node.props;
      const currentValue = readBoundString(selectedValue);
      const selectedOpt = options.find((o) => o.value === currentValue);
      const isFilled = variant === "filled";

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={(e) => {
            if (isPreview) {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
              return;
            }
            handleNodeClick(e);
          }}
          className={`relative ${node.style.width === "fill" ? "w-full " : ""}cursor-pointer`}
          style={nodeFrameStyle}
        >
          <div
            className="px-3.5 py-2 flex items-center justify-between gap-2"
            style={{
              backgroundColor: isFilled ? palette.surfaceContainerHighest : palette.surface,
              borderRadius: isFilled
                ? `${shapes.extraSmall}px ${shapes.extraSmall}px 0 0`
                : shapes.small,
              border: isFilled ? "none" : `1px solid ${palette.outline}`,
              borderBottom: isFilled ? `2px solid ${palette.primary}` : `1px solid ${palette.outline}`,
            }}
          >
            <div className="min-w-0">
              <div style={{ ...typeStyle("labelSmall"), color: palette.primary }}>{label}</div>
              <div
                className="truncate"
                style={{
                  ...typeStyle("bodyMedium"),
                  color: selectedOpt ? palette.onSurface : palette.onSurfaceVariant,
                }}
              >
                {selectedOpt?.label || currentValue || placeholder}
              </div>
            </div>
            <Icon
              name={menuOpen ? "arrow_drop_up" : "arrow_drop_down"}
              size={20}
              color={palette.onSurfaceVariant}
            />
          </div>

          {isPreview && menuOpen && (
            <div
              role="listbox"
              aria-label={label}
              className="absolute left-0 right-0 top-full mt-1 z-30 py-1 border shadow-lg max-h-48 overflow-y-auto"
              style={{
                borderRadius: shapes.small,
                backgroundColor: palette.surfaceContainer,
                borderColor: palette.outlineVariant,
              }}
            >
              {options.map((opt) => {
                const active = opt.value === currentValue;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={(e) => {
                      e.stopPropagation();
                      writeBoundValue(opt.value);
                      setMenuOpen(false);
                      if (node.action && node.action.type !== "none") {
                        executeAction(node.action, availableScreenIds, itemCtx);
                      }
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs flex items-center justify-between border-0 cursor-pointer"
                    style={{
                      backgroundColor: active ? palette.secondaryContainer : "transparent",
                      color: active ? palette.onSecondaryContainer : palette.onSurface,
                    }}
                  >
                    <span className="truncate">{opt.label}</span>
                    {active && <Icon name="check" size={15} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    case "RadioGroup": {
      const { label, options, selectedValue } = node.props;
      const currentValue = readBoundString(selectedValue);

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          role="radiogroup"
          aria-label={label}
          className={`${node.style.width === "fill" ? "w-full " : ""}space-y-1.5 ${!isPreview ? "cursor-pointer" : ""}`}
          style={nodeFrameStyle}
        >
          {label && (
            <div style={{ ...typeStyle("labelLarge"), color: palette.primary }}>
              {resolveStr(label)}
            </div>
          )}
          <div className="space-y-1">
            {options.map((opt) => {
              const selected = currentValue === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={(e) => {
                    if (isPreview) {
                      e.stopPropagation();
                      writeBoundValue(opt.value);
                      if (node.action && node.action.type !== "none") {
                        executeAction(node.action, availableScreenIds, itemCtx);
                      }
                      return;
                    }
                    handleNodeClick(e);
                  }}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 border-0 bg-transparent text-left cursor-pointer"
                  style={{
                    borderRadius: shapes.small,
                    color: palette.onSurface,
                  }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      border: `2px solid ${selected ? palette.primary : palette.outline}`,
                    }}
                  >
                    {selected && (
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: palette.primary }}
                      />
                    )}
                  </span>
                  <span style={typeStyle("bodyMedium")}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "Tabs": {
      const { options, selectedValue, variant } = node.props;
      const currentValue = readBoundString(selectedValue || options[0]?.value || "");

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={handleNodeClick}
          role="tablist"
          className={`${node.style.width === "fill" ? "w-full " : ""}flex items-stretch border-b ${!isPreview ? "cursor-pointer" : ""}`}
          style={{
            borderColor: palette.outlineVariant,
            backgroundColor: resolveBg(node.style.backgroundToken, palette) ?? palette.surface,
            ...nodeFrameStyle,
          }}
        >
          {options.map((opt) => {
            const active = currentValue === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={(e) => {
                  if (isPreview) {
                    e.stopPropagation();
                    writeBoundValue(opt.value);
                    if (node.action && node.action.type !== "none") {
                      executeAction(node.action, availableScreenIds, itemCtx);
                    }
                    return;
                  }
                  handleNodeClick(e);
                }}
                className="flex-1 py-2.5 px-2 flex flex-col items-center justify-center gap-1 border-0 bg-transparent cursor-pointer relative min-w-0"
                style={{
                  ...typeStyle("titleSmall"),
                  color: active ? palette.primary : palette.onSurfaceVariant,
                }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {variant === "primary" && opt.icon && <Icon name={opt.icon} size={16} />}
                  <span className="truncate">{opt.label}</span>
                </div>
                {active && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-[3px]"
                    style={{
                      backgroundColor: palette.primary,
                      borderRadius: `${shapes.extraSmall}px ${shapes.extraSmall}px 0 0`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      );
    }

    case "AlertDialog": {
      const { title, message, icon, confirmLabel, dismissLabel, confirmAction } = node.props;

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={isPreview ? (e) => e.stopPropagation() : handleNodeClick}
          role="dialog"
          aria-modal={isPreview}
          className={`w-full p-5 space-y-3 border shadow-md ${!isPreview ? "cursor-pointer" : ""}`}
          style={{
            borderRadius: shapes.extraLarge,
            backgroundColor: palette.surfaceContainerHigh,
            borderColor: palette.outlineVariant,
            color: palette.onSurface,
            ...dndTransformStyle,
            ...selectionRingStyle,
          }}
        >
          {!isPreview && (
            <div
              className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider"
              style={{ color: palette.primary }}
            >
              <span>Overlay • AlertDialog</span>
              <span className="font-mono opacity-75">{node.id}</span>
            </div>
          )}
          <div className="flex flex-col items-center text-center gap-2">
            {icon && <Icon name={icon} size={24} color={palette.secondary} />}
            <div style={typeStyle("headlineSmall")}>{resolveStr(title)}</div>
          </div>
          <div style={{ ...typeStyle("bodyMedium"), color: palette.onSurfaceVariant }}>
            {resolveStr(message)}
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            {dismissLabel && (
              <button
                type="button"
                onClick={(e) => {
                  if (isPreview) {
                    e.stopPropagation();
                    dismissOverlay();
                    return;
                  }
                  handleNodeClick(e);
                }}
                className="m3-press px-3 py-1.5 border-0 bg-transparent cursor-pointer"
                style={{ ...typeStyle("labelLarge"), color: palette.primary, borderRadius: shapes.full }}
              >
                {dismissLabel}
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                if (isPreview) {
                  e.stopPropagation();
                  if (confirmAction && confirmAction.type !== "none") {
                    executeAction(confirmAction, availableScreenIds, itemCtx);
                  }
                  if (confirmAction?.type !== "openOverlay") {
                    dismissOverlay();
                  }
                  return;
                }
                handleNodeClick(e);
              }}
              className="m3-press px-4 py-1.5 border-0 cursor-pointer"
              style={{
                ...typeStyle("labelLarge"),
                borderRadius: shapes.full,
                backgroundColor: palette.primary,
                color: palette.onPrimary,
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      );
    }

    case "ModalBottomSheet": {
      const { title, dragHandle } = node.props;

      return (
        <div
          ref={setMergedRef}
          {...commonAttrs}
          onClick={isPreview ? (e) => e.stopPropagation() : handleNodeClick}
          role="dialog"
          aria-modal={isPreview}
          className={`w-full p-4 space-y-3 border shadow-md ${!isPreview ? "cursor-pointer" : ""}`}
          style={{
            borderRadius: isPreview
              ? `${shapes.extraLarge}px ${shapes.extraLarge}px 0 0`
              : shapes.extraLarge,
            backgroundColor: palette.surfaceContainerLow,
            borderColor: palette.outlineVariant,
            color: palette.onSurface,
            ...dndTransformStyle,
            ...selectionRingStyle,
          }}
        >
          {!isPreview && (
            <div
              className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider"
              style={{ color: palette.primary }}
            >
              <span>Overlay • BottomSheet</span>
              <span className="font-mono opacity-75">{node.id}</span>
            </div>
          )}
          {dragHandle && (
            <div className="flex justify-center">
              <span
                className="w-9 h-1 rounded-full"
                style={{ backgroundColor: palette.onSurfaceVariant, opacity: 0.4 }}
              />
            </div>
          )}
          {title && <div style={typeStyle("titleMedium")}>{resolveStr(title)}</div>}
          {node.childIds.length === 0 && !isPreview ? (
            <div
              className="p-4 text-center text-xs border border-dashed"
              style={{
                borderRadius: shapes.medium,
                borderColor: palette.outlineVariant,
                color: palette.onSurfaceVariant,
              }}
            >
              Drop sheet content (Column, ListItem, Button...)
            </div>
          ) : (
            <SortableContext
              items={node.childIds.map((cid) => `canvas:${cid}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {node.childIds.map((cid) => (
                  <M3NodeRenderer key={cid} screen={screen} nodeId={cid} />
                ))}
              </div>
            </SortableContext>
          )}
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
