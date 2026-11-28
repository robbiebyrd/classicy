import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import type {
	ClassicyStore,
	ClassicyStoreSystemAppWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

// Store-free, so the window reducer may import it (the view-state hook,
// `ClassicyWindowViewState.internal.ts`, reads the store and may not).

/**
 * Whether the active package keeps a window's view state: its
 * `layout.window.restoreViewState` (Windows; WIG Ch.2 "Persistence", p.12;
 * Ch.6 "Opening and Closing Windows", p.94). `packageId` is the store's,
 * a reducer passing its draft's; absent, the active package's.
 */
export const classicyRestoresViewState = (packageId?: string): boolean =>
	getClassicyAppearanceLayout(packageId).window.restoreViewState === true;

/** `value` as scroll offsets: two finite, non-negative numbers. */
export const classicyViewStateScroll = (
	value: unknown,
): [number, number] | undefined =>
	Array.isArray(value) &&
	value.length === 2 &&
	value.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)
		? [value[0], value[1]]
		: undefined;

/** `value` as a caret offset: a finite, non-negative whole number. */
export const classicyViewStateCaret = (value: unknown): number | undefined =>
	typeof value === "number" &&
	Number.isFinite(value) &&
	value >= 0 &&
	Number.isInteger(value)
		? value
		: undefined;

/**
 * The record fields a `ClassicyWindowSetScroll` writes: its `scroll` and
 * `caret` that are valid (finite, non-negative; the caret a whole number),
 * or `undefined` when the active package does not keep view state (its
 * `layout.window.restoreViewState` is not `true`, so Platinum's and System
 * 7's records never gain them) or neither is valid.
 */
export const classicyWindowViewStatePatch = (
	ds: ClassicyStore,
	action: { scroll?: unknown; caret?: unknown },
): Pick<ClassicyStoreSystemAppWindow, "scroll" | "caret"> | undefined => {
	if (!classicyRestoresViewState(ds.System.Manager.Appearance?.packageId)) {
		return undefined;
	}
	const scroll = classicyViewStateScroll(action.scroll);
	const caret = classicyViewStateCaret(action.caret);
	if (scroll === undefined && caret === undefined) return undefined;
	return {
		...(scroll !== undefined ? { scroll } : {}),
		...(caret !== undefined ? { caret } : {}),
	};
};
