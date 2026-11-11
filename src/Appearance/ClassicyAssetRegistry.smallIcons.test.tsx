// Small icon images (plan 0018-dbd 1.2): an icon tree leaf may be
// `{ src, small }`; a render at the small-icon size draws `small`, every other
// render (and every plain-string leaf) draws `src`.
import { act, cleanup, render, screen } from "@testing-library/react";
import { produce } from "immer";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	type ClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	CLASSICY_SMALL_ICON_SIZE,
	registerClassicyAssets,
	resetClassicyAssets,
	resolveClassicyAsset,
	resolveClassicyIcon,
	resolveClassicyIconImage,
	useClassicyAssetTree,
	useClassicyIconImage,
} from "@/Appearance/ClassicyAssetRegistry";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyIcon } from "@/SystemFolder/SystemResources/Icon/ClassicyIcon";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { ClassicyMenu } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

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

const SINK = "small-icons-test";
let entries: ClassicyLogEntry[] = [];

beforeEach(() => {
	resetClassicyAssets();
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
	entries = [];
	vi.spyOn(console, "warn").mockImplementation(() => {});
	registerClassicyLogSink({ id: SINK, onLog: (e) => entries.push(e) });
	registerClassicyAppearancePackage(stub("platinum"));
	registerClassicyAppearancePackage(stub("sys7"));
	registerClassicyAssets("icons", "platinum", { plain: "/plain.png" });
	registerClassicyAssets("icons", "sys7", {
		folder: { src: "/folder.png", small: "/folder-16.png" },
		doc: { src: "/doc.png" },
		plain: "/sys7-plain.png",
	});
	registerClassicyAssets(
		"icons",
		"sys7",
		{ folder: { src: "/bw-folder.png", small: "/bw-folder-16.png" } },
		{ variant: "bw" },
	);
	activate("sys7");
});

afterEach(() => {
	cleanup();
	unregisterClassicyLogSink(SINK);
	vi.restoreAllMocks();
	resetClassicyAssets();
	resetClassicyAppearancePackagesForTests();
});

describe("icon leaves with a small image", () => {
	it("resolves src for the plain lookup and both images for the icon lookup", () => {
		expect(resolveClassicyAsset("icons", "folder")).toBe("/folder.png");
		expect(resolveClassicyIcon("folder")).toEqual({
			src: "/folder.png",
			small: "/folder-16.png",
		});
		expect(resolveClassicyIcon("doc")).toEqual({ src: "/doc.png" });
		expect(resolveClassicyIcon("plain")).toEqual({ src: "/sys7-plain.png" });
	});

	it("draws small at the small-icon size or less, src above it", () => {
		expect(CLASSICY_SMALL_ICON_SIZE).toBe(16);
		expect(resolveClassicyIconImage("/folder.png", 16)).toBe("/folder-16.png");
		expect(resolveClassicyIconImage("/folder.png", 12)).toBe("/folder-16.png");
		expect(resolveClassicyIconImage("/folder.png", true)).toBe(
			"/folder-16.png",
		);
		expect(resolveClassicyIconImage("/folder.png", 17)).toBe("/folder.png");
		expect(resolveClassicyIconImage("/folder.png", 32)).toBe("/folder.png");
	});

	it("scales a leaf with no small image, and an unregistered URL", () => {
		expect(resolveClassicyIconImage("/doc.png", 16)).toBe("/doc.png");
		expect(resolveClassicyIconImage("/sys7-plain.png", 16)).toBe(
			"/sys7-plain.png",
		);
		expect(resolveClassicyIconImage("/elsewhere.png", 16)).toBe(
			"/elsewhere.png",
		);
	});

	it("survives a deep merge: a later registration of a sibling keeps small", () => {
		registerClassicyAssets("icons", "sys7", { other: "/other.png" });
		registerClassicyAssets("icons", "sys7", {
			folder: { src: "/folder.png", small: "/folder-16-b.png" },
		});
		expect(resolveClassicyIcon("folder")?.small).toBe("/folder-16-b.png");
		expect(resolveClassicyIcon("doc")?.src).toBe("/doc.png");
		const tree = renderTree();
		expect(Object.keys(tree).sort()).toEqual(
			expect.arrayContaining(["doc", "folder", "other", "plain"]),
		);
	});

	it("a plain string replaces a leaf and drops its small image", () => {
		registerClassicyAssets("icons", "sys7", { folder: "/flat.png" });
		expect(resolveClassicyIcon("folder")).toEqual({ src: "/flat.png" });
		expect(resolveClassicyIconImage("/folder.png", 16)).toBe("/folder.png");
	});

	it("a variant tree's leaves carry small too", () => {
		activate("sys7", "bw");
		expect(resolveClassicyAsset("icons", "folder")).toBe("/bw-folder.png");
		expect(resolveClassicyIcon("folder")).toEqual({
			src: "/bw-folder.png",
			small: "/bw-folder-16.png",
		});
		expect(resolveClassicyIconImage("/bw-folder.png", 16)).toBe(
			"/bw-folder-16.png",
		);
		// The base tree's image is not in the active (bw) icon set.
		expect(resolveClassicyIconImage("/folder.png", 16)).toBe("/folder.png");
		activate("sys7");
		expect(resolveClassicyIconImage("/folder.png", 16)).toBe("/folder-16.png");
	});

	it("a variant plain string over a base leaf has no small image", () => {
		registerClassicyAssets(
			"icons",
			"sys7",
			{ doc: { src: "/bw-doc.png", small: "/bw-doc-16.png" } },
			{ variant: "bw" },
		);
		registerClassicyAssets(
			"icons",
			"sys7",
			{ folder: "/bw-flat.png" },
			{
				variant: "bw",
			},
		);
		activate("sys7", "bw");
		expect(resolveClassicyIcon("folder")).toEqual({ src: "/bw-flat.png" });
		expect(resolveClassicyIcon("doc")?.small).toBe("/bw-doc-16.png");
	});

	it("refuses an unsafe small image but keeps the leaf's src", () => {
		registerClassicyAssets("icons", "sys7", {
			bad: { src: "/ok.png", small: 'x".png' },
			worse: { src: "javascript:alert(1)", small: "/s.png" },
		});
		expect(resolveClassicyIcon("bad")).toEqual({ src: "/ok.png" });
		expect(resolveClassicyIcon("worse")).toBeUndefined();
		expect(entries.filter((e) => e.level === "warn")).toHaveLength(2);
	});

	it("takes the object form for icons only", () => {
		registerClassicyAssets("systemArt", "sys7", {
			x: { src: "/art.png" },
		} as never);
		expect(resolveClassicyAsset("systemArt", "x.src", "sys7")).toBe("/art.png");
		expect(resolveClassicyAsset("systemArt", "x", "sys7")).toBeUndefined();
	});
});

const renderTree = () => {
	let seen: Record<string, unknown> = {};
	const Probe = () => {
		seen = useClassicyAssetTree("icons");
		return null;
	};
	render(createElement(Probe));
	return seen;
};

describe("components draw the right image", () => {
	it("ClassicyIcon: small at 16 px, src at 32 px and at the default size", () => {
		const { rerender } = render(
			<ClassicyIcon appId="T.app" name="Folder" icon="/folder.png" size={16} />,
		);
		expect(screen.getByRole("img").getAttribute("src")).toBe("/folder-16.png");
		rerender(
			<ClassicyIcon appId="T.app" name="Folder" icon="/folder.png" size={32} />,
		);
		expect(screen.getByRole("img").getAttribute("src")).toBe("/folder.png");
		rerender(<ClassicyIcon appId="T.app" name="Folder" icon="/folder.png" />);
		expect(screen.getByRole("img").getAttribute("src")).toBe("/folder.png");
	});

	it("ClassicyIcon: a plain-string leaf scales as today", () => {
		render(
			<ClassicyIcon
				appId="T.app"
				name="Plain"
				icon="/sys7-plain.png"
				size={16}
			/>,
		);
		expect(screen.getByRole("img").getAttribute("src")).toBe("/sys7-plain.png");
	});

	it("ClassicyIcon follows a late registration", () => {
		render(
			<ClassicyIcon appId="T.app" name="Folder" icon="/folder.png" size={16} />,
		);
		expect(screen.getByRole("img").getAttribute("src")).toBe("/folder-16.png");
		act(() => {
			registerClassicyAssets("icons", "sys7", {
				folder: { src: "/folder.png", small: "/late-16.png" },
			});
		});
		expect(screen.getByRole("img").getAttribute("src")).toBe("/late-16.png");
	});

	it("a hook reads small for a CSS-sized surface", () => {
		const Probe = () => <i data-src={useClassicyIconImage("/folder.png")} />;
		const { container } = render(<Probe />);
		expect(container.querySelector("i")?.getAttribute("data-src")).toBe(
			"/folder-16.png",
		);
	});

	it("menu items draw small; a string-prop icon with no leaf is unchanged", () => {
		render(
			<ClassicyMenu
				name="M"
				menuItems={[
					{ id: "a", title: "A", icon: "/folder.png" },
					{ id: "b", title: "B", icon: "/not-registered.png" },
				]}
			/>,
		);
		expect(screen.getByAltText("A").getAttribute("src")).toBe("/folder-16.png");
		expect(screen.getByAltText("B").getAttribute("src")).toBe(
			"/not-registered.png",
		);
	});

	it("control labels draw small only for a small icon", () => {
		const { rerender } = render(
			<ClassicyControlLabel label="L" icon="/folder.png" iconSize="sm" />,
		);
		expect(screen.getByAltText("L").getAttribute("src")).toBe("/folder-16.png");
		rerender(<ClassicyControlLabel label="L" icon="/folder.png" />);
		expect(screen.getByAltText("L").getAttribute("src")).toBe("/folder.png");
	});
});

describe("bevel button icons", () => {
	it("draw small only when the surface says it is small", () => {
		const { container, rerender } = render(
			<ClassicyBevelButton icon="/folder.png" iconSmall />,
		);
		expect(
			container.querySelector(".classicyBevelButtonIcon")?.getAttribute("src"),
		).toBe("/folder-16.png");
		rerender(<ClassicyBevelButton icon="/folder.png" />);
		expect(
			container.querySelector(".classicyBevelButtonIcon")?.getAttribute("src"),
		).toBe("/folder.png");
	});
});
