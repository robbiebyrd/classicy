import { describe, expect, it, vi } from "vitest";
import type {
	ClassicyAppearanceContext,
	ClassicyAppearanceEvent,
} from "@/Appearance/ClassicyAppearancePackage";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { runWithClassicyAppearanceSoundDispatch } from "@/Appearance/ClassicyAppearanceSound";
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

	it("is the Platinum package's hooks, and the library barrel exports it", async () => {
		await import("@/Appearance/Platinum");
		expect(getClassicyAppearancePackage("platinum")?.hooks).toBe(
			platinumAppearanceHooks,
		);
		const api: Record<string, unknown> = await import("@/index");
		expect(api.platinumAppearanceHooks).toBe(platinumAppearanceHooks);
	}, 60_000);
});
