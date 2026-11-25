import { produce } from "immer";
import { afterEach, describe, expect, it } from "vitest";
// The Windows-layout package below needs a sound pack registered: the core
// default theme names Platinum's.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import {
	type ClassicyStore,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";
import {
	classicyReopenActivates,
	focusClassicyReopenedWindow,
} from "./ClassicyDocumentReopen";

const useLayout = (document: Record<string, unknown> | undefined) =>
	registerClassicyAppearancePackage({
		id: "reopen-probe",
		name: "Reopen Probe",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: "reopen-probe-default",
			package: "reopen-probe",
		},
		layout: { ...windows98.layout, document } as never,
	});

afterEach(() => {
	resetClassicyAppearancePackagesForTests();
});

const APP = "Notes.app";

const store = (closed = false): ClassicyStore =>
	produce(DefaultAppManagerState, (draft) => {
		const win = (id: string, zOrder: number) => ({
			id,
			closed: id === "doc" ? closed : false,
			size: [100, 100] as [number, number],
			position: [0, 0] as [number, number],
			minimumSize: [0, 0] as [number, number],
			zOrder,
		});
		draft.System.Manager.Applications.apps[APP] = {
			id: APP,
			name: "Notes",
			icon: "",
			open: true,
			windows: { doc: win("doc", 1), other: win("other", 2) },
			lastAccessedWindowId: "other",
			data: {},
		};
	});

describe("classicyReopenActivates", () => {
	it("is false under the default layout", () => {
		expect(classicyReopenActivates(DefaultAppManagerState)).toBe(false);
	});

	it("follows the drawn package's document.reopenActivates", () => {
		useLayout({ reopenActivates: true });
		expect(classicyReopenActivates(DefaultAppManagerState)).toBe(true);
		resetClassicyAppearancePackagesForTests();
		useLayout({ reopenActivates: false });
		expect(classicyReopenActivates(DefaultAppManagerState)).toBe(false);
		resetClassicyAppearancePackagesForTests();
		useLayout(undefined);
		expect(classicyReopenActivates(DefaultAppManagerState)).toBe(false);
	});
});

describe("focusClassicyReopenedWindow", () => {
	const run = (ds: ClassicyStore, windowId: string, wasOpen: boolean) => {
		let focused = false;
		const next = produce(ds, (draft) => {
			focused = focusClassicyReopenedWindow(draft, APP, windowId, wasOpen);
		});
		return { focused, next };
	};

	it("focuses the document's open window under the key", () => {
		useLayout({ reopenActivates: true });
		const { focused, next } = run(store(), "doc", true);
		expect(focused).toBe(true);
		const app = next.System.Manager.Applications.apps[APP];
		expect(app.windows.doc.focused).toBe(true);
		expect(app.lastAccessedWindowId).toBe("doc");
		expect(next.System.Manager.Applications.focusedAppId).toBe(APP);
	});

	it("does nothing for a document that was not open, a closed window, an unknown window or app", () => {
		useLayout({ reopenActivates: true });
		expect(run(store(), "doc", false).focused).toBe(false);
		expect(run(store(true), "doc", true).focused).toBe(false);
		expect(run(store(), "missing", true).focused).toBe(false);
		const ds = store();
		const next = produce(ds, (draft) => {
			expect(
				focusClassicyReopenedWindow(draft, "Missing.app", "doc", true),
			).toBe(false);
		});
		expect(next).toBe(ds);
	});

	it("does nothing under the default layout", () => {
		const ds = store();
		const { focused, next } = run(ds, "doc", true);
		expect(focused).toBe(false);
		expect(next).toBe(ds);
	});
});
