import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { ClassicyAppearanceKnobs } from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_FALLBACK_APPEARANCE_PACKAGE } from "@/Appearance/ClassicyAppearancePackage";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { ClassicyAppearancePackageSchema } from "@/Appearance/ClassicyAppearancePackageSchema";
import { resolveClassicyWallpaper } from "@/Appearance/ClassicyWallpaperIndex";
import platinumJson from "@/Appearance/Platinum/platinum.json";
import {
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { CLASSICY_DEFAULT_THEME_METRICS } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import { isThemeMetricFamilyTarget } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";
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

	it("carries its icon, the platinum.png in its own art", async () => {
		await import("@/Appearance/Platinum");
		const { platinumArt } = await import(
			"@/Appearance/Platinum/assets/art/platinumArt"
		);
		const icon = getClassicyAppearancePackage("platinum")?.icon;
		expect(icon).toBeTruthy();
		expect(icon).toBe(platinumArt("platinum.png"));
		expect(
			readFileSync("src/Appearance/Platinum/assets/art/platinum.png").length,
		).toBeGreaterThan(0);
	});

	it("registers its own themes, which getAllThemes() serves", async () => {
		await import("@/Appearance/Platinum");
		const pkg = getClassicyAppearancePackage("platinum");
		expect(pkg?.presets).toEqual(getAllThemes());
		getAllThemes().forEach((theme, i) => {
			expect(theme).toBe(pkg?.presets?.[i]);
		});
		// The defaults are the `default` preset itself.
		expect(pkg?.defaults).toBe(getTheme("default"));
		expect(pkg?.defaults).toBe(pkg?.presets?.[0]);
		expect(pkg?.layout).toEqual(CLASSICY_FALLBACK_APPEARANCE_PACKAGE.layout);
	});

	it("completes each preset: wallpaper by filename, every knob family filled", async () => {
		await import("@/Appearance/Platinum");
		const pkg = getClassicyAppearancePackage("platinum");
		const m = platinumJson.defaults.measurements;
		for (const theme of pkg?.presets ?? []) {
			expect(theme.package).toBe("platinum");
			// The look-only knobs too: they are Platinum's, not the core floor's.
			expect(theme.measurements.menuFrame).toEqual(m.menuFrame);
			expect(theme.measurements.controlStrip).toEqual(m.controlStrip);
			expect(Object.keys(theme.measurements)).toEqual(Object.keys(m));
			const raw = platinumJson.presets.find((t) => t.id === theme.id);
			// The JSON's filename, kept: getThemeVars resolves it at render.
			expect(theme.desktop.backgroundImage).toBe(
				raw?.desktop.backgroundImage ?? "",
			);
		}
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

	// H-R22, H-R23, H-R24 and the label ruling: knobs size one thing each
	// and never misalign fixed art.
	it("keeps the knobs over fixed art inside what the art allows", () => {
		const { knobs } = platinumJson;
		// The balloon tail is a 20 × 14 drawing: it is centered by layout, and
		// its offset is the drawing's height less a 0–2 px junction overlap.
		expect(knobs.balloonHelp).not.toHaveProperty("tailWidth");
		expect(knobs.balloonHelp.tailOffset).toMatchObject({ min: 12, max: 14 });
		// The pop-up slider's thumb follows trackTop (the JS reads it); its
		// horizontal placement against the track drawing is fixed.
		expect(knobs.popUpSlider.trackLeft).toMatchObject({ min: 4, max: 4 });
		expect(knobs.popUpSlider.thumbLeft).toMatchObject({ min: 1, max: 1 });
		// The menu shadow sits outside the border by a gap, not a raw offset.
		expect(knobs.menuFrame).not.toHaveProperty("shadowOffset");
		expect(knobs.menuFrame.shadowGap).toMatchObject({ default: 0, min: 0 });
	});

	it("labels the knobs for what they size", () => {
		const { knobs } = platinumJson;
		expect(knobs.scrollbar).toEqual({
			thumbGripWidth: expect.objectContaining({
				label: "Thumb grip width (across the bar)",
			}),
			thumbGripHeight: expect.objectContaining({
				label: "Thumb grip height (along the bar)",
			}),
		});
		expect(knobs.pager.cellHeight.label).toBe("Row height");
	});

	it("getAllThemes() comes from the package presets, wallpapers by filename", async () => {
		await import("@/Appearance/Platinum");
		const all = getAllThemes();
		expect(all.map((t) => t.id)).toEqual(PRESET_IDS);
		const azul = all.find((t) => t.id === "azul");
		expect(azul?.desktop.backgroundImage).toBe("azul_dark.png");
		expect(resolveClassicyWallpaper("azul_dark.png")).not.toBe("");
	});

	// The core neither imports nor exports Platinum (0015 §1.6): barrelsby
	// excludes this folder, and Platinum's names come from its own index.
	it("the top barrel does not re-export the Platinum entry", () =>
		expect(readFileSync("src/index.ts", "utf8")).not.toContain(
			"./Appearance/Platinum",
		));

	it("Platinum's index, not the library barrel, exports the Platinum sound pack", async () => {
		const api: Record<string, unknown> = await import("@/index");
		const platinumIndex: Record<string, unknown> = await import(
			"@/Appearance/Platinum"
		);
		const { platinumSoundPack } = await import(
			"@/Appearance/Platinum/assets/sounds/platinum"
		);
		expect(platinumIndex.platinumSoundPack).toBe(platinumSoundPack);
		expect(platinumIndex.PLATINUM_APPEARANCE_PACKAGE_ID).toBe("platinum");
		expect(api).not.toHaveProperty("platinumSoundPack");
		expect(api).not.toHaveProperty("PLATINUM_APPEARANCE_PACKAGE_ID");
	}, 60_000);
});
