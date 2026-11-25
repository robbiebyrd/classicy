import { act, renderHook } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
// The Windows-layout package below needs a sound pack registered: the core
// default theme names Platinum's.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";
import { useClassicyWindowViewState } from "./ClassicyWindowViewState.internal";
import {
	classicyRestoresViewState,
	classicyViewStateCaret,
	classicyViewStateScroll,
	classicyWindowViewStatePatch,
} from "./ClassicyWindowViewStatePatch.internal";

// A window's view state (the WIG audit's 2.1; WIG Ch.2 "Persistence",
// p.12): what the window's record holds, handed to its scroll area and a
// document's editor, and written back once it settles, under a package's
// `layout.window.restoreViewState`; nothing without it.

const APP = "Notes.app";
const WINDOW = "Notes.app_file_Macintosh HD:Notes.txt";

const useWindowsLayout = () =>
	registerClassicyAppearancePackage({
		id: "windows-view-state",
		name: "Windows View State",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: "windows-view-state-default",
			package: "windows-view-state",
		},
		layout: windows98.layout as never,
	});

const record = () =>
	getAppWindow(
		useAppManager.getState().System.Manager.Applications.apps[APP],
		WINDOW,
	);

beforeEach(() => {
	useAppManager.setState(
		produce(DefaultAppManagerState, (draft) => {
			draft.System.Manager.Applications.apps[APP] = {
				id: APP,
				name: "Notes",
				icon: "",
				open: true,
				data: {},
				windows: {
					[WINDOW]: {
						id: WINDOW,
						closed: false,
						size: [300, 200],
						position: [0, 0],
						minimumSize: [0, 0],
						scroll: [0, 240],
						caret: 12,
					},
				},
			};
		}),
		true,
	);
});

afterEach(() => {
	resetClassicyAppearancePackagesForTests();
});

describe("useClassicyWindowViewState", () => {
	it("hands back the record's offsets and caret under Windows 98's layout", () => {
		useWindowsLayout();
		const { result } = renderHook(() =>
			useClassicyWindowViewState(APP, WINDOW),
		);
		expect(result.current.initialScroll).toEqual([0, 240]);
		expect(result.current.initialCaret).toBe(12);
		expect(typeof result.current.onScrollSettled).toBe("function");
		expect(typeof result.current.onCaretSettled).toBe("function");
	});

	it("writes settled offsets and caret to the record, keeping the initial values", () => {
		useWindowsLayout();
		const { result, rerender } = renderHook(() =>
			useClassicyWindowViewState(APP, WINDOW),
		);
		act(() => {
			result.current.onScrollSettled?.([5, 600]);
			result.current.onCaretSettled?.(40);
		});
		expect(record()?.scroll).toEqual([5, 600]);
		expect(record()?.caret).toBe(40);
		rerender();
		// What the window mounted with stays: its view is not moved again.
		expect(result.current.initialScroll).toEqual([0, 240]);
		expect(result.current.initialCaret).toBe(12);
	});

	it("reads a window that has no record yet as nothing to put back", () => {
		useWindowsLayout();
		const { result } = renderHook(() =>
			useClassicyWindowViewState(APP, "Notes.app_untitled_1"),
		);
		expect(result.current.initialScroll).toBeUndefined();
		expect(result.current.initialCaret).toBeUndefined();
	});

	it("drops a stored value that is not finite", () => {
		useWindowsLayout();
		useAppManager.setState(
			produce(useAppManager.getState(), (draft) => {
				const win = draft.System.Manager.Applications.apps[APP].windows[WINDOW];
				win.scroll = [Number.NaN, 4] as [number, number];
				win.caret = -3;
			}),
		);
		const { result } = renderHook(() =>
			useClassicyWindowViewState(APP, WINDOW),
		);
		expect(result.current.initialScroll).toBeUndefined();
		expect(result.current.initialCaret).toBeUndefined();
	});

	it("hands back nothing under the default layout", () => {
		const { result } = renderHook(() =>
			useClassicyWindowViewState(APP, WINDOW),
		);
		expect(result.current).toEqual({});
	});
});

describe("the view state's store-free rules", () => {
	it("keeps finite, non-negative offsets and whole, non-negative carets", () => {
		expect(classicyViewStateScroll([0, 12.5])).toEqual([0, 12.5]);
		expect(classicyViewStateScroll([1])).toBeUndefined();
		expect(classicyViewStateScroll([1, -1])).toBeUndefined();
		expect(classicyViewStateScroll("1,2")).toBeUndefined();
		expect(classicyViewStateCaret(0)).toBe(0);
		expect(classicyViewStateCaret(7)).toBe(7);
		expect(classicyViewStateCaret(1.5)).toBeUndefined();
		expect(classicyViewStateCaret(Number.POSITIVE_INFINITY)).toBeUndefined();
	});

	it("patches the record only under the key", () => {
		const ds = useAppManager.getState();
		expect(classicyRestoresViewState()).toBe(false);
		expect(
			classicyWindowViewStatePatch(ds, { scroll: [1, 2], caret: 3 }),
		).toBeUndefined();
		useWindowsLayout();
		expect(classicyRestoresViewState()).toBe(true);
		expect(
			classicyWindowViewStatePatch(ds, { scroll: [1, 2], caret: 3 }),
		).toEqual({ scroll: [1, 2], caret: 3 });
		expect(classicyWindowViewStatePatch(ds, { caret: 3 })).toEqual({
			caret: 3,
		});
		expect(classicyWindowViewStatePatch(ds, { scroll: [1] })).toBeUndefined();
	});
});
