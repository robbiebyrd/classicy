import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	CLASSICY_FALLBACK_APPEARANCE_PACKAGE,
	type ClassicyAppearanceLayout,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
	classicyLayoutVars,
	getClassicyAppearanceLayout,
} from "@/Appearance/useClassicyAppearanceLayout";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

const MIRROR: ClassicyAppearanceLayout = {
	window: { growBoxCorner: "bottom-left" },
	menuBar: { placement: "window" },
	desktop: { iconGridOrigin: "top-left" },
};

const registerMirror = () =>
	registerClassicyAppearancePackage({
		id: "mirror",
		name: "Mirror",
		css: "",
		defaults: { ...getTheme("default"), package: "mirror" },
		layout: MIRROR,
	});

beforeEach(() => {
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
});

afterEach(() => {
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
});

describe("CLASSICY_DEFAULT_APPEARANCE_LAYOUT", () => {
	it("is Platinum's arrangement, frozen, and the fallback package's layout", () => {
		expect(CLASSICY_DEFAULT_APPEARANCE_LAYOUT).toEqual({
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		});
		expect(Object.isFrozen(CLASSICY_DEFAULT_APPEARANCE_LAYOUT)).toBe(true);
		expect(Object.isFrozen(CLASSICY_DEFAULT_APPEARANCE_LAYOUT.window)).toBe(
			true,
		);
		expect(CLASSICY_FALLBACK_APPEARANCE_PACKAGE.layout).toBe(
			CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
		);
	});
});

describe("getClassicyAppearanceLayout", () => {
	it("returns a registered package's layout by id", () => {
		registerMirror();
		expect(getClassicyAppearanceLayout("mirror")).toEqual(MIRROR);
	});

	it("falls back to the default layout for an unregistered id", () =>
		expect(getClassicyAppearanceLayout("irix")).toBe(
			CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
		));

	it("reads the active package from the store when no id is given", () => {
		registerMirror();
		expect(getClassicyAppearanceLayout()).toBe(
			CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
		);
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Appearance.packageId = "mirror";
			}),
		);
		expect(getClassicyAppearanceLayout()).toEqual(MIRROR);
	});
});

describe("classicyLayoutVars", () => {
	it("emits the three layout declarations as bare keywords", () =>
		expect(classicyLayoutVars(MIRROR)).toEqual({
			"--classicy-layout-grow-box-corner": "bottom-left",
			"--classicy-layout-menu-bar-placement": "window",
			"--classicy-layout-icon-grid-origin": "top-left",
		}));
});
