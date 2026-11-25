// Platinum, for the store without the key (and the sound pack the test
// package's Platinum theme names).
import "@/__tests__/withPlatinum";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import {
	type ClassicyStore,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { sanitizeStateForPersistence } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { migrateClassicyState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

// The user's own shortcuts (the remaining chapters' audit's 4.15; WIG Ch.4
// "Shortcut Keys", p.27): `Desktop.shortcutOverrides`, written only under the
// active package's `layout.keyboard.editableShortcuts`.
const EDITABLE = "test-editable-shortcuts";

const store = (packageId: string): ClassicyStore => {
	const ds = structuredClone(DefaultAppManagerState) as ClassicyStore;
	ds.System.Manager.Appearance.packageId = packageId;
	return ds;
};

const set = (ds: ClassicyStore, action: Record<string, unknown>) =>
	classicyDesktopEventHandler(ds, {
		type: "ClassicyDesktopSetShortcutOverride",
		...action,
	});

beforeEach(() => {
	registerClassicyAppearancePackage({
		id: EDITABLE,
		name: "Editable shortcuts",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: `${EDITABLE}-default`,
			package: EDITABLE,
		},
		layout: windows98.layout as never,
	});
});
afterEach(() => unregisterClassicyAppearancePackage(EDITABLE));

describe("classicyDesktopEventHandler — shortcut overrides (layout.keyboard.editableShortcuts)", () => {
	it("is absent from the default state", () => {
		expect(
			Object.hasOwn(
				DefaultAppManagerState.System.Manager.Desktop,
				"shortcutOverrides",
			),
		).toBe(false);
	});

	it("stores an item's new chord in canonical form under the key", () => {
		const ds = store(EDITABLE);
		set(ds, { itemId: "finder_file_open", shortcut: "⌘K" });
		set(ds, { itemId: "SoundManager.app_quit", shortcut: "Ctrl+Shift+Q" });
		expect(ds.System.Manager.Desktop.shortcutOverrides).toEqual({
			finder_file_open: "command+k",
			"SoundManager.app_quit": "control+shift+q",
		});
	});

	it("drops the override when the item's own chord comes back, and the map with its last entry", () => {
		const ds = store(EDITABLE);
		set(ds, { itemId: "finder_file_open", shortcut: "⌘K" });
		set(ds, {
			itemId: "finder_file_open",
			shortcut: "⌘O",
			defaultShortcut: "⌘O",
		});
		expect(Object.hasOwn(ds.System.Manager.Desktop, "shortcutOverrides")).toBe(
			false,
		);
	});

	it("refuses an unusable id or chord", () => {
		const ds = store(EDITABLE);
		set(ds, { itemId: "__proto__", shortcut: "⌘K" });
		set(ds, { itemId: "", shortcut: "⌘K" });
		set(ds, { itemId: "finder_file_open", shortcut: "K" });
		set(ds, { itemId: "finder_file_open" });
		expect(ds.System.Manager.Desktop.shortcutOverrides).toBeUndefined();
	});

	it("writes nothing without the key (Platinum)", () => {
		const ds = store("platinum");
		set(ds, { itemId: "finder_file_open", shortcut: "⌘K" });
		expect(ds.System.Manager.Desktop.shortcutOverrides).toBeUndefined();
		ds.System.Manager.Desktop.shortcutOverrides = {
			finder_file_open: "command+k",
		};
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopResetShortcutOverrides",
		});
		expect(ds.System.Manager.Desktop.shortcutOverrides).toEqual({
			finder_file_open: "command+k",
		});
	});

	it("resets the listed items, or every one", () => {
		const ds = store(EDITABLE);
		set(ds, { itemId: "finder_file_open", shortcut: "⌘K" });
		set(ds, { itemId: "finder_edit_select_all", shortcut: "⌃⌘A" });
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopResetShortcutOverrides",
			itemIds: ["finder_file_open", "constructor"],
		});
		expect(ds.System.Manager.Desktop.shortcutOverrides).toEqual({
			finder_edit_select_all: "control+command+a",
		});
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopResetShortcutOverrides",
		});
		expect(Object.hasOwn(ds.System.Manager.Desktop, "shortcutOverrides")).toBe(
			false,
		);
	});

	it("is kept by sanitizeStateForPersistence, and absent from the saved state when none was made", () => {
		const ds = store(EDITABLE);
		expect(
			Object.hasOwn(
				sanitizeStateForPersistence(ds).System.Manager.Desktop,
				"shortcutOverrides",
			),
		).toBe(false);
		set(ds, { itemId: "finder_file_open", shortcut: "⌘K" });
		expect(
			sanitizeStateForPersistence(ds).System.Manager.Desktop.shortcutOverrides,
		).toEqual({ finder_file_open: "command+k" });
	});

	it("is validated on load: usable entries kept in canonical form, the rest dropped", () => {
		const ds = store(EDITABLE);
		(
			ds.System.Manager.Desktop as unknown as Record<string, unknown>
		).shortcutOverrides = {
			finder_file_open: "⌘K",
			constructor: "command+j",
			bad: "K",
		};
		const migrated = migrateClassicyState(ds);
		expect(migrated.System.Manager.Desktop.shortcutOverrides).toEqual({
			finder_file_open: "command+k",
		});
		// Idempotent: a valid map is left as it is.
		expect(migrateClassicyState(migrated)).toBe(migrated);

		const junk = store(EDITABLE);
		(
			junk.System.Manager.Desktop as unknown as Record<string, unknown>
		).shortcutOverrides = "⌘K";
		expect(
			Object.hasOwn(
				migrateClassicyState(junk).System.Manager.Desktop,
				"shortcutOverrides",
			),
		).toBe(false);
	});
});
