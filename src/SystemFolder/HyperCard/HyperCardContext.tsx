/**
 * HyperCard app event handler. Routes ClassicyAppHyperCard* actions to the
 * interpreter engine, storing all state under apps["HyperCard.app"].data. Self-
 * registers with the AppManager kernel so the reducer can dispatch to it without
 * a hard import (see MoviePlayerContext for the same pattern).
 */

import { openApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import {
	type ActionMessage,
	type ClassicyStore,
	registerAppEventHandler,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	consumeEffects,
	resumeCustom,
	resumeDialog,
	resumeTransition,
	resumeWait,
	runPartEvent,
	runStackOpen,
	startRun,
} from "@/SystemFolder/HyperCard/HyperCardEngine";
import type {
	HCEventName,
	HCStack,
} from "@/SystemFolder/HyperCard/HyperCardModel";
import {
	fieldKey,
	findPart,
	getCard,
	type HCOpenStack,
	HYPERCARD_EVENT_PREFIX,
	HyperCardAppInfo,
	type HyperCardData,
	isHyperCardData,
	makeInitialRuntime,
} from "@/SystemFolder/HyperCard/HyperCardUtils";

const { id: APP_ID } = HyperCardAppInfo;

function getData(ds: ClassicyStore): HyperCardData | undefined {
	const app = ds.System.Manager.Applications.apps[APP_ID];
	if (!app) return undefined;
	const raw = app.data ?? {};
	if (!isHyperCardData(raw)) {
		// Merge instead of replace: the kernel's generic *OpenFile handler may
		// have already written { openFiles: [...] } before any HyperCard action
		// ran — replacing would drop that queue.
		app.data = {
			...(typeof raw === "object" && raw !== null ? raw : {}),
			openStacks: {},
		} satisfies HyperCardData;
	}
	return app.data as unknown as HyperCardData;
}

function activeOpen(
	data: HyperCardData,
	action: ActionMessage,
): HCOpenStack | undefined {
	const id = (action.stackId as string | undefined) ?? data.activeStackId;
	const open = id ? data.openStacks[id] : undefined;
	// Runtime is stripped before persistence; re-create it on first use after a
	// reload (without re-running onOpenStack — the card deltas already persisted).
	if (open && !open.runtime) open.runtime = makeInitialRuntime();
	return open;
}

function commitFieldValue(
	open: HCOpenStack,
	partId: string,
	value: string,
): void {
	const card = getCard(open.stack, open.currentCardId);
	if (!card) return;
	const found = findPart(open.stack, card, partId);
	if (!found) return;
	const key = fieldKey(found.part, open.currentCardId, found.backgroundId);
	open.fieldValues[key] = value;
}

export const classicyHyperCardEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
): ClassicyStore => {
	const data = getData(ds);
	if (!data) return ds;

	switch (action.type) {
		case "ClassicyAppHyperCardOpenStack": {
			const stack = action.stack as HCStack | undefined;
			const stackId =
				(action.stackId as string | undefined) ??
				(action.stackSource as string | undefined) ??
				stack?.name;
			if (!stack || !stackId) break;

			openApp(ds, APP_ID, HyperCardAppInfo.name, HyperCardAppInfo.icon);
			data.activeStackId = stackId;

			// Fit the (possibly already-mounted) window to this stack's card
			// width. The component keys the window on activeStackId, so it
			// remounts and re-reads this record; height 0 = auto, matching the
			// initialSize used when a stack is preloaded at mount.
			const win = ds.System.Manager.Applications.apps[APP_ID].windows?.find(
				(w) => w.id === "hypercard_main",
			);
			if (win) win.size = [(stack.size?.[0] ?? 420) + 4, 0];

			if (!data.openStacks[stackId]) {
				const open: HCOpenStack = {
					stackSource: (action.stackSource as string) ?? stackId,
					stack,
					currentCardId: stack.cards[0].id,
					history: [],
					variables: { ...(stack.variables ?? {}) },
					fieldValues: {},
					partVisibility: {},
					fieldRev: {},
					runtime: makeInitialRuntime(),
				};
				data.openStacks[stackId] = open;
				runStackOpen(open);
			} else {
				// Re-opening: refresh the in-memory stack definition and re-hydrate
				// runtime (stripped on persistence) without re-running onOpenStack.
				const open = data.openStacks[stackId];
				open.stack = stack;
				if (!open.runtime) open.runtime = makeInitialRuntime();
			}
			break;
		}

		case "ClassicyAppHyperCardEvent": {
			const open = activeOpen(data, action);
			if (!open) break;
			const partId = action.partId as string | undefined;
			const event = (action.event as HCEventName) ?? "onMouseUp";
			if (action.value !== undefined && partId) {
				commitFieldValue(open, partId, String(action.value));
			}
			if (partId) {
				runPartEvent(open, partId, event);
			} else {
				// Card-level event.
				const card = getCard(open.stack, open.currentCardId);
				const actions = card?.script?.[event];
				if (actions && actions.length > 0) startRun(open, actions);
			}
			break;
		}

		case "ClassicyAppHyperCardNavigate": {
			const open = activeOpen(data, action);
			if (!open) break;
			const to = action.to as string | undefined;
			if (to) startRun(open, [{ do: "go", to }]);
			break;
		}

		case "ClassicyAppHyperCardCommitField": {
			const open = activeOpen(data, action);
			if (!open) break;
			const partId = action.partId as string | undefined;
			if (partId) commitFieldValue(open, partId, String(action.value ?? ""));
			break;
		}

		case "ClassicyAppHyperCardDialogResponse": {
			const open = activeOpen(data, action);
			if (!open) break;
			resumeDialog(
				open,
				String(action.result ?? ""),
				action.token as string | undefined,
			);
			break;
		}

		case "ClassicyAppHyperCardWaitComplete": {
			const open = activeOpen(data, action);
			if (!open) break;
			resumeWait(open, action.token as string | undefined);
			break;
		}

		case "ClassicyAppHyperCardTransitionComplete": {
			const open = activeOpen(data, action);
			if (!open) break;
			resumeTransition(open, action.token as string | undefined);
			break;
		}

		case "ClassicyAppHyperCardConsumeEffects": {
			const open = activeOpen(data, action);
			if (!open) break;
			const ids = (action.ids as number[] | undefined) ?? [];
			consumeEffects(open, ids);
			break;
		}

		case "ClassicyAppHyperCardResolveCommand": {
			const open = activeOpen(data, action);
			if (!open) break;
			resumeCustom(
				open,
				String(action.result ?? ""),
				action.token as string | undefined,
			);
			break;
		}

		case "ClassicyAppHyperCardSetVariable": {
			const open = activeOpen(data, action);
			if (!open) break;
			const name = action.name as string | undefined;
			if (name) {
				open.variables[name] = action.value as string | number;
			}
			break;
		}

		case "ClassicyAppHyperCardOpenFile": {
			// Double-clicked Stack-type files land in data.openFiles: Finder
			// dispatches ClassicyAppHyperCardOpenFile through the generic
			// classicyAppEventHandler (whose *OpenFile default appends the path
			// and opens the app); this case gives programmatic dispatch through
			// the plugin router the same behavior, plus focus-if-already-open.
			// Fetching/parsing is async, so the HyperCard component consumes the
			// queue and dispatches OpenStack/OpenFileConsumed/OpenFileFailed.
			const path = action.path as string | undefined;
			if (!path) break;
			if (data.openStacks[path]) {
				// Already open from this path: just focus it.
				data.activeStackId = path;
			} else {
				const files = data.openFiles ?? [];
				if (!files.includes(path)) data.openFiles = [...files, path];
			}
			openApp(ds, APP_ID, HyperCardAppInfo.name, HyperCardAppInfo.icon);
			break;
		}

		case "ClassicyAppHyperCardOpenFileConsumed": {
			const path = action.path as string | undefined;
			if (!path) break;
			data.openFiles = (data.openFiles ?? []).filter((p) => p !== path);
			break;
		}

		case "ClassicyAppHyperCardOpenFileFailed": {
			const path = action.path as string | undefined;
			if (!path) break;
			data.openFiles = (data.openFiles ?? []).filter((p) => p !== path);
			ds.System.Manager.Desktop.errorDialog = {
				title: "HyperCard",
				message:
					typeof action.message === "string" && action.message.length > 0
						? action.message
						: "The stack could not be opened.",
			};
			break;
		}

		case "ClassicyAppHyperCardCloseStack": {
			const stackId =
				(action.stackId as string | undefined) ?? data.activeStackId;
			if (stackId) {
				delete data.openStacks[stackId];
				if (data.activeStackId === stackId) {
					data.activeStackId = Object.keys(data.openStacks)[0];
				}
			}
			break;
		}
	}

	return ds;
};

// Self-register so the kernel router dispatches ClassicyAppHyperCard* events here.
registerAppEventHandler(HYPERCARD_EVENT_PREFIX, classicyHyperCardEventHandler);
