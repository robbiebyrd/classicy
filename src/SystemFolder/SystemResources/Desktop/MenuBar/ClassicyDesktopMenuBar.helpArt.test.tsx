import { act, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	registerClassicyAssets,
	registerClassicySystemArt,
	resetClassicyAssets,
	resolveClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";

const trackMock = vi.fn();
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useClassicyAnalytics: () => ({ track: trackMock, page: vi.fn() }),
	}),
);

// System 7's Help menu title is an icon, the balloon with a "?" (HIG p.52,
// fig 4-2). The menu bar draws the `helpMenuTitle` system art in place of the
// word when the active package registers it, else the word, as Platinum does.

const helpCluster = (container: HTMLElement) =>
	container.querySelector('[data-classicy-part="help"]') as HTMLElement;

// The cluster's own title row (its submenu is rendered inside the <li>).
const titleRow = (container: HTMLElement) =>
	helpCluster(container).querySelector(":scope > p") as HTMLElement;

// Clears this file's art, then registers the core's icon tree again: the
// reset clears every package's trees, the default package's icons included,
// which the core registers once, at import (ClassicyIcons.ts).
afterEach(() => {
	resetClassicyAssets();
	registerClassicyAssets(
		"icons",
		CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
		ClassicyIcons,
	);
	trackMock.mockClear();
});

// The `title` of the last "hover" event the cluster's own item tracked.
const hoverTitle = (cluster: HTMLElement) => {
	trackMock.mockClear();
	fireEvent.mouseOver(cluster.querySelector(":scope > p") as HTMLElement);
	const own = trackMock.mock.calls.filter(
		([event, args]) => event === "hover" && args.id === cluster.id,
	);
	return own.at(-1)?.[1].title;
};

describe("the menu bar's Help cluster", () => {
	it("shows the word Help when no package registers helpMenuTitle", () => {
		const { container } = render(<ClassicyDesktopMenuBar />);
		expect(titleRow(container).textContent).toBe("Help");
		expect(titleRow(container).querySelector("img")).toBeNull();
	});

	it("shows the registered art in place of the word", () => {
		registerClassicySystemArt(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID, {
			helpMenuTitle: "help-balloon.png",
		});
		const { container } = render(<ClassicyDesktopMenuBar />);
		const img = titleRow(container).querySelector("img");
		expect(img?.getAttribute("src")).toBe("help-balloon.png");
		// The word goes, but stays the image's accessible name.
		expect(img?.getAttribute("alt")).toBe("Help");
		expect(titleRow(container).textContent).toBe("");
	});

	it("reads the art at render, so a registration after mount shows", () => {
		const { container } = render(<ClassicyDesktopMenuBar />);
		expect(titleRow(container).querySelector("img")).toBeNull();
		act(() =>
			registerClassicySystemArt(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID, {
				helpMenuTitle: "help-later.png",
			}),
		);
		expect(titleRow(container).querySelector("img")?.getAttribute("src")).toBe(
			"help-later.png",
		);
	});

	it("tracks the art's accessible name as the item's analytics title", () => {
		registerClassicySystemArt(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID, {
			helpMenuTitle: "help-balloon.png",
		});
		const { container } = render(<ClassicyDesktopMenuBar />);
		expect(hoverTitle(helpCluster(container))).toBe("Help");
	});

	it("tracks the word as the title when no art is registered", () => {
		const { container } = render(<ClassicyDesktopMenuBar />);
		expect(hoverTitle(helpCluster(container))).toBe("Help");
	});

	it("leaves the Apple menu's art alone", () => {
		registerClassicySystemArt(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID, {
			appleMenu: "apple.png",
			helpMenuTitle: "help-balloon.png",
		});
		const { container } = render(<ClassicyDesktopMenuBar />);
		expect(
			container
				.querySelector('[data-classicy-part="apple"] > p img')
				?.getAttribute("src"),
		).toBe("apple.png");
	});
});

describe("the menu bar's Apple menu", () => {
	const appleCluster = (container: HTMLElement) =>
		container.querySelector('[data-classicy-part="apple"]') as HTMLElement;

	it("names its art Apple, for assistive technology and analytics", () => {
		registerClassicySystemArt(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID, {
			appleMenu: "apple.png",
		});
		const { container } = render(<ClassicyDesktopMenuBar />);
		const img = appleCluster(container).querySelector(":scope > p img");
		expect(img?.getAttribute("alt")).toBe("Apple");
		expect(hoverTitle(appleCluster(container))).toBe("Apple");
	});
});

describe("after a test resets the asset registry", () => {
	// Runs after the tests above, which register art and reset the registry:
	// the core's icon tree is back, as the core registered it.
	it("still resolves the core's icon tree", () => {
		expect(resolveClassicyAsset("icons", "system.macos")).toBe(
			ClassicyIcons.system.macos,
		);
		expect(resolveClassicyAsset("icons", "system.files.document")).toBe(
			ClassicyIcons.system.files.document,
		);
	});
});
