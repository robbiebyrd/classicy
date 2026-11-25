import { readFileSync } from "node:fs";
import path from "node:path";
import { act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	getClassicyAppIdentityOverrides,
	getClassicyDesktopIconOverrides,
} from "@/Appearance/ClassicyAppIdentity";
import {
	type ClassicyAssetKind,
	type ClassicyAssetTree,
	type ClassicyCursorRole,
	resolveClassicyCursorHotspot,
	resolveClassicyIcon,
	resolveClassicyIconImage,
	resolveClassicyThemeAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import {
	defaultClassicyWallpaper,
	listClassicyWallpapers,
} from "@/Appearance/ClassicyWallpaperIndex";
import { getAllThemes } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getClassicySoundPack } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import {
	listClassicyScreenSaversFor,
	resolveClassicyScreenSaverFor,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverOffer";

// Loading Windows 98 beside Platinum and System 7, as the example app does,
// changes nothing either of them draws, plays or offers: its icons, system
// art, cursors, wallpapers, fonts, sound pack, screen savers, `apps` and
// `desktopIcons` are registered under `windows98` alone. Everything Platinum
// and System 7 resolve, under each of their themes (System 7's black-and-
// white and color variants included), is read before Windows 98 is imported
// and again after, and must be the same.

const PACKAGES = ["platinum", "system7"] as const;

const registrySource = readFileSync(
	path.resolve(
		import.meta.dirname,
		"../../../../src/Appearance/ClassicyAssetRegistry.ts",
	),
	"utf8",
);
const unionMembers = (typeName: string): string[] => {
	const match = new RegExp(`export type ${typeName} =([^;]+);`).exec(
		registrySource,
	);
	return [...(match?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? "");
};
const ART_KEYS = unionMembers("ClassicySystemArtKey");
const CURSOR_ROLES = unionMembers("ClassicyCursorRole");

const iconLeaves = (tree: ClassicyAssetTree, trail = ""): [string, string][] =>
	Object.entries(tree).flatMap(([key, value]) => {
		const keyPath = trail ? `${trail}.${key}` : key;
		return typeof value === "string"
			? [[keyPath, value] as [string, string]]
			: iconLeaves(value, keyPath);
	});
const ICONS = iconLeaves(ClassicyIcons);

const switchPackage = (packageId: string) =>
	act(() => {
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId });
	});

/** Everything `packageId` resolves, for every one of its themes. */
const snapshot = (packageId: string) => {
	const themes = getAllThemes().filter(
		(theme) => (theme.package ?? "platinum") === packageId,
	);
	const perTheme = themes.map((theme) => {
		const asset = (kind: ClassicyAssetKind, key: string) =>
			resolveClassicyThemeAsset(kind, key, theme);
		return {
			id: theme.id,
			icons: ICONS.map(([key]) => [
				asset("icons", key),
				resolveClassicyIcon(key, packageId, theme.assetVariant ?? "")?.small,
			]),
			art: ART_KEYS.map((key) => asset("systemArt", key)),
			cursors: CURSOR_ROLES.map((role) => [
				asset("cursors", role),
				resolveClassicyCursorHotspot(
					role as ClassicyCursorRole,
					packageId,
					theme.assetVariant ?? "",
				),
			]),
			sound: getClassicySoundPack(theme.sound?.pack ?? "")?.src,
		};
	});
	// What a stored core icon URL draws, large, small and selected, while the
	// package is the active one.
	switchPackage(packageId);
	const drawn = ICONS.map(([, url]) => [
		resolveClassicyIconImage(url, 32),
		resolveClassicyIconImage(url, 16),
		resolveClassicyIconImage(url, 32, true),
	]);
	// The `@font-face` rules on the page, but Windows 98's own: System 7's
	// faces are Platinum's files, so Platinum's element holds their rules.
	const fonts = [...document.querySelectorAll('style[id^="classicy-fonts-"]')]
		.filter((style) => style.id !== "classicy-fonts-windows98")
		.map((style) => [style.id, style.textContent]);
	return {
		perTheme,
		drawn,
		fonts,
		wallpapers: listClassicyWallpapers(packageId),
		defaultWallpaper: defaultClassicyWallpaper(packageId),
		apps: getClassicyAppIdentityOverrides(packageId),
		desktopIcons: getClassicyDesktopIconOverrides(packageId),
		savers: listClassicyScreenSaversFor(packageId).map((saver) => saver.id),
		saver: resolveClassicyScreenSaverFor(packageId)?.id,
		registered: getClassicyAppearancePackage(packageId),
	};
};

describe("Windows 98 beside Platinum and System 7", () => {
	// Three packages loaded and every theme's assets read twice: slow on a
	// loaded machine, hence the budget.
	it("changes nothing they resolve", async () => {
		await import("../../platinum/src/index");
		await import("../../system7/src/index");
		const before = Object.fromEntries(PACKAGES.map((id) => [id, snapshot(id)]));
		// Each was read, with its themes, its fonts and its savers.
		for (const id of PACKAGES) {
			expect(before[id]?.perTheme.length, id).toBeGreaterThan(0);
			expect(before[id]?.fonts.length, id).toBeGreaterThan(0);
			expect(before[id]?.savers.length, id).toBeGreaterThan(0);
			expect(before[id]?.registered, id).toBeDefined();
		}

		await import("./index");
		expect(getClassicyAppearancePackage("windows98")).toBeDefined();
		const after = Object.fromEntries(PACKAGES.map((id) => [id, snapshot(id)]));
		for (const id of PACKAGES) {
			const { registered, ...rest } = after[id] ?? {};
			const { registered: registeredBefore, ...restBefore } = before[id] ?? {};
			expect(rest, id).toEqual(restBefore);
			// The registered package itself is the same object.
			expect(registered, id).toBe(registeredBefore);
		}
		// Not vacuous: Windows 98 itself draws the same stored URLs otherwise.
		const windows98 = snapshot("windows98");
		expect(windows98.drawn).not.toEqual(after.platinum?.drawn);
		expect(windows98.savers).not.toEqual(after.platinum?.savers);
		switchPackage("platinum");
	}, 60_000);
});
