import type { Dispatch } from "react";
import type { ClassicySoundAction } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// The bridge between an Appearance Package's handlers and the sound manager.
// A handler runs synchronously inside `runWithClassicyAppearanceSoundDispatch`
// with the emitting component's own sound dispatch, so a package plays sounds
// without holding a dispatch of its own and a component's sounds still reach
// the component's `useSoundDispatch` (tests mock it there). A runtime leaf:
// only types and the leaf log module, so a package's hooks module may import
// it without pulling the store or the sound manager into its graph.

const dispatches: Dispatch<ClassicySoundAction>[] = [];

/**
 * Runs `fn` with `dispatch` as the target of `playClassicyAppearanceSound`,
 * restoring the previous target afterwards (even when `fn` throws), and
 * returns `fn`'s result. Runs nest. `useClassicyAppearance` calls it around
 * every handler; hosts and packages never need it.
 * @internal
 */
export function runWithClassicyAppearanceSoundDispatch<T>(
	dispatch: Dispatch<ClassicySoundAction>,
	fn: () => T,
): T {
	dispatches.push(dispatch);
	try {
		return fn();
	} finally {
		dispatches.pop();
	}
}

/**
 * Plays a sound from an Appearance Package handler, through the dispatch of
 * the component whose event is being handled: `ClassicySoundPlay`, or
 * `ClassicySoundPlayInterrupt` with `{ interrupt: true }`. Called outside a
 * handler it logs a warning and does nothing.
 */
export function playClassicyAppearanceSound(
	sound: string,
	options?: { interrupt?: boolean },
): void {
	const dispatch = dispatches[dispatches.length - 1];
	if (!dispatch) {
		classicyLog(
			"warn",
			"ClassicyAppearance",
			"playClassicyAppearanceSound was called outside an appearance handler; ignored.",
		);
		return;
	}
	dispatch({
		type: options?.interrupt
			? "ClassicySoundPlayInterrupt"
			: "ClassicySoundPlay",
		sound,
	});
}
