import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	type ClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_ICON_DIMMED_IMAGE_CLASS } from "@/Appearance/ClassicyIconDimming";
import { resetClassicyDimmedIconsForTests } from "@/Appearance/ClassicyIconDimming.internal";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";

// Story 0214-c61 fix round 3: a hidden application's icon draws the active
// package's dimmed image (`iconDimming.hiddenApp`) once a canvas has drawn
// it, marked `classicyIconDimmedImage` so the package's stylesheet dimming
// (an opacity) stands down. An icon a canvas cannot read keeps its own image
// and the stylesheet's dimming.

const RULE = { blend: { color: "#FFFFFF", amount: 0.5 }, bits: 4 };

const register = () =>
	registerClassicyAppearancePackage({
		id: "platinum",
		name: "Test",
		css: "",
		defaults: { ...getTheme("default"), package: "platinum" },
		layout: {
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		},
		iconDimming: { hiddenApp: RULE },
	} satisfies ClassicyAppearancePackage);

const fakeImages = () =>
	// A constructor (\`new Image()\`): an <img> that loads at once.
	vi.stubGlobal(
		"Image",
		class {
			constructor() {
				const img = document.createElement("img");
				Object.defineProperty(img, "naturalWidth", { value: 16 });
				Object.defineProperty(img, "naturalHeight", { value: 16 });
				queueMicrotask(() => img.onload?.(new Event("load")));
				// biome-ignore lint/correctness/noConstructorReturn: stands in for an HTMLImageElement
				return img;
			}
		},
	);

const fakeCanvas = (readable: boolean) => {
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
		() =>
			({
				drawImage: vi.fn(),
				getImageData: vi.fn(() => {
					if (!readable) throw new DOMException("tainted", "SecurityError");
					return { data: new Uint8ClampedArray(16 * 16 * 4) };
				}),
				putImageData: vi.fn(),
			}) as unknown as CanvasRenderingContext2D,
	);
	vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
		"data:image/png;base64,DIMMED",
	);
};

beforeEach(() => {
	resetClassicyAppearancePackagesForTests();
	resetClassicyDimmedIconsForTests();
});
afterEach(() => {
	resetClassicyAppearancePackagesForTests();
	resetClassicyDimmedIconsForTests();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("ClassicyIconImage dimmed", () => {
	it("draws the package's dimmed image, marked DimmedImage", async () => {
		register();
		fakeImages();
		fakeCanvas(true);
		render(<ClassicyIconImage src="app.png" alt="App" dimmed />);
		await waitFor(() =>
			expect(screen.getByAltText("App").getAttribute("src")).toBe(
				"data:image/png;base64,DIMMED",
			),
		);
		expect(screen.getByAltText("App").classList).toContain(
			CLASSICY_ICON_DIMMED_IMAGE_CLASS,
		);
	});

	it("keeps its own image, unmarked, when the canvas is tainted (the stylesheet's opacity applies)", async () => {
		register();
		fakeImages();
		fakeCanvas(false);
		const ctx = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL");
		render(
			<ClassicyIconImage
				src="https://elsewhere.example/app.png"
				alt="App"
				dimmed
			/>,
		);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(ctx).not.toHaveBeenCalled();
		const img = screen.getByAltText("App");
		expect(img.getAttribute("src")).toBe("https://elsewhere.example/app.png");
		expect(img.classList).not.toContain(CLASSICY_ICON_DIMMED_IMAGE_CLASS);
	});

	it("draws its own image when not dimmed", () => {
		register();
		render(<ClassicyIconImage src="app.png" alt="App" />);
		expect(screen.getByAltText("App").getAttribute("src")).toBe("app.png");
	});
});
