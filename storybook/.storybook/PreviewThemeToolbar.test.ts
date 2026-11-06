// Storybook's Theme toolbar lists the presets of the Appearance Packages
// registered when the preview loads (plan 0015 §1.6), read from the package
// registry, not from Platinum's JSON: the preview imports Platinum the way a
// host does, and the core no longer registers it.
import { describe, expect, it, vi } from "vitest";

type ToolbarItem = { value: string; title: string };

const toolbarItems = async (): Promise<ToolbarItem[]> => {
	const { default: preview } = await import("./preview");
	return (preview.globalTypes?.theme?.toolbar?.items ?? []) as ToolbarItem[];
};

describe("Storybook preview theme toolbar", () => {
	it("lists Platinum's presets, from the registry", async () => {
		vi.resetModules();
		const items = await toolbarItems();
		const { getClassicyAppearancePackage } = await import(
			"@/Appearance/ClassicyAppearancePackageRegistry"
		);
		const platinum = getClassicyAppearancePackage("platinum");
		expect(platinum?.presets?.length).toBeGreaterThan(1);
		expect(items).toEqual(
			platinum?.presets?.map((theme) => ({
				value: theme.id,
				title: theme.name,
			})),
		);
	}, 60000);

	it("lists every registered package's presets, Platinum's first", async () => {
		vi.resetModules();
		await import("@classicy/appearance-platinum");
		const { registerClassicyAppearancePackage } = await import(
			"@/Appearance/ClassicyAppearancePackageRegistry"
		);
		const { getTheme } = await import(
			"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance"
		);
		const extra = {
			...getTheme("default"),
			id: "toolbar-extra-one",
			name: "Extra One",
			package: "toolbar-extra",
		};
		registerClassicyAppearancePackage({
			id: "toolbar-extra",
			name: "Toolbar Extra",
			css: "",
			defaults: extra,
			presets: [extra],
			layout: {
				window: { growBoxCorner: "bottom-right" },
				menuBar: { placement: "screen" },
				desktop: { iconGridOrigin: "top-right" },
			},
		});
		const items = await toolbarItems();
		expect(items.at(0)).toEqual({ value: "default", title: "Default" });
		expect(items.at(-1)).toEqual({
			value: "toolbar-extra-one",
			title: "Extra One",
		});
	}, 60000);
});
