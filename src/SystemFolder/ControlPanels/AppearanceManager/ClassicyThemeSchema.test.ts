import { afterEach, describe, expect, it, vi } from "vitest";
import { runtimeImportGraph } from "@/__tests__/runtimeImportGraph";
// The schema does not register Platinum's sound pack; the bundled themes name
// it, so this file registers it explicitly.
import { platinumSoundPack } from "@/Appearance/Platinum/assets/sounds/platinum";
// getTheme/getAllThemes serve the registered packages' themes: Platinum's.
import "@/Appearance/Platinum";
import { defaultClassicyWallpaper } from "@/Appearance/ClassicyWallpaperIndex";
import platinumJson from "@/Appearance/Platinum/platinum.json";
import {
	type ClassicyTheme,
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_CUSTOM_THEME_ID,
	editActiveClassicyTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import { CLASSICY_DEFAULT_THEME_METRICS } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import {
	ClassicyPackageThemeSchema,
	ClassicyThemeSchema,
	isSafeClassicyThemeBackgroundImage,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema";
import {
	registerClassicySoundPack,
	resetClassicySoundPacks,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

const base = (): ClassicyTheme => structuredClone(getTheme("default"));

/** A copy of the default theme with one change applied. */
const withEdit = (edit: (t: Record<string, never>) => void): unknown => {
	const theme = base() as unknown as Record<string, never>;
	edit(theme);
	return theme;
};

const rejects = (value: unknown) =>
	expect(ClassicyThemeSchema.safeParse(value).success).toBe(false);

describe("ClassicyThemeSchema — accepts", () => {
	it.each(
		(platinumJson.presets as unknown as ClassicyTheme[]).map(
			(t) => [t.id, t] as const,
		),
	)("bundled theme %s as written in platinum.json", (_id, theme) => {
		const parsed = ClassicyThemeSchema.safeParse(theme);
		expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
	});

	it("all 21 bundled themes with resolved wallpapers", () => {
		const all = getAllThemes();
		expect(all).toHaveLength(21);
		for (const theme of all) {
			expect(ClassicyThemeSchema.safeParse(theme).success).toBe(true);
		}
	});

	it("the forked Custom theme", () => {
		const appearance = {
			packageId: "platinum",
			activeTheme: base(),
			availableThemes: getAllThemes(),
			customThemes: [] as ClassicyTheme[],
		};
		editActiveClassicyTheme(appearance, (t) => {
			t.color.highlight = 0x123456;
		});
		expect(appearance.activeTheme.id).toBe(CLASSICY_CUSTOM_THEME_ID);
		expect(ClassicyThemeSchema.safeParse(appearance.activeTheme).success).toBe(
			true,
		);
	});

	it("strips unknown keys at every level instead of rejecting them", () => {
		const parsed = ClassicyThemeSchema.parse({
			...base(),
			future: true,
			desktop: { ...base().desktop, parallax: 3 },
		});
		expect(parsed).not.toHaveProperty("future");
		expect(parsed.desktop).not.toHaveProperty("parallax");
	});

	it("a numeric backgroundSize and an http(s) wallpaper URL", () => {
		const theme = base();
		theme.desktop.backgroundSize = 100;
		theme.desktop.backgroundImage = "https://example.com/bg.png?x=1&y=2";
		expect(ClassicyThemeSchema.safeParse(theme).success).toBe(true);
	});
});

describe("ClassicyThemeSchema — rejects", () => {
	it.each([
		["negative", -1],
		["above 0xFFFFFF", 0x1000000],
		["fractional", 12.5],
		["a string", "#ffffff"],
		["NaN", Number.NaN],
	])("a %s color", (_label, value) => {
		rejects(withEdit((t) => Object.assign(t.color, { select: value })));
		rejects(
			withEdit((t) => {
				(t.color as unknown as { system: unknown[] }).system[3] = value;
			}),
		);
		rejects(
			withEdit((t) => Object.assign(t.desktop, { backgroundColor: value })),
		);
	});

	it.each([
		["too short", 6],
		["too long", 8],
	])("a palette that is %s", (_label, length) => {
		rejects(
			withEdit((t) =>
				Object.assign(t.color, { theme: new Array(length).fill(0) }),
			),
		);
	});

	it.each([
		[
			"name",
			(t: Record<string, never>) => delete (t as { name?: string }).name,
		],
		[
			"typography.ui",
			(t: Record<string, never>) => delete (t.typography as { ui?: string }).ui,
		],
		[
			"measurements",
			(t: Record<string, never>) =>
				delete (t as { measurements?: unknown }).measurements,
		],
		[
			"desktop.backgroundRepeat",
			(t: Record<string, never>) =>
				delete (t.desktop as { backgroundRepeat?: string }).backgroundRepeat,
		],
		[
			"sound.disabled",
			(t: Record<string, never>) =>
				delete (t.sound as { disabled?: string[] }).disabled,
		],
	])("a theme missing %s", (_field, remove) => {
		rejects(withEdit(remove));
	});

	it("an empty name", () => {
		rejects(withEdit((t) => Object.assign(t, { name: "   " })));
	});

	it("non-positive or non-finite sizes", () => {
		rejects(withEdit((t) => Object.assign(t.typography, { uiSize: 0 })));
		rejects(
			withEdit((t) =>
				Object.assign(t.typography, { bodySize: Number.POSITIVE_INFINITY }),
			),
		);
		rejects(withEdit((t) => Object.assign(t.desktop, { iconSize: -48 })));
	});

	it("an unknown sound theme", () => {
		const parsed = ClassicyThemeSchema.safeParse(
			withEdit((t) => Object.assign(t.sound, { pack: "sosumi" })),
		);
		expect(parsed.success).toBe(false);
		expect(parsed.error?.issues[0].path).toEqual(["sound", "pack"]);
	});

	it("a sound pack registered after module load validates", () => {
		registerClassicySoundPack({
			id: "late",
			name: "Late",
			src: ["https://x/l.ogg"],
			sprite: { ClassicyBeep: [0, 1] },
		});
		const parsed = ClassicyThemeSchema.safeParse(
			withEdit((t) => {
				Object.assign(t.sound, { pack: "late" });
			}),
		);
		expect(parsed.success).toBe(true);
	});

	it("a theme file still using sound.name is refused with a sound.pack issue", () => {
		const parsed = ClassicyThemeSchema.safeParse(
			withEdit((t) => {
				const sound = t.sound as Record<string, unknown>;
				delete sound.pack;
				sound.name = "platinum";
			}),
		);
		expect(parsed.success).toBe(false);
		expect(parsed.error?.issues[0].path).toEqual(["sound", "pack"]);
	});

	it("a sound pack inherited from Object.prototype", () => {
		rejects(withEdit((t) => Object.assign(t.sound, { pack: "toString" })));
	});

	it("font stacks carrying CSS syntax", () => {
		rejects(
			withEdit((t) =>
				Object.assign(t.typography, { ui: "Geneva; background: red" }),
			),
		);
		rejects(
			withEdit((t) =>
				Object.assign(t.typography, { body: "url(https://x.test/f)" }),
			),
		);
	});

	it("background keywords carrying CSS syntax", () => {
		rejects(
			withEdit((t) =>
				Object.assign(t.desktop, { backgroundRepeat: "repeat; color: red" }),
			),
		);
		rejects(
			withEdit((t) => Object.assign(t.desktop, { backgroundSize: "url(x)" })),
		);
	});
});

describe("ClassicyPackageThemeSchema — a package's own themes", () => {
	const withBackground = (backgroundImage: string) =>
		withEdit((t) => Object.assign(t.desktop, { backgroundImage }));

	it("accepts a plain wallpaper filename no package has registered yet", () => {
		const theme = withBackground("not_registered_yet.png");
		expect(ClassicyPackageThemeSchema.safeParse(theme).success).toBe(true);
		// Untrusted themes keep the strict rule.
		expect(ClassicyThemeSchema.safeParse(theme).success).toBe(false);
	});

	it("accepts another package's <package>|<file> reference, registered or not", () => {
		for (const value of ["platinum|azul_dark.png", "late|not_yet.png"]) {
			expect(
				ClassicyPackageThemeSchema.safeParse(withBackground(value)).success,
				value,
			).toBe(true);
		}
		// Only a registered one is accepted from an untrusted theme.
		expect(
			ClassicyThemeSchema.safeParse(withBackground("platinum|azul_dark.png"))
				.success,
		).toBe(true);
		expect(
			ClassicyThemeSchema.safeParse(withBackground("late|not_yet.png")).success,
		).toBe(false);
	});

	it("accepts what the strict schema accepts", () => {
		for (const value of ["", "azul_dark.png", "https://example.com/a.png"]) {
			expect(
				ClassicyPackageThemeSchema.safeParse(withBackground(value)).success,
				value,
			).toBe(true);
		}
	});

	it.each([
		["a path", "/assets/other.png"],
		["a url() breakout", 'x");background:url(y'],
		["a parenthesis", "a).png"],
		["whitespace", "a b.png"],
		["javascript:", "javascript:alert(1)"],
		["an unknown data: URI", "data:image/png;base64,iVBORw0KGgo="],
		["a reference with a path", "platinum|a/b.png"],
		["a reference with a scheme", "data:x|a.png"],
	])("still rejects %s", (_label, value) => {
		expect(
			ClassicyPackageThemeSchema.safeParse(withBackground(value)).success,
		).toBe(false);
	});
});

describe("isSafeClassicyThemeBackgroundImage", () => {
	it.each([
		["empty (color-only)", ""],
		["a registered filename", "azul_dark.png"],
		["a resolved registered wallpaper", defaultClassicyWallpaper()],
		["an https URL", "https://example.com/wallpaper.png"],
		["an http URL", "http://example.com/a/b.png?size=2"],
	])("accepts %s", (_label, value) => {
		expect(isSafeClassicyThemeBackgroundImage(value)).toBe(true);
	});

	it.each([
		["javascript:", "javascript:alert(1)"],
		["a url() breakout", "https://x.test/a.png) ; background:red"],
		["a closing paren", "https://x.test/a.png)"],
		["whitespace", "https://x.test/a b.png"],
		["a double quote", 'https://x.test/a".png'],
		["a single quote", "https://x.test/a'.png"],
		["a semicolon", "https://x.test/a.png;x"],
		["a backslash", "https://x.test/a\\.png"],
		["a newline", "https://x.test/a\n.png"],
		["an unknown data: URI", "data:image/png;base64,iVBORw0KGgo="],
		["an svg data: URI", "data:image/svg+xml,<svg onload=alert(1)>"],
		["a blob: URL", "blob:https://x.test/1234"],
		["a protocol-relative URL", "//x.test/a.png"],
		["a relative path", "/assets/other.png"],
		["an unknown filename", "no_such_wallpaper.png"],
		["a bare word", "x) ; background:red"],
		["a file: URL", "file:///etc/passwd"],
	])("rejects %s", (_label, value) => {
		expect(isSafeClassicyThemeBackgroundImage(value)).toBe(false);
	});

	it("rejects an unsafe backgroundImage through the schema", () => {
		rejects(
			withEdit((t) =>
				Object.assign(t.desktop, { backgroundImage: "javascript:alert(1)" }),
			),
		);
	});
});

describe("ClassicyThemeSchema — metric defaults", () => {
	/** A default theme as a pre-metrics build wrote it: `measurements.window`
	 * with its four original keys and nothing else. */
	const v1Measurements = () =>
		withEdit((t) => {
			Object.assign(t, {
				measurements: {
					window: {
						borderSize: 1,
						controlSize: 12,
						paddingSize: 6,
						scrollbarSize: 17,
					},
				},
			});
		});

	it("accepts a v1 theme with only measurements.window and fills the rest", () => {
		const parsed = ClassicyThemeSchema.safeParse(v1Measurements());
		expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
		expect(parsed.data?.measurements).toEqual(CLASSICY_DEFAULT_THEME_METRICS);
	});

	it("keeps provided metrics", () => {
		const parsed = ClassicyThemeSchema.safeParse(
			withEdit((t) => {
				(t.measurements as { control: { height: number } }).control.height = 24;
			}),
		);
		expect(parsed.success).toBe(true);
		expect(parsed.data?.measurements.control.height).toBe(24);
		expect(parsed.data?.measurements.control.labelGap).toBe(5);
	});

	it("rejects a non-numeric metric", () => {
		rejects(
			withEdit((t) => {
				Object.assign(
					(t.measurements as unknown as { button: object }).button,
					{ gap: "12" },
				);
			}),
		);
	});

	it("rejects a metric over 512", () => {
		rejects(
			withEdit((t) => {
				Object.assign(
					(t.measurements as unknown as { layout: object }).layout,
					{ groupGap: 513 },
				);
			}),
		);
	});
});

describe("ClassicyThemeSchema — appearance package", () => {
	it("defaults package to platinum when absent", () => {
		const parsed = ClassicyThemeSchema.safeParse(
			withEdit((t) => {
				delete (t as Record<string, unknown>).package;
			}),
		);
		expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
		expect(parsed.data?.package).toBe("platinum");
	});

	// R16: the default comes from CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID, never
	// a literal, so the schema follows the constant wherever it is defined.
	it("defaults package to CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID", async () => {
		const defaults = "@/Appearance/ClassicyAppearanceDefaults";
		vi.resetModules();
		vi.doMock(defaults, async (importOriginal) => ({
			...(await importOriginal<object>()),
			CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID: "default-under-test",
		}));
		try {
			// The fresh module graph's registry needs Platinum's wallpapers too.
			await import("@/Appearance/Platinum/assets/platinumAssets");
			const fresh = await import(
				"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema"
			);
			// The fresh module graph has its own, empty, sound pack registry.
			(
				await import(
					"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks"
				)
			).registerClassicySoundPack(platinumSoundPack);
			const parsed = fresh.ClassicyThemeSchema.safeParse(
				withEdit((t) => {
					delete (t as Record<string, unknown>).package;
				}),
			);
			expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
			expect(parsed.data?.package).toBe("default-under-test");
		} finally {
			vi.doUnmock(defaults);
			vi.resetModules();
		}
	}, 30_000);

	it("keeps a package id", () => {
		const parsed = ClassicyThemeSchema.safeParse(
			withEdit((t) => Object.assign(t, { package: "irix" })),
		);
		expect(parsed.success).toBe(true);
		expect(parsed.data?.package).toBe("irix");
	});

	it("theme schema keeps package knob families", () => {
		const parsed = ClassicyThemeSchema.safeParse(platinumJson.defaults);
		expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
		expect(parsed.data?.measurements.controlStrip.cellHeight).toBe(22);
	});

	it("accepts a package measurement family", () => {
		const parsed = ClassicyThemeSchema.safeParse(
			withEdit((t) => {
				Object.assign(t.measurements, { controlStrip: { cellHeight: 22 } });
			}),
		);
		expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
		expect(parsed.data?.measurements.controlStrip.cellHeight).toBe(22);
	});

	it("rejects a non-numeric package measurement", () => {
		rejects(
			withEdit((t) => {
				Object.assign(t.measurements, { controlStrip: { cellHeight: "22" } });
			}),
		);
	});
});

describe("ClassicyThemeSchema — sound packs", () => {
	afterEach(() => {
		resetClassicySoundPacks();
		registerClassicySoundPack(platinumSoundPack);
	});

	it("sound.pack validates against whatever is registered, Platinum included", () => {
		resetClassicySoundPacks();
		registerClassicySoundPack({
			id: "only",
			name: "Only",
			src: ["https://x/o.ogg"],
			sprite: { ClassicyBeep: [0, 1] },
		});
		const withPack = (pack: string) =>
			ClassicyThemeSchema.safeParse(
				withEdit((t) => Object.assign(t.sound, { pack })),
			);
		expect(withPack("only").success).toBe(true);
		const platinum = withPack("platinum");
		expect(platinum.success).toBe(false);
		expect(platinum.error?.issues[0].path).toEqual(["sound", "pack"]);
	});

	it("the schema's module graph loads no Platinum module", () => {
		const graph = runtimeImportGraph(
			"src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts",
		);
		// Platinum is its own workspace package (plan 0015-kxa §3.1).
		expect(graph.filter((file) => file.startsWith("packages/"))).toEqual([]);
	});
});

describe("ClassicyThemeSchema — package measurement names", () => {
	it.each([
		["a hyphenated family", { "control-strip": { cellHeight: 22 } }],
		["a PascalCase family", { ControlStrip: { cellHeight: 22 } }],
		["a family starting with a digit", { "2x": { cellHeight: 22 } }],
		["an underscored key", { controlStrip: { cell_height: 22 } }],
		["a key starting with a digit", { controlStrip: { "2x": 22 } }],
		["a PascalCase key", { controlStrip: { CellHeight: 22 } }],
	])("rejects %s", (_label, family) => {
		rejects(withEdit((t) => Object.assign(t.measurements, family)));
	});
});
