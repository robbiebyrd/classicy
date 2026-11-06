import { act } from "@testing-library/react";
import { produce } from "immer";
import type { ChangeEvent } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import "@classicy/appearance-platinum";
import {
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { registerClassicyWallpapers } from "@/Appearance/ClassicyAssetRegistry";
import { resolveClassicyWallpaper } from "@/Appearance/ClassicyWallpaperIndex";
import {
	type ClassicyTheme,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { useDesktopTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop";
import { activatableClassicyPackageTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyBuiltInThemes.internal";
import {
	exportClassicyTheme,
	parseClassicyThemeFile,
	readClassicyLoadedThemes,
	readClassicyTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import {
	type ClassicyStore,
	DefaultAppManagerState,
	mergeClassicyState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import { platinumWallpaperUrl } from "../../../../packages/appearance/platinum/src/assets/platinumWallpapers";

// 0143: a second Appearance Package that registers its own "default.png",
// beside Platinum's, and a third that registers a wallpaper nobody else has.
const FOO_DEFAULT = "/foo/default.png";
const BAR_WALL = "/bar/wall.png";
const PLATINUM_DEFAULT = platinumWallpaperUrl("default.png");
const PLATINUM_AZUL = platinumWallpaperUrl("azul_dark.png");

const themeOf = (packageId: string, backgroundImage: string): ClassicyTheme => {
	const base = structuredClone(getTheme("default"));
	return {
		...base,
		id: packageId,
		name: packageId,
		package: packageId,
		desktop: { ...base.desktop, backgroundImage },
	};
};

const register = (id: string) =>
	registerClassicyAppearancePackage({
		id,
		name: id,
		css: "",
		defaults: themeOf(id, "default.png"),
		layout: {
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		},
	});

beforeAll(() => {
	register("foo");
	registerClassicyWallpapers("foo", [
		{ name: "Foo Default", file: "default.png", src: FOO_DEFAULT },
	]);
	registerClassicyWallpapers("bar", [
		{ name: "Bar Wall", file: "bar_wall.png", src: BAR_WALL },
	]);
	// foo is the active package, so the Desktop tab offers its wallpapers
	// beside Platinum's.
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Appearance.packageId = "foo";
			}),
		);
	});
});

type SelectHandler = (e: ChangeEvent<HTMLSelectElement>) => void;

const Host = (props: {
	bg: string;
	themePackage: string;
	changeBackground?: SelectHandler;
}) => {
	const tab = useDesktopTab({
		changeBackground: vi.fn(),
		setBackgroundURL: vi.fn(),
		alignBackground: vi.fn(),
		repeatBackground: vi.fn(),
		backgroundSize: vi.fn(),
		...props,
	});
	return <div>{tab.children}</div>;
};

const patternsMenu = () => screen.getAllByRole("combobox")[0];

/** The value the Desktop tab hands ChangeBackground for the option `label`. */
const pick = async (themePackage: string, label: string): Promise<string> => {
	const changeBackground = vi.fn();
	const user = userEvent.setup();
	const { unmount } = render(
		<Host
			bg={PLATINUM_AZUL}
			themePackage={themePackage}
			changeBackground={changeBackground}
		/>,
	);
	await user.click(patternsMenu());
	await user.click(screen.getByRole("option", { name: label }));
	unmount();
	return changeBackground.mock.calls[0][0].target.value;
};

/** The active theme after ChangeBackground, starting from `theme`. */
const changeBackground = (
	theme: ClassicyTheme,
	backgroundImage: string,
): ClassicyTheme => {
	const state: ClassicyStore = mergeClassicyState(DefaultAppManagerState, {});
	state.System.Manager.Appearance.activeTheme = theme;
	return classicyDesktopEventHandler(state, {
		type: "ClassicyDesktopChangeBackground",
		backgroundImage,
	}).System.Manager.Appearance.activeTheme;
};

const rendered = (theme: ClassicyTheme) =>
	getThemeVars(theme)["--desktop-background-image"];

describe.each([
	["platinum", "default.png", "foo|default.png"],
	["foo", "platinum|default.png", "default.png"],
])("Desktop tab, two packages with a default.png, a theme of %s", (themePackage, platinumRef, fooRef) => {
	it("gives each option its own value", async () => {
		expect(await pick(themePackage, "Default")).toBe(platinumRef);
		expect(await pick(themePackage, "Foo Default")).toBe(fooRef);
	});

	it("stores and renders each option's own image", async () => {
		const theme = themeOf(themePackage, "");
		const platinum = changeBackground(
			theme,
			await pick(themePackage, "Default"),
		);
		expect(platinum.desktop.backgroundImage).toBe(platinumRef);
		expect(rendered(platinum)).toBe(`url("${PLATINUM_DEFAULT}")`);
		const foo = changeBackground(
			theme,
			await pick(themePackage, "Foo Default"),
		);
		expect(foo.desktop.backgroundImage).toBe(fooRef);
		expect(rendered(foo)).toBe(`url("${FOO_DEFAULT}")`);
	});

	it("highlights the option the theme's wallpaper is", () => {
		const { rerender } = render(
			<Host bg={PLATINUM_DEFAULT} themePackage={themePackage} />,
		);
		expect(patternsMenu()).toHaveTextContent(/^Default$/);
		rerender(<Host bg={FOO_DEFAULT} themePackage={themePackage} />);
		expect(patternsMenu()).toHaveTextContent("Foo Default");
	});
});

describe("storing another package's wallpaper", () => {
	it("ChangeBackground stores a source by its reference for the theme's package", () => {
		const platinum = changeBackground(themeOf("platinum", ""), FOO_DEFAULT);
		expect(platinum.desktop.backgroundImage).toBe("foo|default.png");
		const foo = changeBackground(themeOf("foo", ""), PLATINUM_DEFAULT);
		expect(foo.desktop.backgroundImage).toBe("platinum|default.png");
		expect(rendered(foo)).toBe(`url("${PLATINUM_DEFAULT}")`);
	});

	it("a package's theme naming another package's source is activated with its reference", () => {
		const pkg = getClassicyAppearancePackage("foo");
		if (!pkg) throw new Error("foo is not registered");
		const theme = activatableClassicyPackageTheme(
			pkg,
			themeOf("foo", PLATINUM_DEFAULT),
		);
		expect(theme.desktop.backgroundImage).toBe("platinum|default.png");
	});

	it("host-loaded themes keep a bare filename, which resolves once its package registers", () => {
		const { themes } = readClassicyLoadedThemes([
			themeOf("foo", "bar_wall.png"),
			themeOf("foo", FOO_DEFAULT),
		]);
		expect(themes.map((t) => t.desktop.backgroundImage)).toEqual([
			"bar_wall.png",
			"default.png",
		]);
	});
});

describe("theme files naming another package's wallpaper", () => {
	it("imports a filename only a third package registers, pinned to it, and renders it", () => {
		const read = readClassicyTheme(themeOf("foo", "bar_wall.png"));
		expect(read.ok).toBe(true);
		if (!read.ok) return;
		expect(read.theme.desktop.backgroundImage).toBe("bar|bar_wall.png");
		expect(rendered(read.theme)).toBe(`url("${BAR_WALL}")`);
	});

	it("imports a package-qualified reference as it is, and renders it", () => {
		const read = readClassicyTheme(themeOf("foo", "bar|bar_wall.png"));
		expect(read.ok && read.theme.desktop.backgroundImage).toBe(
			"bar|bar_wall.png",
		);
		const platinum = readClassicyTheme(themeOf("foo", "platinum|default.png"));
		expect(platinum.ok && rendered(platinum.theme)).toBe(
			`url("${PLATINUM_DEFAULT}")`,
		);
	});

	it("refuses a reference no package registers, saying which setting", () => {
		for (const value of ["nobody|x.png", "foo|bar_wall.png"]) {
			const read = readClassicyTheme(themeOf("foo", value));
			expect(read.ok).toBe(false);
			if (read.ok) return;
			expect(read.error).toMatch(/^This theme has invalid settings: /);
			expect(read.error).toContain("desktop.backgroundImage");
			expect(read.error).toContain("registered wallpaper");
		}
	});

	it("exports a wallpaper of another package qualified, and imports it back to the same image", () => {
		for (const stored of ["platinum|azul_dark.png", "azul_dark.png"]) {
			const text = exportClassicyTheme(themeOf("foo", stored));
			expect(JSON.parse(text).theme.desktop.backgroundImage).toBe(
				"platinum|azul_dark.png",
			);
			const back = parseClassicyThemeFile(text);
			expect(back.ok && back.theme.desktop.backgroundImage).toBe(
				"platinum|azul_dark.png",
			);
			expect(back.ok && rendered(back.theme)).toBe(`url("${PLATINUM_AZUL}")`);
		}
	});

	it("round-trips each package's own wallpaper bare, Platinum's included", () => {
		for (const [packageId, src] of [
			["platinum", PLATINUM_DEFAULT],
			["foo", FOO_DEFAULT],
		] as const) {
			const text = exportClassicyTheme(themeOf(packageId, "default.png"));
			expect(JSON.parse(text).theme.desktop.backgroundImage).toBe(
				"default.png",
			);
			const back = parseClassicyThemeFile(text);
			expect(back.ok && back.theme.desktop.backgroundImage).toBe("default.png");
			expect(back.ok && rendered(back.theme)).toBe(`url("${src}")`);
		}
	});

	it("keeps rendering a qualified reference whichever package is active", () => {
		expect(resolveClassicyWallpaper("foo|default.png", "platinum")).toBe(
			FOO_DEFAULT,
		);
		expect(resolveClassicyWallpaper("platinum|default.png", "foo")).toBe(
			PLATINUM_DEFAULT,
		);
	});
});
