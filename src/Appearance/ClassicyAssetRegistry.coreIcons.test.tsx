// Core icon URLs follow the active package (story 0193-801, plan 0018-dbd
// 6.5): icons travel as plain URL strings, and a URL the default package
// registers for a key (the core's, `ClassicyIcons.*`) stands for that key, so
// every icon surface draws the active package's and theme variant's image
// for it. Nothing stored changes: the URL is the reference.
import { act, cleanup, render, screen } from "@testing-library/react";
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

const SINK = "core-icons-test";
let entries: ClassicyLogEntry[] = [];
const followWarnings = () =>
	entries.filter(
		(e) =>
			e.level === "warn" && /share an image the active theme/.test(e.message),
	);

beforeEach(() => {
	resetClassicyAssets();
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
	entries = [];
	vi.spyOn(console, "warn").mockImplementation(() => {});
	registerClassicyLogSink({ id: SINK, onLog: (e) => entries.push(e) });
	registerClassicyAppearancePackage(stub("platinum"));
	registerClassicyAppearancePackage(stub("sys7"));
	// The default package's (the core's) icons.
	registerClassicyAssets("icons", "platinum", {
		folders: { directory: "/core/folder.png", apps: "/core/apps.png" },
		drives: { disk: "/core/disk.png" },
		brand: "/core/brand.png",
	});
	registerClassicyAssets("icons", "sys7", {
		folders: {
			directory: { src: "/s7/folder.png", small: "/s7/folder-16.png" },
			apps: "/s7/folder.png",
		},
		drives: { disk: "/s7/disk.png" },
	});
	registerClassicyAssets(
		"icons",
		"sys7",
		{
			folders: { directory: "/bw/folder.png" },
			drives: { disk: { src: "/bw/disk.png", small: "/bw/disk-16.png" } },
		},
		{ variant: "bw" },
	);
	activate("platinum");
});

afterEach(() => {
	cleanup();
	unregisterClassicyLogSink(SINK);
	vi.restoreAllMocks();
	resetClassicyAssets();
	resetClassicyAppearancePackagesForTests();
});

describe("a core icon URL draws the active package's icon for its key", () => {
	it("draws as is under the default package", () => {
		for (const src of [
			"/core/folder.png",
			"/core/apps.png",
			"/core/disk.png",
			"/core/brand.png",
		]) {
			expect(resolveClassicyIconImage(src, 32)).toBe(src);
			expect(resolveClassicyIconImage(src, 16)).toBe(src);
		}
	});

	it("draws the active package's image for the key, its small at 16 px", () => {
		activate("sys7");
		expect(resolveClassicyIconImage("/core/folder.png", 32)).toBe(
			"/s7/folder.png",
		);
		expect(resolveClassicyIconImage("/core/folder.png", 16)).toBe(
			"/s7/folder-16.png",
		);
		// A key the package draws with another key's image takes its small too.
		expect(resolveClassicyIconImage("/core/apps.png", 16)).toBe(
			"/s7/folder-16.png",
		);
		expect(resolveClassicyIconImage("/core/disk.png", 32)).toBe("/s7/disk.png");
	});

	it("draws the theme variant's image, falling back to the base tree", () => {
		activate("sys7", "bw");
		expect(resolveClassicyIconImage("/core/disk.png", 32)).toBe("/bw/disk.png");
		expect(resolveClassicyIconImage("/core/disk.png", 16)).toBe(
			"/bw/disk-16.png",
		);
		expect(resolveClassicyIconImage("/core/folder.png", 32)).toBe(
			"/bw/folder.png",
		);
		// The variant has no `folders.apps`: the base tree's.
		expect(resolveClassicyIconImage("/core/apps.png", 32)).toBe(
			"/s7/folder.png",
		);
	});

	it("keeps a key the package does not draw, and any URL that is not the core's", () => {
		activate("sys7", "bw");
		expect(resolveClassicyIconImage("/core/brand.png", 32)).toBe(
			"/core/brand.png",
		);
		expect(resolveClassicyIconImage("/host/custom.png", 32)).toBe(
			"/host/custom.png",
		);
		// Another package's own URL is never translated.
		expect(resolveClassicyIconImage("/s7/disk.png", 32)).toBe("/s7/disk.png");
	});

	it("follows a later registration under the default package", () => {
		activate("sys7");
		expect(resolveClassicyIconImage("/core/disk.png", 32)).toBe("/s7/disk.png");
		registerClassicyAssets("icons", "platinum", {
			drives: { disk: "/host/disk.png" },
		});
		expect(resolveClassicyIconImage("/host/disk.png", 32)).toBe("/s7/disk.png");
		// The replaced URL no longer stands for the key.
		expect(resolveClassicyIconImage("/core/disk.png", 32)).toBe(
			"/core/disk.png",
		);
	});

	it("takes the first key in tree order for a URL several keys share, warning once when they differ", () => {
		registerClassicyAssets("icons", "platinum", {
			shared: { a: "/core/shared.png", b: "/core/shared.png" },
		});
		registerClassicyAssets("icons", "sys7", {
			shared: { a: "/s7/a.png", b: "/s7/b.png" },
		});
		activate("sys7");
		expect(resolveClassicyIconImage("/core/shared.png", 32)).toBe("/s7/a.png");
		expect(resolveClassicyIconImage("/core/shared.png", 32)).toBe("/s7/a.png");
		expect(followWarnings()).toHaveLength(1);
		// The keys, never the URL (a production build may inline a `data:` URI).
		expect(followWarnings()[0].message).toContain('"shared.a"');
		expect(followWarnings()[0].message).toContain('"shared.b"');
		expect(followWarnings()[0].message).not.toContain("/core/shared.png");
	});

	it("does not warn for a shared URL the package draws one way", () => {
		registerClassicyAssets("icons", "platinum", {
			shared: { a: "/core/shared.png", b: "/core/shared.png" },
		});
		activate("sys7");
		expect(resolveClassicyIconImage("/core/shared.png", 32)).toBe(
			"/core/shared.png",
		);
		expect(followWarnings()).toHaveLength(0);
	});
});

describe("icon surfaces re-draw on a package or variant switch", () => {
	it("ClassicyIcon and ClassicyIconImage follow the switch and back", () => {
		render(
			<>
				<ClassicyIcon
					appId="T.app"
					name="Disk"
					icon="/core/disk.png"
					size={32}
				/>
				<ClassicyIconImage src="/core/folder.png" alt="Folder" />
			</>,
		);
		const disk = () => screen.getByAltText("Disk").getAttribute("src");
		const folder = () => screen.getByAltText("Folder").getAttribute("src");
		expect(disk()).toBe("/core/disk.png");
		expect(folder()).toBe("/core/folder.png");

		activate("sys7", "bw");
		expect(disk()).toBe("/bw/disk.png");
		expect(folder()).toBe("/bw/folder.png");

		activate("sys7");
		expect(disk()).toBe("/s7/disk.png");
		expect(folder()).toBe("/s7/folder-16.png");

		activate("platinum");
		expect(disk()).toBe("/core/disk.png");
		expect(folder()).toBe("/core/folder.png");
	});
});
