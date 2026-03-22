import { create, StoreApi, UseBoundStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  ActionMessage,
  classicyDesktopStateEventReducer,
  ClassicyStore,
  DefaultAppManagerState,
} from "./ClassicyAppManager";

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

export const useAppManager: UseBoundStore<StoreApi<ClassicyStore>> = create<ClassicyStore>()(immer<ClassicyStore>(() => ({
  ...getInitialState(),
})));

export const dispatch = (action: ActionMessage): void => {
  useAppManager.setState((currentState) =>
    classicyDesktopStateEventReducer(currentState, action)
  );
};

export const useAppManagerDispatch = (): ((action: ActionMessage) => void) => dispatch;

// Persist to localStorage with debouncing (matches original 500ms debounce)
let debounceTimer: ReturnType<typeof setTimeout>;

/** Call this during app cleanup or test teardown to stop localStorage sync. */
export const unsubscribeAppManagerPersistence = useAppManager.subscribe((state) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    try {
      localStorage.setItem("classicyDesktopState", JSON.stringify(state));
    } catch (error) {
      console.error('[ClassicyAppManager] Failed to persist desktop state to localStorage. Storage quota may be exceeded.', error);
    }
  }, 500);
});
