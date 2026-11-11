import { act } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "@/__tests__/test-utils";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	registerClassicySystemArt,
	resetClassicyAssets,
} from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";

// System 7's Help menu title is an icon, the balloon with a "?" (HIG p.52,
// fig 4-2). The menu bar draws the `helpMenuTitle` system art in place of the
// word when the active package registers it, else the word, as Platinum does.

const helpCluster = (container: HTMLElement) =>
	container.querySelector('[data-classicy-part="help"]') as HTMLElement;

// The cluster's own title row (its submenu is rendered inside the <li>).
const titleRow = (container: HTMLElement) =>
	helpCluster(container).querySelector(":scope > p") as HTMLElement;

afterEach(() => resetClassicyAssets());

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
