import { act } from "@testing-library/react";
import { vi } from "vitest";

/** The three ways a gesture's pointer stream is lost. */
export const POINTER_STREAM_LOSSES = [
	"blur",
	"pointercancel",
	"hidden",
] as const;

export type PointerStreamLoss = (typeof POINTER_STREAM_LOSSES)[number];

// Test helper: loses the pointer stream a gesture follows, the way a browser
// does. `blur` is the window losing focus (Alt-Tab, a system dialog),
// `pointercancel` the browser taking the pointer over (a touch scroll, an OS
// gesture), and `hidden` the page being hidden: jsdom's visibilityState is
// always "visible", so it is stubbed to "hidden" for the event and restored.
// Run inside `act`, so a component's state updates are flushed after it.
export function losePointerStream(loss: PointerStreamLoss): void {
	act(() => dispatchLoss(loss));
}

function dispatchLoss(loss: PointerStreamLoss): void {
	if (loss === "blur") {
		window.dispatchEvent(new Event("blur"));
		return;
	}
	if (loss === "pointercancel") {
		document.dispatchEvent(new Event("pointercancel", { bubbles: true }));
		return;
	}
	const visibility = vi
		.spyOn(document, "visibilityState", "get")
		.mockReturnValue("hidden");
	try {
		document.dispatchEvent(new Event("visibilitychange"));
	} finally {
		visibility.mockRestore();
	}
}

/**
 * The pointer-stream listeners (window `blur`, document `pointercancel` and
 * `visibilitychange`) live right now, followed through spies on
 * add/removeEventListener. Restored with the rest of the spies
 * (`vi.restoreAllMocks`).
 */
export function trackPointerStreamListeners(): Set<string> {
	const live = new Set<string>();
	const ids = new Map<unknown, number>();
	const watched = new Set(["blur", "pointercancel", "visibilitychange"]);
	const key = (target: string, type: string, listener: unknown) => {
		if (!ids.has(listener)) ids.set(listener, ids.size);
		return `${target}:${type}:${ids.get(listener)}`;
	};
	for (const [name, target] of [
		["window", window],
		["document", document],
	] as const) {
		const add = target.addEventListener.bind(target);
		const remove = target.removeEventListener.bind(target);
		vi.spyOn(target, "addEventListener").mockImplementation(
			(type, listener, options) => {
				if (watched.has(type)) live.add(key(name, type, listener));
				add(type, listener, options);
			},
		);
		vi.spyOn(target, "removeEventListener").mockImplementation(
			(type, listener, options) => {
				live.delete(key(name, type, listener));
				remove(type, listener, options);
			},
		);
	}
	return live;
}
