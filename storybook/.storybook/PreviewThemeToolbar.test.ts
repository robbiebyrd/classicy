// Storybook's toolbars (plan 0015 §1.6): the Theme toolbar lists the presets
// of the registered Appearance Packages, read from the package registry, not
// from Platinum's JSON (the preview imports Platinum the way a host does, and
// the core no longer registers it), then those of each switchable package
// not registered yet, read from its JSON. The Package toolbar lists the
// shipped packages; one other than Platinum is registered only once chosen.
import { describe, expect, it, vi } from "vitest";

type ToolbarItem = { value: string; title: string; right?: string };

const loadPreview = async () => (await import("./preview")).default;

const toolbarItems = async (
	global: "theme" | "appearancePackage",
): Promise<ToolbarItem[]> =>
	((await loadPreview()).globalTypes?.[global]?.toolbar?.items ??
		[]) as ToolbarItem[];

describe("Storybook preview theme toolbar", () => {
	it("lists Platinum's presets from the registry, then System 7's, then Windows 98's", async () => {
		vi.resetModules();
		const items = await toolbarItems("theme");
		const { getClassicyAppearancePackage } = await import(
			"@/Appearance/ClassicyAppearancePackageRegistry"
		);
		const platinum = getClassicyAppearancePackage("platinum");
		expect(platinum?.presets?.length).toBeGreaterThan(1);
		const platinumItems = platinum?.presets?.map((theme) => ({
			value: theme.id,
			title: theme.name,
			right: "Platinum",
		}));
		expect(items.slice(0, platinumItems?.length)).toEqual(platinumItems);
		const { default: windows98Json } = await import(
			"../../packages/appearance/windows98/src/windows98.json"
		);
		expect(windows98Json.presets).toHaveLength(34);
		expect(items.slice(platinumItems?.length)).toEqual([
			{ value: "system7", title: "System 7", right: "System 7" },
			{ value: "system7-color", title: "System 7 Color", right: "System 7" },
			...windows98Json.presets.map((theme) => ({
				value: theme.id,
				title: theme.name,
				right: "Windows 98",
			})),
		]);
		expect(items.slice(platinumItems?.length)[2]).toEqual({
			value: "windows98",
			title: "Windows Standard",
			right: "Windows 98",
		});
		// Listed from their JSON: loading the preview never registers them.
		expect(getClassicyAppearancePackage("system7")).toBeUndefined();
		expect(getClassicyAppearancePackage("windows98")).toBeUndefined();
	}, 60000);

	it("gives every theme a distinct value", async () => {
		vi.resetModules();
		const values = (await toolbarItems("theme")).map((item) => item.value);
		expect(new Set(values).size).toBe(values.length);
	}, 60000);

	it("lists System 7's registered presets once it is registered", async () => {
		vi.resetModules();
		await import("@classicy/appearance-platinum");
		await import("@classicy/appearance-system7");
		const { getClassicyAppearancePackage } = await import(
			"@/Appearance/ClassicyAppearancePackageRegistry"
		);
		const items = await toolbarItems("theme");
		const system7 = items.filter((item) => item.right === "System 7");
		expect(system7).toEqual(
			getClassicyAppearancePackage("system7")?.presets?.map((theme) => ({
				value: theme.id,
				title: theme.name,
				right: "System 7",
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
		const items = await toolbarItems("theme");
		expect(items.at(0)).toEqual({
			value: "default",
			title: "Default",
			right: "Platinum",
		});
		expect(items).toContainEqual({
			value: "toolbar-extra-one",
			title: "Extra One",
			right: "Toolbar Extra",
		});
	}, 60000);
});

describe("Storybook preview package toolbar", () => {
	it("switches between the shipped packages, starting on Platinum", async () => {
		vi.resetModules();
		expect(await toolbarItems("appearancePackage")).toEqual([
			{ value: "platinum", title: "Platinum" },
			{ value: "system7", title: "System 7" },
			{ value: "windows98", title: "Windows 98" },
		]);
		expect((await loadPreview()).initialGlobals?.appearancePackage).toBe(
			"platinum",
		);
	}, 60000);

	it("registers a chosen package on first use", async () => {
		vi.resetModules();
		await import("@classicy/appearance-platinum");
		const {
			isStorybookAppearancePackagePending,
			loadStorybookAppearancePackage,
		} = await import("./StorybookPackages");
		expect(isStorybookAppearancePackagePending("system7")).toBe(true);
		expect(await loadStorybookAppearancePackage("system7")).toBe(true);
		expect(isStorybookAppearancePackagePending("system7")).toBe(false);
		// Neither switchable nor registered: nothing to wait for.
		expect(isStorybookAppearancePackagePending("mirrored")).toBe(false);
		expect(await loadStorybookAppearancePackage("mirrored")).toBe(false);
	}, 60000);

	it("draws the Theme toolbar's theme only under its own package", async () => {
		vi.resetModules();
		await import("@classicy/appearance-platinum");
		await import("@classicy/appearance-system7");
		const { resolveStorybookThemeId } = await import("./StorybookPackages");
		expect(resolveStorybookThemeId("platinum", "default")).toBe("default");
		expect(resolveStorybookThemeId("system7", "system7-color")).toBe(
			"system7-color",
		);
		// Another package's theme: the drawn package's defaults.
		expect(resolveStorybookThemeId("system7", "default")).toBe("system7");
		expect(resolveStorybookThemeId("platinum", "system7-color")).toBe(
			"default",
		);
	}, 60000);
});
