import { create } from "zustand";
import { createEmptyAppState } from "../ast/state.ts";
import type {
  AppStateConfig,
  CollectionRecord,
  TransitionType,
  UserAction,
} from "../ast/types.ts";

export interface NavEntry {
  screenId: string;
  transition: TransitionType;
}

export interface SnackbarState {
  id: number;
  message: string;
}

export interface ItemActionContext {
  collectionKey: string;
  item?: CollectionRecord & { id: string };
}

interface PreviewStoreState {
  projectId: string | null;
  appStateConfig: AppStateConfig;
  navStack: NavEntry[];
  isBack: boolean;
  values: Record<string, unknown>;
  collections: Record<string, (CollectionRecord & { id: string })[]>;
  activeOverlayNodeId: string | null;
  snackbar: SnackbarState | null;

  startPreview: (initialScreenId: string, projectId?: string, stateConfig?: AppStateConfig) => void;
  resetPreview: (initialScreenId: string) => void;
  pushScreen: (screenId: string, transition?: TransitionType) => void;
  switchTabScreen: (screenId: string) => void;
  goBack: () => void;
  setValue: (key: string, value: unknown) => void;
  openOverlay: (nodeId: string) => void;
  dismissOverlay: () => void;
  showSnackbar: (message: string) => void;
  dismissSnackbar: () => void;
  executeAction: (
    action: UserAction | undefined,
    availableScreenIds: Set<string>,
    itemCtx?: ItemActionContext,
  ) => void;
}

let snackIdCounter = 1;
let itemSeq = 1;

const RUNTIME_STORAGE_PREFIX = "m3_app_builder_runtime_";

function storageKeyFor(projectId: string | null): string | null {
  return projectId ? `${RUNTIME_STORAGE_PREFIX}${projectId}` : null;
}

interface PersistedRuntimeBlob {
  values?: Record<string, unknown>;
  collections?: Record<string, (CollectionRecord & { id: string })[]>;
}

function hydrateFromConfig(
  projectId: string | null,
  config: AppStateConfig,
  ignorePersisted = false,
): {
  values: Record<string, unknown>;
  collections: Record<string, (CollectionRecord & { id: string })[]>;
} {
  const values: Record<string, unknown> = {};
  for (const v of config.variables) {
    values[v.key] = v.defaultValue;
  }

  const collections: Record<string, (CollectionRecord & { id: string })[]> = {};
  for (const col of config.collections) {
    collections[col.key] = col.initialItems.map((item) => ({ ...item }));
  }

  const sKey = storageKeyFor(projectId);
  if (!ignorePersisted && sKey && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(sKey);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedRuntimeBlob;
        if (parsed.values) {
          for (const v of config.variables) {
            if (v.persist && v.key in parsed.values) {
              values[v.key] = parsed.values[v.key];
            }
          }
        }
        if (parsed.collections) {
          for (const col of config.collections) {
            if (col.persist && Array.isArray(parsed.collections[col.key])) {
              collections[col.key] = parsed.collections[col.key].map((item, idx) => ({
                ...item,
                id: typeof item.id === "string" ? item.id : `restored_${idx}`,
              }));
            }
          }
        }
      }
    } catch {
      // Ignore corrupt persisted preview storage
    }
  }

  return { values, collections };
}

function persistRuntimeSnapshot(
  projectId: string | null,
  config: AppStateConfig,
  values: Record<string, unknown>,
  collections: Record<string, (CollectionRecord & { id: string })[]>,
): void {
  const sKey = storageKeyFor(projectId);
  if (!sKey || typeof window === "undefined") return;

  const savedValues: Record<string, unknown> = {};
  for (const v of config.variables) {
    if (v.persist && v.key in values) {
      savedValues[v.key] = values[v.key];
    }
  }

  const savedCollections: Record<string, (CollectionRecord & { id: string })[]> = {};
  for (const col of config.collections) {
    if (col.persist && Array.isArray(collections[col.key])) {
      savedCollections[col.key] = collections[col.key];
    }
  }

  if (Object.keys(savedValues).length === 0 && Object.keys(savedCollections).length === 0) {
    return;
  }

  try {
    localStorage.setItem(
      sKey,
      JSON.stringify({ values: savedValues, collections: savedCollections }),
    );
  } catch {
    // Ignore storage quota issues
  }
}

export const usePreviewStore = create<PreviewStoreState>((set, get) => ({
  projectId: null,
  appStateConfig: createEmptyAppState(),
  navStack: [],
  isBack: false,
  values: {},
  collections: {},
  activeOverlayNodeId: null,
  snackbar: null,

  startPreview: (initialScreenId, projectId, stateConfig) => {
    const config = stateConfig ?? createEmptyAppState();
    const pid = projectId ?? null;
    const { values, collections } = hydrateFromConfig(pid, config, false);
    set({
      projectId: pid,
      appStateConfig: config,
      navStack: [{ screenId: initialScreenId, transition: "none" }],
      isBack: false,
      values,
      collections,
      activeOverlayNodeId: null,
      snackbar: null,
    });
  },

  resetPreview: (initialScreenId) => {
    const { projectId, appStateConfig } = get();
    const sKey = storageKeyFor(projectId);
    if (sKey && typeof window !== "undefined") {
      try {
        localStorage.removeItem(sKey);
      } catch {
        // ignore
      }
    }
    const { values, collections } = hydrateFromConfig(projectId, appStateConfig, true);
    set({
      navStack: [{ screenId: initialScreenId, transition: "none" }],
      isBack: false,
      values,
      collections,
      activeOverlayNodeId: null,
      snackbar: null,
    });
  },

  pushScreen: (screenId, transition = "slide") =>
    set((state) => {
      const top = state.navStack[state.navStack.length - 1];
      if (top?.screenId === screenId) return state;
      return {
        navStack: [...state.navStack, { screenId, transition }],
        isBack: false,
        activeOverlayNodeId: null,
      };
    }),

  switchTabScreen: (screenId) =>
    set((state) => {
      const top = state.navStack[state.navStack.length - 1];
      if (top?.screenId === screenId) return state;
      return {
        navStack: [{ screenId, transition: "fade" }],
        isBack: false,
        activeOverlayNodeId: null,
      };
    }),

  goBack: () =>
    set((state) => {
      if (state.activeOverlayNodeId) {
        return { activeOverlayNodeId: null };
      }
      if (state.navStack.length <= 1) return state;
      return {
        navStack: state.navStack.slice(0, -1),
        isBack: true,
        activeOverlayNodeId: null,
      };
    }),

  setValue: (key, value) =>
    set((state) => {
      const nextValues = { ...state.values, [key]: value };
      persistRuntimeSnapshot(state.projectId, state.appStateConfig, nextValues, state.collections);
      return { values: nextValues };
    }),

  openOverlay: (nodeId) => set({ activeOverlayNodeId: nodeId }),

  dismissOverlay: () => set({ activeOverlayNodeId: null }),

  showSnackbar: (message) =>
    set({
      snackbar: { id: snackIdCounter++, message },
    }),

  dismissSnackbar: () => set({ snackbar: null }),

  executeAction: (action, availableScreenIds, itemCtx) => {
    if (!action || action.type === "none") return;
    const state = get();
    const { pushScreen, goBack, showSnackbar, setValue } = state;

    const resetVar = (nextValues: Record<string, unknown>, stateKey: string) => {
      const def = state.appStateConfig.variables.find((v) => v.key === stateKey);
      nextValues[stateKey] = def ? def.defaultValue : "";
    };

    const buildRecordFromState = (
      colKey: string,
      fieldFromState: Record<string, string>,
      existing?: CollectionRecord & { id: string },
    ): CollectionRecord & { id: string } => {
      const colSchema = state.appStateConfig.collections.find((c) => c.key === colKey);
      const record: CollectionRecord & { id: string } = existing
        ? { ...existing }
        : {
            id: `item_${Date.now()}_${itemSeq++}`,
            createdAt: Date.now(),
          };

      if (!existing && colSchema) {
        for (const f of colSchema.fields) {
          if (f.key in record) continue;
          if (f.type === "boolean") record[f.key] = false;
          else if (f.type === "number") record[f.key] = 0;
          else if (f.key === "priority") record[f.key] = "medium";
          else record[f.key] = "";
        }
      }

      for (const [fieldKey, stateKey] of Object.entries(fieldFromState)) {
        const val = state.values[stateKey];
        if (typeof val === "string" || typeof val === "boolean" || typeof val === "number") {
          record[fieldKey] = typeof val === "string" ? val.trim() : val;
        }
      }
      return record;
    };

    switch (action.type) {
      case "navigate":
        if (availableScreenIds.has(action.targetScreenId)) {
          pushScreen(action.targetScreenId, action.transition);
        }
        break;
      case "navigateBack":
        goBack();
        break;
      case "showSnackbar":
        showSnackbar(action.message);
        break;
      case "openUrl":
        showSnackbar(`Link: ${action.url}`);
        break;
      case "toggleState":
        if (action.stateKey) {
          setValue(action.stateKey, !Boolean(state.values[action.stateKey]));
        }
        break;
      case "setState":
        setValue(action.stateKey, action.value);
        break;
      case "createItem": {
        const record = buildRecordFromState(action.collectionKey, action.fieldFromState);
        if ("title" in action.fieldFromState && !String(record.title ?? "").trim()) {
          showSnackbar("Please enter a title first");
          return;
        }
        const curList = state.collections[action.collectionKey] ?? [];
        const nextCollections = {
          ...state.collections,
          [action.collectionKey]: [record, ...curList],
        };
        const nextValues = { ...state.values };
        for (const k of action.clearStateKeys ?? []) {
          resetVar(nextValues, k);
        }
        persistRuntimeSnapshot(state.projectId, state.appStateConfig, nextValues, nextCollections);
        set({ collections: nextCollections, values: nextValues });
        if (action.snackbarMessage) showSnackbar(action.snackbarMessage);
        if (action.navigateBackAfter) goBack();
        break;
      }
      case "selectItem": {
        const nextValues = { ...state.values };
        if (itemCtx?.item) {
          nextValues[action.targetStateKey] = itemCtx.item.id;
          for (const [stateKey, itemField] of Object.entries(action.populateState ?? {})) {
            const fieldVal = itemCtx.item[itemField];
            if (fieldVal !== undefined) nextValues[stateKey] = fieldVal;
            else resetVar(nextValues, stateKey);
          }
        } else {
          nextValues[action.targetStateKey] = "";
          for (const stateKey of Object.keys(action.populateState ?? {})) {
            resetVar(nextValues, stateKey);
          }
        }
        persistRuntimeSnapshot(state.projectId, state.appStateConfig, nextValues, state.collections);
        set({ values: nextValues });
        if (action.targetScreenId && availableScreenIds.has(action.targetScreenId)) {
          pushScreen(action.targetScreenId, action.transition ?? "slide");
        }
        break;
      }
      case "updateItem": {
        const targetId =
          (action.idStateKey ? String(state.values[action.idStateKey] ?? "") : "") ||
          itemCtx?.item?.id ||
          "";
        const curList = state.collections[action.collectionKey] ?? [];
        const existingIdx = targetId ? curList.findIndex((i) => i.id === targetId) : -1;

        let nextList: (CollectionRecord & { id: string })[];
        if (existingIdx >= 0) {
          const updated = buildRecordFromState(
            action.collectionKey,
            action.fieldFromState,
            curList[existingIdx],
          );
          if ("title" in action.fieldFromState && !String(updated.title ?? "").trim()) {
            showSnackbar("Please enter a title first");
            return;
          }
          nextList = curList.map((row, i) => (i === existingIdx ? updated : row));
        } else if (action.createIfMissing) {
          const created = buildRecordFromState(action.collectionKey, action.fieldFromState);
          if ("title" in action.fieldFromState && !String(created.title ?? "").trim()) {
            showSnackbar("Please enter a title first");
            return;
          }
          nextList = [created, ...curList];
        } else {
          return;
        }

        const nextCollections = { ...state.collections, [action.collectionKey]: nextList };
        const nextValues = { ...state.values };
        for (const k of action.clearStateKeys ?? []) {
          resetVar(nextValues, k);
        }
        persistRuntimeSnapshot(state.projectId, state.appStateConfig, nextValues, nextCollections);
        set({ collections: nextCollections, values: nextValues });
        if (action.snackbarMessage) showSnackbar(action.snackbarMessage);
        if (action.navigateBackAfter) goBack();
        break;
      }
      case "toggleItemField": {
        const targetId =
          (action.idStateKey ? String(state.values[action.idStateKey] ?? "") : "") ||
          itemCtx?.item?.id ||
          "";
        if (!targetId) return;
        const curList = state.collections[action.collectionKey] ?? [];
        const nextList = curList.map((row) =>
          row.id === targetId ? { ...row, [action.field]: !Boolean(row[action.field]) } : row,
        );
        const nextCollections = { ...state.collections, [action.collectionKey]: nextList };
        persistRuntimeSnapshot(state.projectId, state.appStateConfig, state.values, nextCollections);
        set({ collections: nextCollections });
        break;
      }
      case "deleteItem": {
        const targetId =
          (action.idStateKey ? String(state.values[action.idStateKey] ?? "") : "") ||
          itemCtx?.item?.id ||
          "";
        if (!targetId) {
          if (action.navigateBackAfter) goBack();
          return;
        }
        const curList = state.collections[action.collectionKey] ?? [];
        const nextList = curList.filter((row) => row.id !== targetId);
        const nextCollections = { ...state.collections, [action.collectionKey]: nextList };
        const nextValues = { ...state.values };
        if (action.idStateKey) nextValues[action.idStateKey] = "";
        persistRuntimeSnapshot(state.projectId, state.appStateConfig, nextValues, nextCollections);
        set({ collections: nextCollections, values: nextValues });
        if (action.snackbarMessage) showSnackbar(action.snackbarMessage);
        if (action.navigateBackAfter) goBack();
        break;
      }
      case "openOverlay":
        set({ activeOverlayNodeId: action.targetNodeId });
        break;
      case "dismissOverlay":
        set({ activeOverlayNodeId: null });
        break;
    }
  },
}));
