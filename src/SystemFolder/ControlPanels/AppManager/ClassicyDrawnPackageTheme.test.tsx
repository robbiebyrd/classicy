// A first session whose only Appearance Package is not the default one
// (story 0144-6sc). The store seeds `packageId: "platinum"` and the core's
// stand-in theme (`CLASSICY_CORE_DEFAULT_THEME`, a theme of "platinum"); the
// desktop draws the first registered package, so the store activates that
// package's defaults in place of the stand-in, completed as a package switch
// completes them, and leaves `packageId` alone. A custom, host-loaded or
// user-chosen theme is never replaced. Each test boots a fresh module graph,
// with the package registered after the store (as a host's entry imports it
// after the core) or before it.
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

const STORE = "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
const KEY = "classicyDesktopState";

const strip = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const FOO = "foo";
const FOO_SOUND = "foo-sound";

/**
 * A theme of `foo`, built on the core theme, with a family of its own and,
 * as a JS-authored package may, without the core `layout` family, which a
 * switch to the package completes.
 */
const fooTheme = (
	id: string,
	name: string,
	bevelWidth: number,
): ClassicyTheme => {
	const { layout: _layout, ...measurements } = strip(
		CLASSICY_CORE_DEFAULT_THEME.measurements,
	);
	return {
		...strip(CLASSICY_CORE_DEFAULT_THEME),
		id,
		name,
		package: FOO,
		sound: { pack: FOO_SOUND, disabled: [] },
		measurements: {
			...measurements,
			fooFrame: { bevelWidth, shadowWidth: 2 },
		},
	} as unknown as ClassicyTheme;
};

const fooPackage = (bevelWidth = 3): ClassicyAppearancePackage => {
	const defaults = fooTheme("foo-default", "Foo", bevelWidth);
	return {
		id: FOO,
		name: "Foo",
		css: "",
		defaults,
		presets: [defaults, fooTheme("foo-dark", "Foo Dark", 1)],
		knobs: {
			fooFrame: {
				bevelWidth: { label: "Bevel width", min: 0, max: 6, default: 3 },
				shadowWidth: { label: "Shadow width", min: 0, max: 6, default: 2 },
			},
		},
		layout: {
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		},
	};
};

/**
 * A fresh module graph whose store hydrates from `saved` (none: a first
 * session). `registerFoo` registers `foo` (and its sound pack); with
 * `fooFirst` it is registered before the store is created.
 */
const boot = async ({
	saved,
	fooFirst = false,
	keepModules = false,
}: {
	saved?: unknown;
	fooFirst?: boolean;
	/** Keep the module graph (a package the caller registered first). */
	keepModules?: boolean;
} = {}) => {
	if (!keepModules) vi.resetModules();
	localStorage.clear();
	if (saved !== undefined) localStorage.setItem(KEY, JSON.stringify(saved));
	vi.spyOn(console, "warn").mockImplementation(() => {});
	const registry = await import(
		"@/Appearance/ClassicyAppearancePackageRegistry"
	);
	const soundPacks = await import(
		"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks"
	);
	const registerFoo = () => {
		soundPacks.registerClassicySoundPack({
			id: FOO_SOUND,
			name: "Foo Sounds",
			src: ["foo.mp3"],
			sprite: {},
		});
		registry.registerClassicyAppearancePackage(fooPackage());
	};
	if (fooFirst) registerFoo();
	const store = await import(STORE);
	store.stopAppManagerPersistence();
	const state = (): ClassicyStore => store.useAppManager.getState();
	const appearance = await import(
		"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance"
	);
	const builtIns = await import(
		"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyBuiltInThemes.internal"
	);
	return {
		store,
		registry,
		appearance,
		registerFoo,
		state,
		active: (): ClassicyTheme => state().System.Manager.Appearance.activeTheme,
		/** foo's defaults as a switch to foo activates them. */
		fooDefaults: (): ClassicyTheme => {
			const foo = registry.getClassicyAppearancePackage(FOO);
			if (!foo) throw new Error("foo is not registered");
			return builtIns.activatableClassicyPackageTheme(foo, foo.defaults);
		},
		/** The JSON object the persistence subscriber would write. */
		saved: (): ClassicyStore =>
			strip(store.sanitizeStateForPersistence(state())),
	};
};

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
	vi.resetModules();
});

describe("a first session whose only package is not the default one", () => {
	it.each([
		["registered after the store", false],
		["registered before the store", true],
	])("activates foo's defaults when foo is %s", async (_name, fooFirst) => {
		const b = await boot({ fooFirst });
		if (!fooFirst) {
			// Before any package registers, the core stand-in is active.
			expect(strip(b.active())).toEqual(strip(CLASSICY_CORE_DEFAULT_THEME));
			b.registerFoo();
		}
		expect(strip(b.active())).toEqual(strip(b.fooDefaults()));
		expect(b.active().package).toBe(FOO);
		// Completed as a switch completes it, and a copy, never the
		// registered object.
		expect(b.active().measurements.layout).toEqual(
			CLASSICY_CORE_DEFAULT_THEME.measurements.layout,
		);
		expect(b.active()).not.toBe(
			b.registry.getClassicyAppearancePackage(FOO)?.defaults,
		);
		// packageId is not written: the desktop draws foo by resolution.
		expect(b.state().System.Manager.Appearance.packageId).toBe("platinum");
		// Every knob foo's themes declare is emitted.
		const vars: Record<string, unknown> = b.appearance.getThemeVars(b.active());
		expect(vars["--foo-frame-bevel-width"]).toBe("3px");
		expect(vars["--foo-frame-shadow-width"]).toBe("2px");
	});

	it("draws foo's knobs on a desktop mounted on a fresh store", async () => {
		const b = await boot();
		b.registerFoo();
		const { ClassicyAppManagerProvider } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const { ClassicyDesktop } = await import(
			"@/SystemFolder/SystemResources/Desktop/ClassicyDesktop"
		);
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		const root = document.getElementById("classicyDesktop");
		expect(root?.getAttribute("data-classicy-appearance")).toBe(FOO);
		expect(root?.style.getPropertyValue("--foo-frame-bevel-width")).toBe("3px");
		expect(b.state().System.Manager.Appearance.packageId).toBe("platinum");
	}, 60_000);

	it("forks a knob edit into foo's Custom slot", async () => {
		const b = await boot();
		b.registerFoo();
		act(() =>
			b.store.dispatch({
				type: "ClassicyDesktopChangeMetric",
				family: "fooFrame",
				key: "bevelWidth",
				value: 5,
			}),
		);
		const appearance = b.state().System.Manager.Appearance;
		expect(appearance.activeTheme.id).toBe("custom-foo");
		expect(appearance.activeTheme.package).toBe(FOO);
		expect(appearance.customThemes?.map((t) => t.id)).toEqual(["custom-foo"]);
		const vars: Record<string, unknown> = b.appearance.getThemeVars(
			appearance.activeTheme,
		);
		expect(vars["--foo-frame-bevel-width"]).toBe("5px");
	});

	it("is saved as a reference to foo's defaults, packageId unchanged", async () => {
		const b = await boot();
		b.registerFoo();
		const saved = b.saved().System.Manager.Appearance;
		expect(saved.activeTheme).toEqual({ id: "foo-default", package: FOO });
		expect(saved.packageId).toBe("platinum");
	});

	it.each([
		["registered after the store", false],
		["registered before the store", true],
	])("reloads to foo's defaults when foo is %s", async (_name, fooFirst) => {
		const first = await boot();
		first.registerFoo();
		const saved = first.saved();
		const b = await boot({ saved, fooFirst });
		if (!fooFirst) {
			// Pending until foo registers, and saved as the reference meanwhile.
			expect(b.saved().System.Manager.Appearance.activeTheme).toEqual({
				id: "foo-default",
				package: FOO,
			});
			b.registerFoo();
		}
		expect(strip(b.active())).toEqual(strip(b.fooDefaults()));
		expect(b.state().System.Manager.Appearance.packageId).toBe("platinum");
	});

	it("replaces a stand-in saved before any package registered", async () => {
		const first = await boot();
		// Saved whole: its package ("platinum") was not registered.
		const saved = first.saved();
		expect(saved.System.Manager.Appearance.activeTheme.id).toBe("default");
		const b = await boot({ saved });
		b.registerFoo();
		expect(strip(b.active())).toEqual(strip(b.fooDefaults()));
	});

	it("gives way to the default package when it registers later in the session", async () => {
		const b = await boot();
		b.registerFoo();
		await import("@/Appearance/Platinum");
		// The desktop now draws Platinum (the stored packageId), so the stand-in
		// is Platinum's defaults, as on a first session with Platinum alone.
		expect(b.active().package).toBe("platinum");
		expect(strip(b.active())).toEqual(strip(b.appearance.getTheme("default")));
	});
});

describe("a theme the store never replaces with the drawn package's defaults", () => {
	it("keeps a saved custom theme", async () => {
		const custom = {
			...strip(CLASSICY_CORE_DEFAULT_THEME),
			id: "custom",
			name: "Custom",
		} as ClassicyTheme;
		const first = await boot();
		const saved = first.saved();
		saved.System.Manager.Appearance.activeTheme = custom;
		saved.System.Manager.Appearance.customThemes = [custom];
		const b = await boot({ saved });
		b.registerFoo();
		expect(b.active().id).toBe("custom");
		expect(b.active().package).toBe("platinum");
	});

	it("keeps a saved theme that is not its package's defaults", async () => {
		const host = {
			...strip(CLASSICY_CORE_DEFAULT_THEME),
			id: "host-blue",
			name: "Host Blue",
		} as ClassicyTheme;
		const first = await boot();
		const saved = first.saved();
		saved.System.Manager.Appearance.activeTheme = host;
		const b = await boot({ saved });
		b.registerFoo();
		expect(b.active().id).toBe("host-blue");
	});

	it("keeps a host-loaded theme under the defaults' id", async () => {
		const b = await boot();
		const host = {
			...strip(CLASSICY_CORE_DEFAULT_THEME),
			name: "Host Default",
			color: { ...strip(CLASSICY_CORE_DEFAULT_THEME.color), outline: 0x123456 },
		} as ClassicyTheme;
		// As a host's ClassicyDesktopLoadThemes leaves it, the theme active.
		act(() =>
			b.store.useAppManager.setState((state: ClassicyStore) => ({
				...state,
				System: {
					...state.System,
					Manager: {
						...state.System.Manager,
						Appearance: {
							...state.System.Manager.Appearance,
							availableThemes: [host],
							activeTheme: strip(host),
						},
					},
				},
			})),
		);
		b.registerFoo();
		expect(b.active().name).toBe("Host Default");
		expect(b.active().package).toBe("platinum");
	});

	it("keeps a preset the user chose, when another package is drawn later", async () => {
		const b = await boot();
		b.registerFoo();
		act(() =>
			b.store.dispatch({
				type: "ClassicyDesktopChangeTheme",
				activeTheme: "foo-dark",
			}),
		);
		expect(b.active().id).toBe("foo-dark");
		await import("@/Appearance/Platinum");
		expect(b.active().id).toBe("foo-dark");
	});

	it("keeps another package's defaults, chosen in the session, until the next load", async () => {
		// The accepted cost: an explicit choice of another package's defaults
		// theme lasts the session; the next load activates the drawn package's.
		const b = await boot();
		await import("@/Appearance/Platinum");
		b.registerFoo();
		// As a mounted desktop loads them, so ChangeTheme finds foo's themes.
		act(() =>
			b.store.dispatch({
				type: "ClassicyDesktopLoadThemes",
				availableThemes: b.appearance.getAllThemes(),
			}),
		);
		act(() =>
			b.store.dispatch({
				type: "ClassicyDesktopChangeTheme",
				activeTheme: "foo-default",
			}),
		);
		expect(b.active().id).toBe("foo-default");
		const saved = b.saved();
		const c = await boot({ saved });
		await import("@/Appearance/Platinum");
		c.registerFoo();
		expect(c.active().id).toBe("default");
		expect(c.active().package).toBe("platinum");
	});
});

describe("stand-ins the store heals (review of 0144-6sc)", () => {
	/** A host `defaultState` seed, merged as ClassicyAppManagerProvider merges it. */
	const seedDefaultState = async (b: Awaited<ReturnType<typeof boot>>) => {
		const manager = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager"
		);
		act(() =>
			b.store.useAppManager.setState((state: ClassicyStore) =>
				manager.mergeClassicyState(
					b.store.withoutDefaultActiveThemeMeasurements(state),
					{ System: { Manager: { Desktop: { disableBalloonHelp: true } } } },
				),
			),
		);
	};

	it("activates foo's defaults after a provider seed, when foo registers after mount", async () => {
		const b = await boot();
		await seedDefaultState(b);
		b.registerFoo();
		expect(strip(b.active())).toEqual(strip(b.fooDefaults()));
	});

	it("gives way to Platinum after a provider seed over foo's defaults", async () => {
		const b = await boot();
		b.registerFoo();
		await seedDefaultState(b);
		await import("@/Appearance/Platinum");
		expect(strip(b.active())).toEqual(strip(b.appearance.getTheme("default")));
	});

	it("gives way to Platinum after foo re-registers", async () => {
		const b = await boot();
		b.registerFoo();
		b.registry.registerClassicyAppearancePackage(fooPackage(4));
		expect(b.active().id).toBe("foo-default");
		expect(b.active().measurements.fooFrame).toEqual({
			bevelWidth: 4,
			shadowWidth: 2,
		});
		await import("@/Appearance/Platinum");
		expect(strip(b.active())).toEqual(strip(b.appearance.getTheme("default")));
	});

	it("writes nothing when the drawn package re-registers unchanged", async () => {
		const b = await boot();
		b.registerFoo();
		const writes: unknown[] = [];
		const unsubscribe = b.store.useAppManager.subscribe((state: unknown) =>
			writes.push(state),
		);
		const foo = b.registry.getClassicyAppearancePackage(FOO);
		if (foo) b.registry.registerClassicyAppearancePackage(foo);
		b.registry.registerClassicyAppearancePackage(fooPackage());
		unsubscribe();
		expect(writes).toEqual([]);
	});

	it("heals a saved Platinum defaults reference when only foo is registered", async () => {
		// Every Platinum session saved this reference; the user never chose it.
		const first = await boot();
		const saved = first.saved();
		saved.System.Manager.Appearance.activeTheme = {
			id: "default",
			package: "platinum",
		} as ClassicyTheme;
		const b = await boot({ saved });
		b.registerFoo();
		expect(strip(b.active())).toEqual(strip(b.fooDefaults()));
		expect(b.saved().System.Manager.Appearance.activeTheme).toEqual({
			id: "foo-default",
			package: FOO,
		});
		// And Platinum, registering later, is drawn with its own defaults.
		await import("@/Appearance/Platinum");
		expect(strip(b.active())).toEqual(strip(b.appearance.getTheme("default")));
	});

	it("heals an in-place edit saved under the stand-in's id", async () => {
		// Built-ins are never edited in place since custom themes (v0.83):
		// such data gives way, as the preset refresh replaces it.
		const first = await boot();
		const saved = first.saved();
		saved.System.Manager.Appearance.activeTheme.color.outline = 0x123456;
		const b = await boot({ saved });
		b.registerFoo();
		expect(strip(b.active())).toEqual(strip(b.fooDefaults()));
	});

	it.each([
		["store, Platinum, then foo", false],
		["Platinum before the store, then foo", true],
	])("J5: a foo-only save reloads with Platinum drawn on Platinum's defaults (%s)", async (_name, platinumFirst) => {
		const first = await boot();
		first.registerFoo();
		const saved = first.saved();
		expect(saved.System.Manager.Appearance.activeTheme).toEqual({
			id: "foo-default",
			package: FOO,
		});
		vi.resetModules();
		if (platinumFirst) await import("@/Appearance/Platinum");
		const b = await boot({ saved, keepModules: platinumFirst });
		if (!platinumFirst) await import("@/Appearance/Platinum");
		b.registerFoo();
		expect(b.active().package).toBe("platinum");
		expect(strip(b.active())).toEqual(strip(b.appearance.getTheme("default")));
		const vars: Record<string, unknown> = b.appearance.getThemeVars(b.active());
		expect(vars["--menu-frame-shadow-width"]).toBe("1px");
	});

	it("J5 reversed: a Platinum save reloads with foo alone drawn on foo's defaults", async () => {
		const first = await boot();
		await import("@/Appearance/Platinum");
		const saved = first.saved();
		expect(saved.System.Manager.Appearance.activeTheme).toEqual({
			id: "default",
			package: "platinum",
		});
		const b = await boot({ saved, fooFirst: true });
		expect(strip(b.active())).toEqual(strip(b.fooDefaults()));
		expect(b.state().System.Manager.Appearance.packageId).toBe("platinum");
	});

	it("follows a stored packageId change to the package it names", async () => {
		const b = await boot();
		await import("@/Appearance/Platinum");
		b.registerFoo();
		expect(b.active().package).toBe("platinum");
		act(() =>
			b.store.useAppManager.setState((state: ClassicyStore) => ({
				...state,
				System: {
					...state.System,
					Manager: {
						...state.System.Manager,
						Appearance: { ...state.System.Manager.Appearance, packageId: FOO },
					},
				},
			})),
		);
		expect(strip(b.active())).toEqual(strip(b.fooDefaults()));
		expect(b.state().System.Manager.Appearance.packageId).toBe(FOO);
	});

	it("follows a seeded packageId once its package registers", async () => {
		const first = await boot();
		const saved = first.saved();
		saved.System.Manager.Appearance.packageId = FOO;
		const b = await boot({ saved });
		await import("@/Appearance/Platinum");
		expect(b.active().package).toBe("platinum");
		b.registerFoo();
		expect(strip(b.active())).toEqual(strip(b.fooDefaults()));
	});

	it("keeps a preset when the stored packageId changes", async () => {
		const b = await boot();
		await import("@/Appearance/Platinum");
		b.registerFoo();
		act(() =>
			b.store.dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: FOO,
			}),
		);
		act(() =>
			b.store.dispatch({
				type: "ClassicyDesktopChangeTheme",
				activeTheme: "foo-dark",
			}),
		);
		act(() =>
			b.store.useAppManager.setState((state: ClassicyStore) => ({
				...state,
				System: {
					...state.System,
					Manager: {
						...state.System.Manager,
						Appearance: {
							...state.System.Manager.Appearance,
							packageId: "platinum",
						},
					},
				},
			})),
		);
		expect(b.active()?.id).toBe("foo-dark");
	});

	it("gives way after a saved preset that is gone falls back to its package's defaults", async () => {
		const first = await boot();
		const saved = first.saved();
		saved.System.Manager.Appearance.activeTheme = {
			id: "foo-gone",
			package: FOO,
		} as ClassicyTheme;
		const b = await boot({ saved });
		await import("@/Appearance/Platinum");
		b.registerFoo();
		expect(strip(b.active())).toEqual(strip(b.appearance.getTheme("default")));
	});

	it("keeps a custom theme whose id is its package's defaults id", async () => {
		const b = await boot();
		b.registerFoo();
		const bar = {
			...fooPackage(),
			id: "bar",
			name: "Bar",
			defaults: { ...fooTheme("custom-bar", "Custom", 3), package: "bar" },
			presets: [],
		};
		b.registry.registerClassicyAppearancePackage(bar);
		const custom = { ...strip(bar.defaults), name: "Custom" };
		act(() =>
			b.store.useAppManager.setState((state: ClassicyStore) => ({
				...state,
				System: {
					...state.System,
					Manager: {
						...state.System.Manager,
						Appearance: {
							...state.System.Manager.Appearance,
							activeTheme: custom,
							customThemes: [custom],
						},
					},
				},
			})),
		);
		b.registry.registerClassicyAppearancePackage({ ...bar });
		expect(b.active().id).toBe("custom-bar");
		expect(b.active().package).toBe("bar");
	});
});

describe("a host defaultState seed that names a packageId", () => {
	const SEED_TWEAKS = { desktop: { iconSize: 64, backgroundColor: 0x112233 } };

	/** Mounts ClassicyAppManagerProvider with `defaultState`, on a first session. */
	const mountSeeded = async (
		b: Awaited<ReturnType<typeof boot>>,
		appearance: Record<string, unknown>,
	) => {
		const { ClassicyAppManagerProvider } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const defaultState = { System: { Manager: { Appearance: appearance } } };
		render(
			<ClassicyAppManagerProvider defaultState={defaultState}>
				<p>host</p>
			</ClassicyAppManagerProvider>,
		);
		return b.state().System.Manager.Appearance;
	};

	it("lands the seed's theme tweaks on the named package's defaults", async () => {
		const b = await boot();
		await import("@/Appearance/Platinum");
		b.registerFoo();
		const appearance = await mountSeeded(b, {
			packageId: FOO,
			activeTheme: SEED_TWEAKS,
		});
		expect(appearance.packageId).toBe(FOO);
		expect(appearance.activeTheme.id).toBe("foo-default");
		expect(appearance.activeTheme.package).toBe(FOO);
		expect(appearance.activeTheme.desktop.iconSize).toBe(64);
		expect(appearance.activeTheme.desktop.backgroundColor).toBe(0x112233);
		// foo's own knob values still come through.
		const vars: Record<string, unknown> = b.appearance.getThemeVars(
			appearance.activeTheme,
		);
		expect(vars["--foo-frame-bevel-width"]).toBe("3px");
	});

	it("keeps today's behavior for tweaks with no packageId", async () => {
		const b = await boot();
		await import("@/Appearance/Platinum");
		b.registerFoo();
		const appearance = await mountSeeded(b, { activeTheme: SEED_TWEAKS });
		expect(appearance.packageId).toBe("platinum");
		expect(appearance.activeTheme.id).toBe("default");
		expect(appearance.activeTheme.package).toBe("platinum");
		expect(appearance.activeTheme.desktop.iconSize).toBe(64);
		expect(appearance.activeTheme.desktop.backgroundColor).toBe(0x112233);
	});

	it("keeps the live package's theme for tweaks with no packageId", async () => {
		const b = await boot();
		await import("@/Appearance/Platinum");
		b.registerFoo();
		act(() =>
			b.store.dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: FOO,
			}),
		);
		const appearance = await mountSeeded(b, { activeTheme: SEED_TWEAKS });
		expect(appearance.packageId).toBe(FOO);
		expect(appearance.activeTheme.id).toBe("foo-default");
		expect(appearance.activeTheme.desktop.iconSize).toBe(64);
	});

	it("keeps the tweaks when the named package is not registered", async () => {
		const b = await boot();
		await import("@/Appearance/Platinum");
		const appearance = await mountSeeded(b, {
			packageId: "nope",
			activeTheme: SEED_TWEAKS,
		});
		expect(appearance.packageId).toBe("nope");
		expect(appearance.activeTheme.id).toBe("default");
		expect(appearance.activeTheme.desktop.iconSize).toBe(64);
		expect(appearance.activeTheme.desktop.backgroundColor).toBe(0x112233);
	});
});
