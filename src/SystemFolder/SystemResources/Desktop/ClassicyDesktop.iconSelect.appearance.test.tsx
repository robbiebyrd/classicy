import { produce } from "immer";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { resetClassicyDesktopIconKeyboardSelectionForTests } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKeyboardSelection.internal";

// DesktopIcon `select` from the desktop's keyboard selection (arrow keys and
// type-ahead, ruling I-R14): the icon that becomes selected reports it, with
// `input: "keyboard"`, and a pointer selection still reports once.

// jsdom plays no audio, so the full desktop's sound manager would log a
// "Failed to load audio sprite" error for every Howl it builds. A silent Howl
// keeps the run's output to real failures.
vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
	},
}));

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }),
	}),
);

// The desktop re-lays these out in its single column, Alpha above Beta.
const icon = (appId: string, label: string, location: [number, number]) => ({
	appId,
	appName: label,
	label,
	icon: "/i.png",
	kind: "app_shortcut",
	location,
	noLaunch: true,
});

let probe: ReturnType<typeof installClassicyAppearanceProbe>;
/** `select` emits as [icon element id, detail]. */
let selects: [string | undefined, unknown][];

beforeEach(() => {
	localStorage.clear();
	resetClassicyDesktopIconKeyboardSelectionForTests();
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Desktop.icons = [
					icon("Alpha.app", "Alpha", [100, 100]),
					icon("Beta.app", "Beta", [300, 100]),
				];
			}),
		);
	});
	selects = [];
	probe = installClassicyAppearanceProbe({
		on: {
			select: (ctx) => {
				if (ctx.component === "DesktopIcon")
					selects.push([ctx.element?.id, ctx.detail]);
			},
		},
	});
});

afterEach(() => {
	probe.uninstall();
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
});

const renderDesktop = () =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop controlStrip={false} />
		</ClassicyAppManagerProvider>,
	);

const iconElement = (appId: string) =>
	document.getElementById(`${appId}.shortcut`) as HTMLElement;

const selectedIcons = () =>
	useAppManager.getState().System.Manager.Desktop.selectedIcons;

/** Selects Alpha with the pointer and forgets that select. */
const selectAlphaByPointer = () => {
	const alpha = iconElement("Alpha.app");
	fireEvent.mouseDown(alpha);
	fireEvent.mouseUp(alpha);
	fireEvent.click(alpha);
	expect(selectedIcons()).toEqual(["Alpha.app"]);
	expect(selects).toEqual([["Alpha.app.shortcut", { input: "pointer" }]]);
	selects.length = 0;
};

describe("DesktopIcon select from the desktop's keyboard selection", () => {
	it("an arrow key emits select on the icon it selects, once, as keyboard input", () => {
		renderDesktop();
		selectAlphaByPointer();
		fireEvent.keyDown(iconElement("Alpha.app"), { key: "ArrowDown" });
		expect(selectedIcons()).toEqual(["Beta.app"]);
		expect(selects).toEqual([["Beta.app.shortcut", { input: "keyboard" }]]);
	});

	it("type-ahead emits select on the icon it selects, once, as keyboard input", () => {
		renderDesktop();
		selectAlphaByPointer();
		fireEvent.keyDown(iconElement("Alpha.app"), { key: "b" });
		expect(selectedIcons()).toEqual(["Beta.app"]);
		expect(selects).toEqual([["Beta.app.shortcut", { input: "keyboard" }]]);
	});

	it("an arrow key that collapses a multiple selection to an icon emits select for it", () => {
		renderDesktop();
		selectAlphaByPointer();
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Desktop.selectedIcons = [
						"Alpha.app",
						"Beta.app",
					];
				}),
			);
		});
		fireEvent.keyDown(iconElement("Alpha.app"), { key: "ArrowDown" });
		expect(selectedIcons()).toEqual(["Beta.app"]);
		expect(selects).toEqual([["Beta.app.shortcut", { input: "keyboard" }]]);
	});

	it("a key that selects nothing new emits nothing", () => {
		renderDesktop();
		selectAlphaByPointer();
		// The desktop lays its icons out in one column: nothing lies to the
		// left of Alpha.
		fireEvent.keyDown(iconElement("Alpha.app"), { key: "ArrowLeft" });
		expect(selectedIcons()).toEqual(["Alpha.app"]);
		expect(selects).toEqual([]);
	});

	it("a pointer selection made after a key press still emits once, as pointer input", () => {
		renderDesktop();
		selectAlphaByPointer();
		fireEvent.keyDown(iconElement("Alpha.app"), { key: "ArrowDown" });
		selects.length = 0;
		const alpha = iconElement("Alpha.app");
		fireEvent.mouseDown(alpha);
		fireEvent.mouseUp(alpha);
		fireEvent.click(alpha);
		expect(selects).toEqual([["Alpha.app.shortcut", { input: "pointer" }]]);
	});

	it("a selection rectangle and a selection made in code emit nothing", () => {
		renderDesktop();
		act(() => {
			dispatch({
				type: "ClassicyDesktopIconSelectBox",
				iconIds: ["Alpha.app", "Beta.app"],
			});
		});
		expect(selectedIcons()).toEqual(["Alpha.app", "Beta.app"]);
		expect(selects).toEqual([]);
	});

	it("a selection made in code after a key press emits nothing", () => {
		renderDesktop();
		fireEvent.keyDown(document.body, { key: "Enter" });
		act(() => {
			dispatch({ type: "ClassicyDesktopIconFocus", iconId: "Beta.app" });
		});
		expect(selectedIcons()).toEqual(["Beta.app"]);
		expect(selects).toEqual([]);
	});

	it("a selection rectangle after a key press emits nothing", () => {
		renderDesktop();
		fireEvent.keyDown(document.body, { key: "x" });
		act(() => {
			dispatch({
				type: "ClassicyDesktopIconSelectBox",
				iconIds: ["Alpha.app", "Beta.app"],
			});
		});
		expect(selectedIcons()).toEqual(["Alpha.app", "Beta.app"]);
		expect(selects).toEqual([]);
	});

	it("under StrictMode, a pointer select and an arrow key each emit once", () => {
		render(
			<StrictMode>
				<ClassicyAppManagerProvider>
					<ClassicyDesktop controlStrip={false} />
				</ClassicyAppManagerProvider>
			</StrictMode>,
		);
		selectAlphaByPointer();
		fireEvent.keyDown(iconElement("Alpha.app"), { key: "ArrowDown" });
		expect(selects).toEqual([["Beta.app.shortcut", { input: "keyboard" }]]);
	});

	it("an icon mounted already selected, after a key press, emits nothing", () => {
		fireEvent.keyDown(document.body, { key: "x" });
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Desktop.selectedIcons = ["Alpha.app"];
				}),
			);
		});
		renderDesktop();
		expect(selects).toEqual([]);
	});

	it("an arrow key during a press, then the click, reports the click's re-selection", () => {
		renderDesktop();
		const alpha = iconElement("Alpha.app");
		fireEvent.mouseDown(alpha);
		fireEvent.keyDown(alpha, { key: "ArrowDown" });
		expect(selectedIcons()).toEqual(["Beta.app"]);
		fireEvent.mouseUp(alpha);
		fireEvent.click(alpha);
		expect(selectedIcons()).toEqual(["Alpha.app"]);
		expect(selects).toEqual([
			["Alpha.app.shortcut", { input: "pointer" }],
			["Beta.app.shortcut", { input: "keyboard" }],
			["Alpha.app.shortcut", { input: "pointer" }],
		]);
	});
});
