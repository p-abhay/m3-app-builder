import { useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { createNode } from "@/ast/factory";
import { isContainerType } from "@/ast/operations";
import { OVERLAY_TYPES, type ComponentType } from "@/ast/types";
import { useProjectStore } from "@/store/useProjectStore";
import { useM3Theme } from "@/theme/ThemeContext";
import { Icon } from "../Icon";

interface ActiveDragInfo {
  label: string;
  icon: string;
}

export function BuilderDndProvider({ children }: { children: ReactNode }) {
  const { palette, shapes } = useM3Theme();
  const project = useProjectStore((s) => s.project);
  const activeScreenId = useProjectStore((s) => s.activeScreenId);
  const insertNode = useProjectStore((s) => s.insertNode);
  const moveNode = useProjectStore((s) => s.moveNode);
  const setSlotNode = useProjectStore((s) => s.setSlotNode);

  const [activeDrag, setActiveDrag] = useState<ActiveDragInfo | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activeScreen =
    project.screens.find((s) => s.id === activeScreenId) ?? project.screens[0];

  const collisionDetection: CollisionDetection = (args) => {
    const activeData = args.active.data.current as Record<string, unknown> | undefined;
    const isPalette = activeData?.source === "palette";
    const componentType = activeData?.componentType as ComponentType | undefined;

    const filterEligible = (containers: typeof args.droppableContainers) =>
      containers.filter((container) => {
        const data = container.data.current as Record<string, unknown> | undefined;
        if (!data) return false;
        if (isPalette && componentType === "TopAppBar") {
          return data.targetType === "slot" && data.slot === "topBarId";
        }
        if (isPalette && componentType === "FloatingActionButton") {
          return data.targetType === "slot" && data.slot === "fabId";
        }
        // Regular components and node moves cannot drop into topBar/fab slots
        if (data.targetType === "slot") return false;
        // AST Tree drags only collide with tree droppables; canvas/palette prefer canvas/containers
        if (activeData?.source === "tree") {
          return data.source === "tree" || data.targetType === "treeContainer";
        }
        if (activeData?.source === "canvas") {
          return data.source === "canvas" || data.targetType === "container";
        }
        return data.targetType === "container" || data.source === "canvas";
      });

    const eligible = filterEligible(args.droppableContainers);
    const hits = pointerWithin({ ...args, droppableContainers: eligible });
    if (hits.length > 0) {
      // Pick the deepest / smallest container under the pointer; break area ties cleanly by source
      return [...hits].sort((a, b) => {
        const ra = args.droppableRects.get(a.id);
        const rb = args.droppableRects.get(b.id);
        const areaA = ra ? ra.width * ra.height : Infinity;
        const areaB = rb ? rb.width * rb.height : Infinity;
        if (Math.abs(areaA - areaB) > 1) return areaA - areaB;

        const da = a.data?.current as Record<string, unknown> | undefined;
        const db = b.data?.current as Record<string, unknown> | undefined;
        if (isPalette) {
          const aCont = da?.targetType === "container" ? 0 : 1;
          const bCont = db?.targetType === "container" ? 0 : 1;
          return aCont - bCont;
        }
        const aSort = da?.source === "canvas" ? 0 : 1;
        const bSort = db?.source === "canvas" ? 0 : 1;
        return aSort - bSort;
      });
    }

    return closestCenter({ ...args, droppableContainers: eligible });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as Record<string, unknown> | undefined;
    if (!data) return;
    if (data.source === "palette") {
      setActiveDrag({
        label: String(data.label ?? data.componentType ?? "Component"),
        icon: String(data.icon ?? "widgets"),
      });
    } else if (data.nodeId && activeScreen) {
      const node = activeScreen.nodes[String(data.nodeId)];
      if (node) {
        setActiveDrag({
          label: node.name || node.type,
          icon: isContainerType(node.type) ? "folder" : "widgets",
        });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over || !activeScreen) return;

    const activeData = active.data.current as Record<string, unknown> | undefined;
    const overData = over.data.current as Record<string, unknown> | undefined;
    if (!activeData || !overData) return;

    // 1. Palette -> Slot or Container / Node
    if (activeData.source === "palette") {
      const type = activeData.componentType as ComponentType;
      if (type === "TopAppBar" && overData.targetType === "slot" && overData.slot === "topBarId") {
        setSlotNode(
          "topBarId",
          createNode("TopAppBar", { props: { title: activeScreen.name } }),
        );
        return;
      }
      if (
        type === "FloatingActionButton" &&
        overData.targetType === "slot" &&
        overData.slot === "fabId"
      ) {
        setSlotNode("fabId", createNode("FloatingActionButton"));
        return;
      }

      if (OVERLAY_TYPES.has(type)) {
        insertNode(activeScreen.slots.bodyId, createNode(type));
        return;
      }

      if (overData.targetType === "container" && typeof overData.containerId === "string") {
        insertNode(overData.containerId, createNode(type));
        return;
      }

      if (typeof overData.nodeId === "string") {
        const overNode = activeScreen.nodes[overData.nodeId];
        if (!overNode) return;
        if (isContainerType(overNode.type)) {
          insertNode(overNode.id, createNode(type));
        } else if (overNode.parentId) {
          const parent = activeScreen.nodes[overNode.parentId];
          const idx = parent ? parent.childIds.indexOf(overNode.id) : -1;
          insertNode(overNode.parentId, createNode(type), idx === -1 ? undefined : idx + 1);
        }
      }
      return;
    }

    // 2. Existing Node Move (from AST Tree or Canvas)
    const activeNodeId = activeData.nodeId as string | undefined;
    if (!activeNodeId) return;
    const activeNode = activeScreen.nodes[activeNodeId];
    if (!activeNode || !activeNode.parentId) return;

    if (
      (overData.targetType === "container" || overData.targetType === "treeContainer") &&
      typeof overData.containerId === "string"
    ) {
      const targetContainerId = overData.containerId;
      if (targetContainerId === activeNodeId) return;
      const targetParent = activeScreen.nodes[targetContainerId];
      if (!targetParent) return;
      moveNode(activeNodeId, targetContainerId, targetParent.childIds.length);
      return;
    }

    if (typeof overData.nodeId === "string" && overData.nodeId !== activeNodeId) {
      const overNode = activeScreen.nodes[overData.nodeId];
      if (!overNode || !overNode.parentId) return;

      const targetParent = activeScreen.nodes[overNode.parentId];
      if (!targetParent) return;
      const overIndex = targetParent.childIds.indexOf(overNode.id);
      if (overIndex === -1) return;

      if (activeNode.parentId === overNode.parentId) {
        const fromIndex = targetParent.childIds.indexOf(activeNodeId);
        const targetIndex = fromIndex < overIndex ? overIndex + 1 : overIndex;
        moveNode(activeNodeId, overNode.parentId, targetIndex);
      } else {
        moveNode(activeNodeId, overNode.parentId, overIndex);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {activeDrag && (
          <div
            className="flex items-center gap-2 px-3 py-2 shadow-xl border pointer-events-none"
            style={{
              borderRadius: shapes.full,
              backgroundColor: palette.primaryContainer,
              color: palette.onPrimaryContainer,
              borderColor: palette.primary,
            }}
          >
            <Icon name={activeDrag.icon} size={16} />
            <span className="text-xs font-semibold">{activeDrag.label}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
