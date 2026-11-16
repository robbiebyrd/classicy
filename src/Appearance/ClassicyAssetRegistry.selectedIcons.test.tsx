// Selected icon images (story 0197-s0z): a package may register, for an icon
// image, the image its selected icon draws (System 7's color icons darken
// through the 8-bit color table, which no CSS filter draws exactly). A
// selected icon draws it, marked so the package's own darkening stands down.
import { act, cleanup, fireEvent, render } from "@testing-library/react";
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
	registerClassicySelectedIconImages,
	resetClassicyAssets,
	resolveClassicyIconImage,
} from "@/Appearance/ClassicyAssetRegistry";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyIcon } from "@/SystemFolder/SystemResources/Icon/ClassicyIcon";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import { resetClassicySelectedIconImagesForTests } from "@/SystemFolder/SystemResources/Icon/ClassicySelectedIconImage.internal";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

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

const activate = (packageId: string, assetVariant?: string) =>
	act(() => {
		const theme: ClassicyTheme = {
			...getTheme("default"),
			id: `${packageId}-${assetVariant ?? "base"}`,
			package: packageId,
		};
		if (assetVariant !== undefined) theme.assetVariant = assetVariant;
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Appearance.packageId = packageId;
				draft.System.Manager.Appearance.activeTheme = theme;
			}),
		);
	});

// jsdom loads no image: this one "loads" when the test says so.
const pendingLoads: Array<() => void> = [];
class FakeImage {
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;
	set src(_value: string) {
		pendingLoads.push(() => this.onload?.());
	}
}
const loadImages = () =>
	act(() => {
		for (const load of pendingLoads.splice(0)) load();
	});

const SINK = "selected-icons-test";
let entries: ClassicyLogEntry[] = [];

beforeEach(() => {
	vi.stubGlobal("Image", FakeImage);
	pendingLoads.length = 0;
	resetClassicySelectedIconImagesForTests();
	resetClassicyAssets();
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
	entries = [];
	vi.spyOn(console, "warn").mockImplementation(() => {});
	registerClassicyLogSink({ id: SINK, onLog: (e) => entries.push(e) });
	registerClassicyAppearancePackage(stub("platinum"));
	registerClassicyAppearancePackage(stub("sys7"));
	registerClassicyAssets("icons", "sys7", {
		folder: { src: "/folder.png", small: "/folder-16.png" },
	});
	registerClassicySelectedIconImages("sys7", {
		"/folder.png": "/folder-selected.png",
		"/folder-16.png": "/folder-16-selected.png",
	});
	activate("sys7");
});

afterEach(() => {
	cleanup();
	unregisterClassicyLogSink(SINK);
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	resetClassicyAssets();
	resetClassicyAppearancePackagesForTests();
});

describe("selected icon images", () => {
	it("resolves the active package's selected image of the image drawn, at either size", () => {
		expect(resolveClassicyIconImage("/folder.png", 32, true)).toBe(
			"/folder-selected.png",
		);
		expect(resolveClassicyIconImage("/folder.png", 16, true)).toBe(
			"/folder-16-selected.png",
		);
		// Not selected, or an image with none: unchanged.
		expect(resolveClassicyIconImage("/folder.png", 32)).toBe("/folder.png");
		expect(resolveClassicyIconImage("/doc.png", 32, true)).toBe("/doc.png");
	});

	it("belongs to the look that registered it: a variant's theme draws the variant's", () => {
		registerClassicyAssets(
			"icons",
			"sys7",
			{ folder: { src: "/bw-folder.png" } },
			{ variant: "bw" },
		);
		activate("sys7", "bw");
		// The base tree's selected images are not the 1-bit look's.
		expect(resolveClassicyIconImage("/folder.png", 32, true)).toBe(
			"/folder.png",
		);
		registerClassicySelectedIconImages(
			"sys7",
			{ "/folder.png": "/folder-bw-selected.png" },
			{ variant: "bw" },
		);
		expect(resolveClassicyIconImage("/folder.png", 32, true)).toBe(
			"/folder-bw-selected.png",
		);
		activate("sys7");
		expect(resolveClassicyIconImage("/folder.png", 32, true)).toBe(
			"/folder-selected.png",
		);
	});

	it("belongs to its package: another package draws its own", () => {
		activate("platinum");
		expect(resolveClassicyIconImage("/folder.png", 32, true)).toBe(
			"/folder.png",
		);
	});

	it("drops an entry that is not a safe asset source, with a warning", () => {
		registerClassicySelectedIconImages("sys7", {
			"/a.png": 'x") ; background: url("evil',
			"/b.png": "/b-selected.png",
		});
		expect(resolveClassicyIconImage("/a.png", 32, true)).toBe("/a.png");
		expect(resolveClassicyIconImage("/b.png", 32, true)).toBe(
			"/b-selected.png",
		);
		expect(entries.some((e) => e.level === "warn")).toBe(true);
	});

	it("is cleared by resetClassicyAssets", () => {
		resetClassicyAssets();
		expect(resolveClassicyIconImage("/folder-selected.png", 32, true)).toBe(
			"/folder-selected.png",
		);
		expect(resolveClassicyIconImage("/folder.png", 32, true)).toBe(
			"/folder.png",
		);
	});

	it("is drawn by a selected icon, marked, and only then", () => {
		const { container } = render(
			<ClassicyIcon appId="a" name="Folder" icon="/folder.png" size={32} />,
		);
		const img = () => container.querySelector("img") as HTMLImageElement;
		const outer = () =>
			container.querySelector(".classicyIconMaskOuter") as HTMLElement;
		expect(img().getAttribute("src")).toBe("/folder.png");
		expect(outer().classList.contains("classicyIconSelectedImage")).toBe(false);
		// A click selects it. Until its selected image has loaded it keeps the
		// plain one, unmarked, so the package's own selected look stays: no
		// flash on the first selection.
		fireEvent.click(container.querySelector('[role="button"]') as HTMLElement);
		expect(img().getAttribute("src")).toBe("/folder.png");
		expect(outer().classList.contains("classicyIconSelectedImage")).toBe(false);
		loadImages();
		expect(img().getAttribute("src")).toBe("/folder-selected.png");
		expect(outer().classList.contains("classicyIconSelectedImage")).toBe(true);
		// The mask keeps the plain image's shape.
		expect(outer().style.getPropertyValue("--classicy-icon-mask")).toBe(
			'url("/folder.png")',
		);
	});

	it("is preloaded when the icon mounts, so a later selection draws it at once", () => {
		const { container } = render(
			<ClassicyIcon appId="a" name="Folder" icon="/folder.png" size={32} />,
		);
		expect(pendingLoads).toHaveLength(1);
		loadImages();
		fireEvent.click(container.querySelector('[role="button"]') as HTMLElement);
		expect(container.querySelector("img")?.getAttribute("src")).toBe(
			"/folder-selected.png",
		);
	});

	it("is drawn by ClassicyIconImage only when asked for", () => {
		const { container, rerender } = render(
			<ClassicyIconImage src="/folder.png" drawnAt={32} alt="" />,
		);
		loadImages();
		expect(container.querySelector("img")?.getAttribute("src")).toBe(
			"/folder.png",
		);
		rerender(
			<ClassicyIconImage src="/folder.png" drawnAt={32} alt="" selected />,
		);
		loadImages();
		expect(container.querySelector("img")?.getAttribute("src")).toBe(
			"/folder-selected.png",
		);
	});
});
