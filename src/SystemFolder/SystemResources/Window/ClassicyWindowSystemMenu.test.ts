import { describe, expect, it, vi } from "vitest";
import { parseKeyboardShortcut } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import {
	CLASSICY_WINDOW_SYSTEM_MENU_CLOSE_SHORTCUT,
	type ClassicyWindowSystemMenuCommand,
	type ClassicyWindowSystemMenuHandlers,
	type ClassicyWindowSystemMenuState,
	classicyWindowSystemMenuItemId,
	classicyWindowSystemMenuItemIdPrefix,
	classicyWindowSystemMenuItems,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowSystemMenu";

// Plan 0020-w98 §5, "The window pop-up (system) menu": the items of WIG Ch.7
// "The Window Pop-up Menu" (p.102), Ch.8 (pp.145, 164), enabled as Wine's
// `MENU_InitSysMenuPopup` enables them.

const COMMANDS: ClassicyWindowSystemMenuCommand[] = [
	"restore",
	"move",
	"size",
	"minimize",
	"maximize",
	"close",
];

const handlers = (): ClassicyWindowSystemMenuHandlers & {
	[K in ClassicyWindowSystemMenuCommand]: ReturnType<typeof vi.fn>;
} => Object.fromEntries(COMMANDS.map((c) => [c, vi.fn()])) as never;

// A sizable primary window that is neither minimized nor maximized.
const NORMAL: ClassicyWindowSystemMenuState = {
	appId: "Notes.app",
	windowId: "main",
	kind: "document",
	minimized: false,
	maximized: false,
	offScreen: false,
	movable: true,
	resizable: true,
	minimizable: true,
	maximizable: true,
	closable: true,
};

const build = (state: Partial<ClassicyWindowSystemMenuState> = {}) =>
	classicyWindowSystemMenuItems({ ...NORMAL, ...state }, handlers());

// Each item's title, `—` for the separator.
const titles = (state: Partial<ClassicyWindowSystemMenuState> = {}) =>
	build(state).map((i) => (i.id === "spacer" ? "—" : i.title));

// The titles of the items that are enabled.
const enabledTitles = (state: Partial<ClassicyWindowSystemMenuState> = {}) =>
	build(state)
		.filter((i) => i.id !== "spacer" && !i.disabled)
		.map((i) => i.title);

describe("classicyWindowSystemMenuItems", () => {
	describe("the items of each kind of window", () => {
		it("gives a primary window Restore, Move, Size, Minimize, Maximize, a separator and Close", () => {
			expect(titles()).toEqual([
				"Restore",
				"Move",
				"Size",
				"Minimize",
				"Maximize",
				"—",
				"Close",
			]);
		});

		it("gives a secondary window (a modal) Move, a separator and Close", () => {
			expect(titles({ kind: "modal" })).toEqual(["Move", "—", "Close"]);
		});

		it("gives a palette Move, Size, a separator and Close", () => {
			expect(titles({ kind: "utility" })).toEqual([
				"Move",
				"Size",
				"—",
				"Close",
			]);
		});
	});

	describe("which items are enabled", () => {
		it("dims Restore alone on a window neither minimized nor maximized", () => {
			expect(enabledTitles()).toEqual([
				"Move",
				"Size",
				"Minimize",
				"Maximize",
				"Close",
			]);
		});

		it("enables Restore, Maximize and Close on a minimized window", () => {
			expect(enabledTitles({ minimized: true, offScreen: true })).toEqual([
				"Restore",
				"Maximize",
				"Close",
			]);
		});

		it("keeps Move on a shaded window, which is on the screen", () => {
			expect(enabledTitles({ minimized: true, offScreen: false })).toEqual([
				"Restore",
				"Move",
				"Maximize",
				"Close",
			]);
		});

		it("enables Restore, Minimize and Close on a maximized window", () => {
			expect(enabledTitles({ maximized: true })).toEqual([
				"Restore",
				"Minimize",
				"Close",
			]);
		});

		it("dims Size on a window that cannot be sized", () => {
			expect(enabledTitles({ resizable: false })).toEqual([
				"Move",
				"Minimize",
				"Maximize",
				"Close",
			]);
		});

		it("dims Minimize and Maximize on a window without their boxes", () => {
			expect(enabledTitles({ minimizable: false, maximizable: false })).toEqual(
				["Move", "Size", "Close"],
			);
		});

		it("dims Move on a window that does not move (a fixed modal)", () => {
			expect(enabledTitles({ kind: "modal", movable: false })).toEqual([
				"Close",
			]);
		});

		it("dims Close on a window its Close would not close", () => {
			expect(enabledTitles({ kind: "modal", closable: false })).toEqual([
				"Move",
			]);
		});

		it("dims a palette's Size when it cannot be sized", () => {
			expect(enabledTitles({ kind: "utility", resizable: false })).toEqual([
				"Move",
				"Close",
			]);
		});
	});

	it("makes Close the default item, showing ALT+F4", () => {
		const close = build().find((i) => i.title === "Close");
		expect(close).toMatchObject({
			isDefault: true,
			keyboardShortcut: CLASSICY_WINDOW_SYSTEM_MENU_CLOSE_SHORTCUT,
		});
		expect(
			parseKeyboardShortcut(CLASSICY_WINDOW_SYSTEM_MENU_CLOSE_SHORTCUT),
		).toMatchObject({ key: "F4" });
		expect(
			build()
				.filter((i) => i.title !== "Close")
				.some((i) => i.isDefault || i.keyboardShortcut),
		).toBe(false);
	});

	it("gives each item user.exe's access key", () => {
		expect(
			build()
				.filter((i) => i.id !== "spacer")
				.map((i) => [i.title, i.accessKey]),
		).toEqual([
			["Restore", "R"],
			["Move", "M"],
			["Size", "S"],
			["Minimize", "n"],
			["Maximize", "x"],
			["Close", "C"],
		]);
	});

	it("runs each item's handler", () => {
		const h = handlers();
		const items = classicyWindowSystemMenuItems(NORMAL, h);
		for (const command of COMMANDS) {
			items
				.find(
					(i) =>
						i.id ===
						classicyWindowSystemMenuItemId("Notes.app", "main", command),
				)
				?.onClickFunc?.();
			expect(h[command]).toHaveBeenCalledTimes(1);
		}
	});

	it("ids each item by its window and command", () => {
		expect(classicyWindowSystemMenuItemIdPrefix("Notes.app", "main")).toBe(
			"Notes.app_main_system_",
		);
		expect(
			build()
				.filter((i) => i.id !== "spacer")
				.map((i) => i.id),
		).toEqual(COMMANDS.map((c) => `Notes.app_main_system_${c}`));
	});
});
