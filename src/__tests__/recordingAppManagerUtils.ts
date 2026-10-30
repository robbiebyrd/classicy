import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type * as AppManagerUtils from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

/**
 * The body of a partial `vi.mock` of `ClassicyAppManagerUtils` that records
 * every action a component dispatches into `sink`, then calls straight
 * through to the real `dispatch`, so the reducers still run. The store has
 * no `dispatch` of its own to wrap; components reach it through the module's
 * `dispatch` and `useAppManagerDispatch`, so both are replaced.
 *
 * `vi.mock` is hoisted above imports, so load this from inside the factory:
 *
 * ```ts
 * const dispatched = vi.hoisted((): ActionMessage[] => []);
 * vi.mock(
 *   "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
 *   async (importOriginal) => {
 *     const { recordingAppManagerUtils } = await import("@/__tests__/recordingAppManagerUtils");
 *     return recordingAppManagerUtils(await importOriginal(), dispatched);
 *   },
 * );
 * ```
 */
export const recordingAppManagerUtils = (
	actual: typeof AppManagerUtils,
	sink: ActionMessage[],
): typeof AppManagerUtils => {
	const recording: typeof actual.dispatch = (action, trust) => {
		sink.push(action);
		actual.dispatch(action, trust);
	};
	return {
		...actual,
		dispatch: recording,
		useAppManagerDispatch: () => recording,
	};
};
