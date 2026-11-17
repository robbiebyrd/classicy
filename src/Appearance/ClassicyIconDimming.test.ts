import { afterEach, describe, expect, it, vi } from "vitest";
import "../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	type ClassicyIconDimmingRule,
	classicyDimmedIconSource,
	dimClassicyIconPixels,
	resetClassicyDimmedIconsForTests,
	resolveClassicyIconDimmingRule,
} from "@/Appearance/ClassicyIconDimming";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

// Story 0214-c61 fix round 3: a hidden application's icon is dimmed by the
// active package's declared rule, per pixel, on a canvas: blend each channel
// toward a color, quantize to `bits` per channel, then (optionally) take the
// nearest entry of a palette over all three channels at once.

const SYSTEM7_LIKE: ClassicyIconDimmingRule = {
	blend: { color: "#ffffff", amount: 0.5 },
	bits: 4,
	palette: ["#777777", "#999999", "#AAAAAA", "#eeeeee", "#ffffff", "#66cc66"],
};

const px = (...rgba: number[][]) => new Uint8ClampedArray(rgba.flat());

describe("dimClassicyIconPixels", () => {
	it("blends toward the color rounding down, quantizes to the bits, and snaps to the palette", () => {
		const data = px(
			[0, 0, 0, 255],
			[204, 204, 204, 255],
			[68, 68, 68, 255],
			[34, 34, 34, 255],
			[0, 187, 0, 255],
		);
		dimClassicyIconPixels(data, SYSTEM7_LIKE);
		expect([...data]).toEqual([
			0x77, 0x77, 0x77, 255, 0xee, 0xee, 0xee, 255, 0xaa, 0xaa, 0xaa, 255, 0x99,
			0x99, 0x99, 255, 0x66, 0xcc, 0x66, 255,
		]);
	});

	it("keeps the alpha mask: a clear pixel stays clear and is not recolored", () => {
		const data = px([10, 20, 30, 0], [0, 0, 0, 255]);
		dimClassicyIconPixels(data, SYSTEM7_LIKE);
		expect([...data.slice(0, 4)]).toEqual([10, 20, 30, 0]);
		expect(data[7]).toBe(255);
	});

	it("quantizes without a palette when none is given", () => {
		const data = px([0, 0, 0, 255]);
		dimClassicyIconPixels(data, {
			blend: { color: "#ffffff", amount: 0.5 },
			bits: 4,
		});
		expect([...data]).toEqual([0x77, 0x77, 0x77, 255]);
	});
});

describe("classicyDimmedIconSource", () => {
	afterEach(() => {
		resetClassicyDimmedIconsForTests();
		vi.restoreAllMocks();
	});

	/** A canvas whose 2D context draws nothing and reads `pixels`. */
	const fakeCanvas = (getImageData: () => ImageData) => {
		const ctx = {
			drawImage: vi.fn(),
			getImageData: vi.fn(getImageData),
			putImageData: vi.fn(),
		};
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
			() => ctx as unknown as CanvasRenderingContext2D,
		);
		vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
			"data:image/png;base64,DIMMED",
		);
		return ctx;
	};
	const loaded = () =>
		vi.spyOn(globalThis, "Image").mockImplementation(function (
			this: HTMLImageElement,
		) {
			const img = document.createElement("img");
			Object.defineProperty(img, "naturalWidth", { value: 16 });
			Object.defineProperty(img, "naturalHeight", { value: 16 });
			queueMicrotask(() => img.onload?.(new Event("load")));
			return img;
		} as unknown as typeof Image);

	it("draws the icon dimmed and caches it per source and rule", async () => {
		loaded();
		const ctx = fakeCanvas(
			() =>
				({
					data: new Uint8ClampedArray(16 * 16 * 4),
					width: 16,
					height: 16,
				}) as ImageData,
		);
		const first = await classicyDimmedIconSource("icon.png", SYSTEM7_LIKE);
		expect(first).toBe("data:image/png;base64,DIMMED");
		const again = await classicyDimmedIconSource("icon.png", SYSTEM7_LIKE);
		expect(again).toBe(first);
		expect(ctx.getImageData).toHaveBeenCalledTimes(1);
		expect(ctx.putImageData).toHaveBeenCalledTimes(1);
	});

	// The one case a browser forbids: a cross-origin icon served without
	// CORS taints the canvas, so its pixels cannot be read. No image then:
	// the package's stylesheet dims the icon its own way (an opacity).
	it("gives no image for an icon that taints the canvas", async () => {
		loaded();
		fakeCanvas(() => {
			throw new DOMException("tainted", "SecurityError");
		});
		await expect(
			classicyDimmedIconSource(
				"https://elsewhere.example/icon.png",
				SYSTEM7_LIKE,
			),
		).resolves.toBeUndefined();
	});
});

describe("resolveClassicyIconDimmingRule", () => {
	const makePackage = (
		id: string,
		overrides: Partial<ClassicyAppearancePackage> = {},
	): ClassicyAppearancePackage => ({
		id,
		name: id,
		css: "",
		defaults: { ...getTheme("default"), package: id },
		layout: {
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		},
		...overrides,
	});
	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		vi.restoreAllMocks();
	});

	it("reads the package's rule, and a variant's override (null: none)", () => {
		registerClassicyAppearancePackage(
			makePackage("dims", {
				iconDimming: {
					hiddenApp: SYSTEM7_LIKE,
					variants: { bw: { hiddenApp: null } },
				},
			}),
		);
		expect(
			resolveClassicyIconDimmingRule("hiddenApp", "dims", undefined),
		).toEqual(SYSTEM7_LIKE);
		expect(
			resolveClassicyIconDimmingRule("hiddenApp", "dims", "other"),
		).toEqual(SYSTEM7_LIKE);
		expect(
			resolveClassicyIconDimmingRule("hiddenApp", "dims", "bw"),
		).toBeUndefined();
	});

	it("is undefined for a package that declares no rule", () => {
		registerClassicyAppearancePackage(makePackage("plain"));
		expect(
			resolveClassicyIconDimmingRule("hiddenApp", "plain", undefined),
		).toBeUndefined();
	});

	it("refuses a malformed rule at registration", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		registerClassicyAppearancePackage(
			makePackage("bad", {
				iconDimming: {
					hiddenApp: { blend: { color: "white", amount: 2 }, bits: 9 },
				},
			}),
		);
		expect(getClassicyAppearancePackage("bad")).toBeUndefined();
	});
});
