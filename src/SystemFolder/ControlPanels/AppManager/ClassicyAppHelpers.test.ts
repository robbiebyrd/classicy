import { afterEach, describe, expect, it } from "vitest";
import {
	registerTestTaskbarPackage,
	TEST_MINIMIZE_LAYOUT,
	TEST_MINIMIZE_PACKAGE_ID,
	TEST_TASKBAR_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { windowsRecord } from "@/__tests__/windowsRecord";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	classicyAppPalettesHidden,
	classicyVisibleSuccession,
	classicyWindowsMinimize,
	closeApp,
	focusApp,
	focusWindow,
	hideApp,
	hideOtherApps,
	isClassicyPrimaryWindow,
	isClassicyWindowMinimized,
	isClassicyWindowShown,
	loadApp,
	markAppFocused,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import {
	type ClassicyStore,
	type ClassicyStoreSystemApp,
	type ClassicyStoreSystemAppWindow,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";

// An app id is library input (a host's ClassicyApp id, a HyperCard stack's
// ClassicyAppOpen). Read with a plain index, `apps["__proto__"]` is
// Object.prototype, and assigned, it rewrites the apps record's prototype, so
// that id is never an app (CodeQL js/prototype-polluting-assignment).
const RESERVED = "__proto__";

const store = (): ClassicyStore => structuredClone(DefaultAppManagerState);

afterEach(() => {
	for (const key of ["open", "focused", "hidden", "windows"]) {
		delete (Object.prototype as Record<string, unknown>)[key];
	}
});

describe("the app helpers and the reserved __proto__ id", () => {
	it("never write to Object.prototype", () => {
		const ds = store();
		closeApp(ds, RESERVED);
		focusApp(ds, RESERVED);
		markAppFocused(ds, RESERVED);
		hideApp(ds, RESERVED);
		hideOtherApps(ds, RESERVED);
		const proto = Object.prototype as Record<string, unknown>;
		expect(Object.hasOwn(proto, "open")).toBe(false);
		expect(Object.hasOwn(proto, "focused")).toBe(false);
		expect(Object.hasOwn(proto, "hidden")).toBe(false);
	});

	it("never replace the apps record's prototype", () => {
		const ds = store();
		const apps = ds.System.Manager.Applications.apps;
		openApp(ds, RESERVED, "Evil", "");
		loadApp(ds, RESERVED, "Evil", "");
		expect(Object.getPrototypeOf(apps)).toBe(Object.prototype);
		expect(Object.hasOwn(apps, RESERVED)).toBe(false);
	});

	it("still open and close an ordinary app", () => {
		const ds = store();
		openApp(ds, "Ordinary.app", "Ordinary", "");
		expect(ds.System.Manager.Applications.apps["Ordinary.app"]?.open).toBe(
			true,
		);
		closeApp(ds, "Ordinary.app");
		expect(ds.System.Manager.Applications.apps["Ordinary.app"]?.open).toBe(
			false,
		);
	});
});

// Plan 0020-w98 §5, "Minimize": what the store's `collapsed` means under
// `window.collapse: "minimize"`, and where focus goes when a window leaves
// the screen. Each case runs under the default layout (a test package
// without the flag) and under one that minimizes.
describe("minimize (window.collapse)", () => {
	afterEach(() => {
		unregisterClassicyAppearancePackage(TEST_MINIMIZE_PACKAGE_ID);
		unregisterClassicyAppearancePackage(TEST_TASKBAR_PACKAGE_ID);
	});

	const win = (
		id: string,
		overrides: Partial<ClassicyStoreSystemAppWindow> = {},
	): ClassicyStoreSystemAppWindow => ({
		id,
		closed: false,
		size: [100, 100],
		position: [0, 0],
		minimumSize: [0, 0],
		...overrides,
	});

	const app = (
		id: string,
		windows: ClassicyStoreSystemAppWindow[],
		overrides: Partial<ClassicyStoreSystemApp> = {},
	): ClassicyStoreSystemApp => ({
		id,
		name: id.replace(/\.app$/, ""),
		icon: "",
		windows: windowsRecord(...windows),
		open: true,
		data: {},
		...overrides,
	});

	// A store drawn by `packageId`, holding Finder (no windows) and `apps`.
	const storeWith = (
		packageId: string,
		...apps: ClassicyStoreSystemApp[]
	): ClassicyStore => {
		const ds = store();
		ds.System.Manager.Appearance.packageId = packageId;
		for (const a of apps) ds.System.Manager.Applications.apps[a.id] = a;
		return ds;
	};

	const minimizing = (...apps: ClassicyStoreSystemApp[]) => {
		registerTestTaskbarPackage(TEST_MINIMIZE_LAYOUT, TEST_MINIMIZE_PACKAGE_ID);
		return storeWith(TEST_MINIMIZE_PACKAGE_ID, ...apps);
	};
	const shading = (...apps: ClassicyStoreSystemApp[]) => {
		registerTestTaskbarPackage();
		return storeWith(TEST_TASKBAR_PACKAGE_ID, ...apps);
	};

	const focusOf = (ds: ClassicyStore) => {
		const { apps, focusedAppId } = ds.System.Manager.Applications;
		const focusedWindows = Object.values(apps).flatMap((a) =>
			Object.values(a.windows ?? {})
				.filter((w) => w.focused)
				.map((w) => `${a.id}/${w.id}`),
		);
		return { focusedAppId, focusedWindows };
	};

	describe("classicyWindowsMinimize", () => {
		it("is true only for a package whose layout minimizes", () => {
			expect(classicyWindowsMinimize(minimizing())).toBe(true);
			expect(classicyWindowsMinimize(shading())).toBe(false);
			// With no such package registered, the default layout: WindowShade.
			unregisterClassicyAppearancePackage(TEST_TASKBAR_PACKAGE_ID);
			unregisterClassicyAppearancePackage(TEST_MINIMIZE_PACKAGE_ID);
			expect(classicyWindowsMinimize(store())).toBe(false);
		});
	});

	describe("which windows minimize", () => {
		it("a primary window is neither a modal nor a palette", () => {
			expect(isClassicyPrimaryWindow({})).toBe(true);
			expect(isClassicyPrimaryWindow({ windowType: "document" })).toBe(true);
			expect(isClassicyPrimaryWindow({ modal: true })).toBe(false);
			expect(isClassicyPrimaryWindow({ windowType: "utility" })).toBe(false);
		});

		it("a minimized window is a collapsed primary window", () => {
			expect(isClassicyWindowMinimized({ collapsed: true })).toBe(true);
			expect(isClassicyWindowMinimized({ collapsed: false })).toBe(false);
			expect(
				isClassicyWindowMinimized({ collapsed: true, windowType: "utility" }),
			).toBe(false);
			expect(isClassicyWindowMinimized({ collapsed: true, modal: true })).toBe(
				false,
			);
		});

		it("hides an app's palettes while every open primary window is minimized", () => {
			const palette = win("tools", { windowType: "utility" });
			expect(
				classicyAppPalettesHidden(
					app("A.app", [win("doc", { collapsed: true }), palette]),
				),
			).toBe(true);
			// One primary window still shown.
			expect(
				classicyAppPalettesHidden(
					app("A.app", [
						win("doc", { collapsed: true }),
						win("other"),
						palette,
					]),
				),
			).toBe(false);
			// A closed window does not count; an app with palettes only keeps
			// them; a modal is no primary window.
			expect(
				classicyAppPalettesHidden(
					app("A.app", [
						win("doc", { collapsed: true }),
						win("shut", { closed: true }),
						palette,
					]),
				),
			).toBe(true);
			expect(classicyAppPalettesHidden(app("A.app", [palette]))).toBe(false);
			expect(
				classicyAppPalettesHidden(
					app("A.app", [win("dialog", { modal: true }), palette]),
				),
			).toBe(false);
			expect(classicyAppPalettesHidden(undefined)).toBe(false);
		});

		it("a window is shown while open, unminimized and, for a palette, not hidden with its app", () => {
			const a = app("A.app", [
				win("doc", { collapsed: true }),
				win("tools", { windowType: "utility", collapsed: true }),
				win("dialog", { modal: true, collapsed: true }),
				win("shut", { closed: true }),
			]);
			const shown = (id: string) => {
				const w = getAppWindow(a, id);
				if (!w) throw new Error(id);
				return isClassicyWindowShown(a, w);
			};
			expect(shown("doc")).toBe(false);
			// Its app's only primary window is minimized.
			expect(shown("tools")).toBe(false);
			// A modal's collapse is no minimize.
			expect(shown("dialog")).toBe(true);
			expect(shown("shut")).toBe(false);
		});
	});

	describe("focusWindow", () => {
		it("restores a minimized primary window it focuses, under the flag only", () => {
			const windows = () => [
				win("doc", { collapsed: true }),
				win("tools", { windowType: "utility", collapsed: true }),
			];
			const minimized = focusWindow(
				minimizing(app("A.app", windows())),
				"A.app",
				"doc",
			);
			const aMin = minimized.System.Manager.Applications.apps["A.app"];
			expect(getAppWindow(aMin, "doc")).toMatchObject({
				focused: true,
				collapsed: false,
			});
			// A palette's stored collapse is no minimize: kept.
			focusWindow(minimized, "A.app", "tools");
			expect(getAppWindow(aMin, "tools")?.collapsed).toBe(true);

			// WindowShade: focus never touches `collapsed`.
			const shaded = focusWindow(
				shading(app("A.app", windows())),
				"A.app",
				"doc",
			);
			expect(
				getAppWindow(shaded.System.Manager.Applications.apps["A.app"], "doc"),
			).toMatchObject({ focused: true, collapsed: true });
		});

		it("so activating an app restores its last-accessed window under the flag", () => {
			const ds = minimizing(
				app("A.app", [win("doc", { collapsed: true, zOrder: 5 })], {
					lastAccessedWindowId: "doc",
				}),
			);
			focusApp(ds, "A.app");
			expect(
				getAppWindow(ds.System.Manager.Applications.apps["A.app"], "doc"),
			).toMatchObject({ focused: true, collapsed: false });
		});
	});

	describe("classicyVisibleSuccession", () => {
		it("passes focus to the app's own front shown primary window first", () => {
			const ds = minimizing(
				app(
					"A.app",
					[
						win("gone", { collapsed: true, zOrder: 9 }),
						win("back", { zOrder: 3 }),
						win("front", { zOrder: 7 }),
						win("min", { collapsed: true, zOrder: 8 }),
						win("tools", { windowType: "utility", zOrder: 10 }),
						win("dialog", { modal: true, zOrder: 11, closed: true }),
					],
					{ focused: true },
				),
				app("B.app", [win("doc", { zOrder: 100 })]),
			);
			classicyVisibleSuccession(ds, "A.app", "gone");
			expect(focusOf(ds)).toEqual({
				focusedAppId: "A.app",
				focusedWindows: ["A.app/front"],
			});
		});

		it("else to the front shown window of any other open, shown app", () => {
			const ds = minimizing(
				app("A.app", [win("gone", { collapsed: true, zOrder: 9 })], {
					focused: true,
				}),
				app("B.app", [win("doc", { zOrder: 4 })]),
				app("C.app", [
					win("doc", { zOrder: 6 }),
					win("min", { collapsed: true, zOrder: 50 }),
				]),
				app("Hidden.app", [win("doc", { zOrder: 70 })], { hidden: true }),
				app("Shut.app", [win("doc", { zOrder: 80 })], { open: false }),
				app("Help.app", [win("topic", { zOrder: 5 })], { extension: true }),
			);
			classicyVisibleSuccession(ds, "A.app", "gone");
			expect(focusOf(ds)).toEqual({
				focusedAppId: "C.app",
				focusedWindows: ["C.app/doc"],
			});
			// Nothing minimized was restored.
			expect(
				getAppWindow(ds.System.Manager.Applications.apps["C.app"], "min")
					?.collapsed,
			).toBe(true);
		});

		it("an extension's window is a primary window too (Apple Guide's help)", () => {
			const ds = minimizing(
				app("A.app", [win("gone", { collapsed: true })], { focused: true }),
				app("Help.app", [win("topic", { zOrder: 5 })], { extension: true }),
			);
			classicyVisibleSuccession(ds, "A.app", "gone");
			expect(focusOf(ds).focusedWindows).toEqual(["Help.app/topic"]);
		});

		it("else to the desktop: Finder focused with no window", () => {
			const ds = minimizing(
				app("A.app", [win("gone", { collapsed: true })], { focused: true }),
				app("B.app", [win("min", { collapsed: true, zOrder: 4 })]),
			);
			classicyVisibleSuccession(ds, "A.app", "gone");
			expect(focusOf(ds)).toEqual({
				focusedAppId: "Finder.app",
				focusedWindows: [],
			});
			expect(ds.System.Manager.Applications.apps["A.app"].focused).toBe(false);
		});

		it("with no Finder record, to no app at all", () => {
			const ds = minimizing(
				app("A.app", [win("gone", { collapsed: true })], { focused: true }),
			);
			delete ds.System.Manager.Applications.apps["Finder.app"];
			classicyVisibleSuccession(ds, "A.app", "gone");
			expect(focusOf(ds)).toEqual({
				focusedAppId: undefined,
				focusedWindows: [],
			});
		});
	});
});
