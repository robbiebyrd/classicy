import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type {
	ClassicyAssetTree,
	ClassicyCursorRole,
	ClassicySystemArtKey,
} from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { getClassicyScreenSaver } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import { WINDOWS98_SCREEN_SAVER_IDS } from "../screenSavers/windows98ScreenSavers";
import { WINDOWS98_APPS, WINDOWS98_DESKTOP_ICONS } from "../windows98Apps";
import { windows98SoundPack } from "./sounds/windows98";
import {
	WINDOWS98_CURSOR_ADDITIONS,
	WINDOWS98_FILE_TYPE_ICON_FILES,
} from "./windows98AssetAdditions";
import { WINDOWS98_CURSORS, WINDOWS98_SYSTEM_ART } from "./windows98Assets";
import { WINDOWS98_FONT_FACES } from "./windows98Fonts.internal";
import { WINDOWS98_ICON_FILES, WINDOWS98_ICON_REUSE } from "./windows98Icons";
import {
	WINDOWS98_DESKTOP_PATTERNS,
	WINDOWS98_WALLPAPERS,
	windows98WallpaperFile,
} from "./windows98Wallpapers";

// docs/windows98-asset-inventory.md is the map: each row's decision is what
// Windows 98 registers for its key, so the two never drift apart, and a key
// the core adds later fails here until the inventory decides it.

const repoRoot = path.resolve(import.meta.dirname, "../../../../..");
const doc = readFileSync(
	path.join(repoRoot, "docs/windows98-asset-inventory.md"),
	"utf8",
);
const registrySource = readFileSync(
	path.join(repoRoot, "src/Appearance/ClassicyAssetRegistry.ts"),
	"utf8",
);

/** The table rows of a `## heading` section, each row's cells trimmed. */
const sectionRows = (heading: string): string[][] => {
	const start = doc.indexOf(`\n## ${heading}\n`);
	expect(start, heading).toBeGreaterThan(-1);
	const end = doc.indexOf("\n## ", start + 1);
	return doc
		.slice(start, end === -1 ? undefined : end)
		.split("\n")
		.filter((line) => /^\| `/.test(line))
		.map((line) =>
			line
				.replace(/^\||\|$/g, "")
				.split(/(?<!\\)\|/)
				.map((cell) => cell.trim()),
		);
};

/** A cell's first `code` span. */
const code = (cell = "") => /`([^`]+)`/.exec(cell)?.[1] ?? "";
/** A cell's `code` spans. */
const codes = (cell = "") => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

const iconLeaves = (tree: ClassicyAssetTree, trail = ""): string[] =>
	Object.entries(tree).flatMap(([key, value]) => {
		const keyPath = trail ? `${trail}.${key}` : key;
		return typeof value === "string" ? [keyPath] : iconLeaves(value, keyPath);
	});
const ICON_KEYS = iconLeaves(ClassicyIcons);
const unionMembers = (typeName: string): string[] =>
	[
		...(
			new RegExp(`export type ${typeName} =([^;]+);`).exec(
				registrySource,
			)?.[1] ?? ""
		).matchAll(/"([^"]+)"/g),
	].map((m) => m[1] ?? "");
const ART_KEYS = unionMembers("ClassicySystemArtKey") as ClassicySystemArtKey[];
const CURSOR_ROLES = unionMembers("ClassicyCursorRole") as ClassicyCursorRole[];

describe("docs/windows98-asset-inventory.md", () => {
	it("lists every icon key once, in the core tree's order", () =>
		expect(sectionRows("Icons").map(([key]) => code(key))).toEqual(ICON_KEYS));

	it("registers each icon key as the inventory decides", () => {
		for (const [keyCell, decision, source, files] of sectionRows("Icons")) {
			const key = code(keyCell);
			if (decision === "reuse") {
				expect(WINDOWS98_ICON_REUSE[key], key).toBe(code(source));
				expect(WINDOWS98_ICON_FILES[key], key).toBeUndefined();
			} else if (decision === "core") {
				expect(
					WINDOWS98_ICON_FILES[key] ?? WINDOWS98_ICON_REUSE[key],
					key,
				).toBeUndefined();
			} else {
				expect(["export", "export (16 px)", "crop", "picture"]).toContain(
					decision,
				);
				const registered = WINDOWS98_ICON_FILES[key];
				expect(registered, key).toBeDefined();
				const { src, small } = registered ?? { src: "" };
				expect(codes(files), key).toEqual(
					[src, small].filter(Boolean).map((stem) => `${stem}.webp`),
				);
				if (decision === "export (16 px)") expect(src, key).toMatch(/-16$/);
			}
		}
	});

	it("lists every system art key once, registering exactly the register rows", () => {
		const rows = sectionRows("System art");
		expect(rows.map(([key]) => code(key)).sort()).toEqual([...ART_KEYS].sort());
		for (const [keyCell, decision, , file] of rows) {
			const key = code(keyCell) as ClassicySystemArtKey;
			if (decision === "register")
				expect(WINDOWS98_SYSTEM_ART[key], key).toMatch(
					new RegExp(`/${code(file).replace(".", "\\.")}$`),
				);
			else {
				expect(decision, key).toBe("default");
				expect(WINDOWS98_SYSTEM_ART[key], key).toBeUndefined();
			}
		}
	});

	it("lists every cursor role once, each drawing its file at its hotspot", () => {
		const rows = sectionRows("Cursors");
		expect(rows.map(([role]) => code(role))).toEqual(CURSOR_ROLES);
		for (const [roleCell, , , file, hotspot] of rows) {
			const role = code(roleCell) as ClassicyCursorRole;
			const { src, hotspot: registered } = {
				...WINDOWS98_CURSORS,
				...WINDOWS98_CURSOR_ADDITIONS,
			}[role];
			expect(src, role).toMatch(
				new RegExp(`/${code(file).replace(".", "\\.")}$`),
			);
			expect(registered.join(", "), role).toBe(hotspot);
		}
	});

	it("lists every font face the package registers, in order", () => {
		const rows = sectionRows("Fonts");
		expect(
			rows.map(([family, weight, style, file]) => ({
				family: code(family),
				weight,
				style,
				file: code(file),
			})),
		).toEqual(
			WINDOWS98_FONT_FACES.map(({ family, weight, style, file }) => ({
				family,
				weight,
				style,
				file: `fonts/${file}.woff2`,
			})),
		);
	});

	// Each sprite's WAV is the CD's file, byte for byte (its SHA-256), every
	// WAV a sprite of the pack, and the Alert column the Sound tab's list.
	it("lists every sprite once, each WAV the file it names, and the alerts", () => {
		const rows = sectionRows("Sounds");
		const sprites = path.join(import.meta.dirname, "sounds/windows98/sprites");
		expect(rows.map(([sprite]) => code(sprite))).toEqual(
			Object.keys(windows98SoundPack.sprite).sort(),
		);
		expect(
			readdirSync(sprites)
				.map((file) => file.replace(/\.wav$/, ""))
				.sort(),
		).toEqual(rows.map(([sprite]) => code(sprite)));
		for (const [sprite, , , , hash] of rows)
			expect(
				createHash("sha256")
					.update(readFileSync(path.join(sprites, `${code(sprite)}.wav`)))
					.digest("hex"),
				code(sprite),
			).toBe(code(hash));
		expect(
			rows
				.filter(([, , , alert]) => alert !== "—")
				.map(([sprite, , , label]) => ({ value: code(sprite), label })),
		).toEqual(windows98SoundPack.alerts);
	});

	it("gives each app the name, icon and description the package declares", () => {
		const rows = sectionRows("Apps");
		expect(rows).toHaveLength(16);
		const declared = (cell: string) => (cell === "—" ? undefined : cell);
		for (const [appCell, name, icon, description] of rows) {
			const appId = code(appCell);
			const override = WINDOWS98_APPS[appId];
			expect(override?.name, appId).toBe(declared(name));
			expect(override?.description, appId).toBe(declared(description));
			expect(override?.icon !== undefined, appId).toBe(!icon.startsWith("—"));
			if (override?.icon)
				expect(override.icon, appId).toMatch(
					new RegExp(`/${codes(icon)[1]?.replace(".", "\\.")}$`),
				);
		}
		// No override for an app the table does not list.
		expect(
			Object.keys(WINDOWS98_APPS).filter(
				(appId) => !rows.some(([cell]) => code(cell) === appId),
			),
		).toEqual([]);
	});

	it("relabels the desktop's own icons as the package declares", () => {
		const rows = sectionRows("Desktop icons");
		expect(rows.map(([icon]) => code(icon))).toEqual(
			Object.keys(WINDOWS98_DESKTOP_ICONS),
		);
		for (const [iconCell, name, , description] of rows) {
			const icon = code(iconCell) as keyof typeof WINDOWS98_DESKTOP_ICONS;
			const override = WINDOWS98_DESKTOP_ICONS[icon] as
				| { name?: string }
				| undefined;
			expect(override?.name, icon).toBe(name === "—" ? undefined : name);
			expect(WINDOWS98_DESKTOP_ICONS[icon]?.description, icon).toBe(
				description,
			);
		}
		expect(WINDOWS98_DESKTOP_ICONS.startupDisk?.icon).toMatch(
			/\/explorer-100-32\.webp$/,
		);
	});

	// The document icons registered by file type (`system.files.byType`,
	// windows98AssetAdditions.ts): each row's files are what the type draws.
	it("lists every document icon by type, each drawing its files", () => {
		const rows = sectionRows("Document icons by type");
		expect(rows.map(([type]) => code(type))).toEqual(
			Object.keys(WINDOWS98_FILE_TYPE_ICON_FILES),
		);
		for (const [typeCell, , files] of rows) {
			const { src, small } = WINDOWS98_FILE_TYPE_ICON_FILES[code(typeCell)] ?? {
				src: "",
			};
			expect(codes(files), code(typeCell)).toEqual(
				[src, small].filter(Boolean).map((stem) => `${stem}.webp`),
			);
		}
	});

	it("lists every wallpaper, its CD bitmap, size and file, in the Display control panel's order", () => {
		const rows = sectionRows("Wallpapers");
		expect(
			rows.map(([file, label, source, , shipped]) => ({
				file: code(file),
				label,
				cd: code(source),
				size: /(\d+) x (\d+)/
					.exec(source ?? "")
					?.slice(1)
					.map(Number),
				shipped: code(shipped),
			})),
		).toEqual(
			WINDOWS98_WALLPAPERS.map(({ file, label, cd, width, height }) => ({
				file,
				label,
				cd,
				size: [width, height],
				shipped: `wallpapers/${windows98WallpaperFile(file)}`,
			})),
		);
		for (const [, , , , , hash] of rows)
			expect(code(hash)).toMatch(/^[0-9a-f]{64}$/);
	});

	it("lists every desktop pattern with its eight bytes", () => {
		const rows = sectionRows("Desktop patterns");
		expect(
			rows.map(([file, label, bytes, shipped]) => ({
				file: code(file),
				label,
				rows: (bytes ?? "").split(" ").map(Number),
				shipped: code(shipped),
			})),
		).toEqual(
			WINDOWS98_DESKTOP_PATTERNS.map(({ file, label, rows }) => ({
				file,
				label,
				rows,
				shipped: `wallpapers/${windows98WallpaperFile(file)}`,
			})),
		);
	});

	it("lists every screen saver once, by the name it registers", () => {
		const rows = sectionRows("Screen savers");
		expect(rows.map(([id]) => code(id))).toEqual([
			...WINDOWS98_SCREEN_SAVER_IDS,
		]);
		for (const [id, name, file] of rows) {
			expect(getClassicyScreenSaver(code(id))?.name, code(id)).toBe(name);
			expect(code(file)).toMatch(/^[a-z0-9]+\.scr$/);
		}
	});
});
