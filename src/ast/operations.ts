import { createId } from "./factory.ts";
import {
  CONTAINER_TYPES,
  type AppProject,
  type ComponentNode,
  type ComponentStyle,
  type ComponentType,
  type NodeBindings,
  type ScreenNode,
  type UserAction,
  type VisibilityCondition,
} from "./types.ts";

export function isContainerType(type: ComponentType): boolean {
  return CONTAINER_TYPES.has(type);
}

/** Returns true if `candidateAncestorId` equals `targetId` or contains `targetId` in its subtree. */
export function isDescendant(
  screen: ScreenNode,
  candidateAncestorId: string,
  targetId: string,
): boolean {
  if (candidateAncestorId === targetId) return true;
  const node = screen.nodes[candidateAncestorId];
  if (!node) return false;
  for (const childId of node.childIds) {
    if (isDescendant(screen, childId, targetId)) return true;
  }
  return false;
}

export function insertNode(
  screen: ScreenNode,
  parentId: string,
  node: ComponentNode,
  index?: number,
): ScreenNode {
  const parent = screen.nodes[parentId];
  if (!parent || !isContainerType(parent.type)) return screen;

  const nextNodes = { ...screen.nodes };
  const attachedNode: ComponentNode = { ...node, parentId };
  nextNodes[attachedNode.id] = attachedNode;

  const nextChildIds = [...parent.childIds];
  const clampedIndex =
    index === undefined ? nextChildIds.length : Math.max(0, Math.min(index, nextChildIds.length));
  nextChildIds.splice(clampedIndex, 0, attachedNode.id);

  nextNodes[parentId] = { ...parent, childIds: nextChildIds };
  return { ...screen, nodes: nextNodes };
}

export function moveNode(
  screen: ScreenNode,
  nodeId: string,
  targetParentId: string,
  targetIndex: number,
): ScreenNode {
  if (
    nodeId === screen.slots.bodyId ||
    nodeId === screen.slots.topBarId ||
    nodeId === screen.slots.fabId
  ) {
    return screen;
  }

  const node = screen.nodes[nodeId];
  const targetParent = screen.nodes[targetParentId];
  if (!node || !node.parentId || !targetParent || !isContainerType(targetParent.type)) {
    return screen;
  }

  // Prevent cycles (dropping a container inside itself or its own descendant)
  if (isDescendant(screen, nodeId, targetParentId)) {
    return screen;
  }

  const oldParent = screen.nodes[node.parentId];
  if (!oldParent) return screen;

  const nextNodes = { ...screen.nodes };

  if (oldParent.id === targetParentId) {
    const list = [...oldParent.childIds];
    const fromIdx = list.indexOf(nodeId);
    if (fromIdx === -1) return screen;
    list.splice(fromIdx, 1);
    const adjustedIndex = targetIndex > fromIdx ? targetIndex - 1 : targetIndex;
    const clamped = Math.max(0, Math.min(adjustedIndex, list.length));
    list.splice(clamped, 0, nodeId);
    nextNodes[oldParent.id] = { ...oldParent, childIds: list };
  } else {
    const oldList = oldParent.childIds.filter((id) => id !== nodeId);
    const newList = [...targetParent.childIds];
    const clamped = Math.max(0, Math.min(targetIndex, newList.length));
    newList.splice(clamped, 0, nodeId);

    nextNodes[oldParent.id] = { ...oldParent, childIds: oldList };
    nextNodes[targetParentId] = { ...targetParent, childIds: newList };
    nextNodes[nodeId] = { ...node, parentId: targetParentId };
  }

  return { ...screen, nodes: nextNodes };
}

function collectSubtreeIds(screen: ScreenNode, rootId: string, acc: Set<string>): void {
  const node = screen.nodes[rootId];
  if (!node || acc.has(rootId)) return;
  acc.add(rootId);
  for (const childId of node.childIds) {
    collectSubtreeIds(screen, childId, acc);
  }
}

export function removeNode(screen: ScreenNode, nodeId: string): ScreenNode {
  if (nodeId === screen.slots.bodyId) return screen;
  const node = screen.nodes[nodeId];
  if (!node) return screen;

  const toDelete = new Set<string>();
  collectSubtreeIds(screen, nodeId, toDelete);

  const nextNodes: Record<string, ComponentNode> = {};
  for (const [id, entry] of Object.entries(screen.nodes)) {
    if (!toDelete.has(id)) {
      nextNodes[id] = entry;
    }
  }

  const nextSlots = { ...screen.slots };
  if (nextSlots.topBarId === nodeId) nextSlots.topBarId = undefined;
  if (nextSlots.fabId === nodeId) nextSlots.fabId = undefined;

  if (node.parentId && nextNodes[node.parentId]) {
    const parent = nextNodes[node.parentId];
    nextNodes[node.parentId] = {
      ...parent,
      childIds: parent.childIds.filter((id) => id !== nodeId),
    };
  }

  return { ...screen, slots: nextSlots, nodes: nextNodes };
}

function cloneSubtree(
  sourceNodes: Record<string, ComponentNode>,
  sourceId: string,
  newParentId: string | null,
  destNodes: Record<string, ComponentNode>,
): string {
  const orig = sourceNodes[sourceId];
  const clonedId = createId(orig.type.toLowerCase());
  const clonedChildren = orig.childIds
    .filter((cid) => Boolean(sourceNodes[cid]))
    .map((cid) => cloneSubtree(sourceNodes, cid, clonedId, destNodes));

  destNodes[clonedId] = {
    ...orig,
    id: clonedId,
    parentId: newParentId,
    childIds: clonedChildren,
    style: { ...orig.style },
    props: structuredClone(orig.props),
    action: orig.action ? { ...orig.action } : undefined,
    ...(orig.bindings ? { bindings: { ...orig.bindings } } : {}),
    ...(orig.visibleWhen ? { visibleWhen: { ...orig.visibleWhen } } : {}),
  } as ComponentNode;

  return clonedId;
}

export function duplicateNode(
  screen: ScreenNode,
  nodeId: string,
): { screen: ScreenNode; newNodeId: string | null } {
  const orig = screen.nodes[nodeId];
  if (!orig || !orig.parentId) return { screen, newNodeId: null };
  const parent = screen.nodes[orig.parentId];
  if (!parent) return { screen, newNodeId: null };

  const nextNodes = { ...screen.nodes };
  const newNodeId = cloneSubtree(screen.nodes, nodeId, parent.id, nextNodes);

  const idx = parent.childIds.indexOf(nodeId);
  const nextChildIds = [...parent.childIds];
  nextChildIds.splice(idx === -1 ? nextChildIds.length : idx + 1, 0, newNodeId);
  nextNodes[parent.id] = { ...parent, childIds: nextChildIds };

  return {
    screen: { ...screen, nodes: nextNodes },
    newNodeId,
  };
}

export function setSlotNode(
  screen: ScreenNode,
  slot: "topBarId" | "fabId",
  node: ComponentNode | null,
): ScreenNode {
  let working = screen;
  const existingId = working.slots[slot];
  if (existingId && working.nodes[existingId]) {
    working = removeNode(working, existingId);
  }
  if (!node) {
    return {
      ...working,
      slots: { ...working.slots, [slot]: undefined },
    };
  }
  const attached: ComponentNode = { ...node, parentId: null };
  return {
    ...working,
    slots: { ...working.slots, [slot]: attached.id },
    nodes: { ...working.nodes, [attached.id]: attached },
  };
}

export function updateNodeProps(
  screen: ScreenNode,
  nodeId: string,
  propsPatch: Record<string, unknown>,
): ScreenNode {
  const node = screen.nodes[nodeId];
  if (!node) return screen;
  return {
    ...screen,
    nodes: {
      ...screen.nodes,
      [nodeId]: {
        ...node,
        props: { ...node.props, ...propsPatch },
      } as ComponentNode,
    },
  };
}

export function updateNodeStyle(
  screen: ScreenNode,
  nodeId: string,
  stylePatch: Partial<ComponentStyle>,
): ScreenNode {
  const node = screen.nodes[nodeId];
  if (!node) return screen;
  return {
    ...screen,
    nodes: {
      ...screen.nodes,
      [nodeId]: {
        ...node,
        style: { ...node.style, ...stylePatch },
      },
    },
  };
}

export function updateNodeAction(
  screen: ScreenNode,
  nodeId: string,
  action: UserAction | undefined,
): ScreenNode {
  const node = screen.nodes[nodeId];
  if (!node) return screen;
  return {
    ...screen,
    nodes: {
      ...screen.nodes,
      [nodeId]: {
        ...node,
        action,
      },
    },
  };
}

export function updateNodeBindings(
  screen: ScreenNode,
  nodeId: string,
  bindings: NodeBindings | undefined,
): ScreenNode {
  const node = screen.nodes[nodeId];
  if (!node) return screen;
  return {
    ...screen,
    nodes: {
      ...screen.nodes,
      [nodeId]: {
        ...node,
        bindings,
      },
    },
  };
}

export function updateNodeVisibility(
  screen: ScreenNode,
  nodeId: string,
  visibleWhen: VisibilityCondition | undefined,
): ScreenNode {
  const node = screen.nodes[nodeId];
  if (!node) return screen;
  return {
    ...screen,
    nodes: {
      ...screen.nodes,
      [nodeId]: {
        ...node,
        visibleWhen,
      },
    },
  };
}

export function slugifyRoute(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "screen";
}

export function duplicateScreenNode(screen: ScreenNode, existingNames: string[]): ScreenNode {
  const nextNodes: Record<string, ComponentNode> = {};
  const bodyId = cloneSubtree(screen.nodes, screen.slots.bodyId, null, nextNodes);
  const topBarId =
    screen.slots.topBarId && screen.nodes[screen.slots.topBarId]
      ? cloneSubtree(screen.nodes, screen.slots.topBarId, null, nextNodes)
      : undefined;
  const fabId =
    screen.slots.fabId && screen.nodes[screen.slots.fabId]
      ? cloneSubtree(screen.nodes, screen.slots.fabId, null, nextNodes)
      : undefined;

  let copyName = `${screen.name} Copy`;
  let counter = 2;
  while (existingNames.includes(copyName)) {
    copyName = `${screen.name} Copy ${counter++}`;
  }

  return {
    id: createId("scr"),
    name: copyName,
    route: slugifyRoute(copyName),
    showBottomNav: screen.showBottomNav,
    backgroundToken: screen.backgroundToken,
    slots: { topBarId, fabId, bodyId },
    nodes: nextNodes,
  };
}

export function removeScreenFromProject(project: AppProject, screenId: string): AppProject {
  if (project.screens.length <= 1) return project;
  const remaining = project.screens.filter((s) => s.id !== screenId);
  if (remaining.length === project.screens.length) return project;

  const fallbackScreenId = remaining[0].id;
  const nextInitial =
    project.initialScreenId === screenId ? fallbackScreenId : project.initialScreenId;

  const nextDestinations = project.bottomNav.destinations.filter(
    (d) => d.targetScreenId !== screenId,
  );

  return {
    ...project,
    screens: remaining,
    initialScreenId: nextInitial,
    bottomNav: {
      ...project.bottomNav,
      destinations: nextDestinations,
    },
  };
}
