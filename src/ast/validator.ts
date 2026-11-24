import { DEFAULT_THEME } from "../theme/tokens.ts";
import type { AppProject, ComponentNode, ScreenNode } from "./types.ts";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function isValidNode(node: unknown): node is ComponentNode {
  if (!isRecord(node)) return false;
  return (
    typeof node.id === "string" &&
    typeof node.type === "string" &&
    (node.parentId === null || typeof node.parentId === "string") &&
    Array.isArray(node.childIds) &&
    node.childIds.every((c) => typeof c === "string") &&
    isRecord(node.style) &&
    isRecord(node.props)
  );
}

function isValidScreen(screen: unknown): screen is ScreenNode {
  if (!isRecord(screen)) return false;
  if (
    typeof screen.id !== "string" ||
    typeof screen.name !== "string" ||
    typeof screen.route !== "string" ||
    typeof screen.showBottomNav !== "boolean"
  ) {
    return false;
  }
  if (!isRecord(screen.slots) || typeof screen.slots.bodyId !== "string") {
    return false;
  }
  if (!isRecord(screen.nodes)) return false;
  const nodes = screen.nodes;
  if (!nodes[screen.slots.bodyId]) return false;
  return Object.values(nodes).every(isValidNode);
}

/** Validate and normalize a parsed JSON project, returning null if structurally invalid. */
export function validateProject(raw: unknown): AppProject | null {
  if (!isRecord(raw)) return null;
  if (raw.schemaVersion !== 1) return null;
  if (typeof raw.id !== "string" || typeof raw.name !== "string") return null;
  if (!Array.isArray(raw.screens) || raw.screens.length === 0) return null;
  if (!raw.screens.every(isValidScreen)) return null;

  const screens = raw.screens;
  const initialScreenId =
    typeof raw.initialScreenId === "string" &&
    screens.some((s) => s.id === raw.initialScreenId)
      ? raw.initialScreenId
      : screens[0].id;

  const rawTheme = isRecord(raw.theme) ? raw.theme : {};
  const rawSystemBars = isRecord(rawTheme.systemBars) ? rawTheme.systemBars : {};

  const theme = {
    ...DEFAULT_THEME,
    ...rawTheme,
    customOverrides: isRecord(rawTheme.customOverrides)
      ? (rawTheme.customOverrides as AppProject["theme"]["customOverrides"])
      : {},
    systemBars: {
      ...DEFAULT_THEME.systemBars,
      ...rawSystemBars,
    },
  };

  const rawBottomNav = isRecord(raw.bottomNav) ? raw.bottomNav : {};
  const destinations = Array.isArray(rawBottomNav.destinations)
    ? rawBottomNav.destinations.filter(
        (d): d is AppProject["bottomNav"]["destinations"][number] =>
          isRecord(d) &&
          typeof d.id === "string" &&
          typeof d.label === "string" &&
          typeof d.icon === "string" &&
          typeof d.targetScreenId === "string",
      )
    : [];

  return {
    schemaVersion: 1,
    id: raw.id,
    name: raw.name,
    packageName:
      typeof raw.packageName === "string" ? raw.packageName : "com.example.m3app",
    theme,
    bottomNav: {
      enabled: typeof rawBottomNav.enabled === "boolean" ? rawBottomNav.enabled : true,
      destinations,
    },
    screens,
    initialScreenId,
  };
}
