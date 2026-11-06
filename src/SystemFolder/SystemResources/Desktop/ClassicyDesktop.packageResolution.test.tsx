// Which package the desktop draws (plan 0014-ahm, "Package resolution and the
// fallback"; 0015 §1.5): the stored `packageId` when registered, else the
// registered default package, else the first registered package. The
// structure-only fallback package is for lone components; a desktop with no
// package stops (ClassicyNoAppearancePackage.test.tsx).
// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import { act, render, renderHook } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	registerClassicyAssets,
	resetClassicyAssets,
	resolveClassicyAsset,
	useClassicyAssetVars,
} from "@/Appearance/ClassicyAssetRegistry";
import { platinumSoundPack } from "@/Appearance/Platinum/assets/sounds/platinum";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	registerClassicySoundPack,
	resetClassicySoundPacks,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const { howls } = vi.hoisted(() => ({
	howls: { created: 0, played: 0 },
}));

// jsdom plays no audio; this Howl counts what the desktop asks of it.
vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn(() => {
			howls.played += 1;
		});
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
		constructor() {
			howls.created += 1;
		}
	},
}));

// Platinum is registered here (withPlatinum).
const platinum = getClassicyAppearancePackage("platinum");

// Storybook's "mirrored" package, as far as resolution cares: a package that
// is not Platinum.
const mirrored: ClassicyAppearancePackage = {
	id: "mirrored",
	name: "Mirrored",
	css: "",
	defaults: {
		...getTheme("default"),
		id: "mirrored-default",
		package: "mirrored",
	},
	layout: {
		window: { growBoxCorner: "bottom-left" },
		menuBar: { placement: "window" },
		desktop: { iconGridOrigin: "top-left" },
	},
};

const setPackageId = (packageId: string) =>
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Appearance.packageId = packageId;
			}),
		);
	});

const renderDesktop = (startupScreen = false) =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop startupScreen={startupScreen} />
		</ClassicyAppManagerProvider>,
	);

const rootAppearance = () =>
	document
		.getElementById("classicyDesktop")
		?.getAttribute("data-classicy-appearance");

const collectLog = (id: string) => {
	const entries: ClassicyLogEntry[] = [];
	registerClassicyLogSink({ id, onLog: (entry) => entries.push(entry) });
	return {
		entries,
		stop: () => unregisterClassicyLogSink(id),
	};
};

beforeEach(() => {
	localStorage.clear();
	sessionStorage.clear();
	vi.spyOn(console, "warn").mockImplementation(() => {});
	useAppManager.setState(DefaultAppManagerState, true);
});

afterEach(() => {
	useAppManager.setState(DefaultAppManagerState, true);
	vi.restoreAllMocks();
});

describe("ClassicyDesktop's package resolution", () => {
	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		if (platinum) registerClassicyAppearancePackage(platinum);
	});

	// First in the file: the desktop reports each stored id once per page,
	// so this case must run before anything else stores "platinum" unregistered.
	// The default state seeds packageId "platinum", so a host that registers
	// only its own package stores the default id without ever choosing it,
	// and must not be warned on every load.
	it("draws the only registered package when the stored id is the unregistered default, and says nothing", async () => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(mirrored);
		const log = collectLog("resolution-default-test");
		try {
			setPackageId("platinum");
			const first = renderDesktop();
			await act(async () => {});
			first.unmount();
			renderDesktop();
			await act(async () => {});
		} finally {
			log.stop();
		}
		expect(
			log.entries.filter((e) => /is not registered; drawing/.test(e.message)),
		).toEqual([]);
		expect(rootAppearance()).toBe("mirrored");
		expect(
			document
				.getElementById("classicyDesktop")
				?.getAttribute("data-classicy-menu-bar"),
		).toBe("window");
	});

	it("draws the default package for an unregistered stored id, and says so once", async () => {
		expect(platinum).toBeDefined();
		registerClassicyAppearancePackage(mirrored);
		const log = collectLog("resolution-test");
		try {
			setPackageId("irix");
			const first = renderDesktop();
			await act(async () => {});
			expect(rootAppearance()).toBe("platinum");
			first.rerender(
				<ClassicyAppManagerProvider>
					<ClassicyDesktop startupScreen={false} />
				</ClassicyAppManagerProvider>,
			);
			first.unmount();
			renderDesktop();
			await act(async () => {});
			expect(rootAppearance()).toBe("platinum");
		} finally {
			log.stop();
		}
		const warnings = log.entries.filter((e) => /"irix"/.test(e.message));
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toMatchObject({
			level: "warn",
			subsystem: "ClassicyAppearance",
			message:
				'Appearance Package "irix" is not registered; drawing "platinum" instead.',
		});
	});

	it("says nothing for a registered stored id", async () => {
		registerClassicyAppearancePackage(mirrored);
		const log = collectLog("resolution-registered-test");
		try {
			setPackageId("mirrored");
			renderDesktop();
			await act(async () => {});
		} finally {
			log.stop();
		}
		expect(rootAppearance()).toBe("mirrored");
		expect(
			log.entries.filter((e) => /is not registered; drawing/.test(e.message)),
		).toEqual([]);
	});
});

// Review focus 3 (plan 0015): a host that registers one package, not
// Platinum. Platinum's assets and sound pack are cleared here, as they are
// absent when a host never imports Platinum (the core does not, §1.6).
describe("only a non-Platinum package registered", () => {
	beforeEach(() => {
		resetClassicyAppearancePackagesForTests();
		// Registered while Platinum's sound pack is: its theme names it (and
		// a sound pack must be registered for a theme naming it to validate).
		registerClassicySoundPack(platinumSoundPack);
		registerClassicyAppearancePackage(mirrored);
		expect(getClassicyAppearancePackage("mirrored")).toBe(mirrored);
		resetClassicyAssets();
		resetClassicySoundPacks();
		// The core's own icon tree, which the core always registers.
		registerClassicyAssets(
			"icons",
			CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
			ClassicyIcons,
		);
		howls.created = 0;
		howls.played = 0;
	});

	it("resolves icons from the core tree, and system art and cursors to undefined", async () => {
		expect(() => renderDesktop()).not.toThrow();
		await act(async () => {});
		expect(rootAppearance()).toBe("mirrored");
		expect(resolveClassicyAsset("icons", "system.macos")).toBe(
			ClassicyIcons.system.macos,
		);
		expect(resolveClassicyAsset("icons", "system.macos")).toBeTruthy();
		expect(resolveClassicyAsset("cursors", "arrow")).toBeUndefined();
		expect(resolveClassicyAsset("systemArt", "sadMac")).toBeUndefined();
		expect(resolveClassicyAsset("systemArt", "windowGrip")).toBeUndefined();
		const { result } = renderHook(() => useClassicyAssetVars());
		expect(
			Object.keys(result.current).filter((name) =>
				/^--classicy-(cursor|art)-/.test(name),
			),
		).toEqual([]);
		const root = document.getElementById("classicyDesktop") as HTMLElement;
		expect(root.style.getPropertyValue("--classicy-cursor-arrow")).toBe("");
		// The Trash draws the core tree's icon.
		expect(document.querySelector(".classicyDesktopIcon img")).not.toBeNull();
	});

	it("is silent: no player is built and nothing plays", async () => {
		renderDesktop(true);
		await act(async () => {});
		expect(rootAppearance()).toBe("mirrored");
		expect(howls.created).toBe(0);
		expect(howls.played).toBe(0);
	});
});
