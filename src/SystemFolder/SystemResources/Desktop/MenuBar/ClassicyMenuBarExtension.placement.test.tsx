import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import { act, render } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	registerTestMirrorPackage,
	TEST_MIRROR_PACKAGE_ID,
} from "@/__tests__/testMirrorPackage";
import {
	registerTestTaskbarPackage,
	TEST_TASKBAR_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { resolveClassicyIconImage } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import { ClassicyMenuBarExtension } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyMenuBarExtension";
import { ClassicyTaskbar } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbar";

/**
 * F 5.1 review carry-forward: an extension portals into the screen bar's
 * extensions region, which window placement removes and screen placement
 * renders anew. The extension follows the placement, so a package round trip
 * (screen → window → screen) leaves it in the live region, never in a
 * detached one.
 */

const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

const setPackage = (packageId: string) =>
	act(() => {
		useAppManager.setState(
			produce(useAppManager.getState(), (draft) => {
				draft.System.Manager.Appearance.packageId = packageId;
			}),
			true,
		);
	});

const extensionInLiveRegion = () =>
	document
		.getElementById("classicyDesktopMenuExtensions")
		?.querySelector('[aria-label="Account"]') ?? null;

// The taskbar where the desktop mounts it: only under a layout that
// declares one.
const LayoutTaskbar = () =>
	useClassicyAppearanceLayout().taskbar ? <ClassicyTaskbar /> : null;

const renderBar = () =>
	render(
		<>
			<ClassicyDesktopMenuBar />
			<LayoutTaskbar />
			<ClassicyMenuBarExtension id="user" icon="/user.png" title="Account" />
		</>,
	);

const extensionInTray = () =>
	document
		.querySelector(".classicyTaskbarTray > #classicyDesktopMenuExtensions")
		?.querySelector('[aria-label="Account"]') ?? null;

describe("ClassicyMenuBarExtension — menu bar placement", () => {
	beforeEach(() => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(platinum);
		registerTestMirrorPackage();
		registerTestTaskbarPackage();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(platinum);
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("follows the region through a screen → window → screen round trip", () => {
		renderBar();
		expect(extensionInLiveRegion()).not.toBeNull();

		setPackage(TEST_MIRROR_PACKAGE_ID);
		expect(document.getElementById("classicyDesktopMenuExtensions")).toBeNull();
		expect(document.querySelector('[aria-label="Account"]')).toBeNull();

		setPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
		expect(extensionInLiveRegion()).not.toBeNull();
	});

	it("appears once a package mounted under window placement moves the bar to the screen", () => {
		setPackage(TEST_MIRROR_PACKAGE_ID);
		renderBar();
		expect(document.querySelector('[aria-label="Account"]')).toBeNull();

		setPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
		expect(extensionInLiveRegion()).not.toBeNull();
	});
	// Plan 0020-w98 §2, "The extensions region": under a taskbar the screen
	// bar is headless and the region is the status area's.
	it("portals into the taskbar's status area under a layout that declares one", () => {
		setPackage(TEST_TASKBAR_PACKAGE_ID);
		renderBar();
		expect(extensionInTray()).not.toBeNull();
		expect(
			document.querySelectorAll("#classicyDesktopMenuExtensions"),
		).toHaveLength(1);
		expect(
			document.querySelector(
				".classicyDesktopMenuBar #classicyDesktopMenuExtensions",
			),
		).toBeNull();
	});

	// B16 (audit 10.13): in the status area an extension is an icon alone,
	// its title the name and the tooltip, never text; the screen bar keeps
	// its children.
	describe("in the taskbar's status area (B16)", () => {
		const renderExtensions = () =>
			render(
				<>
					<ClassicyDesktopMenuBar />
					<LayoutTaskbar />
					<ClassicyMenuBarExtension
						id="user"
						icon="/user.png"
						title="Account"
					/>
					<ClassicyMenuBarExtension id="status" title="Connected to Server">
						<span className="statusText">Connected to Server</span>
					</ClassicyMenuBarExtension>
				</>,
			);
		const trigger = (label: string) =>
			document.querySelector<HTMLButtonElement>(
				`.classicyDesktopMenuExtensionTrigger[aria-label="${label}"]`,
			);

		it("draws the item's icon alone, named by its title, with no text", () => {
			setPackage(TEST_TASKBAR_PACKAGE_ID);
			renderExtensions();
			const account = trigger("Account");
			expect(account?.closest(".classicyTaskbarTray")).not.toBeNull();
			const img = account?.querySelector("img");
			expect(img?.getAttribute("src")).toBe("/user.png");
			expect(img).toHaveAttribute("alt", "");
			expect(account?.textContent).toBe("");
		});

		it("draws the package's generic application icon for an item without one, and never its children", () => {
			setPackage(TEST_TASKBAR_PACKAGE_ID);
			renderExtensions();
			const status = trigger("Connected to Server");
			expect(status?.closest(".classicyTaskbarTray")).not.toBeNull();
			expect(status?.querySelector(".statusText")).toBeNull();
			expect(status?.textContent).toBe("");
			const img = status?.querySelector("img");
			expect(img).not.toBeNull();
			expect(img?.getAttribute("src")).toBe(
				resolveClassicyIconImage(ClassicyIcons.system.files.application),
			);
		});

		it("keeps the children under the screen bar", () => {
			renderExtensions();
			const status = trigger("Connected to Server");
			expect(status?.closest(".classicyDesktopMenuBar")).not.toBeNull();
			expect(status?.querySelector(".statusText")).toHaveTextContent(
				"Connected to Server",
			);
			expect(trigger("Account")?.querySelector("img")).toHaveAttribute(
				"alt",
				"Account",
			);
		});
	});

	it("follows the region from the screen bar into the tray and back", () => {
		renderBar();
		expect(extensionInLiveRegion()).not.toBeNull();
		expect(extensionInTray()).toBeNull();

		setPackage(TEST_TASKBAR_PACKAGE_ID);
		expect(extensionInTray()).not.toBeNull();

		setPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
		expect(document.querySelector(".classicyTaskbar")).toBeNull();
		expect(extensionInLiveRegion()).not.toBeNull();
		expect(
			extensionInLiveRegion()?.closest(".classicyDesktopMenuBar"),
		).not.toBeNull();
	});

	// The placement is "window" on both sides of this switch: only the
	// taskbar's arrival tells the extension to look again.
	it("appears in the tray when a taskbar arrives with no change of placement, and goes with it", () => {
		setPackage(TEST_MIRROR_PACKAGE_ID);
		renderBar();
		expect(document.querySelector('[aria-label="Account"]')).toBeNull();

		setPackage(TEST_TASKBAR_PACKAGE_ID);
		expect(extensionInTray()).not.toBeNull();

		setPackage(TEST_MIRROR_PACKAGE_ID);
		expect(document.getElementById("classicyDesktopMenuExtensions")).toBeNull();
		expect(document.querySelector('[aria-label="Account"]')).toBeNull();
	});
});
