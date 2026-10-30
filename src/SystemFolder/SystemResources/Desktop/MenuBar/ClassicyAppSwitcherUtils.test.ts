import { describe, expect, it } from "vitest";
import { CLASSICY_NO_APP_IDENTITY_OVERRIDES } from "@/Appearance/ClassicyAppIdentity";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	appSwitcherAppsFrom,
	CLASSICY_SYSTEM_MENU_APP_PREFIX,
	withClassicyAppIdentityAboutItem,
	withClassicyAppIdentityMenuItems,
} from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const app = (
	id: string,
	overrides: Partial<ClassicyStoreSystemApp> = {},
): ClassicyStoreSystemApp => ({
	id,
	name: id.replace(".app", ""),
	icon: `/icons/${id}.png`,
	windows: {},
	open: true,
	data: {},
	...overrides,
});

describe("appSwitcherAppsFrom", () => {
	it("lists open apps", () => {
		const result = appSwitcherAppsFrom({
			"Finder.app": app("Finder.app", { focused: true }),
			"TV.app": app("TV.app"),
		});
		expect(result.map((a) => a.id)).toEqual(["Finder.app", "TV.app"]);
	});

	it("excludes closed, unfocused apps", () => {
		const result = appSwitcherAppsFrom({
			"TV.app": app("TV.app", { open: false }),
		});
		expect(result).toEqual([]);
	});

	it("excludes extensions even when open or focused", () => {
		const result = appSwitcherAppsFrom({
			"Finder.app": app("Finder.app"),
			"ClockExt.app": app("ClockExt.app", { extension: true }),
			"FocusedExt.app": app("FocusedExt.app", {
				extension: true,
				focused: true,
			}),
		});
		expect(result.map((a) => a.id)).toEqual(["Finder.app"]);
	});
});

describe("appSwitcherAppsFrom — display identity", () => {
	it("renames only the app an override names", () => {
		const result = appSwitcherAppsFrom(
			{
				"A.app": app("A.app"),
				"B.app": app("B.app"),
			},
			{ "B.app": { name: "Bee" } },
		);
		expect(result.map((a) => [a.id, a.name, a.icon])).toEqual([
			["A.app", "A", "/icons/A.app.png"],
			["B.app", "Bee", "/icons/B.app.png"],
		]);
	});

	it("returns the apps' own names with an empty override map", () => {
		const result = appSwitcherAppsFrom(
			{
				"A.app": app("A.app"),
				"B.app": app("B.app"),
			},
			CLASSICY_NO_APP_IDENTITY_OVERRIDES,
		);
		expect(result.map((a) => a.name)).toEqual(["A", "B"]);
	});

	it("re-icons an app whose override gives an icon", () => {
		const [entry] = appSwitcherAppsFrom(
			{ "B.app": app("B.app") },
			{ "B.app": { icon: "/icons/bee.png" } },
		);
		expect(entry).toMatchObject({ name: "B", icon: "/icons/bee.png" });
	});
});

describe("CLASSICY_SYSTEM_MENU_APP_PREFIX", () => {
	it("keeps the id format persisted Apple-menu entries carry", () => {
		expect(CLASSICY_SYSTEM_MENU_APP_PREFIX).toBe("system_menu_");
	});
});

describe("withClassicyAppIdentityMenuItems", () => {
	const systemMenuItem = (
		appId: string,
		name: string,
		icon: string,
	): ClassicyMenuItem => ({
		id: `system_menu_${appId}`,
		title: name,
		image: icon,
		event: "ClassicyAppOpen",
		eventData: { app: { id: appId, name, icon } },
	});

	const items = (): ClassicyMenuItem[] => [
		{ id: "about-this-computer", title: "About This Computer" },
		{ id: "spacer" },
		systemMenuItem("A.app", "A", "/icons/a.png"),
		systemMenuItem("B.app", "B", "/icons/b.png"),
	];

	it("renames only the system_menu_ entry an override names", () => {
		const input = items();
		const result = withClassicyAppIdentityMenuItems(input, {
			"B.app": { name: "Bee" },
		});
		expect(result).not.toBe(input);
		expect(result?.map((i) => i.title)).toEqual([
			"About This Computer",
			undefined,
			"A",
			"Bee",
		]);
		expect(result?.[3].image).toBe("/icons/b.png");
		// Unmatched items are passed through as they are.
		expect(result?.[0]).toBe(input[0]);
		expect(result?.[2]).toBe(input[2]);
	});

	it("keeps the open action's internal name in eventData", () => {
		const result = withClassicyAppIdentityMenuItems(items(), {
			"B.app": { name: "Bee", icon: "/icons/bee.png" },
		});
		expect(result?.[3].image).toBe("/icons/bee.png");
		expect(result?.[3].eventData).toEqual({
			app: { id: "B.app", name: "B", icon: "/icons/b.png" },
		});
	});

	it("does not resolve items whose id is not a system_menu_ entry", () => {
		const input: ClassicyMenuItem[] = [{ id: "B.app", title: "B" }];
		const result = withClassicyAppIdentityMenuItems(input, {
			"B.app": { name: "Bee" },
		});
		expect(result).toBe(input);
	});

	it("returns the same array when there are no overrides", () => {
		const input = items();
		expect(
			withClassicyAppIdentityMenuItems(
				input,
				CLASSICY_NO_APP_IDENTITY_OVERRIDES,
			),
		).toBe(input);
	});

	it("returns the same array when no override changes an entry", () => {
		const input = items();
		expect(
			withClassicyAppIdentityMenuItems(input, { "B.app": { name: "B" } }),
		).toBe(input);
	});

	it("passes undefined through", () => {
		expect(
			withClassicyAppIdentityMenuItems(undefined, { "B.app": { name: "Bee" } }),
		).toBeUndefined();
	});
});

describe("withClassicyAppIdentityAboutItem (K-R8)", () => {
	const onClickFunc = () => {};
	const menu = (): ClassicyMenuItem[] => [
		{
			id: "A.app_file",
			title: "File",
			menuChildren: [
				{ id: "A.app_about", title: "About A", onClickFunc },
				{ id: "spacer" },
				{ id: "A.app_quit", title: "Quit" },
			],
		},
		{
			id: "A.app_help",
			title: "Help",
			// Another app's About, and a stray "About" title: never matched.
			menuChildren: [
				{ id: "B.app_about", title: "About B" },
				{ id: "A.app_topic", title: "About" },
			],
		},
	];

	it("titles the app's own About item, found by id at any depth", () => {
		const input = menu();
		const result = withClassicyAppIdentityAboutItem(input, "A.app", {
			"A.app": { name: "Ay" },
		});
		expect(result?.[0].menuChildren?.[0]).toEqual({
			id: "A.app_about",
			title: "About Ay",
			onClickFunc,
		});
		// Other items, and the input itself, are untouched.
		expect(result?.[0].menuChildren?.slice(1)).toEqual(
			input[0].menuChildren?.slice(1),
		);
		expect(result?.[1]).toBe(input[1]);
		expect(input[0].menuChildren?.[0].title).toBe("About A");
	});

	it("returns the input itself when nothing renames the app", () => {
		const input = menu();
		for (const overrides of [
			CLASSICY_NO_APP_IDENTITY_OVERRIDES,
			{ "A.app": { icon: "/icons/ay.png" } },
			{ "B.app": { name: "Bee" } },
			{ constructor: { name: "Proto" } },
		]) {
			expect(withClassicyAppIdentityAboutItem(input, "A.app", overrides)).toBe(
				input,
			);
		}
		expect(withClassicyAppIdentityAboutItem(input, "constructor", {})).toBe(
			input,
		);
		expect(
			withClassicyAppIdentityAboutItem(undefined, "A.app", {
				"A.app": { name: "Ay" },
			}),
		).toBeUndefined();
	});

	it("returns the input itself when the title already matches", () => {
		const input = menu();
		expect(
			withClassicyAppIdentityAboutItem(input, "A.app", {
				"A.app": { name: "A" },
			}),
		).toBe(input);
	});
});
