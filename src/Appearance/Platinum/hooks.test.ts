import { describe, expect, it, vi } from "vitest";
import type {
	ClassicyAppearanceContext,
	ClassicyAppearanceEvent,
} from "@/Appearance/ClassicyAppearancePackage";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	playClassicyAppearanceSound,
	runWithClassicyAppearanceSoundDispatch,
} from "@/Appearance/ClassicyAppearanceSound";
import { platinumAppearanceHooks } from "@/Appearance/Platinum/hooks";
import type { ClassicyComponentName } from "@/Appearance/vocabulary/ClassicyVocabulary";

type Row = [ClassicyComponentName, ClassicyAppearanceEvent, string];

const ctx = (
	component: ClassicyComponentName,
	event: ClassicyAppearanceEvent,
	detail?: unknown,
): ClassicyAppearanceContext => ({
	component,
	event,
	element: null,
	state: {},
	detail,
});

/** Runs the Platinum handler for `component.event`; returns its result and the dispatches. */
const run = (
	component: ClassicyComponentName,
	event: ClassicyAppearanceEvent,
	detail?: unknown,
) => {
	const spy = vi.fn();
	const handler = platinumAppearanceHooks.on?.[component]?.[event];
	if (!handler)
		throw new Error(`no Platinum handler for ${component}.${event}`);
	const result = runWithClassicyAppearanceSoundDispatch(spy, () =>
		handler(ctx(component, event, detail)),
	);
	return { result, calls: spy.mock.calls.map(([action]) => action) };
};

describe("platinumAppearanceHooks", () => {
	it("maps every control event to its Platinum sprite", () => {
		const rows: Row[] = [
			["Button", "press", "ClassicyButtonClickDown"],
			["Button", "release", "ClassicyButtonClickUp"],
			["BevelButton", "open", "ClassicyMenuOpen"],
			["Placard", "press", "ClassicyButtonClickDown"],
			["RadioInput", "press", "ClassicyInputRadioClickDown"],
			["RadioInput", "release", "ClassicyInputRadioClickUp"],
			["Tabs", "press", "ClassicyTabClickDown"],
			["Tabs", "select", "ClassicyTabClickUp"],
			["Tabs", "change", "ClassicyTabClickUp"],
			["Assistant", "change", "ClassicyTabClickUp"],
		];
		for (const [c, e, sound] of rows) {
			const spy = vi.fn();
			const handler = platinumAppearanceHooks.on?.[c]?.[e];
			expect(handler, `${c}.${e}`).toBeTypeOf("function");
			const result = runWithClassicyAppearanceSoundDispatch(spy, () =>
				handler?.(ctx(c, e)),
			);
			expect(result, `${c}.${e}`).toBeUndefined();
			expect(spy, `${c}.${e}`).toHaveBeenCalledWith({
				type: "ClassicySoundPlay",
				sound,
			});
		}
	});

	it("maps the remaining control events, and nothing else, for the six controls", () => {
		const rows: Row[] = [
			["BevelButton", "press", "ClassicyButtonClickDown"],
			["BevelButton", "release", "ClassicyButtonClickUp"],
			["Placard", "release", "ClassicyButtonClickUp"],
		];
		for (const [c, e, sound] of rows) {
			const { result, calls } = run(c, e);
			expect(result, `${c}.${e}`).toBeUndefined();
			expect(calls, `${c}.${e}`).toEqual([
				{ type: "ClassicySoundPlay", sound },
			]);
		}
		// Exactly today's sound sites: no new sound on any other event.
		const mapped = Object.fromEntries(
			(
				[
					"Button",
					"BevelButton",
					"Placard",
					"RadioInput",
					"Tabs",
					"Assistant",
				] as const
			).map((c) => [
				c,
				Object.keys(platinumAppearanceHooks.on?.[c] ?? {}).sort(),
			]),
		);
		expect(mapped).toEqual({
			Button: ["press", "release"],
			BevelButton: ["open", "press", "release"],
			Placard: ["press", "release"],
			RadioInput: ["press", "release"],
			Tabs: ["change", "press", "select"],
			Assistant: ["change"],
		});
	});

	// I-R14: a sound plays only for the inputs that play it today.
	it("keeps the keyboard silent where it is silent today, and clicking where it clicks", () => {
		const keyboard = { input: "keyboard" };
		const pointer = { input: "pointer" };
		// Placard Return/Space and the tab an arrow, Home or End key lands on
		// press silently.
		expect(run("Placard", "press", keyboard).calls).toEqual([]);
		expect(run("Placard", "release", keyboard).calls).toEqual([]);
		expect(run("Tabs", "press", { tabId: 1, ...keyboard }).calls).toEqual([]);
		// ...while their pointer presses still click.
		expect(run("Placard", "press", pointer).calls).toEqual([
			{ type: "ClassicySoundPlay", sound: "ClassicyButtonClickDown" },
		]);
		expect(run("Placard", "release", pointer).calls).toEqual([
			{ type: "ClassicySoundPlay", sound: "ClassicyButtonClickUp" },
		]);
		expect(run("Tabs", "press", { tabId: 1, ...pointer }).calls).toEqual([
			{ type: "ClassicySoundPlay", sound: "ClassicyTabClickDown" },
		]);
		// A push button clicks on Return and Space; a keyboard tab change and
		// an Assistant page turned by an arrow key click up.
		expect(run("Button", "press", keyboard).calls).toEqual([
			{ type: "ClassicySoundPlay", sound: "ClassicyButtonClickDown" },
		]);
		expect(run("Button", "release", keyboard).calls).toEqual([
			{ type: "ClassicySoundPlay", sound: "ClassicyButtonClickUp" },
		]);
		expect(run("Tabs", "select", { tabId: 1, ...keyboard }).calls).toEqual([
			{ type: "ClassicySoundPlay", sound: "ClassicyTabClickUp" },
		]);
		expect(run("Assistant", "change", { page: 1, ...keyboard }).calls).toEqual([
			{ type: "ClassicySoundPlay", sound: "ClassicyTabClickUp" },
		]);
	});

	it("maps window events to sprites", () => {
		const rows: [ClassicyAppearanceEvent, unknown, string][] = [
			["focus", undefined, "ClassicyWindowFocus"],
			["collapse", undefined, "ClassicyWindowCollapse"],
			["expand", undefined, "ClassicyWindowExpand"],
			["close", undefined, "ClassicyWindowClose"],
			["dragStart", undefined, "ClassicyWindowMoveIdle"],
			["zoom", { zoomed: true }, "ClassicyWindowZoomMaximize"],
			["zoom", { zoomed: false }, "ClassicyWindowZoomMinimize"],
			["change", { kind: "move" }, "ClassicyWindowMoveMoving"],
		];
		for (const [e, detail, sound] of rows) {
			const { result, calls } = run("Window", e, detail);
			expect(result, `Window.${e}`).toBeUndefined();
			expect(calls, `Window.${e}`).toEqual([
				{ type: "ClassicySoundPlay", sound },
			]);
		}
		expect(run("Window", "change", { kind: "resize" }).calls).toEqual([]);
		expect(run("Window", "dragEnd").calls).toEqual([
			{ type: "ClassicySoundPlayInterrupt", sound: "ClassicyWindowMoveStop" },
		]);
	});

	// I-R16 and I-R17: each window sound keeps the cause and input that play
	// it today.
	it("plays window sounds for the same causes and inputs as before", () => {
		// A resize start plays no idle (its zoom-minimize comes from the zoom
		// event); a move start does.
		expect(run("Window", "dragStart", { kind: "resize" }).calls).toEqual([]);
		expect(run("Window", "dragStart", { kind: "move" }).calls).toEqual([
			{ type: "ClassicySoundPlay", sound: "ClassicyWindowMoveIdle" },
		]);
		// Both drag kinds stop with the interrupting MoveStop.
		for (const kind of ["move", "resize"])
			expect(run("Window", "dragEnd", { kind }).calls).toEqual([
				{
					type: "ClassicySoundPlayInterrupt",
					sound: "ClassicyWindowMoveStop",
				},
			]);
		// The zoom sprite follows `zoomed` whatever the cause, as the zoom
		// box, a collapse and a resize start all play it today.
		for (const cause of ["zoom", "collapse", "resize"]) {
			expect(
				run("Window", "zoom", { zoomed: false, cause, input: "pointer" }).calls,
			).toEqual([
				{ type: "ClassicySoundPlay", sound: "ClassicyWindowZoomMinimize" },
			]);
		}
		// Keyboard and pointer alike: the close box by Return or Space, a
		// modal's Escape, and focus from either input.
		for (const input of ["pointer", "keyboard"]) {
			expect(run("Window", "close", { input }).calls).toEqual([
				{ type: "ClassicySoundPlay", sound: "ClassicyWindowClose" },
			]);
			expect(run("Window", "focus", { input }).calls).toEqual([
				{ type: "ClassicySoundPlay", sound: "ClassicyWindowFocus" },
			]);
		}
		// Option-click collapses every window with one sound.
		expect(
			run("Window", "collapse", { all: true, input: "pointer" }).calls,
		).toEqual([{ type: "ClassicySoundPlay", sound: "ClassicyWindowCollapse" }]);
	});

	it("a menu item press plays the click and returns the flash decoration", () => {
		const { result, calls } = run("MenuItem", "press", {
			itemId: "save",
			input: "pointer",
		});
		expect(calls).toEqual([
			{ type: "ClassicySoundPlay", sound: "ClassicyMenuItemClick" },
		]);
		expect(result).toEqual({ className: "classicyMenuItemFlash" });
	});

	it("a menu item release clears the flash", () => {
		const { result, calls } = run("MenuItem", "release", { itemId: "save" });
		expect(result).toEqual({});
		expect(calls).toEqual([]);
	});

	it("maps the menu item's open and focus, and nothing for blur", () => {
		expect(run("MenuItem", "open", { itemId: "more" }).calls).toEqual([
			{ type: "ClassicySoundPlay", sound: "ClassicyMenuOpen" },
		]);
		expect(run("MenuItem", "focus", { itemId: "save" }).calls).toEqual([
			{ type: "ClassicySoundPlay", sound: "ClassicyMenuItemHover" },
		]);
		// Ruling 6: no pack has a blur sprite, and a blur is silent today.
		expect(
			Object.keys(platinumAppearanceHooks.on?.MenuItem ?? {}).sort(),
		).toEqual(["focus", "open", "press", "release"]);
		expect(
			Object.keys(platinumAppearanceHooks.on?.Window ?? {}).sort(),
		).toEqual([
			"change",
			"close",
			"collapse",
			"dragEnd",
			"dragStart",
			"expand",
			"focus",
			"zoom",
		]);
		// The submenu list's own open and close stay silent: the item plays it.
		expect(platinumAppearanceHooks.on?.Menu).toBeUndefined();
	});

	it("is frozen, so no importer can change what Platinum plays", () => {
		// What a package author "extending Platinum" might try, past the types.
		const hooks = platinumAppearanceHooks as unknown as {
			on: Record<string, Record<string, unknown>>;
			decorate?: unknown;
		};
		const replacement = () => {
			playClassicyAppearanceSound("ClassicyMenuOpen");
		};
		expect(() => {
			hooks.on.Button.press = replacement;
		}).toThrow(TypeError);
		expect(() => {
			hooks.on.Placard = { press: replacement };
		}).toThrow(TypeError);
		expect(() => {
			hooks.on = {};
		}).toThrow(TypeError);
		expect(() => {
			hooks.decorate = () => ({ className: "x" });
		}).toThrow(TypeError);
		expect(Object.isFrozen(platinumAppearanceHooks)).toBe(true);
		expect(Object.isFrozen(platinumAppearanceHooks.on)).toBe(true);
		for (const map of Object.values(platinumAppearanceHooks.on ?? {}))
			expect(Object.isFrozen(map)).toBe(true);
		// Platinum still plays its own sprite.
		expect(run("Button", "press").calls).toEqual([
			{ type: "ClassicySoundPlay", sound: "ClassicyButtonClickDown" },
		]);
		expect(platinumAppearanceHooks.decorate).toBeUndefined();
	});

	it("is the Platinum package's hooks, and the library barrel exports it", async () => {
		await import("@/Appearance/Platinum");
		expect(getClassicyAppearancePackage("platinum")?.hooks).toBe(
			platinumAppearanceHooks,
		);
		const api: Record<string, unknown> = await import("@/index");
		expect(api.platinumAppearanceHooks).toBe(platinumAppearanceHooks);
	}, 60_000);
});
