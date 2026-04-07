import { castDraft, produce } from "immer";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import {
	type ActionMessage,
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	DefaultAppManagerState,
} from "./ClassicyAppManager";

function getInitialState(): ClassicyStore {
	if (typeof window !== "undefined") {
		try {
			const storedState = localStorage.getItem("classicyDesktopState");
			if (storedState) {
				const parsed = JSON.parse(storedState);
				// Schema validation — fall back on shape mismatch
				if (
					!parsed ||
					typeof parsed !== "object" ||
					!("System" in parsed) ||
					!parsed.System?.Manager?.Applications?.apps ||
					!parsed.System?.Manager?.Desktop ||
					!parsed.System?.Manager?.Appearance?.activeTheme
				) {
					console.warn(
						"[ClassicyAppManager] Persisted state schema mismatch; falling back to defaults.",
					);
					return DefaultAppManagerState;
				}
				return parsed;
			}
		} catch (error) {
			console.error(
				"[ClassicyAppManager] Failed to parse persisted desktop state; falling back to defaults.",
				error,
			);
		}
	}
	return DefaultAppManagerState;
}

export const useAppManager: UseBoundStore<StoreApi<ClassicyStore>> =
	create<ClassicyStore>()(() => ({
		...getInitialState(),
	}));

export const dispatch = (action: ActionMessage): void => {
	useAppManager.setState((currentState) =>
		produce(currentState, (draft) => {
			classicyDesktopStateEventReducer(
				castDraft(draft) as ClassicyStore,
				action,
			);
		}),
	);
};

export const useAppManagerDispatch = (): ((action: ActionMessage) => void) =>
	dispatch;

// Persist to localStorage on every state change
let unsubscribeFn: (() => void) | null = null;

/** Start persisting state to localStorage. Returns an unsubscribe function. */
export function startAppManagerPersistence(): () => void {
	if (unsubscribeFn) return unsubscribeFn;
	unsubscribeFn = useAppManager.subscribe((state) => {
		try {
			localStorage.setItem("classicyDesktopState", JSON.stringify(state));
		} catch (error) {
			console.error(
				"[ClassicyAppManager] Failed to persist desktop state to localStorage. Storage quota may be exceeded.",
				error,
			);
		}
	});
	return unsubscribeFn;
}

/** Call this during app cleanup or test teardown to stop localStorage sync. */
export function stopAppManagerPersistence(): void {
	if (unsubscribeFn) {
		unsubscribeFn();
		unsubscribeFn = null;
	}
}

// Auto-start persistence (consumers can call stopAppManagerPersistence to clean up)
startAppManagerPersistence();
