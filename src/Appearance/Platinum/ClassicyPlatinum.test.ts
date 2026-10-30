import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { CLASSICY_FALLBACK_APPEARANCE_PACKAGE } from "@/Appearance/ClassicyAppearancePackage";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { ClassicyAppearancePackageSchema } from "@/Appearance/ClassicyAppearancePackageSchema";
import platinumJson from "@/Appearance/Platinum/platinum.json";
import {
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
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
		// The package carries platinum.json's (empty) knobs, and the options
		// schema is built from them.
		expect(pkg?.knobs).toEqual(platinumJson.knobs);
		expect(pkg?.options?.parse({})).toEqual({});
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

	it("defaults equals the Default preset", () =>
		expect(platinumJson.defaults).toEqual(platinumJson.presets[0]));

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

	it("declares no knobs yet", () => expect(platinumJson.knobs).toEqual({}));

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
