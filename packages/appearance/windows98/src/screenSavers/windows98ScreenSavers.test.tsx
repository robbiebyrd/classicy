import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Platinum first, as a host loads it: its savers beside Windows 98's.
import "../../../platinum/src/index";
import "../index";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { ClassicyScreenSaverConfigForm } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverConfigForm";
import {
	listClassicyScreenSaversFor,
	resolveClassicyScreenSaverFor,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverOffer";
import {
	type ClassicyScreenSaverDefinition,
	getClassicyScreenSaver,
	resolveScreenSaverConfig,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import { ClassicyScreenSaverBlankScreen } from "./BlankScreen/ClassicyScreenSaverBlankScreen";
import { ClassicyScreenSaverFlyingThroughSpace } from "./FlyingThroughSpace/ClassicyScreenSaverFlyingThroughSpace";
import { ClassicyScreenSaverFlyingWindows } from "./FlyingWindows/ClassicyScreenSaverFlyingWindows";
import { ClassicyScreenSaverPipes } from "./Pipes/ClassicyScreenSaverPipes";
import { ClassicyScreenSaverScrollingMarquee } from "./ScrollingMarquee/ClassicyScreenSaverScrollingMarquee";
import {
	WINDOWS98_DEFAULT_SCREEN_SAVER,
	WINDOWS98_SCREEN_SAVER_IDS,
} from "./windows98ScreenSavers";

// Windows 98's screen savers as the core sees them: offered under Windows 98
// alone, by the Display control panel's names, with the .scr's options and
// defaults; and as they run: a still frame under reduced motion, nothing
// while the page is hidden, nothing without a canvas to draw on.

const saver = (id: string) =>
	getClassicyScreenSaver(id) as ClassicyScreenSaverDefinition;

describe("Windows 98's screen savers", () => {
	it("are offered under Windows 98 alone, by the names Windows 98 listed them under", () => {
		expect(
			listClassicyScreenSaversFor("windows98").map(({ id, name }) => [
				id,
				name,
			]),
		).toEqual([
			["3d-pipes", "3D Pipes"],
			["blank-screen", "Blank Screen"],
			["curves-and-colors", "Curves and Colors"],
			["flying-through-space", "Flying Through Space"],
			["flying-windows", "Flying Windows"],
			["mystify-your-mind", "Mystify Your Mind"],
			["scrolling-marquee", "Scrolling Marquee"],
		]);
		expect(WINDOWS98_SCREEN_SAVER_IDS).toHaveLength(7);
		for (const packageId of ["platinum", "system7"])
			for (const offered of listClassicyScreenSaversFor(packageId))
				expect(WINDOWS98_SCREEN_SAVER_IDS).not.toContain(offered.id);
	});

	it("default to Blank Screen, Windows 98 naming none", () => {
		expect(getClassicyAppearancePackage("windows98")?.defaultScreenSaver).toBe(
			WINDOWS98_DEFAULT_SCREEN_SAVER,
		);
		expect(resolveClassicyScreenSaverFor("windows98")?.id).toBe("blank-screen");
		// A stored choice offered under Windows 98 wins; Platinum's does not.
		expect(
			resolveClassicyScreenSaverFor("windows98", "mystify-your-mind")?.id,
		).toBe("mystify-your-mind");
		expect(
			resolveClassicyScreenSaverFor("windows98", "bouncing-ball")?.id,
		).toBe("blank-screen");
	});

	// The .scr files' own defaults (their control.ini readers' fallbacks).
	it("start from the .scr files' defaults", () => {
		expect(resolveScreenSaverConfig(saver("flying-through-space"))).toEqual({
			warpSpeed: 10,
			density: 25,
		});
		expect(resolveScreenSaverConfig(saver("flying-windows"))).toEqual({
			warpSpeed: 20,
			density: 25,
		});
		const polygon = {
			active: true,
			lines: 5,
			colors: "Multiple random colors",
			startColor: "Black",
			endColor: "White",
		};
		expect(resolveScreenSaverConfig(saver("mystify-your-mind"))).toEqual({
			polygon1: polygon,
			polygon2: polygon,
			clearScreen: true,
		});
		expect(resolveScreenSaverConfig(saver("curves-and-colors"))).toEqual({
			speed: 8,
			lines: 2,
			curves: 10,
			density: 6,
			colors: "Multiple random colors",
			color: "Red",
			clearScreen: true,
		});
		expect(resolveScreenSaverConfig(saver("scrolling-marquee"))).toEqual({
			position: "Random",
			backgroundColor: "Black",
			speed: 60,
			text: "Where do you want to go today?",
			font: "Arial",
			fontStyle: "Bold",
			size: 72,
			strikeout: false,
			underline: false,
			color: "Red",
		});
		expect(resolveScreenSaverConfig(saver("3d-pipes"))).toEqual({
			pipes: "Single",
			pipeStyle: "Traditional",
			jointType: "Elbow",
			resolution: 0,
			surfaceStyle: "Solid",
		});
		expect(saver("blank-screen").configSchema).toBeUndefined();
	});

	it("keep each option within the range its dialog allowed", () => {
		const fails = (id: string, config: Record<string, unknown>) =>
			saver(id).configSchema?.safeParse(config).success === false;
		expect(fails("flying-through-space", { density: 201 })).toBe(true);
		expect(fails("flying-windows", { density: 4 })).toBe(true);
		expect(fails("mystify-your-mind", { polygon1: { lines: 16 } })).toBe(true);
		expect(fails("curves-and-colors", { lines: 81 })).toBe(true);
		expect(fails("scrolling-marquee", { speed: 0 })).toBe(true);
		expect(fails("3d-pipes", { resolution: 201 })).toBe(true);
	});

	it("draw over the desktop only when Clear screen may be off", () => {
		expect(
			listClassicyScreenSaversFor("windows98")
				.filter((s) => s.transparentBackground)
				.map((s) => s.id),
		).toEqual(["curves-and-colors", "mystify-your-mind"]);
	});

	it("show their options as the Screen Saver panel's form", () => {
		render(
			<ClassicyScreenSaverConfigForm
				saver={saver("mystify-your-mind")}
				config={resolveScreenSaverConfig(saver("mystify-your-mind"))}
				onChange={() => {}}
			/>,
		);
		expect(screen.getByText("Polygon 1")).toBeTruthy();
		expect(screen.getByText("Polygon 2")).toBeTruthy();
		expect(screen.getByLabelText("Clear screen")).toBeTruthy();
		expect(screen.getAllByText("Lines")).toHaveLength(2);
	});
});

describe("a running Windows 98 saver", () => {
	let reduce = false;
	let hidden = false;
	const mediaListeners = new Set<() => void>();
	const frames: FrameRequestCallback[] = [];
	const puts: unknown[][] = [];
	const texts: unknown[][] = [];
	let raf: ReturnType<typeof vi.fn>;
	let cancel: ReturnType<typeof vi.fn>;
	let context: "2d" | null = "2d";

	beforeEach(() => {
		reduce = false;
		hidden = false;
		context = "2d";
		mediaListeners.clear();
		frames.length = 0;
		puts.length = 0;
		texts.length = 0;
		raf = vi.fn((callback: FrameRequestCallback) => frames.push(callback));
		cancel = vi.fn();
		vi.stubGlobal("requestAnimationFrame", raf);
		vi.stubGlobal("cancelAnimationFrame", cancel);
		vi.stubGlobal("matchMedia", (query: string) => ({
			get matches() {
				return query.includes("reduce") && reduce;
			},
			addEventListener: (_: string, listener: () => void) =>
				mediaListeners.add(listener),
			removeEventListener: (_: string, listener: () => void) =>
				mediaListeners.delete(listener),
		}));
		Object.defineProperty(document, "hidden", {
			configurable: true,
			get: () => hidden,
		});
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((
			type: string,
		) =>
			type === "2d" && context
				? {
						createImageData: (w: number, h: number) => ({
							data: new Uint8ClampedArray(w * h * 4),
							width: w,
							height: h,
						}),
						putImageData: (...args: unknown[]) => puts.push(args),
						fillRect: () => {},
						fillText: (...args: unknown[]) => texts.push(args),
						measureText: () => ({
							width: 200,
							fontBoundingBoxAscent: 50,
							fontBoundingBoxDescent: 10,
						}),
					}
				: null) as unknown as HTMLCanvasElement["getContext"]);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		Reflect.deleteProperty(document, "hidden");
	});

	const runFrames = (from: number, count: number, step = 60) => {
		for (let i = 0; i < count; i++) {
			const callback = frames.shift();
			act(() => callback?.(from + i * step));
		}
	};

	it("draws in its own canvas, on Windows 98's 55 ms tick", () => {
		const { container } = render(
			<ClassicyScreenSaverFlyingThroughSpace config={{}} />,
		);
		const root = container.firstElementChild;
		expect(root?.className).toBe("classicySaverFlyingThroughSpace");
		expect(
			root?.querySelector("canvas.classicySaverWindows98Canvas"),
		).toBeTruthy();
		// The first paint (the black screen), then a frame asked for.
		expect(puts).toHaveLength(1);
		expect(raf).toHaveBeenCalledTimes(1);
		runFrames(1000, 1);
		// No time has passed yet: no tick, no paint.
		expect(puts).toHaveLength(1);
		runFrames(1060, 1);
		expect(puts).toHaveLength(2);
		expect(raf).toHaveBeenCalledTimes(3);
	});

	it("draws one still frame under reduced motion and asks for no frame", () => {
		reduce = true;
		render(<ClassicyScreenSaverFlyingWindows config={{}} />);
		expect(puts).toHaveLength(1);
		expect(raf).not.toHaveBeenCalled();
		// Turned off, it runs on from there; turned on again, it stops.
		reduce = false;
		act(() => {
			for (const listener of mediaListeners) listener();
		});
		expect(raf).toHaveBeenCalledTimes(1);
		reduce = true;
		act(() => {
			for (const listener of mediaListeners) listener();
		});
		expect(cancel).toHaveBeenCalled();
	});

	it("stops while the page is hidden and resumes when it shows", () => {
		render(<ClassicyScreenSaverFlyingWindows config={{}} />);
		expect(raf).toHaveBeenCalledTimes(1);
		hidden = true;
		act(() => {
			document.dispatchEvent(new Event("visibilitychange"));
		});
		expect(cancel).toHaveBeenCalledTimes(1);
		frames.length = 0;
		hidden = false;
		act(() => {
			document.dispatchEvent(new Event("visibilitychange"));
		});
		expect(raf).toHaveBeenCalledTimes(2);
	});

	it("stops when it unmounts", () => {
		const { unmount } = render(
			<ClassicyScreenSaverFlyingWindows config={{}} />,
		);
		unmount();
		expect(cancel).toHaveBeenCalled();
		hidden = false;
		act(() => {
			document.dispatchEvent(new Event("visibilitychange"));
		});
		expect(raf).toHaveBeenCalledTimes(1);
	});

	it("draws nothing, and asks for no frame, without a canvas context", () => {
		context = null;
		render(<ClassicyScreenSaverFlyingWindows config={{}} />);
		render(<ClassicyScreenSaverPipes config={{}} />);
		expect(puts).toHaveLength(0);
		expect(raf).not.toHaveBeenCalled();
	});

	it("shows Scrolling Marquee's text in mid-screen as its still frame", () => {
		reduce = true;
		render(<ClassicyScreenSaverScrollingMarquee config={{ text: "Hello" }} />);
		expect(texts).toHaveLength(1);
		expect(texts[0]?.[0]).toBe("Hello");
		expect(texts[0]?.[1]).toBe(Math.trunc((window.innerWidth - 200) / 2));
	});

	it("leaves Blank Screen blank: a root, no canvas, the host's class and style after its own", () => {
		const { container } = render(
			<ClassicyScreenSaverBlankScreen
				config={{}}
				className="mine"
				style={{ opacity: 0.5 }}
			/>,
		);
		const root = container.firstElementChild as HTMLElement;
		expect(root.className).toBe("classicySaverBlankScreen mine");
		expect(root.style.opacity).toBe("0.5");
		expect(root.querySelector("canvas")).toBeNull();
		expect(raf).not.toHaveBeenCalled();
	});
});
