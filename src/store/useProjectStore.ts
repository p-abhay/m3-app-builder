import { create } from "zustand";
import { createBlankScreen, createId } from "../ast/factory.ts";
import {
  duplicateNode as dupNodeOp,
  duplicateScreenNode,
  insertNode as insertNodeOp,
  moveNode as moveNodeOp,
  removeNode as removeNodeOp,
  removeScreenFromProject,
  setSlotNode as setSlotNodeOp,
  slugifyRoute,
  updateNodeAction as updateNodeActionOp,
  updateNodeBindings as updateNodeBindingsOp,
  updateNodeProps as updateNodePropsOp,
  updateNodeStyle as updateNodeStyleOp,
  updateNodeVisibility as updateNodeVisibilityOp,
} from "../ast/operations.ts";
import { createEmptyAppState } from "../ast/state.ts";
import { STARTER_TEMPLATES } from "../ast/templates.ts";
import type {
  AppCollection,
  AppProject,
  AppVariable,
  ComponentNode,
  ComponentStyle,
  NavDestination,
  NodeBindings,
  PersistenceBackend,
  ScreenNode,
  UserAction,
  VisibilityCondition,
} from "../ast/types.ts";
import { validateProject } from "../ast/validator.ts";
import { DEFAULT_THEME } from "../theme/tokens.ts";
import type { AppThemeConfig, ColorTokenKey, SystemBarsConfig } from "../theme/types.ts";

export const PROJECT_STORAGE_KEY = "m3_app_builder_project_v1";
const MAX_HISTORY = 50;

function loadInitialProject(): AppProject {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
      if (raw) {
        const parsed = validateProject(JSON.parse(raw));
        if (parsed) return parsed;
      }
    } catch {
      // ignore corrupted local storage and fall back to default template
    }
  }
  return STARTER_TEMPLATES[0].build();
}

function saveProjectToStorage(project: AppProject): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
  } catch {
    // ignore storage quota failures
  }
}

function updateActiveScreenInProject(
  project: AppProject,
  screenId: string,
  updater: (screen: ScreenNode) => ScreenNode,
): AppProject {
  let changed = false;
  const screens = project.screens.map((scr) => {
    if (scr.id !== screenId) return scr;
    const next = updater(scr);
    if (next !== scr) changed = true;
    return next;
  });
  return changed ? { ...project, screens } : project;
}

export interface ProjectStoreState {
  project: AppProject;
  past: AppProject[];
  future: AppProject[];
  activeScreenId: string;
  selectedNodeId: string | null;
  editorMode: "edit" | "preview";

  // History & persistence
  commit: (updater: (project: AppProject) => AppProject) => void;
  undo: () => void;
  redo: () => void;
  setProjectName: (name: string) => void;
  setPackageName: (packageName: string) => void;
  loadTemplate: (templateId: string) => void;
  importProjectJson: (raw: string) => { ok: true } | { ok: false; error: string };
  exportProjectJson: () => string;

  // Mode & selection
  setEditorMode: (mode: "edit" | "preview") => void;
  setActiveScreen: (screenId: string) => void;
  selectNode: (nodeId: string | null) => void;

  // Theme & system
  updateTheme: (patch: Partial<AppThemeConfig>) => void;
  updateSystemBars: (patch: Partial<SystemBarsConfig>) => void;
  setColorOverride: (role: ColorTokenKey, hex: string) => void;
  clearColorOverrides: () => void;
  resetTheme: () => void;

  // Screen management
  addScreen: (name?: string) => void;
  duplicateScreen: (screenId: string) => void;
  removeScreen: (screenId: string) => void;
  updateScreenMeta: (
    screenId: string,
    patch: Partial<Pick<ScreenNode, "name" | "route" | "showBottomNav" | "backgroundToken">>,
  ) => void;
  setInitialScreen: (screenId: string) => void;

  // Shared bottom navigation
  setBottomNavEnabled: (enabled: boolean) => void;
  addNavDestination: (dest?: Partial<NavDestination>) => void;
  updateNavDestination: (destId: string, patch: Partial<NavDestination>) => void;
  removeNavDestination: (destId: string) => void;

  // AST node manipulation on active screen
  insertNode: (parentId: string, node: ComponentNode, index?: number) => void;
  moveNode: (nodeId: string, targetParentId: string, targetIndex: number) => void;
  duplicateNode: (nodeId: string) => void;
  removeNode: (nodeId: string) => void;
  setSlotNode: (slot: "topBarId" | "fabId", node: ComponentNode | null) => void;
  updateNodeProps: (nodeId: string, propsPatch: Record<string, unknown>) => void;
  updateNodeStyle: (nodeId: string, stylePatch: Partial<ComponentStyle>) => void;
  updateNodeAction: (nodeId: string, action: UserAction | undefined) => void;
  updateNodeBindings: (nodeId: string, bindings: NodeBindings | undefined) => void;
  updateNodeVisibility: (nodeId: string, visibleWhen: VisibilityCondition | undefined) => void;

  // App state, collections & persistence
  setPersistenceBackend: (backend: PersistenceBackend) => void;
  upsertVariable: (variable: AppVariable) => void;
  removeVariable: (key: string) => void;
  upsertCollection: (collection: AppCollection) => void;
  removeCollection: (key: string) => void;
}

const initialProject = loadInitialProject();

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  project: initialProject,
  past: [],
  future: [],
  activeScreenId: initialProject.initialScreenId,
  selectedNodeId: null,
  editorMode: "edit",

  commit: (updater) =>
    set((state) => {
      const nextProject = updater(state.project);
      if (nextProject === state.project) return state;
      saveProjectToStorage(nextProject);
      const nextPast = [...state.past.slice(-(MAX_HISTORY - 1)), state.project];
      return {
        project: nextProject,
        past: nextPast,
        future: [],
      };
    }),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const nextPast = state.past.slice(0, -1);
      saveProjectToStorage(previous);

      const screenStillExists = previous.screens.some((s) => s.id === state.activeScreenId);
      const nextActiveScreenId = screenStillExists
        ? state.activeScreenId
        : previous.initialScreenId;
      const nextScreen = previous.screens.find((s) => s.id === nextActiveScreenId);
      const nextSelected =
        state.selectedNodeId && nextScreen?.nodes[state.selectedNodeId]
          ? state.selectedNodeId
          : null;

      return {
        project: previous,
        past: nextPast,
        future: [state.project, ...state.future],
        activeScreenId: nextActiveScreenId,
        selectedNodeId: nextSelected,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const nextFuture = state.future.slice(1);
      saveProjectToStorage(next);

      const screenStillExists = next.screens.some((s) => s.id === state.activeScreenId);
      const nextActiveScreenId = screenStillExists ? state.activeScreenId : next.initialScreenId;
      const nextScreen = next.screens.find((s) => s.id === nextActiveScreenId);
      const nextSelected =
        state.selectedNodeId && nextScreen?.nodes[state.selectedNodeId]
          ? state.selectedNodeId
          : null;

      return {
        project: next,
        past: [...state.past, state.project],
        future: nextFuture,
        activeScreenId: nextActiveScreenId,
        selectedNodeId: nextSelected,
      };
    }),

  setProjectName: (name) =>
    get().commit((proj) => ({ ...proj, name })),

  setPackageName: (packageName) =>
    get().commit((proj) => ({ ...proj, packageName })),

  loadTemplate: (templateId) => {
    const tpl = STARTER_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const nextProject = tpl.build();
    saveProjectToStorage(nextProject);
    set((state) => ({
      project: nextProject,
      past: [...state.past.slice(-(MAX_HISTORY - 1)), state.project],
      future: [],
      activeScreenId: nextProject.initialScreenId,
      selectedNodeId: null,
      editorMode: "edit",
    }));
  },

  importProjectJson: (raw) => {
    try {
      const parsedJson = JSON.parse(raw) as unknown;
      const validated = validateProject(parsedJson);
      if (!validated) {
        return { ok: false, error: "Invalid M3 App Builder project schema (expected schemaVersion: 1)." };
      }
      saveProjectToStorage(validated);
      set((state) => ({
        project: validated,
        past: [...state.past.slice(-(MAX_HISTORY - 1)), state.project],
        future: [],
        activeScreenId: validated.initialScreenId,
        selectedNodeId: null,
        editorMode: "edit",
      }));
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to parse JSON.",
      };
    }
  },

  exportProjectJson: () => JSON.stringify(get().project, null, 2),

  setEditorMode: (editorMode) => set({ editorMode }),

  setActiveScreen: (screenId) =>
    set((state) => {
      if (!state.project.screens.some((s) => s.id === screenId)) return state;
      return { activeScreenId: screenId, selectedNodeId: null };
    }),

  selectNode: (selectedNodeId) => set({ selectedNodeId }),

  updateTheme: (patch) =>
    get().commit((proj) => ({
      ...proj,
      theme: { ...proj.theme, ...patch },
    })),

  updateSystemBars: (patch) =>
    get().commit((proj) => ({
      ...proj,
      theme: {
        ...proj.theme,
        systemBars: { ...proj.theme.systemBars, ...patch },
      },
    })),

  setColorOverride: (role, hex) =>
    get().commit((proj) => ({
      ...proj,
      theme: {
        ...proj.theme,
        customOverrides: { ...proj.theme.customOverrides, [role]: hex.toUpperCase() },
      },
    })),

  clearColorOverrides: () =>
    get().commit((proj) => ({
      ...proj,
      theme: { ...proj.theme, customOverrides: {} },
    })),

  resetTheme: () =>
    get().commit((proj) => ({
      ...proj,
      theme: { ...DEFAULT_THEME },
    })),

  addScreen: (name) => {
    const state = get();
    const index = state.project.screens.length + 1;
    const screenName = name?.trim() || `Screen ${index}`;
    const newScreen = createBlankScreen(screenName, slugifyRoute(screenName), {
      showBottomNav: state.project.bottomNav.enabled,
    });
    state.commit((proj) => ({
      ...proj,
      screens: [...proj.screens, newScreen],
    }));
    set({ activeScreenId: newScreen.id, selectedNodeId: null });
  },

  duplicateScreen: (screenId) => {
    const state = get();
    const orig = state.project.screens.find((s) => s.id === screenId);
    if (!orig) return;
    const copy = duplicateScreenNode(
      orig,
      state.project.screens.map((s) => s.name),
    );
    state.commit((proj) => ({
      ...proj,
      screens: [...proj.screens, copy],
    }));
    set({ activeScreenId: copy.id, selectedNodeId: null });
  },

  removeScreen: (screenId) => {
    const state = get();
    if (state.project.screens.length <= 1) return;
    state.commit((proj) => removeScreenFromProject(proj, screenId));
    const updated = get().project;
    if (!updated.screens.some((s) => s.id === get().activeScreenId)) {
      set({ activeScreenId: updated.initialScreenId, selectedNodeId: null });
    }
  },

  updateScreenMeta: (screenId, patch) =>
    get().commit((proj) =>
      updateActiveScreenInProject(proj, screenId, (scr) => ({
        ...scr,
        ...patch,
      })),
    ),

  setInitialScreen: (screenId) =>
    get().commit((proj) => {
      if (!proj.screens.some((s) => s.id === screenId)) return proj;
      return { ...proj, initialScreenId: screenId };
    }),

  setBottomNavEnabled: (enabled) =>
    get().commit((proj) => ({
      ...proj,
      bottomNav: { ...proj.bottomNav, enabled },
    })),

  addNavDestination: (dest) =>
    get().commit((proj) => {
      if (proj.bottomNav.destinations.length >= 5) return proj;
      const targetScreenId = dest?.targetScreenId ?? proj.screens[0]?.id ?? "";
      const next: NavDestination = {
        id: dest?.id ?? createId("nav"),
        label: dest?.label ?? `Tab ${proj.bottomNav.destinations.length + 1}`,
        icon: dest?.icon ?? "star",
        targetScreenId,
      };
      return {
        ...proj,
        bottomNav: {
          ...proj.bottomNav,
          destinations: [...proj.bottomNav.destinations, next],
        },
      };
    }),

  updateNavDestination: (destId, patch) =>
    get().commit((proj) => ({
      ...proj,
      bottomNav: {
        ...proj.bottomNav,
        destinations: proj.bottomNav.destinations.map((d) =>
          d.id === destId ? { ...d, ...patch } : d,
        ),
      },
    })),

  removeNavDestination: (destId) =>
    get().commit((proj) => ({
      ...proj,
      bottomNav: {
        ...proj.bottomNav,
        destinations: proj.bottomNav.destinations.filter((d) => d.id !== destId),
      },
    })),

  insertNode: (parentId, node, index) => {
    const { activeScreenId, commit } = get();
    commit((proj) =>
      updateActiveScreenInProject(proj, activeScreenId, (scr) =>
        insertNodeOp(scr, parentId, node, index),
      ),
    );
    set({ selectedNodeId: node.id });
  },

  moveNode: (nodeId, targetParentId, targetIndex) => {
    const { activeScreenId, commit } = get();
    commit((proj) =>
      updateActiveScreenInProject(proj, activeScreenId, (scr) =>
        moveNodeOp(scr, nodeId, targetParentId, targetIndex),
      ),
    );
  },

  duplicateNode: (nodeId) => {
    const { activeScreenId, commit } = get();
    let createdId: string | null = null;
    commit((proj) =>
      updateActiveScreenInProject(proj, activeScreenId, (scr) => {
        const res = dupNodeOp(scr, nodeId);
        createdId = res.newNodeId;
        return res.screen;
      }),
    );
    if (createdId) set({ selectedNodeId: createdId });
  },

  removeNode: (nodeId) => {
    const { activeScreenId, selectedNodeId, commit } = get();
    commit((proj) =>
      updateActiveScreenInProject(proj, activeScreenId, (scr) =>
        removeNodeOp(scr, nodeId),
      ),
    );
    if (selectedNodeId === nodeId) set({ selectedNodeId: null });
  },

  setSlotNode: (slot, node) => {
    const { activeScreenId, commit } = get();
    commit((proj) =>
      updateActiveScreenInProject(proj, activeScreenId, (scr) =>
        setSlotNodeOp(scr, slot, node),
      ),
    );
    set({ selectedNodeId: node?.id ?? null });
  },

  updateNodeProps: (nodeId, propsPatch) => {
    const { activeScreenId, commit } = get();
    commit((proj) =>
      updateActiveScreenInProject(proj, activeScreenId, (scr) =>
        updateNodePropsOp(scr, nodeId, propsPatch),
      ),
    );
  },

  updateNodeStyle: (nodeId, stylePatch) => {
    const { activeScreenId, commit } = get();
    commit((proj) =>
      updateActiveScreenInProject(proj, activeScreenId, (scr) =>
        updateNodeStyleOp(scr, nodeId, stylePatch),
      ),
    );
  },

  updateNodeAction: (nodeId, action) => {
    const { activeScreenId, commit } = get();
    commit((proj) =>
      updateActiveScreenInProject(proj, activeScreenId, (scr) =>
        updateNodeActionOp(scr, nodeId, action),
      ),
    );
  },

  updateNodeBindings: (nodeId, bindings) => {
    const { activeScreenId, commit } = get();
    commit((proj) =>
      updateActiveScreenInProject(proj, activeScreenId, (scr) =>
        updateNodeBindingsOp(scr, nodeId, bindings),
      ),
    );
  },

  updateNodeVisibility: (nodeId, visibleWhen) => {
    const { activeScreenId, commit } = get();
    commit((proj) =>
      updateActiveScreenInProject(proj, activeScreenId, (scr) =>
        updateNodeVisibilityOp(scr, nodeId, visibleWhen),
      ),
    );
  },

  setPersistenceBackend: (persistenceBackend) =>
    get().commit((proj) => {
      const base = proj.state ?? createEmptyAppState();
      return { ...proj, state: { ...base, persistenceBackend } };
    }),

  upsertVariable: (variable) =>
    get().commit((proj) => {
      const base = proj.state ?? createEmptyAppState();
      const exists = base.variables.some((v) => v.key === variable.key);
      const variables = exists
        ? base.variables.map((v) => (v.key === variable.key ? variable : v))
        : [...base.variables, variable];
      return { ...proj, state: { ...base, variables } };
    }),

  removeVariable: (key) =>
    get().commit((proj) => {
      const base = proj.state ?? createEmptyAppState();
      return {
        ...proj,
        state: {
          ...base,
          variables: base.variables.filter((v) => v.key !== key),
        },
      };
    }),

  upsertCollection: (collection) =>
    get().commit((proj) => {
      const base = proj.state ?? createEmptyAppState();
      const exists = base.collections.some((c) => c.key === collection.key);
      const collections = exists
        ? base.collections.map((c) => (c.key === collection.key ? collection : c))
        : [...base.collections, collection];
      return { ...proj, state: { ...base, collections } };
    }),

  removeCollection: (key) =>
    get().commit((proj) => {
      const base = proj.state ?? createEmptyAppState();
      return {
        ...proj,
        state: {
          ...base,
          collections: base.collections.filter((c) => c.key !== key),
        },
      };
    }),
}));
