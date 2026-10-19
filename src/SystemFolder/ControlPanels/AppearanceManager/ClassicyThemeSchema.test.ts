import { describe, expect, it } from "vitest";
import {
	type ClassicyTheme,
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_CUSTOM_THEME_ID,
	editActiveClassicyTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import {
	ClassicyThemeSchema,
	isSafeClassicyThemeBackgroundImage,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema";
import { ClassicyDefaultWallpaper } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";
import themesData from "@/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json";

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
		(themesData as unknown as ClassicyTheme[]).map((t) => [t.id, t] as const),
	)("bundled theme %s as written in themes.json", (_id, theme) => {
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
	])("a %s colour", (_label, value) => {
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
			withEdit((t) => Object.assign(t.sound, { name: "sosumi" })),
		);
		expect(parsed.success).toBe(false);
		expect(parsed.error?.issues[0].path).toEqual(["sound", "name"]);
	});

	it("a sound name inherited from Object.prototype", () => {
		rejects(withEdit((t) => Object.assign(t.sound, { name: "toString" })));
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

describe("isSafeClassicyThemeBackgroundImage", () => {
	it.each([
		["empty (colour-only)", ""],
		["a bundled filename", "azul_dark.png"],
		["a resolved bundled wallpaper", ClassicyDefaultWallpaper],
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
