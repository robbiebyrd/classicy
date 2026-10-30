import { castDraft, produce } from "immer";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fireEvent, render, renderHook, screen } from "@/__tests__/test-utils";
// Registers Platinum (and its sound pack, which test-pack's defaults name).
import "@/Appearance/Platinum";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	listClassicyAppearancePackages,
	registerClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	appearancePackageInputId,
	usePackagesTab,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Packages";
import {
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	DefaultAppManagerState,
	mergeClassicyState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

const testPack: ClassicyAppearancePackage = {
	id: "test-pack",
	name: "Test Pack",
	css: "",
	defaults: { ...getTheme("default"), package: "test-pack" },
	presets: [],
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
	options: z.looseObject({}),
};

beforeAll(() => {
	registerClassicyAppearancePackage(testPack);
});

const Host = ({
	packages,
	activePackageId,
	changePackage = vi.fn(),
}: {
	packages: ClassicyAppearancePackage[];
	activePackageId: string;
	changePackage?: (packageId: string) => void;
}) => {
	const tab = usePackagesTab({ packages, activePackageId, changePackage });
	return <div>{tab.children}</div>;
};

describe("usePackagesTab", () => {
	it("is titled Packages", () => {
		const { result } = renderHook(() =>
			usePackagesTab({
				packages: listClassicyAppearancePackages(),
				activePackageId: "platinum",
				changePackage: vi.fn(),
			}),
		);
		expect(result.current.title).toBe("Packages");
	});

	it("names its radio group and says theme, not themes, for one", () => {
		render(
			<Host
				packages={[
					...listClassicyAppearancePackages(),
					{
						...testPack,
						id: "one-pack",
						name: "One Pack",
						defaults: { ...testPack.defaults, package: "one-pack" },
						presets: [{ ...testPack.defaults, package: "one-pack" }],
					},
				]}
				activePackageId="platinum"
			/>,
		);
		expect(
			screen.getByRole("radiogroup", { name: "Appearance Package" }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("One Pack (1 theme)")).not.toBeChecked();
	});

	it("lists every registered package with its theme count", () => {
		render(
			<Host
				packages={listClassicyAppearancePackages()}
				activePackageId="platinum"
			/>,
		);
		// Platinum's defaults share a preset's id, so they count once.
		expect(screen.getByLabelText("Platinum (21 themes)")).toBeChecked();
		// Test Pack has no presets: its defaults are its one selectable theme.
		expect(screen.getByLabelText("Test Pack (1 theme)")).not.toBeChecked();
	});

	it("dispatches changePackage with the package id", () => {
		const changePackage = vi.fn();
		render(
			<Host
				packages={listClassicyAppearancePackages()}
				activePackageId="platinum"
				changePackage={changePackage}
			/>,
		);
		fireEvent.click(screen.getByLabelText("Test Pack (1 theme)"));
		expect(changePackage).toHaveBeenCalledWith("test-pack");
	});

	it("draws seven swatches per package from defaults.color.theme", () => {
		render(
			<Host
				packages={listClassicyAppearancePackages()}
				activePackageId="platinum"
			/>,
		);
		const swatches = document.querySelectorAll<HTMLElement>(
			'li[data-package-id="platinum"] .classicyAppearanceManagerPackageSwatch',
		);
		expect(swatches).toHaveLength(7);
		// jsdom normalizes the inline color to rgb(); compare through a probe.
		const probe = document.createElement("span");
		const platinum = listClassicyAppearancePackages().find(
			(pkg) => pkg.id === "platinum",
		) as ClassicyAppearancePackage;
		platinum.defaults.color.theme.forEach((c, i) => {
			probe.style.background = `#${c.toString(16).padStart(6, "0")}`;
			expect(swatches[i].style.background).toBe(probe.style.background);
		});
	});

	it("follows the active package id on re-render", () => {
		const packages = listClassicyAppearancePackages();
		const { rerender } = render(
			<Host packages={packages} activePackageId="platinum" />,
		);
		rerender(<Host packages={packages} activePackageId="test-pack" />);
		expect(screen.getByLabelText("Test Pack (1 theme)")).toBeChecked();
		expect(screen.getByLabelText("Platinum (21 themes)")).not.toBeChecked();
	});

	it("appearancePackageInputId names each radio button", () => {
		render(
			<Host
				packages={listClassicyAppearancePackages()}
				activePackageId="platinum"
			/>,
		);
		expect(appearancePackageInputId("test-pack")).toBe(
			"appearance_package_test-pack",
		);
		expect(document.getElementById(appearancePackageInputId("test-pack"))).toBe(
			screen.getByLabelText("Test Pack (1 theme)"),
		);
	});

	it("sits in the shared Colors scroll region, so many packages never grow the window (J-R18)", () => {
		render(
			<Host
				packages={listClassicyAppearancePackages()}
				activePackageId="platinum"
			/>,
		);
		const scroll = screen
			.getByLabelText("Platinum (21 themes)")
			.closest(".classicyAppearanceManagerColorsScroll");
		expect(scroll).not.toBeNull();
		expect(
			scroll?.querySelector(".classicyAppearanceManagerPackageSwatches"),
		).not.toBeNull();
	});

	it("keeps customThemes when the package changes (reducer)", () => {
		const custom: ClassicyTheme = {
			...structuredClone(getTheme("default")),
			id: "custom",
			name: "Custom",
		};
		const state = mergeClassicyState(DefaultAppManagerState, {});
		state.System.Manager.Appearance.customThemes = [custom];
		const next = produce(state, (draft) => {
			classicyDesktopStateEventReducer(castDraft(draft) as ClassicyStore, {
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: "test-pack",
			});
		});
		expect(next.System.Manager.Appearance.packageId).toBe("test-pack");
		expect(next.System.Manager.Appearance.customThemes).toEqual([custom]);
	});
});
