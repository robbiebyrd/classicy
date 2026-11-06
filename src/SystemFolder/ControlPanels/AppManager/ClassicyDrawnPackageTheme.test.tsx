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
		expect(saved.activeTheme).toEqual({
			id: "foo-default",
			package: FOO,
			defaults: true,
		});
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
				defaults: true,
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
		await import("@classicy/appearance-platinum");
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
		await import("@classicy/appearance-platinum");
		expect(b.active().id).toBe("foo-dark");
	});

	it("keeps another package's defaults, chosen in the session, until the next load", async () => {
		// The accepted cost: an explicit choice of another package's defaults
		// theme lasts the session; the next load activates the drawn package's.
		const b = await boot();
		await import("@classicy/appearance-platinum");
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
		await import("@classicy/appearance-platinum");
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
		await import("@classicy/appearance-platinum");
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
		await import("@classicy/appearance-platinum");
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
			defaults: true,
		});
		// And Platinum, registering later, is drawn with its own defaults.
		await import("@classicy/appearance-platinum");
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
			defaults: true,
		});
		vi.resetModules();
		if (platinumFirst) await import("@classicy/appearance-platinum");
		const b = await boot({ saved, keepModules: platinumFirst });
		if (!platinumFirst) await import("@classicy/appearance-platinum");
		b.registerFoo();
		expect(b.active().package).toBe("platinum");
		expect(strip(b.active())).toEqual(strip(b.appearance.getTheme("default")));
		const vars: Record<string, unknown> = b.appearance.getThemeVars(b.active());
		expect(vars["--menu-frame-shadow-width"]).toBe("1px");
	});

	it("J5 reversed: a Platinum save reloads with foo alone drawn on foo's defaults", async () => {
		const first = await boot();
		await import("@classicy/appearance-platinum");
		const saved = first.saved();
		expect(saved.System.Manager.Appearance.activeTheme).toEqual({
			id: "default",
			package: "platinum",
			defaults: true,
		});
		const b = await boot({ saved, fooFirst: true });
		expect(strip(b.active())).toEqual(strip(b.fooDefaults()));
		expect(b.state().System.Manager.Appearance.packageId).toBe("platinum");
	});

	it("follows a stored packageId change to the package it names", async () => {
		const b = await boot();
		await import("@classicy/appearance-platinum");
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
		await import("@classicy/appearance-platinum");
		expect(b.active().package).toBe("platinum");
		b.registerFoo();
		expect(strip(b.active())).toEqual(strip(b.fooDefaults()));
	});

	it("keeps a preset when the stored packageId changes", async () => {
		const b = await boot();
		await import("@classicy/appearance-platinum");
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
		await import("@classicy/appearance-platinum");
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

/** Mounts ClassicyAppManagerProvider with `defaultState` (its Appearance). */
const mountSeeded = async (
	b: Awaited<ReturnType<typeof boot>>,
	appearance: Record<string, unknown>,
	rest: Record<string, unknown> = {},
) => {
	const { ClassicyAppManagerProvider } = await import(
		"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
	);
	const defaultState = {
		System: { Manager: { ...rest, Appearance: appearance } },
	};
	render(
		<ClassicyAppManagerProvider defaultState={defaultState}>
			<p>host</p>
		</ClassicyAppManagerProvider>,
	);
	return b.state().System.Manager.Appearance;
};

const SEED_TWEAKS = { desktop: { iconSize: 64, backgroundColor: 0x112233 } };

describe("a host defaultState seed that names a packageId", () => {
	it("forks the seed's theme tweaks on the named package's defaults", async () => {
		const b = await boot();
		await import("@classicy/appearance-platinum");
		b.registerFoo();
		const appearance = await mountSeeded(b, {
			packageId: FOO,
			activeTheme: SEED_TWEAKS,
		});
		expect(appearance.packageId).toBe(FOO);
		expect(appearance.activeTheme.id).toBe("custom-foo");
		expect(appearance.activeTheme.package).toBe(FOO);
		expect(appearance.activeTheme.desktop.iconSize).toBe(64);
		expect(appearance.activeTheme.desktop.backgroundColor).toBe(0x112233);
		// foo's own data and knob values still come through.
		expect(appearance.activeTheme.sound.pack).toBe(FOO_SOUND);
		const vars: Record<string, unknown> = b.appearance.getThemeVars(
			appearance.activeTheme,
		);
		expect(vars["--foo-frame-bevel-width"]).toBe("3px");
		expect(appearance.customThemes?.map((t) => [t.id, t.package])).toEqual([
			["custom-foo", FOO],
		]);
	});

	it("forks tweaks with no packageId on the default package's theme", async () => {
		const b = await boot();
		await import("@classicy/appearance-platinum");
		b.registerFoo();
		const appearance = await mountSeeded(b, { activeTheme: SEED_TWEAKS });
		expect(appearance.packageId).toBe("platinum");
		expect(appearance.activeTheme.id).toBe("custom");
		expect(appearance.activeTheme.name).toBe("Custom");
		expect(appearance.activeTheme.package).toBe("platinum");
		expect(appearance.activeTheme.desktop.iconSize).toBe(64);
		expect(appearance.activeTheme.desktop.backgroundColor).toBe(0x112233);
	});

	it("forks tweaks with no packageId on the live package's theme", async () => {
		const b = await boot();
		await import("@classicy/appearance-platinum");
		b.registerFoo();
		act(() =>
			b.store.dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: FOO,
			}),
		);
		const appearance = await mountSeeded(b, { activeTheme: SEED_TWEAKS });
		expect(appearance.packageId).toBe(FOO);
		expect(appearance.activeTheme.id).toBe("custom-foo");
		expect(appearance.activeTheme.desktop.iconSize).toBe(64);
	});

	it("keeps the tweaks when the named package is not registered", async () => {
		const b = await boot();
		await import("@classicy/appearance-platinum");
		const appearance = await mountSeeded(b, {
			packageId: "nope",
			activeTheme: SEED_TWEAKS,
		});
		expect(appearance.packageId).toBe("nope");
		expect(appearance.activeTheme.id).toBe("custom");
		expect(appearance.activeTheme.package).toBe("platinum");
		expect(appearance.activeTheme.desktop.iconSize).toBe(64);
		expect(appearance.activeTheme.desktop.backgroundColor).toBe(0x112233);
	});
});

describe("a host defaultState's theme tweaks persist (0148-wf3)", () => {
	/** Reloads `saved` in a fresh module graph, as a host boots: the store,
	 * then Platinum and foo, then the provider with the same seed. */
	const reload = async (
		saved: unknown,
		appearance: Record<string, unknown>,
	) => {
		const b = await boot({ saved });
		await import("@classicy/appearance-platinum");
		b.registerFoo();
		await mountSeeded(b, appearance);
		return b;
	};

	it("J15: survives a reload, tweaks on the default package", async () => {
		const seed = { activeTheme: SEED_TWEAKS };
		const first = await boot();
		await import("@classicy/appearance-platinum");
		await mountSeeded(first, seed);
		const saved = first.saved();
		// Saved whole, as a custom theme, never as the built-in's reference.
		expect(saved.System.Manager.Appearance.activeTheme.id).toBe("custom");
		expect(saved.System.Manager.Appearance.activeTheme.desktop.iconSize).toBe(
			64,
		);
		const b = await reload(saved, seed);
		expect(b.active().id).toBe("custom");
		expect(b.active().package).toBe("platinum");
		expect(b.active().desktop.iconSize).toBe(64);
		expect(b.active().desktop.backgroundColor).toBe(0x112233);
	});

	it("J15: survives a reload, tweaks on a named package's defaults", async () => {
		const seed = { packageId: FOO, activeTheme: SEED_TWEAKS };
		const first = await boot();
		await import("@classicy/appearance-platinum");
		first.registerFoo();
		await mountSeeded(first, seed);
		const b = await reload(first.saved(), seed);
		expect(b.active().id).toBe("custom-foo");
		expect(b.active().package).toBe(FOO);
		expect(b.active().desktop.iconSize).toBe(64);
		const vars: Record<string, unknown> = b.appearance.getThemeVars(b.active());
		expect(vars["--foo-frame-bevel-width"]).toBe("3px");
	});

	it("J14: moves onto a named package that registers after mount", async () => {
		const b = await boot();
		await import("@classicy/appearance-platinum");
		await mountSeeded(b, { packageId: FOO, activeTheme: SEED_TWEAKS });
		b.registerFoo();
		const appearance = b.state().System.Manager.Appearance;
		expect(appearance.activeTheme.id).toBe("custom-foo");
		expect(appearance.activeTheme.package).toBe(FOO);
		expect(appearance.activeTheme.sound.pack).toBe(FOO_SOUND);
		expect(appearance.activeTheme.desktop.iconSize).toBe(64);
		expect(appearance.activeTheme.desktop.backgroundColor).toBe(0x112233);
		const vars: Record<string, unknown> = b.appearance.getThemeVars(
			appearance.activeTheme,
		);
		expect(vars["--foo-frame-bevel-width"]).toBe("3px");
		// The seed's fork on the default package was never the user's.
		expect(appearance.customThemes?.map((t) => t.id)).toEqual(["custom-foo"]);
		// And it persists whole, across a reload.
		const c = await reload(b.saved(), {
			packageId: FOO,
			activeTheme: SEED_TWEAKS,
		});
		expect(c.active().id).toBe("custom-foo");
		expect(c.active().desktop.iconSize).toBe(64);
	});

	it("J14: moves onto the only package, registered after mount", async () => {
		const b = await boot();
		await mountSeeded(b, { activeTheme: SEED_TWEAKS });
		b.registerFoo();
		expect(b.active().id).toBe("custom-foo");
		expect(b.active().package).toBe(FOO);
		expect(b.active().desktop.iconSize).toBe(64);
		expect(
			b.state().System.Manager.Appearance.customThemes?.map((t) => t.id),
		).toEqual(["custom-foo"]);
	});

	it("moves back onto Platinum when it registers after foo", async () => {
		const b = await boot();
		b.registerFoo();
		await mountSeeded(b, { activeTheme: SEED_TWEAKS });
		expect(b.active().id).toBe("custom-foo");
		await import("@classicy/appearance-platinum");
		expect(b.active().id).toBe("custom");
		expect(b.active().package).toBe("platinum");
		expect(b.active().desktop.iconSize).toBe(64);
		expect(strip(b.active().color)).toEqual(
			strip(b.appearance.getTheme("default").color),
		);
	});

	it("follows a stored packageId change, both ways", async () => {
		const b = await boot();
		await import("@classicy/appearance-platinum");
		b.registerFoo();
		await mountSeeded(b, { activeTheme: SEED_TWEAKS });
		expect(b.active().id).toBe("custom");
		const setPackageId = (packageId: string) =>
			act(() =>
				b.store.useAppManager.setState((state: ClassicyStore) => ({
					...state,
					System: {
						...state.System,
						Manager: {
							...state.System.Manager,
							Appearance: { ...state.System.Manager.Appearance, packageId },
						},
					},
				})),
			);
		setPackageId(FOO);
		expect(b.active().id).toBe("custom-foo");
		expect(
			b.state().System.Manager.Appearance.customThemes?.map((t) => t.id),
		).toEqual(["custom-foo"]);
		expect(b.active().sound.pack).toBe(FOO_SOUND);
		expect(b.active().desktop.iconSize).toBe(64);
		setPackageId("platinum");
		expect(b.active().id).toBe("custom");
		expect(b.active().desktop.iconSize).toBe(64);
		expect(
			b.state().System.Manager.Appearance.customThemes?.map((t) => t.id),
		).toEqual(["custom"]);
	});

	it("still follows the drawn package after its wallpaper is healed", async () => {
		const b = await boot();
		await mountSeeded(b, {
			activeTheme: {
				...SEED_TWEAKS,
				desktop: {
					...SEED_TWEAKS.desktop,
					backgroundImage: "/x/azul_dark.png",
				},
			},
		});
		expect(b.active().id).toBe("custom");
		// Platinum's registration stores the wallpaper by its filename: a
		// new object, still the seed's fork.
		await import("@classicy/appearance-platinum");
		expect(b.active().desktop.backgroundImage).toBe("azul_dark.png");
		b.registerFoo();
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
		expect(b.active().id).toBe("custom-foo");
		expect(b.active().desktop.iconSize).toBe(64);
	});

	it("writes nothing when the fork's package re-registers unchanged", async () => {
		const b = await boot();
		b.registerFoo();
		await mountSeeded(b, { activeTheme: SEED_TWEAKS });
		expect(b.active().id).toBe("custom-foo");
		const writes: unknown[] = [];
		const unsubscribe = b.store.useAppManager.subscribe((state: unknown) =>
			writes.push(state),
		);
		b.registry.registerClassicyAppearancePackage(fooPackage());
		unsubscribe();
		expect(writes).toEqual([]);
		expect(b.active().id).toBe("custom-foo");
	});

	it("keeps a theme the user chose after the seed", async () => {
		const seed = { packageId: FOO, activeTheme: SEED_TWEAKS };
		const b = await boot();
		await import("@classicy/appearance-platinum");
		await mountSeeded(b, seed);
		act(() =>
			b.store.dispatch({
				type: "ClassicyDesktopChangeTheme",
				activeTheme: "azul",
			}),
		);
		b.registerFoo();
		expect(b.active().id).toBe("azul");
		const c = await reload(b.saved(), seed);
		expect(c.active().id).toBe("azul");
		expect(c.active().desktop.iconSize).not.toBe(64);
	});

	it("keeps the user's edit of the seed's fork", async () => {
		const b = await boot();
		await import("@classicy/appearance-platinum");
		await mountSeeded(b, { packageId: FOO, activeTheme: SEED_TWEAKS });
		act(() =>
			b.store.dispatch({
				type: "ClassicyDesktopChangeColor",
				colorKey: "outline",
				color: 0x123456,
			}),
		);
		b.registerFoo();
		expect(b.active().id).toBe("custom");
		expect(b.active().package).toBe("platinum");
		expect(b.active().color.outline).toBe(0x123456);
		expect(b.active().desktop.iconSize).toBe(64);
	});

	it("keeps a seed that names its theme's package on that package", async () => {
		const b = await boot();
		b.registerFoo();
		await mountSeeded(b, { activeTheme: { ...SEED_TWEAKS, package: FOO } });
		expect(b.active().id).toBe("custom-foo");
		// Platinum is drawn now (packageId "platinum"); the pinned fork stays.
		await import("@classicy/appearance-platinum");
		expect(b.active().id).toBe("custom-foo");
		expect(b.active().package).toBe(FOO);
		expect(b.active().sound.pack).toBe(FOO_SOUND);
		expect(b.active().desktop.iconSize).toBe(64);
	});

	it("leaves a seed without tweaks to the drawn-package rule", async () => {
		const b = await boot();
		await import("@classicy/appearance-platinum");
		b.registerFoo();
		await mountSeeded(b, { activeTheme: { id: "default" } });
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
		expect(b.state().System.Manager.Appearance.customThemes).toEqual([]);
	});

	it.each([
		["no theme in the seed", {}, { Desktop: { disableBalloonHelp: true } }],
		[
			"theme values the theme already has",
			{ activeTheme: { id: "default" } },
			{},
		],
	])("creates no custom theme for %s", async (_name, appearance, rest) => {
		const b = await boot();
		await import("@classicy/appearance-platinum");
		const before = b.saved();
		const after = await mountSeeded(b, appearance, rest);
		expect(after.activeTheme.id).toBe("default");
		expect(after.customThemes).toEqual([]);
		const saved = b.saved().System.Manager.Appearance;
		expect(saved.activeTheme).toEqual(
			before.System.Manager.Appearance.activeTheme,
		);
		expect(saved.customThemes).toEqual([]);
	});

	it("keeps a seeded theme with an id of its own whole, never forked", async () => {
		const b = await boot();
		await import("@classicy/appearance-platinum");
		const after = await mountSeeded(b, {
			activeTheme: { ...SEED_TWEAKS, id: "host-blue", name: "Host Blue" },
		});
		expect(after.activeTheme.id).toBe("host-blue");
		expect(after.customThemes).toEqual([]);
	});

	it("saves the same bytes for a host with no seed", async () => {
		const b = await boot();
		await import("@classicy/appearance-platinum");
		const before = JSON.stringify(b.saved());
		const { ClassicyAppManagerProvider } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		render(
			<ClassicyAppManagerProvider>
				<p>host</p>
			</ClassicyAppManagerProvider>,
		);
		expect(JSON.stringify(b.saved())).toBe(before);
	});
});

describe("a defaultState seed applies once per page session (review of 0148-wf3)", () => {
	/** Mounts the provider with `appearance` as its seed; returns `unmount`. */
	const mount = async (appearance: Record<string, unknown>) => {
		const { ClassicyAppManagerProvider } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const defaultState = { System: { Manager: { Appearance: appearance } } };
		return render(
			<ClassicyAppManagerProvider defaultState={defaultState}>
				<p>host</p>
			</ClassicyAppManagerProvider>,
		).unmount;
	};

	it.each([
		["the default package", {}, "custom", "azul"],
		["a named package", { packageId: FOO }, "custom-foo", "foo-dark"],
	])("keeps the user's Custom theme and choice across a remount (%s)", async (_name, extra, slot, choice) => {
		const b = await boot();
		await import("@classicy/appearance-platinum");
		b.registerFoo();
		const seed = { ...extra, activeTheme: SEED_TWEAKS };
		const unmount = await mount(seed);
		expect(b.active().id).toBe(slot);
		act(() =>
			b.store.dispatch({
				type: "ClassicyDesktopChangeColor",
				colorKey: "outline",
				color: 0x123456,
			}),
		);
		const edited = strip(
			b
				.state()
				.System.Manager.Appearance.customThemes?.find((t) => t.id === slot),
		);
		expect(edited?.color.outline).toBe(0x123456);
		act(() =>
			b.store.dispatch({
				type: "ClassicyDesktopChangeTheme",
				activeTheme: choice,
			}),
		);
		unmount();
		await mount(seed);
		expect(b.active().id).toBe(choice);
		expect(
			strip(
				b
					.state()
					.System.Manager.Appearance.customThemes?.find((t) => t.id === slot),
			),
		).toEqual(edited);
	});

	it("still follows the drawn package after a remount on the untouched fork", async () => {
		const b = await boot();
		await import("@classicy/appearance-platinum");
		const seed = { packageId: FOO, activeTheme: SEED_TWEAKS };
		const unmount = await mount(seed);
		expect(b.active().id).toBe("custom");
		unmount();
		await mount(seed);
		b.registerFoo();
		expect(b.active().id).toBe("custom-foo");
		expect(b.active().sound.pack).toBe(FOO_SOUND);
		expect(b.active().desktop.iconSize).toBe(64);
		expect(
			b.state().System.Manager.Appearance.customThemes?.map((t) => t.id),
		).toEqual(["custom-foo"]);
	});
});

describe("a saved defaults reference to a package the host dropped (0147-qyy)", () => {
	/** What a session with only foo saves: foo's defaults, as a reference. */
	const fooOnlySave = async () => {
		const first = await boot();
		first.registerFoo();
		return first.saved();
	};

	it.each([
		["registered after the store", false],
		["registered before the store", true],
	])("heals to Platinum's defaults when only Platinum is %s", async (_name, platinumFirst) => {
		const saved = await fooOnlySave();
		expect(saved.System.Manager.Appearance.activeTheme).toEqual({
			id: "foo-default",
			package: FOO,
			defaults: true,
		});
		vi.resetModules();
		if (platinumFirst) await import("@classicy/appearance-platinum");
		const b = await boot({ saved, keepModules: platinumFirst });
		if (!platinumFirst) await import("@classicy/appearance-platinum");
		// foo never registers.
		expect(strip(b.active())).toEqual(strip(b.appearance.getTheme("default")));
		expect(b.state().System.Manager.Appearance.packageId).toBe("platinum");
		const vars: Record<string, unknown> = b.appearance.getThemeVars(b.active());
		expect(vars["--menu-frame-shadow-width"]).toBe("1px");
		expect(b.saved().System.Manager.Appearance.activeTheme).toEqual({
			id: "default",
			package: "platinum",
			defaults: true,
		});
	});

	it("heals with a stored packageId naming the dropped package, unchanged", async () => {
		const saved = await fooOnlySave();
		saved.System.Manager.Appearance.packageId = FOO;
		const b = await boot({ saved });
		await import("@classicy/appearance-platinum");
		expect(strip(b.active())).toEqual(strip(b.appearance.getTheme("default")));
		expect(b.state().System.Manager.Appearance.packageId).toBe(FOO);
	});

	it("keeps a dropped package's preset reference pending", async () => {
		const saved = await fooOnlySave();
		saved.System.Manager.Appearance.activeTheme = {
			id: "foo-dark",
			package: FOO,
		} as ClassicyTheme;
		const b = await boot({ saved });
		await import("@classicy/appearance-platinum");
		expect(b.active().id).toBe("foo-dark");
		expect(b.active().package).toBe(FOO);
		expect(b.saved().System.Manager.Appearance.activeTheme).toEqual({
			id: "foo-dark",
			package: FOO,
		});
	});

	it("loads an old defaults reference, without the flag, as before", async () => {
		const saved = await fooOnlySave();
		saved.System.Manager.Appearance.activeTheme = {
			id: "foo-default",
			package: FOO,
		} as ClassicyTheme;
		const b = await boot({ saved });
		await import("@classicy/appearance-platinum");
		expect(b.active().id).toBe("foo-default");
		expect(b.active().package).toBe(FOO);
		expect(b.saved().System.Manager.Appearance.activeTheme).toEqual({
			id: "foo-default",
			package: FOO,
		});
		// And foo, registering at last, resolves it.
		b.registerFoo();
		expect(b.active().id).toBe("default");
		expect(b.active().package).toBe("platinum");
	});

	it("keeps a flag that is not true out of the reference", async () => {
		const saved = await fooOnlySave();
		saved.System.Manager.Appearance.activeTheme = {
			id: "foo-default",
			package: FOO,
			defaults: "yes",
		} as unknown as ClassicyTheme;
		const b = await boot({ saved });
		await import("@classicy/appearance-platinum");
		expect(b.active().id).toBe("foo-default");
		expect(b.saved().System.Manager.Appearance.activeTheme).toEqual({
			id: "foo-default",
			package: FOO,
		});
	});

	it("never puts the flag on the live theme", async () => {
		const saved = await fooOnlySave();
		const pending = await boot({ saved });
		expect(pending.active()).not.toHaveProperty("defaults");
		const b = await boot({ saved, fooFirst: true });
		expect(b.active().id).toBe("foo-default");
		expect(b.active()).not.toHaveProperty("defaults");
	});

	it("counts a flagged reference only for the package it names", async () => {
		await boot();
		await import("@classicy/appearance-platinum");
		const { drawnClassicyPackageDefaults } = await import(
			"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyBuiltInThemes.internal"
		);
		const appearance = {
			activeTheme: {
				...strip(CLASSICY_CORE_DEFAULT_THEME),
				id: "foo-default",
				package: FOO,
			} as ClassicyTheme,
			packageId: "platinum",
			customThemes: [],
			availableThemes: [],
		};
		const pending = (pkg: string) => ({
			id: "foo-default",
			package: pkg,
			defaults: true as const,
		});
		expect(drawnClassicyPackageDefaults(appearance, pending("bar"))).toBe(
			undefined,
		);
		expect(drawnClassicyPackageDefaults(appearance, pending(FOO))?.id).toBe(
			"default",
		);
	});

	it("saves a preset's reference without the flag", async () => {
		const b = await boot();
		b.registerFoo();
		act(() =>
			b.store.dispatch({
				type: "ClassicyDesktopChangeTheme",
				activeTheme: "foo-dark",
			}),
		);
		expect(b.saved().System.Manager.Appearance.activeTheme).toEqual({
			id: "foo-dark",
			package: FOO,
		});
	});
});
