import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

/**
 * Platinum's files leave the core's assets/ folder (plan 0015-kxa §3.3,
 * design 0014-ahm "Which assets/ files are Platinum's"): a file moves into
 * packages/appearance/platinum/assets/ when Platinum is its only reader, so a
 * host that loads another Appearance Package ships none of Platinum's sounds,
 * wallpapers, art or cursors. Files the core also reads (`system.macosSvg`,
 * `classicy.logo`, `ui.halftoneLarge`, `ui.cursors.hand`) and files nothing
 * reads stay where they are.
 */

const PLATINUM_ASSETS = "packages/appearance/platinum/assets/";

/** Each moved file, from its old place in assets/ to its place in the package. */
const MOVED: ReadonlyArray<readonly [from: string, to: string]> = [
	["assets/img/icons/system/apple.png", "art/apple.png"],
	["assets/img/icons/system/alias.png", "art/alias.png"],
	["assets/img/icons/system/desktop/trash-empty.png", "art/trash-empty.png"],
	["assets/img/icons/system/desktop/trash-full.png", "art/trash-full.png"],
	["assets/img/ui/help-button.png", "art/help-button.png"],
	...[
		"watch",
		"resize-lr",
		"resize-ud",
		"resize-u",
		"resize-d",
		"resize-l",
		"resize-r",
	].map(
		(name) =>
			[
				`assets/img/ui/cursors/cursor-${name}.png`,
				`cursors/cursor-${name}.png`,
			] as const,
	),
];

/** The icon-tree paths of the moved files, and of the deleted duplicate. */
const REMOVED_ICON_PATHS = [
	"system.apple",
	"system.alias",
	"system.desktop.trashEmpty",
	"system.desktop.trashFull",
	"ui.helpButton",
	"ui.cursors.watch",
	"ui.cursors.resizeLr",
	"ui.cursors.resizeUd",
	"ui.cursors.resizeU",
	"ui.cursors.resizeD",
	"ui.cursors.resizeL",
	"ui.cursors.resizeR",
	"controlPanels.appearanceManager.platinum",
];

const tracked = (...paths: string[]): string[] =>
	execFileSync("git", ["ls-files", "-z", "--", ...paths], {
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	})
		.split("\0")
		.filter(Boolean);

const leaf = (tree: unknown, dotted: string): unknown =>
	dotted
		.split(".")
		.reduce<unknown>(
			(node, key) =>
				node && typeof node === "object"
					? (node as Record<string, unknown>)[key]
					: undefined,
			tree,
		);

const leaves = (tree: unknown, prefix = ""): Array<[string, unknown]> =>
	tree && typeof tree === "object"
		? Object.entries(tree).flatMap(([key, value]) =>
				leaves(value, prefix ? `${prefix}.${key}` : key),
			)
		: [[prefix, tree]];

describe("the core's assets/ folder", () => {
	it("holds no sound pack and no wallpaper", () => {
		expect(tracked("assets/sounds")).toEqual([]);
		expect(tracked("assets/img/wallpapers")).toEqual([]);
	});

	it("moved Platinum's sounds and wallpapers into the package, photos/ included", () => {
		const sounds = tracked(`${PLATINUM_ASSETS}sounds/platinum`);
		expect(sounds).toEqual(
			expect.arrayContaining(
				[
					"platinum.json",
					"platinum.ogg",
					"platinum.m4a",
					"platinum.mp3",
					"platinum.ac3",
					"sprites/ClassicyBeep.mp3",
				].map((file) => `${PLATINUM_ASSETS}sounds/platinum/${file}`),
			),
		);
		const wallpapers = tracked(`${PLATINUM_ASSETS}wallpapers`);
		expect(wallpapers).toContain(`${PLATINUM_ASSETS}wallpapers/azul_dark.png`);
		expect(wallpapers).toContain(`${PLATINUM_ASSETS}wallpapers/default.jpg`);
		expect(
			wallpapers.some((file) =>
				file.startsWith(`${PLATINUM_ASSETS}wallpapers/photos/`),
			),
		).toBe(true);
	});

	it.each(MOVED)("moved %s to the package's assets/%s", (from, to) => {
		expect(tracked(from)).toEqual([]);
		expect(tracked(`${PLATINUM_ASSETS}${to}`)).toEqual([
			`${PLATINUM_ASSETS}${to}`,
		]);
	});

	it("dropped the Appearance Manager's copy of Platinum's package icon", () => {
		// Byte-identical to the package's own icon (its art/platinum.png).
		expect(
			tracked(
				"assets/img/icons/control-panels/appearance-manager/platinum.png",
			),
		).toEqual([]);
	});

	it("keeps the files the core reads too", () => {
		expect(
			tracked(
				"assets/img/icons/system/macos.svg",
				"assets/img/ui/classicy-logo.svg",
				"assets/img/ui/halftone-large.png",
				"assets/img/ui/cursors/cursor-hand.png",
			),
		).toHaveLength(4);
	});
});

describe("the core's icon tree", () => {
	it.each(REMOVED_ICON_PATHS)("has no entry %s", (dotted) => {
		expect(leaf(ClassicyIcons, dotted)).toBeUndefined();
		expect(resolveClassicyAsset("icons", dotted)).toBeUndefined();
	});

	it("names only files that exist: every leaf resolves", () => {
		const all = leaves(ClassicyIcons);
		expect(all.length).toBeGreaterThan(300);
		expect(
			all.filter(([, value]) => typeof value !== "string" || value === ""),
		).toEqual([]);
	});

	it("still carries the entries the core reads", () => {
		for (const dotted of [
			"system.macosSvg",
			"classicy.logo",
			"ui.halftoneLarge",
			"ui.cursors.hand",
		])
			expect(resolveClassicyAsset("icons", dotted), dotted).toMatch(/\S/);
	});
});
