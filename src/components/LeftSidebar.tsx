import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isContainerType } from "@/ast/operations";
import type { ComponentNode, ScreenNode } from "@/ast/types";
import { useProjectStore } from "@/store/useProjectStore";
import { useM3Theme } from "@/theme/ThemeContext";
import { Icon } from "./Icon";
import { PartsPalette } from "./palette/PartsPalette";
import { DataStateSidebar } from "./DataStateSidebar";
import { TokenInspectorSidebar } from "./TokenInspectorSidebar";

type LeftTab = "parts" | "screens" | "data" | "tree" | "tokens";

function TreeNodeItem({
  screen,
  nodeId,
  depth,
  selectedId,
  onSelect,
  onDuplicate,
  onRemove,
}: {
  screen: ScreenNode;
  nodeId: string;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { palette, shapes } = useM3Theme();
  const node: ComponentNode | undefined = screen.nodes[nodeId];

  const isSlotRoot =
    !node ||
    node.id === screen.slots.bodyId ||
    node.id === screen.slots.topBarId ||
    node.id === screen.slots.fabId;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: `tree:${nodeId}`,
    disabled: isSlotRoot,
    data: {
      source: "tree",
      nodeId,
      parentId: node?.parentId ?? null,
    },
  });

  const { setNodeRef: setDropBodyRef, isOver: isBodyOver } = useDroppable({
    id: `tree-container:${nodeId}`,
    disabled: nodeId !== screen.slots.bodyId,
    data: {
      targetType: "treeContainer",
      containerId: nodeId,
    },
  });

  if (!node) return null;

  const isSelected = selectedId === node.id;
  const label =
    node.name ||
    ("label" in node.props && typeof node.props.label === "string" && node.props.label) ||
    ("title" in node.props && typeof node.props.title === "string" && node.props.title) ||
    ("headline" in node.props && typeof node.props.headline === "string" && node.props.headline) ||
    ("text" in node.props && typeof node.props.text === "string" && node.props.text) ||
    node.type;

  const setMergedRef = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    if (nodeId === screen.slots.bodyId) setDropBodyRef(el);
  };

  return (
    <div
      ref={setMergedRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      <div
        data-tree-node-id={node.id}
        data-tree-node-type={node.type}
        data-tree-selected={isSelected ? "true" : "false"}
        {...(!isSlotRoot ? listeners : {})}
        {...(!isSlotRoot ? attributes : {})}
        className="group flex items-center justify-between gap-1 px-2 py-1.5 text-xs cursor-pointer select-none touch-none"
        style={{
          paddingLeft: 8 + depth * 12,
          borderRadius: shapes.small,
          backgroundColor: isSelected
            ? palette.secondaryContainer
            : isOver || isBodyOver
              ? palette.primaryContainer
              : "transparent",
          color: isSelected ? palette.onSecondaryContainer : palette.onSurface,
        }}
        onClick={() => onSelect(node.id)}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {!isSlotRoot && (
            <Icon name="drag_indicator" size={13} color={palette.outline} />
          )}
          <Icon
            name={isContainerType(node.type) ? "folder_open" : "widgets"}
            size={15}
            color={isSelected ? palette.onSecondaryContainer : palette.primary}
          />
          <span className="font-medium truncate">{label}</span>
          <span className="text-[10px] opacity-60 shrink-0">{node.type}</span>
        </div>

        {!isSlotRoot && (
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(node.id);
              }}
              className="p-0.5 border-0 bg-transparent cursor-pointer opacity-75 hover:opacity-100"
              style={{ color: "inherit" }}
              title="Duplicate node"
            >
              <Icon name="content_copy" size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(node.id);
              }}
              className="p-0.5 border-0 bg-transparent cursor-pointer opacity-75 hover:opacity-100"
              style={{ color: palette.error }}
              title="Delete node"
            >
              <Icon name="delete" size={13} />
            </button>
          </div>
        )}
      </div>

      {node.childIds.length > 0 && (
        <SortableContext
          items={node.childIds.map((id) => `tree:${id}`)}
          strategy={verticalListSortingStrategy}
        >
          {node.childIds.map((childId) => (
            <TreeNodeItem
              key={childId}
              screen={screen}
              nodeId={childId}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onDuplicate={onDuplicate}
              onRemove={onRemove}
            />
          ))}
        </SortableContext>
      )}
    </div>
  );
}

export function LeftSidebar() {
  const { palette, shapes } = useM3Theme();
  const [tab, setTab] = useState<LeftTab>("screens");

  const project = useProjectStore((s) => s.project);
  const activeScreenId = useProjectStore((s) => s.activeScreenId);
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);

  const setActiveScreen = useProjectStore((s) => s.setActiveScreen);
  const addScreen = useProjectStore((s) => s.addScreen);
  const duplicateScreen = useProjectStore((s) => s.duplicateScreen);
  const removeScreen = useProjectStore((s) => s.removeScreen);
  const updateScreenMeta = useProjectStore((s) => s.updateScreenMeta);
  const setInitialScreen = useProjectStore((s) => s.setInitialScreen);

  const setBottomNavEnabled = useProjectStore((s) => s.setBottomNavEnabled);
  const addNavDestination = useProjectStore((s) => s.addNavDestination);
  const updateNavDestination = useProjectStore((s) => s.updateNavDestination);
  const removeNavDestination = useProjectStore((s) => s.removeNavDestination);

  const selectNode = useProjectStore((s) => s.selectNode);
  const duplicateNode = useProjectStore((s) => s.duplicateNode);
  const removeNode = useProjectStore((s) => s.removeNode);

  const activeScreen =
    project.screens.find((s) => s.id === activeScreenId) ?? project.screens[0];

  return (
    <div
      data-testid="left-sidebar"
      className="flex flex-col h-full border-r"
      style={{
        backgroundColor: palette.surfaceContainerLow,
        borderColor: palette.outlineVariant,
        color: palette.onSurface,
      }}
    >
      {/* Top Tab Bar */}
      <div className="p-2 border-b" style={{ borderColor: palette.outlineVariant }}>
        <div
          className="grid grid-cols-5 p-1 gap-0.5"
          style={{ backgroundColor: palette.surfaceContainerHigh, borderRadius: shapes.full }}
        >
          {(
            [
              { key: "parts", label: "Parts", icon: "widgets" },
              { key: "screens", label: "Screens", icon: "smartphone" },
              { key: "data", label: "Data", icon: "database" },
              { key: "tree", label: "AST Tree", icon: "account_tree" },
              { key: "tokens", label: "Tokens", icon: "data_object" },
            ] as const
          ).map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className="m3-press flex items-center justify-center gap-1 py-1.5 px-1 text-[11px] font-semibold border-0 cursor-pointer"
                style={{
                  borderRadius: shapes.full,
                  backgroundColor: active ? palette.secondaryContainer : "transparent",
                  color: active ? palette.onSecondaryContainer : palette.onSurfaceVariant,
                }}
              >
                <Icon name={item.icon} size={14} fill={active} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {tab === "parts" && (
        <div className="flex-1 min-h-0">
          <PartsPalette />
        </div>
      )}

      {tab === "tokens" && (
        <div className="flex-1 min-h-0">
          <TokenInspectorSidebar />
        </div>
      )}

      {tab === "screens" && (
        <div className="no-scrollbar flex-1 overflow-y-auto p-3 space-y-5">
          {/* Screens Section */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: palette.onSurfaceVariant }}
              >
                Screens ({project.screens.length})
              </span>
              <button
                type="button"
                onClick={() => addScreen()}
                className="m3-press flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold border-0 cursor-pointer"
                style={{
                  borderRadius: shapes.full,
                  backgroundColor: palette.primaryContainer,
                  color: palette.onPrimaryContainer,
                }}
              >
                <Icon name="add" size={14} />
                Add
              </button>
            </div>

            <div className="space-y-1.5">
              {project.screens.map((scr) => {
                const active = scr.id === activeScreen.id;
                const isInitial = project.initialScreenId === scr.id;
                return (
                  <div
                    key={scr.id}
                    data-testid={`screen-item-${scr.id}`}
                    onClick={() => setActiveScreen(scr.id)}
                    className="p-2.5 cursor-pointer border transition-colors"
                    style={{
                      borderRadius: shapes.medium,
                      backgroundColor: active ? palette.secondaryContainer : palette.surfaceContainer,
                      borderColor: active ? palette.primary : "transparent",
                      color: active ? palette.onSecondaryContainer : palette.onSurface,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon
                          name={isInitial ? "home" : "article"}
                          size={16}
                          fill={isInitial}
                          color={active ? palette.onSecondaryContainer : palette.primary}
                        />
                        <span className="text-xs font-semibold truncate">{scr.name}</span>
                        <span className="text-[10px] font-mono opacity-65">/{scr.route}</span>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        {!isInitial && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInitialScreen(scr.id);
                            }}
                            className="p-1 border-0 bg-transparent cursor-pointer opacity-70 hover:opacity-100"
                            style={{ color: "inherit" }}
                            title="Set as start screen"
                          >
                            <Icon name="flag" size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateScreen(scr.id);
                          }}
                          className="p-1 border-0 bg-transparent cursor-pointer opacity-70 hover:opacity-100"
                          style={{ color: "inherit" }}
                          title="Duplicate screen"
                        >
                          <Icon name="content_copy" size={14} />
                        </button>
                        {project.screens.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeScreen(scr.id);
                            }}
                            className="p-1 border-0 bg-transparent cursor-pointer opacity-70 hover:opacity-100"
                            style={{ color: palette.error }}
                            title="Delete screen"
                          >
                            <Icon name="delete" size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {active && (
                      <div
                        className="mt-2 pt-2 border-t flex items-center justify-between text-[11px]"
                        style={{ borderColor: palette.outlineVariant }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>Show shared bottom bar</span>
                        <input
                          type="checkbox"
                          checked={scr.showBottomNav}
                          onChange={(e) =>
                            updateScreenMeta(scr.id, { showBottomNav: e.target.checked })
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shared Bottom Navigation Config */}
          <div
            className="p-3 space-y-2.5"
            style={{
              backgroundColor: palette.surfaceContainer,
              borderRadius: shapes.large,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold">Shared Bottom Navigation</div>
                <div className="text-[11px]" style={{ color: palette.onSurfaceVariant }}>
                  App-wide tabs ({project.bottomNav.destinations.length}/5)
                </div>
              </div>
              <input
                type="checkbox"
                checked={project.bottomNav.enabled}
                onChange={(e) => setBottomNavEnabled(e.target.checked)}
              />
            </div>

            {project.bottomNav.enabled && (
              <div className="space-y-1.5 pt-1">
                {project.bottomNav.destinations.map((dest) => (
                  <div
                    key={dest.id}
                    className="p-2 space-y-1.5"
                    style={{
                      backgroundColor: palette.surfaceContainerLow,
                      borderRadius: shapes.medium,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon name={dest.icon} size={16} color={palette.primary} />
                      <input
                        type="text"
                        value={dest.label}
                        onChange={(e) =>
                          updateNavDestination(dest.id, { label: e.target.value })
                        }
                        className="flex-1 min-w-0 bg-transparent text-xs font-medium outline-none px-1"
                        style={{ color: palette.onSurface }}
                      />
                      <button
                        type="button"
                        onClick={() => removeNavDestination(dest.id)}
                        className="p-0.5 border-0 bg-transparent cursor-pointer"
                        style={{ color: palette.error }}
                        title="Remove tab"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                    <select
                      value={dest.targetScreenId}
                      onChange={(e) =>
                        updateNavDestination(dest.id, { targetScreenId: e.target.value })
                      }
                      className="w-full px-2 py-1 text-[11px] outline-none"
                      style={{
                        borderRadius: shapes.small,
                        backgroundColor: palette.surfaceContainerHigh,
                        color: palette.onSurface,
                        border: "none",
                      }}
                    >
                      {project.screens.map((s) => (
                        <option key={s.id} value={s.id}>
                          Target: {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                {project.bottomNav.destinations.length < 5 && (
                  <button
                    type="button"
                    onClick={() => addNavDestination()}
                    className="m3-press w-full py-1.5 text-[11px] font-semibold border-0 cursor-pointer flex items-center justify-center gap-1"
                    style={{
                      borderRadius: shapes.full,
                      backgroundColor: palette.secondaryContainer,
                      color: palette.onSecondaryContainer,
                    }}
                  >
                    <Icon name="add" size={14} />
                    Add Tab Destination
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "data" && <DataStateSidebar />}

      {tab === "tree" && activeScreen && (
        <div className="no-scrollbar flex-1 overflow-y-auto p-3 space-y-3">
          <div className="px-1 flex items-center justify-between">
            <span
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: palette.onSurfaceVariant }}
            >
              {activeScreen.name} Scaffold
            </span>
            <span className="text-[10px] font-mono" style={{ color: palette.onSurfaceVariant }}>
              {Object.keys(activeScreen.nodes).length} nodes
            </span>
          </div>

          <div
            className="p-2 space-y-1"
            style={{
              backgroundColor: palette.surfaceContainer,
              borderRadius: shapes.large,
            }}
          >
            {activeScreen.slots.topBarId && (
              <TreeNodeItem
                screen={activeScreen}
                nodeId={activeScreen.slots.topBarId}
                depth={0}
                selectedId={selectedNodeId}
                onSelect={selectNode}
                onDuplicate={duplicateNode}
                onRemove={removeNode}
              />
            )}

            <TreeNodeItem
              screen={activeScreen}
              nodeId={activeScreen.slots.bodyId}
              depth={0}
              selectedId={selectedNodeId}
              onSelect={selectNode}
              onDuplicate={duplicateNode}
              onRemove={removeNode}
            />

            {activeScreen.slots.fabId && (
              <TreeNodeItem
                screen={activeScreen}
                nodeId={activeScreen.slots.fabId}
                depth={0}
                selectedId={selectedNodeId}
                onSelect={selectNode}
                onDuplicate={duplicateNode}
                onRemove={removeNode}
              />
            )}

            {project.bottomNav.enabled && activeScreen.showBottomNav && (
              <div
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs opacity-75"
                style={{ color: palette.onSurfaceVariant }}
              >
                <Icon name="bottom_navigation" size={15} color={palette.primary} />
                <span className="font-medium">Shared BottomBar</span>
                <span className="text-[10px]">
                  ({project.bottomNav.destinations.length} tabs)
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
