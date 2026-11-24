import { create } from "zustand";
import type { TransitionType, UserAction } from "../ast/types.ts";

export interface NavEntry {
  screenId: string;
  transition: TransitionType;
}

export interface SnackbarState {
  id: number;
  message: string;
}

interface PreviewStoreState {
  navStack: NavEntry[];
  isBack: boolean;
  values: Record<string, unknown>;
  snackbar: SnackbarState | null;

  startPreview: (initialScreenId: string) => void;
  resetPreview: (initialScreenId: string) => void;
  pushScreen: (screenId: string, transition?: TransitionType) => void;
  switchTabScreen: (screenId: string) => void;
  goBack: () => void;
  setValue: (key: string, value: unknown) => void;
  showSnackbar: (message: string) => void;
  dismissSnackbar: () => void;
  executeAction: (action: UserAction | undefined, availableScreenIds: Set<string>) => void;
}

let snackIdCounter = 1;

export const usePreviewStore = create<PreviewStoreState>((set, get) => ({
  navStack: [],
  isBack: false,
  values: {},
  snackbar: null,

  startPreview: (initialScreenId) =>
    set({
      navStack: [{ screenId: initialScreenId, transition: "none" }],
      isBack: false,
      values: {},
      snackbar: null,
    }),

  resetPreview: (initialScreenId) =>
    set({
      navStack: [{ screenId: initialScreenId, transition: "none" }],
      isBack: false,
      values: {},
      snackbar: null,
    }),

  pushScreen: (screenId, transition = "slide") =>
    set((state) => {
      const top = state.navStack[state.navStack.length - 1];
      if (top?.screenId === screenId) return state;
      return {
        navStack: [...state.navStack, { screenId, transition }],
        isBack: false,
      };
    }),

  switchTabScreen: (screenId) =>
    set((state) => {
      const top = state.navStack[state.navStack.length - 1];
      if (top?.screenId === screenId) return state;
      return {
        navStack: [{ screenId, transition: "fade" }],
        isBack: false,
      };
    }),

  goBack: () =>
    set((state) => {
      if (state.navStack.length <= 1) return state;
      return {
        navStack: state.navStack.slice(0, -1),
        isBack: true,
      };
    }),

  setValue: (key, value) =>
    set((state) => ({
      values: { ...state.values, [key]: value },
    })),

  showSnackbar: (message) =>
    set({
      snackbar: { id: snackIdCounter++, message },
    }),

  dismissSnackbar: () => set({ snackbar: null }),

  executeAction: (action, availableScreenIds) => {
    if (!action || action.type === "none") return;
    const { pushScreen, goBack, showSnackbar } = get();
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
          const cur = Boolean(get().values[action.stateKey]);
          get().setValue(action.stateKey, !cur);
        }
        break;
    }
  },
}));
