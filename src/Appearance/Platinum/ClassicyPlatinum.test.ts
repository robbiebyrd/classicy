import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { ClassicyAppearanceKnobs } from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_FALLBACK_APPEARANCE_PACKAGE } from "@/Appearance/ClassicyAppearancePackage";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { ClassicyAppearancePackageSchema } from "@/Appearance/ClassicyAppearancePackageSchema";
import platinumJson from "@/Appearance/Platinum/platinum.json";
import {
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { CLASSICY_DEFAULT_THEME_METRICS } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import { isThemeMetricFamilyTarget } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";
import { classicyWallpaperFilename } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";
import * as ClassicyLog from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const PRESET_IDS = [
	"default",
	"azul",
	"bondi",
	"copper",
	"crimson",
	"emerald",
	"frenchBlue",
	"gold",
	"ivy",
	"lavender",
	"pistachio",
	"magenta",
	"nutmeg",
	"poppy",
	"plum",
	"rose",
	"sapphire",
	"silver",
	"teal",
	"turquoise",
	"sunny",
];

describe("the Platinum appearance package", () => {
	it("registers the platinum package on import", async () => {
		const log = vi.spyOn(ClassicyLog, "classicyLog");
		await import("@/Appearance/Platinum");
		const pkg = getClassicyAppearancePackage("platinum");
		expect(pkg).toBeDefined();
		expect(pkg?.name).toBe("Platinum");
		expect(pkg?.presets?.map((t) => t.id)).toEqual(PRESET_IDS);
		expect(log).not.toHaveBeenCalledWith(
			"error",
			"ClassicyAppearance",
			expect.anything(),
		);
		log.mockRestore();
	});

	it("passes the package schema, defaults.package included", async () => {
		await import("@/Appearance/Platinum");
		const pkg = getClassicyAppearancePackage("platinum");
		const parsed = ClassicyAppearancePackageSchema.safeParse(pkg);
		expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
		expect(pkg?.defaults.package).toBe("platinum");
		expect(typeof pkg?.css).toBe("string");
		// The package carries platinum.json's knobs, and the options schema is
		// built from them: parsing nothing gives every knob's default, which
		// is the defaults' own value.
		expect(pkg?.knobs).toEqual(platinumJson.knobs);
		const m = platinumJson.defaults.measurements;
		expect(pkg?.options?.parse({})).toEqual({
			controlStrip: m.controlStrip,
			menuFrame: m.menuFrame,
			pager: m.pager,
			balloonHelp: m.balloonHelp,
			popUpSlider: m.popUpSlider,
			scrollbar: m.scrollbar,
		});
	});

	it("registers the themes getAllThemes() serves, like the fallback package", async () => {
		await import("@/Appearance/Platinum");
		const pkg = getClassicyAppearancePackage("platinum");
		expect(pkg?.presets).toBe(getAllThemes());
		expect(pkg?.defaults).toBe(getTheme("default"));
		expect(pkg?.defaults).toBe(CLASSICY_FALLBACK_APPEARANCE_PACKAGE.defaults);
		expect(pkg?.layout).toEqual(CLASSICY_FALLBACK_APPEARANCE_PACKAGE.layout);
	});

	it("names its sound pack, registered once by the sounds module", async () => {
		const { platinumSoundPack } = await import(
			"@/Appearance/Platinum/assets/sounds/platinum"
		);
		await import("@/Appearance/Platinum");
		expect(getClassicyAppearancePackage("platinum")?.sounds).toEqual([
			platinumSoundPack,
		]);
	});

	it("ships 21 presets whose ids match the former themes.json order", () =>
		expect(platinumJson.presets.map((t) => t.id)).toEqual(PRESET_IDS));

	// H-R8: Platinum's knob families live in `defaults` only; the presets
	// carry the core five and are filled from the defaults at load.
	it("defaults equals the Default preset, plus the knob families", () => {
		const { measurements, ...rest } = platinumJson.defaults;
		const { measurements: presetMeasurements, ...presetRest } =
			platinumJson.presets[0];
		expect(rest).toEqual(presetRest);
		const { window, control, button, groupBox, layout } = measurements;
		expect(presetMeasurements).toEqual({
			window,
			control,
			button,
			groupBox,
			layout,
		});
		for (const preset of platinumJson.presets) {
			expect(Object.keys(preset.measurements), preset.id).toEqual(
				Object.keys(CLASSICY_DEFAULT_THEME_METRICS),
			);
		}
	});

	// The merge order core five → Platinum → package relies on this: the
	// core five in platinum.json are the constant's values.
	it("its core five equal CLASSICY_DEFAULT_THEME_METRICS", () => {
		const { window, control, button, groupBox, layout } =
			platinumJson.defaults.measurements;
		expect({ window, control, button, groupBox, layout }).toEqual(
			CLASSICY_DEFAULT_THEME_METRICS,
		);
	});

	it("every built-in theme is filled with the default's knob families", () => {
		for (const theme of getAllThemes()) {
			for (const [family, keys] of Object.entries(
				platinumJson.defaults.measurements,
			)) {
				if (family in CLASSICY_DEFAULT_THEME_METRICS) continue;
				expect(theme.measurements[family], `${theme.id} ${family}`).toEqual(
					keys,
				);
			}
		}
	});

	it("every preset carries package platinum", () => {
		expect(platinumJson.defaults.package).toBe("platinum");
		for (const preset of platinumJson.presets)
			expect(preset.package).toBe("platinum");
	});

	it("layout declares today's Platinum values", () =>
		expect(platinumJson.layout).toEqual({
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		}));

	// H-R4 (owner ruling): knob metadata only for the six contract families;
	// the other families are emitted and editable in theme files, not shown in
	// the Options tab.
	it("declares knobs for the six contract families only", () =>
		expect(Object.keys(platinumJson.knobs)).toEqual([
			"controlStrip",
			"menuFrame",
			"pager",
			"balloonHelp",
			"popUpSlider",
			"scrollbar",
		]));

	it("every knob matches its defaults value: same keys, integer default inside whole-pixel bounds", () => {
		const knobs: ClassicyAppearanceKnobs = platinumJson.knobs;
		const measurements: Record<string, Record<string, number>> = platinumJson
			.defaults.measurements;
		for (const [family, keys] of Object.entries(knobs)) {
			expect(Object.keys(keys), family).toEqual(
				Object.keys(measurements[family]),
			);
			for (const [key, knob] of Object.entries(keys)) {
				const name = `${family}.${key}`;
				expect(knob.default, name).toBe(measurements[family][key]);
				for (const n of [knob.default, knob.min, knob.max])
					expect(Number.isInteger(n), name).toBe(true);
				expect(knob.min, name).toBeGreaterThanOrEqual(0);
				expect(knob.max, name).toBeLessThanOrEqual(512);
				expect(knob.min <= knob.default && knob.default <= knob.max, name).toBe(
					true,
				);
				expect(knob.label.length, name).toBeGreaterThan(0);
				// J's reducer and Options tab edit only valid family targets.
				expect(isThemeMetricFamilyTarget({ family, key }), name).toBe(true);
			}
		}
	});

	it("getAllThemes() comes from the package presets with resolved wallpapers", () => {
		const all = getAllThemes();
		expect(all.map((t) => t.id)).toEqual(PRESET_IDS);
		const azul = all.find((t) => t.id === "azul");
		expect(azul?.desktop.backgroundImage).not.toBe("azul_dark.png");
		expect(classicyWallpaperFilename(azul?.desktop.backgroundImage ?? "")).toBe(
			"azul_dark.png",
		);
	});

	it("the top barrel re-exports the Platinum entry", () =>
		expect(readFileSync("src/index.ts", "utf8")).toContain(
			"./Appearance/Platinum/index",
		));

	it("the library barrel still exports the Platinum sound pack", async () => {
		const api: Record<string, unknown> = await import("@/index");
		const { platinumSoundPack } = await import(
			"@/Appearance/Platinum/assets/sounds/platinum"
		);
		expect(api.platinumSoundPack).toBe(platinumSoundPack);
		expect(api.PLATINUM_APPEARANCE_PACKAGE_ID).toBe("platinum");
	}, 60_000);
});
