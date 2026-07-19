import { castDraft, produce } from "immer";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import {
	type ActionMessage,
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	type DeepPartial,
	DefaultAppManagerState,
	mergeClassicyState,
} from "./ClassicyAppManager";

let hydratedFromStorage = false;

/** True iff the module store initialized from valid persisted localStorage state. */
export const wasHydratedFromStorage = (): boolean => hydratedFromStorage;

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
				hydratedFromStorage = true;
				// Merge persisted state on top of current defaults so any new fields
				// added since the state was saved get their default values instead of
				// being undefined (e.g. new typography.monoSize / digitalSize keys).
				return mergeClassicyState(
					DefaultAppManagerState,
					parsed as DeepPartial<ClassicyStore>,
				);
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

// Persist to localStorage with a 500ms debounce on every state change
let unsubscribeFn: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Produce a sanitized copy of state safe for persistence.
 * Strips fields that contain PII or are intentionally session-only.
 */
function sanitizeStateForPersistence(state: ClassicyStore): ClassicyStore {
	return produce(state, (draft) => {
		const browserApp = draft.System.Manager.Applications.apps["Browser.app"];
		if (browserApp?.data && "history" in browserApp.data) {
			delete (browserApp.data as Record<string, unknown>).history;
		}
		// HyperCard: drop the ephemeral interpreter runtime (frames, pending
		// dialog/wait/transition, effects) so a reload never restores a
		// half-finished continuation. Only stack deltas are persisted.
		const hyperCardApp =
			draft.System.Manager.Applications.apps["HyperCard.app"];
		const openStacks = (hyperCardApp?.data as Record<string, unknown>)
			?.openStacks;
		if (openStacks && typeof openStacks === "object") {
			for (const openStack of Object.values(
				openStacks as Record<string, Record<string, unknown>>,
			)) {
				if (openStack && typeof openStack === "object") {
					delete openStack.runtime;
				}
			}
		}
		// HyperCard editor: strip the undo/redo history from each persisted edit
		// session. Immer's structural sharing collapses to plain arrays under
		// JSON.stringify, so up to MAX_UNDO full HCStack snapshots get flattened
		// and re-serialized every 500ms — a quota risk that silently disables
		// ALL desktop persistence on QuotaExceededError. The draft, dirty flag,
		// and pristine snapshot are session-scoped and still worth keeping;
		// only the replay history is dropped. SET to empty arrays rather than
		// deleting the keys — the editor reducers read `.length` unconditionally.
		const editSessions = (hyperCardApp?.data as Record<string, unknown>)?.edits;
		if (editSessions && typeof editSessions === "object") {
			for (const editSession of Object.values(
				editSessions as Record<string, Record<string, unknown>>,
			)) {
				if (editSession && typeof editSession === "object") {
					editSession.undo = [];
					editSession.redo = [];
				}
			}
		}
		// Boot parade icons are session-only: owners re-register them on every
		// mount, so persisting them would resurrect icons whose owner removed
		// its bootIcon prop.
		draft.System.Manager.Boot.paradeIcons = [];
	});
}

/** Start persisting state to localStorage. Returns an unsubscribe function. */
export function startAppManagerPersistence(): () => void {
	if (unsubscribeFn) return unsubscribeFn;
	unsubscribeFn = useAppManager.subscribe((state) => {
		if (debounceTimer !== null) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			try {
				const stateToSave = sanitizeStateForPersistence(state);
				localStorage.setItem(
					"classicyDesktopState",
					JSON.stringify(stateToSave),
				);
			} catch (error) {
				console.error(
					"[ClassicyAppManager] Failed to persist desktop state to localStorage. Storage quota may be exceeded.",
					error,
				);
			}
		}, 500);
	});
	return unsubscribeFn;
}

/** Call this during app cleanup or test teardown to stop localStorage sync. */
export function stopAppManagerPersistence(): void {
	if (debounceTimer !== null) {
		clearTimeout(debounceTimer);
		debounceTimer = null;
	}
	if (unsubscribeFn) {
		unsubscribeFn();
		unsubscribeFn = null;
	}
}

// Auto-start persistence (consumers can call stopAppManagerPersistence to clean up)
startAppManagerPersistence();
