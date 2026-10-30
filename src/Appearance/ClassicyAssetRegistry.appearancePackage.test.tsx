import { act, render } from "@testing-library/react";
import { produce } from "immer";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type ClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	getActiveClassicyAppearancePackageId,
	registerClassicyAssets,
	registerClassicySystemArt,
	resetClassicyAssets,
	resolveClassicyAsset,
	useClassicyAsset,
	useClassicyAssetTree,
	useClassicyAssetVars,
} from "@/Appearance/ClassicyAssetRegistry";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

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

const setPackageId = (packageId: string) =>
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Appearance.packageId = packageId;
			}),
		);
	});

const captureHook = <T,>(hook: () => T) => {
	const seen: T[] = [];
	const Probe = () => {
		seen.push(hook());
		return null;
	};
	render(createElement(Probe));
	return seen;
};

beforeEach(() => {
	resetClassicyAssets();
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
	registerClassicyAssets("icons", "platinum", { app: "/platinum.png" });
	registerClassicyAssets("icons", "irix", { app: "/irix.png" });
});

afterEach(() => {
	resetClassicyAssets();
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
});

describe("the asset registry follows the active Appearance Package", () => {
	it("reads the store's resolved package id at call time", () => {
		registerClassicyAppearancePackage(stub("irix"));
		expect(getActiveClassicyAppearancePackageId()).toBe("platinum");
		expect(resolveClassicyAsset("icons", "app")).toBe("/platinum.png");
		setPackageId("irix");
		expect(getActiveClassicyAppearancePackageId()).toBe("irix");
		expect(resolveClassicyAsset("icons", "app")).toBe("/irix.png");
	});

	it("an unregistered stored id resolves as platinum", () => {
		setPackageId("irix");
		expect(getActiveClassicyAppearancePackageId()).toBe("platinum");
		expect(resolveClassicyAsset("icons", "app")).toBe("/platinum.png");
	});

	it("switching packageId re-renders a useClassicyAsset consumer", () => {
		registerClassicyAppearancePackage(stub("irix"));
		const seen = captureHook(() => useClassicyAsset("icons", "app"));
		expect(seen.at(-1)).toBe("/platinum.png");
		setPackageId("irix");
		expect(seen.at(-1)).toBe("/irix.png");
	});

	it("registering the stored package re-renders a useClassicyAsset consumer", () => {
		setPackageId("irix");
		const seen = captureHook(() => useClassicyAsset("icons", "app"));
		expect(seen.at(-1)).toBe("/platinum.png");
		act(() => registerClassicyAppearancePackage(stub("irix")));
		expect(seen.at(-1)).toBe("/irix.png");
	});

	it("does not re-render a consumer for store changes that keep the package", () => {
		registerClassicyAppearancePackage(stub("irix"));
		const seen = captureHook(() => useClassicyAsset("icons", "app"));
		const renders = seen.length;
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Appearance.alertVolume = 50;
				}),
			);
		});
		expect(seen.length).toBe(renders);
	});

	it("useClassicyAssetTree and useClassicyAssetVars follow a switch", () => {
		registerClassicyAppearancePackage(stub("irix"));
		registerClassicySystemArt("platinum", { sadMac: "/sad-platinum.png" });
		registerClassicySystemArt("irix", { sadMac: "/sad-irix.png" });
		const trees = captureHook(() => useClassicyAssetTree("icons"));
		const vars = captureHook(() => useClassicyAssetVars());
		expect(trees.at(-1)).toEqual({ app: "/platinum.png" });
		expect(vars.at(-1)?.["--classicy-art-sad-mac"]).toBe(
			'url("/sad-platinum.png")',
		);
		setPackageId("irix");
		expect(trees.at(-1)).toEqual({ app: "/irix.png" });
		expect(vars.at(-1)?.["--classicy-art-sad-mac"]).toBe(
			'url("/sad-irix.png")',
		);
	});
});

describe("the package source connection", () => {
	it("is not part of the public API", async () => {
		const api: Record<string, unknown> = await import("@/index");
		expect(api).not.toHaveProperty("connectClassicyAssetPackageSource");
		expect(api).toHaveProperty("getActiveClassicyAppearancePackageId");
	}, 60_000);
});
