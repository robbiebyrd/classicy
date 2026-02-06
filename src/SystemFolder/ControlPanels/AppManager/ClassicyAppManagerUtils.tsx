import { create } from "zustand";
import {
  ActionMessage,
  classicyDesktopStateEventReducer,
  ClassicyStore,
  DefaultAppManagerState,
} from "./ClassicyAppManager";

export interface ClassicyStoreWithActions extends ClassicyStore {
  dispatch: (action: ActionMessage) => void;
}

function getInitialState(): ClassicyStore {
  if (typeof window !== "undefined") {
    try {
      const storedState = localStorage.getItem("classicyDesktopState");
      if (storedState) {
        return JSON.parse(storedState);
      }
    } catch (error) {
      console.log(error);
    }
  }
  return DefaultAppManagerState;
}

export const useClassicyStore = create<ClassicyStoreWithActions>()((set) => ({
  ...getInitialState(),
  dispatch: (action: ActionMessage) => {
    set((currentState) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { dispatch, ...stateOnly } = currentState;
      return classicyDesktopStateEventReducer(
        stateOnly as ClassicyStore,
        action,
      );
    });
  },
}));

// Persist to localStorage with debouncing (matches original 500ms debounce)
let debounceTimer: ReturnType<typeof setTimeout>;
useClassicyStore.subscribe((state) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { dispatch, ...stateOnly } = state;
    localStorage.setItem("classicyDesktopState", JSON.stringify(stateOnly));
  }, 500);
});

export function useAppManager(): ClassicyStore {
  return useClassicyStore();
}

export function useAppManagerDispatch(): (action: ActionMessage) => void {
  return useClassicyStore((state) => state.dispatch);
}
