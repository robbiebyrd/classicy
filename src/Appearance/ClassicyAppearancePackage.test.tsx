import { act, renderHook } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID as LEAF_DEFAULT_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
	CLASSICY_FALLBACK_APPEARANCE_PACKAGE,
	type ClassicyAppearanceLayout,
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	getRegisteredClassicyAppearancePackageOrDefault,
	listClassicyAppearancePackages,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
	resolveClassicyAppearancePackage,
	subscribeClassicyAppearancePackages,
	useActiveClassicyAppearancePackage,
	useClassicyAppearancePackages,
} from "@/Appearance/ClassicyAppearancePackage";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const FALLBACK = CLASSICY_FALLBACK_APPEARANCE_PACKAGE;

const PLATINUM_LAYOUT: ClassicyAppearanceLayout = {
	window: { growBoxCorner: "bottom-right" },
	menuBar: { placement: "screen" },
	desktop: { iconGridOrigin: "top-right" },
};

const makePackage = (
	id: string,
	overrides: Partial<ClassicyAppearancePackage> = {},
): ClassicyAppearancePackage => ({
	id,
	name: id,
	css: "",
	defaults: { ...getTheme("default"), package: id },
	layout: PLATINUM_LAYOUT,
	...overrides,
});

const setPackageId = (packageId: string) =>
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Appearance.packageId = packageId;
			}),
		);
	});

beforeEach(() => {
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
});

afterEach(() => {
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
	vi.restoreAllMocks();
});

describe("ClassicyAppearancePackage registry", () => {
	it("registers and lists in registration order", () => {
		registerClassicyAppearancePackage(makePackage("b"));
		registerClassicyAppearancePackage(makePackage("a"));
		expect(listClassicyAppearancePackages().map((p) => p.id)).toEqual([
			"b",
			"a",
		]);
	});

	it("re-registering the same id replaces in place", () => {
		registerClassicyAppearancePackage(makePackage("a", { name: "One" }));
		registerClassicyAppearancePackage(makePackage("a", { name: "Two" }));
		expect(getClassicyAppearancePackage("a")?.name).toBe("Two");
		expect(listClassicyAppearancePackages()).toHaveLength(1);
		expect(listClassicyAppearancePackages()[0].id).toBe("a");
	});

	it("a replaced package keeps its position among others", () => {
		registerClassicyAppearancePackage(makePackage("a", { name: "One" }));
		registerClassicyAppearancePackage(makePackage("b"));
		registerClassicyAppearancePackage(makePackage("a", { name: "Two" }));
		expect(listClassicyAppearancePackages().map((p) => p.id)).toEqual([
			"a",
			"b",
		]);
	});

	it("rejects an invalid package and logs an error", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const entries: ClassicyLogEntry[] = [];
		registerClassicyLogSink({
			id: "appearance-package-test",
			onLog: (entry) => entries.push(entry),
		});
		try {
			registerClassicyAppearancePackage(makePackage("Not Kebab"));
		} finally {
			unregisterClassicyLogSink("appearance-package-test");
		}
		expect(getClassicyAppearancePackage("Not Kebab")).toBeUndefined();
		expect(entries).toHaveLength(1);
		expect(entries[0].level).toBe("error");
		expect(entries[0].subsystem).toBe("ClassicyAppearance");
		expect(entries[0].message).toMatch(
			/^Package "Not Kebab" was not registered: /,
		);
		expect(document.getElementById("classicy-appearance-Not Kebab")).toBeNull();
	});

	it("rejects a package whose defaults belong to another package", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const entries: ClassicyLogEntry[] = [];
		registerClassicyLogSink({
			id: "appearance-package-test",
			onLog: (entry) => entries.push(entry),
		});
		try {
			registerClassicyAppearancePackage(
				makePackage("irix", {
					defaults: { ...getTheme("default"), package: "platinum" },
				}),
			);
		} finally {
			unregisterClassicyLogSink("appearance-package-test");
		}
		expect(getClassicyAppearancePackage("irix")).toBeUndefined();
		expect(entries).toHaveLength(1);
		expect(entries[0].level).toBe("error");
		expect(entries[0].message).toBe(
			'Package "irix" was not registered: defaults.package: must be the package id "irix", not "platinum"',
		);
	});

	it("registers a package whose defaults name it", () => {
		const pkg = makePackage("irix");
		expect(pkg.defaults.package).toBe("irix");
		registerClassicyAppearancePackage(pkg);
		expect(getClassicyAppearancePackage("irix")).toBe(pkg);
	});

	it("rejects a package whose css is not a string", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const entries: ClassicyLogEntry[] = [];
		registerClassicyLogSink({
			id: "appearance-package-test",
			onLog: (entry) => entries.push(entry),
		});
		try {
			registerClassicyAppearancePackage(
				makePackage("a", { css: undefined as unknown as string }),
			);
		} finally {
			unregisterClassicyLogSink("appearance-package-test");
		}
		expect(getClassicyAppearancePackage("a")).toBeUndefined();
		expect(entries).toHaveLength(1);
		expect(entries[0].level).toBe("error");
		expect(entries[0].subsystem).toBe("ClassicyAppearance");
		expect(entries[0].message).toBe(
			'Package "a" was not registered: css: must be a string',
		);
		expect(document.getElementById("classicy-appearance-a")).toBeNull();
	});

	it("injects the package css on register", () => {
		registerClassicyAppearancePackage(makePackage("a", { css: ".x{}" }));
		expect(document.getElementById("classicy-appearance-a")?.textContent).toBe(
			".x{}",
		);
	});

	it("stores the package object it was given", () => {
		const pkg = makePackage("a", { css: ".x{}", hooks: {} });
		registerClassicyAppearancePackage(pkg);
		expect(getClassicyAppearancePackage("a")).toBe(pkg);
	});

	it("subscribe fires once per register and stops after unsubscribe", () => {
		const listener = vi.fn();
		const unsubscribe = subscribeClassicyAppearancePackages(listener);
		registerClassicyAppearancePackage(makePackage("a"));
		expect(listener).toHaveBeenCalledTimes(1);
		registerClassicyAppearancePackage(makePackage("b"));
		expect(listener).toHaveBeenCalledTimes(2);
		unsubscribe();
		registerClassicyAppearancePackage(makePackage("c"));
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it("useClassicyAppearancePackages re-renders on registration", () => {
		const { result } = renderHook(() => useClassicyAppearancePackages());
		const before = result.current.length;
		act(() => registerClassicyAppearancePackage(makePackage("a")));
		expect(result.current.length).toBe(before + 1);
	});

	it("useActiveClassicyAppearancePackage falls back to platinum for an unknown packageId", () => {
		const platinum = makePackage("platinum");
		registerClassicyAppearancePackage(platinum);
		setPackageId("irix");
		const { result } = renderHook(() => useActiveClassicyAppearancePackage());
		expect(result.current.id).toBe("platinum");
		expect(result.current).toBe(platinum);
	});

	it("useActiveClassicyAppearancePackage follows the store and the registry", () => {
		const platinum = makePackage("platinum");
		registerClassicyAppearancePackage(platinum);
		const { result } = renderHook(() => useActiveClassicyAppearancePackage());
		expect(result.current).toBe(platinum);
		setPackageId("mirror");
		expect(result.current).toBe(platinum);
		const mirror = makePackage("mirror");
		act(() => registerClassicyAppearancePackage(mirror));
		expect(result.current).toBe(mirror);
	});

	it("returns CLASSICY_FALLBACK_APPEARANCE_PACKAGE when nothing is registered", () => {
		const { result } = renderHook(() => useActiveClassicyAppearancePackage());
		expect(result.current).toBe(CLASSICY_FALLBACK_APPEARANCE_PACKAGE);
		expect(result.current.css).toBe("");
	});

	it("useClassicyAppearanceLayout returns the active package layout", () => {
		registerClassicyAppearancePackage(
			makePackage("mirror", {
				layout: {
					...PLATINUM_LAYOUT,
					window: { growBoxCorner: "bottom-left" },
				},
			}),
		);
		setPackageId("mirror");
		const { result } = renderHook(() => useClassicyAppearanceLayout());
		expect(result.current.window.growBoxCorner).toBe("bottom-left");
	});
});

describe("resolveClassicyAppearancePackage", () => {
	it("resolves the given id, then platinum, then the fallback", () => {
		expect(resolveClassicyAppearancePackage("irix")).toBe(
			CLASSICY_FALLBACK_APPEARANCE_PACKAGE,
		);
		const platinum = makePackage("platinum");
		registerClassicyAppearancePackage(platinum);
		expect(resolveClassicyAppearancePackage("irix")).toBe(platinum);
		const irix = makePackage("irix");
		registerClassicyAppearancePackage(irix);
		expect(resolveClassicyAppearancePackage("irix")).toBe(irix);
	});

	it("is getRegisteredClassicyAppearancePackageOrDefault, then the fallback (J-R16)", () => {
		const platinum = makePackage("platinum");
		const irix = makePackage("irix");
		const ids = ["platinum", "irix", "unregistered", "constructor"];
		const expected = {
			none: [FALLBACK, FALLBACK, FALLBACK, FALLBACK],
			irixOnly: [FALLBACK, irix, FALLBACK, FALLBACK],
			platinumOnly: [platinum, platinum, platinum, platinum],
			both: [platinum, irix, platinum, platinum],
		};
		const registrations = {
			none: [],
			irixOnly: [irix],
			platinumOnly: [platinum],
			both: [platinum, irix],
		};
		for (const [name, pkgs] of Object.entries(registrations)) {
			resetClassicyAppearancePackagesForTests();
			for (const pkg of pkgs) registerClassicyAppearancePackage(pkg);
			ids.forEach((id, i) => {
				const resolved = resolveClassicyAppearancePackage(id);
				// The chain B shipped, unchanged…
				expect(resolved, `${name}: ${id}`).toBe(
					expected[name as keyof typeof expected][i],
				);
				// …and it is the store-free helper plus the frozen fallback.
				expect(resolved, `${name}: ${id}`).toBe(
					getRegisteredClassicyAppearancePackageOrDefault(id) ?? FALLBACK,
				);
			});
		}
	});

	it("reads the store's packageId at call time when no id is given", () => {
		const platinum = makePackage("platinum");
		const irix = makePackage("irix");
		registerClassicyAppearancePackage(platinum);
		registerClassicyAppearancePackage(irix);
		expect(resolveClassicyAppearancePackage()).toBe(platinum);
		setPackageId("irix");
		expect(resolveClassicyAppearancePackage()).toBe(irix);
	});
});

describe("CLASSICY_FALLBACK_APPEARANCE_PACKAGE", () => {
	it("is Platinum's structure-only render: defaults, presets and layout, no css", () => {
		expect(CLASSICY_FALLBACK_APPEARANCE_PACKAGE).toMatchObject({
			id: "platinum",
			name: "Platinum",
			css: "",
			layout: PLATINUM_LAYOUT,
		});
		expect(CLASSICY_FALLBACK_APPEARANCE_PACKAGE.defaults).toBe(
			getTheme("default"),
		);
		expect(CLASSICY_FALLBACK_APPEARANCE_PACKAGE.presets).toBe(getAllThemes());
		expect(CLASSICY_FALLBACK_APPEARANCE_PACKAGE.hooks).toBeUndefined();
	});

	it("is frozen", () =>
		expect(Object.isFrozen(CLASSICY_FALLBACK_APPEARANCE_PACKAGE)).toBe(true));
});

describe("module load order", () => {
	// Each entry point evaluated first in a fresh module graph: no constant is
	// read in its temporal dead zone, whichever module a bundle reaches first.
	it.each([
		[
			"the package module",
			() => import("@/Appearance/ClassicyAppearancePackage"),
		],
		[
			"the layout module",
			() => import("@/Appearance/useClassicyAppearanceLayout"),
		],
		[
			"the schema module",
			() => import("@/Appearance/ClassicyAppearancePackageSchema"),
		],
		[
			"the app manager",
			() =>
				import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager"),
		],
		[
			"the package registry",
			() => import("@/Appearance/ClassicyAppearancePackageRegistry"),
		],
		["the asset registry", () => import("@/Appearance/ClassicyAssetRegistry")],
		[
			"the store module",
			() =>
				import(
					"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
				),
		],
		[
			"the desktop reducer",
			() =>
				import("@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager"),
		],
		[
			"the fallback package module",
			() => import("@/Appearance/ClassicyAppearanceFallback"),
		],
		["the appearance hook", () => import("@/Appearance/useClassicyAppearance")],
		[
			"the appearance sound bridge",
			() => import("@/Appearance/ClassicyAppearanceSound"),
		],
		["the library barrel", () => import("@/index")],
		["the Platinum package module", () => import("@/Appearance/Platinum")],
	])(
		"evaluates when %s loads first",
		async (_name, load) => {
			vi.resetModules();
			await load();
			// The store was created from its finished default state (a store
			// module evaluated before the app manager would see it unset), and
			// the asset registry follows the active package through it: a
			// switch on the fresh store moves the registry's active id, which
			// only happens when the store connected its package source.
			const store = await import(
				"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
			);
			// The fresh store persists on its own (module-scope persistence);
			// stop it so its debounced write never seeds a later case's store.
			store.stopAppManagerPersistence();
			const state = store.useAppManager.getState();
			expect(state.System.Manager.Appearance.packageId).toBe("platinum");
			const assets = await import("@/Appearance/ClassicyAssetRegistry");
			expect(assets.getActiveClassicyAppearancePackageId()).toBe("platinum");
			const packages = await import(
				"@/Appearance/ClassicyAppearancePackageRegistry"
			);
			packages.registerClassicyAppearancePackage(makePackage("load-order"));
			store.useAppManager.setState(
				produce(state, (draft) => {
					draft.System.Manager.Appearance.packageId = "load-order";
				}),
			);
			expect(assets.getActiveClassicyAppearancePackageId()).toBe("load-order");
			const fresh = await import("@/Appearance/ClassicyAppearancePackage");
			expect(fresh.CLASSICY_FALLBACK_APPEARANCE_PACKAGE.defaults.id).toBe(
				"default",
			);
			expect(fresh.CLASSICY_FALLBACK_APPEARANCE_PACKAGE.presets).toHaveLength(
				21,
			);
			expect(fresh.CLASSICY_FALLBACK_APPEARANCE_PACKAGE.layout).toEqual(
				PLATINUM_LAYOUT,
			);
			// A cold graph transforms the whole library (the barrel case).
		},
		60_000,
	);

	// getClassicyAppearanceLayout is for reducers, and the app manager imports
	// its reducers (the desktop icon reducer among them) while it builds
	// DefaultAppManagerState. The mock below makes that reducer import the
	// getter first, so the app manager, evaluated first in a fresh graph,
	// reaches the getter's module mid-evaluation. Were that module to reach the
	// store, the store would be created against an app manager that is still
	// evaluating: in a bundle, a ReferenceError on DefaultAppManagerState; in
	// vitest's module runner, an import that waits on the app manager forever,
	// which the race turns into a failure.
	it("evaluates when the app manager loads first and a reducer it imports reads the layout getter", async () => {
		const reducer =
			"@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";
		vi.resetModules();
		vi.doMock(reducer, async (importOriginal) => {
			let timer: ReturnType<typeof setTimeout> | undefined;
			const layout = await Promise.race([
				import("@/Appearance/useClassicyAppearanceLayout"),
				new Promise<never>((_, reject) => {
					timer = setTimeout(
						() =>
							reject(
								new Error(
									"the layout getter's module waited on the app manager mid-evaluation",
								),
							),
						20_000,
					);
				}),
			]).finally(() => clearTimeout(timer));
			// As a reducer would, while the app manager evaluates.
			expect(layout.getClassicyAppearanceLayout("platinum")).toEqual(
				PLATINUM_LAYOUT,
			);
			return importOriginal();
		});
		try {
			await import(
				"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager"
			);
			const store = await import(
				"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
			);
			store.stopAppManagerPersistence();
			expect(
				store.useAppManager.getState().System.Manager.Appearance.packageId,
			).toBe("platinum");
			// The getter follows the fresh store's packageId (R18).
			const layout = await import("@/Appearance/useClassicyAppearanceLayout");
			const packages = await import(
				"@/Appearance/ClassicyAppearancePackageRegistry"
			);
			const mirror = makePackage("load-order", {
				layout: { ...PLATINUM_LAYOUT, menuBar: { placement: "window" } },
			});
			packages.registerClassicyAppearancePackage(mirror);
			store.useAppManager.setState(
				produce(store.useAppManager.getState(), (draft) => {
					draft.System.Manager.Appearance.packageId = "load-order";
				}),
			);
			expect(layout.getClassicyAppearanceLayout()).toBe(mirror.layout);
		} finally {
			vi.doUnmock(reducer);
		}
	}, 60_000);
});

describe("CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID", () => {
	it("is platinum, re-exported from the dependency-free defaults module", () => {
		expect(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID).toBe("platinum");
		expect(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID).toBe(LEAF_DEFAULT_ID);
	});
});
