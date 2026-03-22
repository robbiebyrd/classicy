import { create, StoreApi, UseBoundStore } from "zustand";
import { immer } from "zustand/middleware/immer";
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
        const parsed = JSON.parse(storedState);
        // Basic schema validation — fall back on shape mismatch
        if (!parsed || typeof parsed !== 'object' || !('System' in parsed)) {
          console.warn('[ClassicyAppManager] Persisted state schema mismatch; falling back to defaults.');
          return DefaultAppManagerState;
        }
        return parsed;
      }
    } catch (error) {
      console.error('[ClassicyAppManager] Failed to parse persisted desktop state; falling back to defaults.', error);
    }
  }
  return DefaultAppManagerState;
}

export const useAppManager: UseBoundStore<StoreApi<ClassicyStoreWithActions>> = create<ClassicyStoreWithActions>()(immer<ClassicyStoreWithActions>((set) => ({
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
})));

// Persist to localStorage with debouncing (matches original 500ms debounce)
let debounceTimer: ReturnType<typeof setTimeout>;
useAppManager.subscribe((state) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { dispatch, ...stateOnly } = state;
    try {
      localStorage.setItem("classicyDesktopState", JSON.stringify(stateOnly));
    } catch (error) {
      console.error('[ClassicyAppManager] Failed to persist desktop state to localStorage. Storage quota may be exceeded.', error);
    }
  }, 500);
});

export function useAppManagerDispatch(): (action: ActionMessage) => void {
  return useAppManager((state) => state.dispatch);
}
