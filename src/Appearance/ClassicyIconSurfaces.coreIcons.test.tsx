// The icon surfaces that drew a plain <img> (story 0193-801, fix round 1):
// each draws through ClassicyIconImage, so a core icon URL draws as the
// active package's icon for its key, at the small image where the surface
// is small, as the desktop and menus draw the same URL.
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	type ClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	registerClassicyAssets,
	resetClassicyAssets,
} from "@/Appearance/ClassicyAssetRegistry";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow";
import { ClassicyAssistant } from "@/SystemFolder/SystemResources/Assistant/ClassicyAssistant";
import { ClassicyStartupScreen } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreen";
import { ClassicyComboBox } from "@/SystemFolder/SystemResources/ComboBox/ClassicyComboBox";
import { ClassicyInputDialog } from "@/SystemFolder/SystemResources/InputDialog/ClassicyInputDialog";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { ClassicyTree } from "@/SystemFolder/SystemResources/Tree/ClassicyTree";

const CORE = "/core/disk.png";
const PKG = "/pkg/disk.png";
const PKG_SMALL = "/pkg/disk-16.png";

const stub = (id: string): ClassicyAppearancePackage => ({
	id,
	name: id,
	css: "",
	defaults: { ...getTheme("default"), package: id },
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
});

const activate = (packageId: string) =>
	act(() => {
		const theme: ClassicyTheme = {
			...getTheme("default"),
			id: `${packageId}-base`,
			package: packageId,
		};
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Appearance.packageId = packageId;
				draft.System.Manager.Appearance.activeTheme = theme;
			}),
		);
	});

beforeEach(() => {
	resetClassicyAssets();
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
	registerClassicyAppearancePackage(stub("platinum"));
	registerClassicyAppearancePackage(stub("pkg"));
	registerClassicyAssets("icons", "platinum", { drives: { disk: CORE } });
	registerClassicyAssets("icons", "pkg", {
		drives: { disk: { src: PKG, small: PKG_SMALL } },
	});
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	resetClassicyAssets();
	resetClassicyAppearancePackagesForTests();
});

const src = (img: Element | null | undefined) => img?.getAttribute("src");

/** Under the default package, then the other: the draw for each. */
const underBoth = (read: () => string | null | undefined) => {
	const platinum = read();
	activate("pkg");
	return [platinum, read()];
};

describe("icon surfaces draw a core icon URL as the active package's", () => {
	it("ClassicyTree's left and right icons, small", () => {
		const { container } = render(
			<ClassicyTree
				nodes={[{ id: "n", label: "Disk", leftIcon: CORE, rightIcon: CORE }]}
			/>,
		);
		expect(
			underBoth(() => src(container.querySelector(".classicyTreeNodeIcon"))),
		).toEqual([CORE, PKG_SMALL]);
		expect(src(container.querySelector(".classicyTreeNodeIconRight"))).toBe(
			PKG_SMALL,
		);
	});

	it("ClassicyTabs' tab icon: small, large at its regular image", () => {
		const tabs = [{ title: "Disk", icon: CORE, children: <p>x</p> }];
		const { container, rerender } = render(<ClassicyTabs tabs={tabs} />);
		const icon = () => src(container.querySelector(".classicyTabButtonIcon"));
		expect(underBoth(icon)).toEqual([CORE, PKG_SMALL]);
		rerender(<ClassicyTabs tabs={tabs} size="large" />);
		expect(icon()).toBe(PKG);
	});

	it("ClassicyComboBox's option icons, small", () => {
		activate("pkg");
		render(
			<ClassicyComboBox
				id="cb"
				options={[{ value: "a", label: "A", icon: CORE }]}
			/>,
		);
		const arrow = screen.getByRole("button", { name: "Show options" });
		fireEvent.mouseDown(arrow);
		fireEvent.click(arrow);
		expect(src(document.querySelector(".classicyPopUpMenuListItemIcon"))).toBe(
			PKG_SMALL,
		);
	});

	it("ClassicyInputDialog's icon, at its regular image", () => {
		render(
			<ClassicyInputDialog
				id="d"
				title="T"
				prompt="P"
				icon={CORE}
				onConfirm={() => {}}
				onCancel={() => {}}
			/>,
		);
		expect(
			underBoth(() =>
				src(document.querySelector(".classicyInputDialogIcon img")),
			),
		).toEqual([CORE, PKG]);
	});

	it("ClassicyAboutWindow's app icon, at its regular image", () => {
		render(
			<ClassicyAboutWindow
				appId="Disk.app"
				appName="Disk"
				appIcon={CORE}
				hideFunc={() => {}}
			/>,
		);
		expect(underBoth(() => src(screen.getByAltText("About")))).toEqual([
			CORE,
			PKG,
		]);
	});

	it("ClassicyAssistant's label icon small, a large accessory icon regular", () => {
		const { container } = render(
			<ClassicyAssistant
				pages={[
					{
						title: "Disk",
						content: <p>x</p>,
						labelIcon: CORE,
						accessoryIcon: CORE,
						accessoryIconSize: "lg",
					},
				]}
			/>,
		);
		expect(
			underBoth(() =>
				src(container.querySelector(".classicyAssistantHeaderLabelIcon")),
			),
		).toEqual([CORE, PKG_SMALL]);
		expect(
			src(container.querySelector(".classicyAssistantAccessoryIcon")),
		).toBe(PKG);
	});

	it("ClassicyStartupScreen's parade icons, at their regular image", () => {
		vi.useFakeTimers();
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Boot.paradeIcons = [
						{ id: "disk", icon: CORE, name: "Disk" },
					];
				}),
			);
		});
		render(<ClassicyStartupScreen duration={1000} />);
		act(() => {
			vi.advanceTimersByTime(600);
		});
		expect(underBoth(() => src(screen.getByAltText("Disk")))).toEqual([
			CORE,
			PKG,
		]);
	});
});
