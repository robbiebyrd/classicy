import { describe, expect, it, vi } from "vitest";
import { APPLE_GUIDE_SHOW_TOPIC_EVENT } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import { ABOUT_BALLOON_HELP_TOPIC_ID } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import {
	classicyHelpMenuChildren,
	classicySystemHelpItems,
	findClassicyAppAboutItem,
	isClassicyAppHelpMenu,
	splitClassicyAppHelpMenus,
	stripClassicyAboutItem,
	trimClassicyMenuSpacers,
} from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyHelpMenu.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const ids = (items: ClassicyMenuItem[]) => items.map((item) => item.id);

// Plan 0020-w98 §4: the helpers both bars assemble the one Help menu from.
describe("classicySystemHelpItems", () => {
	it("is About Balloon Help… then Hide Balloons ⌥H while balloons show", () => {
		expect(classicySystemHelpItems(false)).toEqual([
			{
				id: "help-about-balloon",
				title: "About Balloon Help…",
				event: APPLE_GUIDE_SHOW_TOPIC_EVENT,
				eventData: { topicId: ABOUT_BALLOON_HELP_TOPIC_ID },
			},
			{
				id: "help-toggle-balloons",
				title: "Hide Balloons",
				keyboardShortcut: "⌥H",
				event: "ClassicyDesktopSetBalloonHelp",
				eventData: { disableBalloonHelp: true },
			},
		]);
	});

	it("offers Show Balloons, turning them back on, while they are off", () => {
		const toggle = classicySystemHelpItems(true)[1];
		expect(toggle.title).toBe("Show Balloons");
		expect(toggle.eventData).toEqual({ disableBalloonHelp: false });
	});
});

describe("isClassicyAppHelpMenu", () => {
	it.each<[string, ClassicyMenuItem]>([
		["its part", { id: "x", title: "Aide", part: "help", menuChildren: [] }],
		["its id", { id: "T.app_main_help", title: "?", menuChildren: [] }],
		["its title", { id: "x", title: "Help", menuChildren: [] }],
	])("knows a Help menu by %s", (_, item) => {
		expect(isClassicyAppHelpMenu(item)).toBe(true);
	});

	it("is false for any other menu", () => {
		expect(
			isClassicyAppHelpMenu({
				id: "T.app_file",
				title: "File",
				menuChildren: [],
			}),
		).toBe(false);
	});

	it("is false for a command titled Help, which is not a menu", () => {
		expect(isClassicyAppHelpMenu({ id: "T.app_help", title: "Help" })).toBe(
			false,
		);
	});
});

describe("splitClassicyAppHelpMenus", () => {
	it("separates the Help menus from the others, keeping each order", () => {
		const file = { id: "a_file", title: "File", menuChildren: [] };
		const help = { id: "a_help", title: "Help", menuChildren: [] };
		const view = { id: "a_view", title: "View", menuChildren: [] };
		const guide = {
			id: "a_guide",
			title: "Guide",
			part: "help",
			menuChildren: [],
		};
		expect(splitClassicyAppHelpMenus([file, help, view, guide])).toEqual({
			menus: [file, view],
			helpMenus: [help, guide],
		});
	});
});

describe("classicyHelpMenuChildren", () => {
	const system = classicySystemHelpItems(false);

	it("is the system items alone with nothing else to add", () => {
		expect(classicyHelpMenuChildren(system, undefined, [])).toEqual(system);
		expect(classicyHelpMenuChildren(system, [], [])).toEqual(system);
	});

	it("adds the registered items, then the app's own, each after a divider", () => {
		const children = classicyHelpMenuChildren(
			system,
			[{ id: "reg", title: "Weather Help" }],
			[
				{
					id: "W.app_help",
					title: "Help",
					menuChildren: [{ id: "own", title: "Forecast Tips" }],
				},
			],
		);
		expect(ids(children)).toEqual([
			"help-about-balloon",
			"help-toggle-balloons",
			"spacer",
			"reg",
			"spacer",
			"own",
		]);
	});

	it("puts a divider between two of the app's Help menus", () => {
		const children = classicyHelpMenuChildren(system, undefined, [
			{ id: "a_help", title: "Help", menuChildren: [{ id: "one" }] },
			{ id: "b_help", title: "Help", menuChildren: [{ id: "two" }] },
		]);
		expect(ids(children).slice(2)).toEqual(["spacer", "one", "spacer", "two"]);
	});

	// Finder's Help menu repeats the system toggle; the merge drops it, so a
	// Finder window adds nothing (and no divider) to the system Help.
	it("drops an app item that repeats the balloon toggle", () => {
		const own: ClassicyMenuItem[] = [
			{
				id: "Finder.app_x_help",
				title: "Help",
				menuChildren: [
					{
						id: "Finder.app_x_help_balloon",
						title: "Hide Balloon Help",
						event: "ClassicyDesktopSetBalloonHelp",
						eventData: { disableBalloonHelp: true },
					},
				],
			},
		];
		expect(classicyHelpMenuChildren(system, undefined, own)).toEqual(system);
	});

	it("drops a registered item that repeats the toggle, and its dividers", () => {
		const children = classicyHelpMenuChildren(
			system,
			[
				{ id: "spacer" },
				{
					id: "dup",
					title: "Balloons",
					event: "ClassicyDesktopSetBalloonHelp",
					eventData: { disableBalloonHelp: true },
				},
				{ id: "spacer" },
				{ id: "kept", title: "Kept" },
			],
			[],
		);
		expect(ids(children)).toEqual([
			"help-about-balloon",
			"help-toggle-balloons",
			"spacer",
			"kept",
		]);
	});

	it("keeps an app's balloon item that is a callback, not the event", () => {
		const children = classicyHelpMenuChildren(system, undefined, [
			{
				id: "a_help",
				title: "Help",
				menuChildren: [{ id: "cb", title: "Balloons", onClickFunc: vi.fn() }],
			},
		]);
		expect(ids(children)).toContain("cb");
	});
});

// Moved unchanged from ClassicyDesktopMenuBar.tsx.
describe("findClassicyAppAboutItem", () => {
	it("prefers the app's exact About id over a looser match", () => {
		const loose = { id: "Other_about", title: "About Other" };
		const exact = { id: "T.app_about", title: "About" };
		const items: ClassicyMenuItem[] = [
			{ id: "m", title: "M", menuChildren: [loose] },
			{ id: "n", title: "N", menuChildren: [exact] },
		];
		expect(findClassicyAppAboutItem(items, "T.app")).toBe(exact);
	});

	it("falls back to any _about id, then a title of About", () => {
		const byTitle = { id: "x", title: "About" };
		expect(
			findClassicyAppAboutItem(
				[{ id: "m", title: "M", menuChildren: [byTitle] }],
				"T.app",
			),
		).toBe(byTitle);
		expect(findClassicyAppAboutItem(undefined, "T.app")).toBeUndefined();
	});
});

describe("stripClassicyAboutItem and trimClassicyMenuSpacers", () => {
	it("removes the item, the menu it empties and the dividers it strands", () => {
		const about = { id: "T.app_about", title: "About" };
		const items: ClassicyMenuItem[] = [
			{ id: "help", title: "Help", menuChildren: [about] },
			{
				id: "file",
				title: "File",
				menuChildren: [about, { id: "spacer" }, { id: "quit", title: "Quit" }],
			},
		];
		const stripped = stripClassicyAboutItem(items, about);
		expect(ids(stripped)).toEqual(["file"]);
		expect(ids(stripped[0].menuChildren ?? [])).toEqual(["quit"]);
	});

	it("collapses runs of dividers and drops them at either end", () => {
		expect(
			ids(
				trimClassicyMenuSpacers([
					{ id: "spacer" },
					{ id: "a" },
					{ id: "spacer" },
					{ id: "spacer" },
					{ id: "b" },
					{ id: "spacer" },
				]),
			),
		).toEqual(["a", "spacer", "b"]);
	});
});
