import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
	classicyIconEmbossColors,
	dimClassicyIconPixels,
	embossClassicyIconPixels,
	resolveClassicyIconDimmingRule,
} from "@/Appearance/ClassicyIconDimming";
import { resetClassicyDimmedIconsForTests } from "@/Appearance/ClassicyIconDimming.internal";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

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

describe("classicyDimmedIconSource: failures are logged", () => {
	const entries: ClassicyLogEntry[] = [];
	const failing = (event: "error" | "load") =>
		vi.spyOn(globalThis, "Image").mockImplementation(function (
			this: HTMLImageElement,
		) {
			const img = document.createElement("img");
			Object.defineProperty(img, "naturalWidth", { value: 16 });
			Object.defineProperty(img, "naturalHeight", { value: 16 });
			queueMicrotask(() =>
				event === "error"
					? img.onerror?.(new Event("error"))
					: img.onload?.(new Event("load")),
			);
			return img;
		} as unknown as typeof Image);
	const sunk = () => entries.filter((e) => e.subsystem === "Appearance");

	beforeEach(() => {
		entries.length = 0;
		registerClassicyLogSink({
			id: "icon-dimming-test",
			onLog: (entry) => entries.push(entry),
		});
	});
	afterEach(() => {
		unregisterClassicyLogSink("icon-dimming-test");
		resetClassicyDimmedIconsForTests();
		vi.restoreAllMocks();
	});

	// The real path for a cross-origin icon served without CORS: with
	// crossOrigin = "anonymous" the load itself fails.
	it("warns once per source when the icon fails to load", async () => {
		failing("error");
		const src = "https://elsewhere.example/icon.png";
		await expect(
			classicyDimmedIconSource(src, SYSTEM7_LIKE),
		).resolves.toBeUndefined();
		// Another size of the same source is another cache key; still one warning.
		await expect(
			classicyDimmedIconSource(src, SYSTEM7_LIKE, 16),
		).resolves.toBeUndefined();
		const warnings = sunk().filter((e) => e.level === "warn");
		expect(warnings).toHaveLength(1);
		expect(warnings[0].message).toContain(src);
	});

	it("tries a failed load again on a later request, without logging again", async () => {
		const image = failing("error");
		const src = "https://elsewhere.example/icon.png";
		await classicyDimmedIconSource(src, SYSTEM7_LIKE);
		await classicyDimmedIconSource(src, SYSTEM7_LIKE);
		expect(image).toHaveBeenCalledTimes(2);
		expect(sunk().filter((e) => e.level === "warn")).toHaveLength(1);
	});

	it("warns once per source when the canvas is tainted, and does not retry", async () => {
		const image = failing("load");
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
			() =>
				({
					drawImage: vi.fn(),
					getImageData: () => {
						throw new DOMException("tainted", "SecurityError");
					},
					putImageData: vi.fn(),
				}) as unknown as CanvasRenderingContext2D,
		);
		const src = "https://elsewhere.example/tainted.png";
		await classicyDimmedIconSource(src, SYSTEM7_LIKE);
		await classicyDimmedIconSource(src, SYSTEM7_LIKE, 16);
		await classicyDimmedIconSource(src, SYSTEM7_LIKE);
		const warnings = sunk().filter((e) => e.level === "warn");
		expect(warnings).toHaveLength(1);
		expect(warnings[0].message).toContain(src);
		// A taint is the same every time; only the size's own key draws again.
		expect(image).toHaveBeenCalledTimes(2);
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

// The 98.js report's 2.7: Windows draws a disabled toolbar button's image as
// DrawState's DSS_DISABLED does (comctl32's TOOLBAR_DrawMasked): the opaque
// pixels that are not white, in ButtonShadow, over the same pixels one down
// and right in ButtonHilight; everything else clear. Only a package that
// declares an emboss rule for `disabledControl` gets it (Windows 98).
describe("embossClassicyIconPixels", () => {
	it("draws the opaque, non-white pixels in the shadow over a copy one pixel down and right in the highlight", () => {
		// 3 x 2: an ink pixel, a white one, a clear one / an ink pixel, a
		// half-clear one, a translucent ink pixel.
		const data = px(
			[10, 20, 30, 255],
			[255, 255, 255, 255],
			[0, 0, 0, 0],
			[200, 0, 0, 200],
			[5, 5, 5, 127],
			[1, 2, 3, 128],
		);
		embossClassicyIconPixels(data, 3, 2, "#ffffff", "#808080");
		const at = (x: number, y: number) =>
			[...data.slice((y * 3 + x) * 4, (y * 3 + x) * 4 + 4)].join(",");
		// Ink at (0,0), (0,1) and (2,1): the shadow there.
		expect(at(0, 0)).toBe("128,128,128,255");
		expect(at(0, 1)).toBe("128,128,128,255");
		expect(at(2, 1)).toBe("128,128,128,255");
		// The highlight one down and right of (0,0); (0,1)'s and (2,1)'s fall
		// outside the image.
		expect(at(1, 1)).toBe("255,255,255,255");
		// The white pixel and the clear ones are clear.
		expect(at(1, 0)).toBe("0,0,0,0");
		expect(at(2, 0)).toBe("0,0,0,0");
	});
});

describe("disabledControl: an emboss in theme colors", () => {
	const EMBOSS = {
		emboss: {
			highlight: { colorKey: "system" as const, index: 0 as const },
			shadow: { colorKey: "system" as const, index: 4 as const },
		},
	};
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

	it("registers an emboss rule for disabledControl and reads its colors from a theme", () => {
		registerClassicyAppearancePackage(
			makePackage("embosses", { iconDimming: { disabledControl: EMBOSS } }),
		);
		const rule = resolveClassicyIconDimmingRule(
			"disabledControl",
			"embosses",
			undefined,
		);
		expect(rule).toEqual(EMBOSS);
		const theme = getTheme("default");
		expect(
			classicyIconEmbossColors(EMBOSS, {
				...theme,
				color: {
					...theme.color,
					system: [0xffffff, 1, 2, 3, 0x808080, 5, 6],
				},
			}),
		).toEqual({ emboss: { highlight: "#ffffff", shadow: "#808080" } });
		expect(classicyIconEmbossColors(EMBOSS, undefined)).toBeUndefined();
	});

	// The other purposes keep the per-pixel rule alone; a package that
	// declares no disabledControl rule (Platinum, System 7) has none.
	it("refuses an emboss rule for another purpose, and resolves none where none is declared", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		registerClassicyAppearancePackage(
			makePackage("misplaced", {
				iconDimming: {
					hiddenApp: EMBOSS as unknown as ClassicyIconDimmingRule,
				},
			}),
		);
		expect(getClassicyAppearancePackage("misplaced")).toBeUndefined();
		registerClassicyAppearancePackage(makePackage("plain"));
		expect(
			resolveClassicyIconDimmingRule("disabledControl", "plain", undefined),
		).toBeUndefined();
	});

	it("draws an emboss rule's image and caches it per colors", async () => {
		vi.spyOn(globalThis, "Image").mockImplementation(function (
			this: HTMLImageElement,
		) {
			const img = document.createElement("img");
			Object.defineProperty(img, "naturalWidth", { value: 2 });
			Object.defineProperty(img, "naturalHeight", { value: 2 });
			queueMicrotask(() => img.onload?.(new Event("load")));
			return img;
		} as unknown as typeof Image);
		const pixels = new Uint8ClampedArray([
			0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
		]);
		const ctx = {
			drawImage: vi.fn(),
			getImageData: vi.fn(() => ({ data: pixels, width: 2, height: 2 })),
			putImageData: vi.fn(),
		};
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
			() => ctx as unknown as CanvasRenderingContext2D,
		);
		vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
			"data:image/png;base64,EMBOSSED",
		);
		const colors = { emboss: { highlight: "#ffffff", shadow: "#808080" } };
		await expect(
			classicyDimmedIconSource("tool.png", colors, Number.POSITIVE_INFINITY),
		).resolves.toBe("data:image/png;base64,EMBOSSED");
		expect([...pixels]).toEqual([
			128, 128, 128, 255, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255,
		]);
		await classicyDimmedIconSource(
			"tool.png",
			{ ...colors },
			Number.POSITIVE_INFINITY,
		);
		expect(ctx.getImageData).toHaveBeenCalledTimes(1);
		resetClassicyDimmedIconsForTests();
	});
});
