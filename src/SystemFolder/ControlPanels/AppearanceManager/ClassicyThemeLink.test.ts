import { deflateSync } from "fflate";
import { describe, expect, it } from "vitest";
// getTheme serves the registered packages' themes: Platinum's and System 7's.
import "@classicy/appearance-platinum";
import "@classicy/appearance-system7";
import {
	type ClassicyTheme,
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_THEME_FILE_MAX_LENGTH,
	compactClassicyThemeFile,
	exportClassicyTheme,
	parseClassicyThemeFile,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import {
	CLASSICY_THEME_LINK_KEY,
	CLASSICY_THEME_LINK_MAX_LENGTH,
	classicyThemeLinkPayload,
	classicyThemeLinkRemoteWallpaperHost,
	createClassicyThemeLink,
	readClassicyThemeLink,
	withoutClassicyThemeLink,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLink";
import {
	decodeClassicyThemeLinkPayload,
	encodeClassicyThemeLinkPayload,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLinkCodec.internal";

const theme = (id: string): ClassicyTheme => structuredClone(getTheme(id));

const PAGE = "https://host.example/desktop/?mode=1";

const base64Url = (bytes: Uint8Array) =>
	btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");

/** A fragment holding `text` deflated as a link holds it. */
const fragmentOf = (text: string) =>
	`#${CLASSICY_THEME_LINK_KEY}=${encodeClassicyThemeLinkPayload(text)}`;

const linkOk = async (t: ClassicyTheme, href = PAGE): Promise<string> => {
	const result = await createClassicyThemeLink(t, href);
	if (!result.ok) throw new Error(result.error);
	return result.url;
};

const readOk = async (hash: string): Promise<ClassicyTheme> => {
	const result = await readClassicyThemeLink(hash);
	if (!result?.ok) throw new Error(result ? result.error : "not a link");
	return result.theme;
};

const readError = async (hash: string): Promise<string> => {
	const result = await readClassicyThemeLink(hash);
	if (result === null) throw new Error("not a link");
	if (result.ok) throw new Error("expected the link to be refused");
	return result.error;
};

describe("createClassicyThemeLink", () => {
	it("puts the theme in the page's fragment as base64url(deflate(theme file))", async () => {
		const url = new URL(await linkOk(theme("azul")));
		expect(`${url.origin}${url.pathname}${url.search}`).toBe(PAGE);
		const payload = classicyThemeLinkPayload(url.hash);
		expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
		const decoded = decodeClassicyThemeLinkPayload(
			payload ?? "",
			CLASSICY_THEME_FILE_MAX_LENGTH,
		);
		expect(decoded.ok && JSON.parse(decoded.text)).toEqual(
			JSON.parse(exportClassicyTheme(theme("azul"))),
		);
	});

	it("carries the compact form of the file Save Theme… writes", () => {
		const azul = theme("azul");
		expect(JSON.parse(compactClassicyThemeFile(azul))).toEqual(
			JSON.parse(exportClassicyTheme(azul)),
		);
		expect(compactClassicyThemeFile(azul)).not.toMatch(/\n|\t/);
	});

	it("replaces a fragment the page already has", async () => {
		const url = await linkOk(theme("azul"), `${PAGE}#/some/route`);
		expect(url).not.toContain("/some/route");
		expect(new URL(url).hash.startsWith(`#${CLASSICY_THEME_LINK_KEY}=`)).toBe(
			true,
		);
	});

	it("keeps every built-in theme well under the length cap", async () => {
		const lengths = await Promise.all(
			getAllThemes().map(async (t) => {
				const payload = classicyThemeLinkPayload(
					new URL(await linkOk(structuredClone(t))).hash,
				);
				return payload?.length ?? Number.POSITIVE_INFINITY;
			}),
		);
		expect(lengths.length).toBeGreaterThan(20);
		expect(Math.max(...lengths)).toBeLessThan(
			CLASSICY_THEME_LINK_MAX_LENGTH / 2,
		);
	});

	it("refuses a theme whose link would pass the cap", async () => {
		const big = theme("azul");
		// A disabled-sounds list of pseudo-random text, which deflates poorly
		// (a fixed linear congruential sequence, so the test is repeatable).
		let seed = 1;
		const next = () => {
			seed = (seed * 1103515245 + 12345) % 2 ** 31;
			return seed;
		};
		big.sound.disabled = Array.from({ length: 256 }, () =>
			Array.from({ length: 64 }, () =>
				String.fromCharCode(48 + (next() % 75)),
			).join(""),
		);
		const result = await createClassicyThemeLink(big, PAGE);
		expect(result).toEqual({
			ok: false,
			error:
				"This theme is too large to share as a link. Save it as a file instead.",
		});
	});

	it("refuses a theme that could not be opened again", async () => {
		const orphan = { ...theme("azul"), package: "not-installed" };
		const result = await createClassicyThemeLink(orphan, PAGE);
		expect(result).toEqual({
			ok: false,
			error:
				'This theme needs the "not-installed" appearance package, which is not installed.',
		});
	});
});

describe("readClassicyThemeLink", () => {
	it("round-trips a theme through its link", async () => {
		const azul = theme("azul");
		azul.name = "Ocean “Blue” ✓";
		const read = await readOk(new URL(await linkOk(azul)).hash);
		expect(read.name).toBe("Ocean “Blue” ✓");
		expect(read.color).toEqual(azul.color);
		expect(read.typography).toEqual(azul.typography);
		expect(read.desktop).toEqual(azul.desktop);
		expect(read.package).toBe("platinum");
	});

	it("round-trips another package's theme", async () => {
		const [system7] = getAllThemes().filter((t) => t.package === "system7");
		expect(system7).toBeDefined();
		const read = await readOk(
			new URL(await linkOk(structuredClone(system7))).hash,
		);
		expect(read.package).toBe("system7");
		expect(read.name).toBe(system7.name);
	});

	it("reads a hash with or without its #", async () => {
		const hash = new URL(await linkOk(theme("azul"))).hash;
		expect((await readOk(hash.slice(1))).name).toBe("Azul");
	});

	it("reads a key whose = was percent-encoded, and decodes escaped padding", async () => {
		const hash = new URL(await linkOk(theme("azul"))).hash;
		const payload = classicyThemeLinkPayload(hash) ?? "";
		for (const key of ["%3D", "%3d"]) {
			expect(
				classicyThemeLinkPayload(`#${CLASSICY_THEME_LINK_KEY}${key}${payload}`),
			).toBe(payload);
			expect(
				(await readOk(`#${CLASSICY_THEME_LINK_KEY}${key}${payload}`)).name,
			).toBe("Azul");
		}
		expect(
			classicyThemeLinkPayload(`#${CLASSICY_THEME_LINK_KEY}=abc%3D%3D`),
		).toBe("abc==");
		// The key itself is matched as written.
		expect(classicyThemeLinkPayload(`#Classicy-Theme=${payload}`)).toBeNull();
		// An escape that does not decode is left for the reader to refuse.
		expect(classicyThemeLinkPayload(`#${CLASSICY_THEME_LINK_KEY}=abc%E0`)).toBe(
			"abc%E0",
		);
	});

	it("ignores a fragment that is not a theme link", async () => {
		expect(await readClassicyThemeLink("")).toBeNull();
		expect(await readClassicyThemeLink("#")).toBeNull();
		expect(await readClassicyThemeLink("#/route")).toBeNull();
		expect(await readClassicyThemeLink("#other=1")).toBeNull();
		expect(await readClassicyThemeLink("#xclassicy-theme=abc")).toBeNull();
	});

	it("refuses an oversized fragment without decoding it", async () => {
		const payload = "A".repeat(CLASSICY_THEME_LINK_MAX_LENGTH + 1);
		expect(await readError(`#${CLASSICY_THEME_LINK_KEY}=${payload}`)).toBe(
			"This theme link is too long to open.",
		);
	});

	it("refuses a payload that inflates past a theme file's size", async () => {
		// Zeros deflate about 1000 to 1: a few hundred bytes of payload that
		// inflate past the 256 KB a theme file may hold.
		const bomb = base64Url(
			deflateSync(new Uint8Array(CLASSICY_THEME_FILE_MAX_LENGTH + 1), {
				level: 9,
			}),
		);
		expect(bomb.length).toBeLessThan(CLASSICY_THEME_LINK_MAX_LENGTH);
		expect(await readError(`#${CLASSICY_THEME_LINK_KEY}=${bomb}`)).toBe(
			"This theme link holds more than a theme.",
		);
	});

	it.each([
		["an empty payload", ""],
		["characters outside base64url", "abc+/def"],
		["percent escapes", "abc%20def"],
		["base64 of the wrong length", "abcde"],
		["bytes that are not DEFLATE", base64Url(new Uint8Array([255, 255, 255]))],
		[
			"DEFLATE that is not UTF-8",
			base64Url(deflateSync(new Uint8Array([0xff, 0xfe, 0x80]))),
		],
	])("refuses a damaged payload: %s", async (_, payload) => {
		expect(await readError(`#${CLASSICY_THEME_LINK_KEY}=${payload}`)).toBe(
			"This link is damaged: it does not hold a theme.",
		);
	});

	it.each([
		["text that is not JSON", "not json"],
		["JSON that is not an object", "[1, 2]"],
		["another format", JSON.stringify({ format: "other", version: 1 })],
	])("refuses a corrupt payload: %s", async (_, text) => {
		expect(await readError(fragmentOf(text))).toBe(
			"This link is damaged: it does not hold a theme.",
		);
	});

	it("names a link, not a file, in the envelope's errors", async () => {
		expect(
			await readError(
				fragmentOf(
					JSON.stringify({ format: "classicy-theme", version: 2, theme: {} }),
				),
			),
		).toBe(
			"This theme link was made by a newer version of Classicy (format version 2).",
		);
		expect(
			await readError(
				fragmentOf(JSON.stringify({ format: "classicy-theme", version: 1 })),
			),
		).toBe("This theme link does not contain a theme.");
	});

	it("validates the theme with the theme file schema", async () => {
		const bad = JSON.parse(compactClassicyThemeFile(theme("azul")));
		bad.theme.color.outline = "red";
		bad.theme.typography.ui = 'x"; background: url(https://evil.example/)';
		expect(await readError(fragmentOf(JSON.stringify(bad)))).toMatch(
			/^This theme has invalid settings: color\.outline: .*typography\.ui: may only contain font names, quotes and commas/,
		);
	});

	it("refuses a theme for a package that is not installed", async () => {
		const file = JSON.parse(compactClassicyThemeFile(theme("azul")));
		file.theme.package = "not-installed";
		expect(await readError(fragmentOf(JSON.stringify(file)))).toBe(
			'This theme needs the "not-installed" appearance package, which is not installed.',
		);
	});

	it("refuses a wallpaper that is neither registered nor an http(s) URL", async () => {
		const file = JSON.parse(compactClassicyThemeFile(theme("azul")));
		file.theme.desktop.backgroundImage = "javascript:alert(1)";
		expect(await readError(fragmentOf(JSON.stringify(file)))).toMatch(
			/^This theme has invalid settings: desktop\.backgroundImage/,
		);
	});

	it("matches parseClassicyThemeFile on the decoded text", async () => {
		const text = compactClassicyThemeFile(theme("azul"));
		expect(await readClassicyThemeLink(fragmentOf(text))).toEqual(
			parseClassicyThemeFile(text, "link"),
		);
	});
});

describe("classicyThemeLinkRemoteWallpaperHost", () => {
	it("names the host of a remote http(s) wallpaper", async () => {
		const azul = theme("azul");
		azul.desktop.backgroundImage = "https://pictures.example:8443/a/b.png?x=1";
		const read = await readOk(new URL(await linkOk(azul)).hash);
		expect(read.desktop.backgroundImage).toBe(
			"https://pictures.example:8443/a/b.png?x=1",
		);
		expect(classicyThemeLinkRemoteWallpaperHost(read)).toBe(
			"pictures.example:8443",
		);
	});

	it("gives an international host in its ASCII form", () => {
		const azul = theme("azul");
		azul.desktop.backgroundImage = "http://bücher.example/p.png";
		expect(classicyThemeLinkRemoteWallpaperHost(azul)).toBe(
			"xn--bcher-kva.example",
		);
	});

	it("names none for a registered wallpaper or no picture", async () => {
		const azul = theme("azul");
		expect(azul.desktop.backgroundImage).not.toBe("");
		const read = await readOk(new URL(await linkOk(azul)).hash);
		expect(classicyThemeLinkRemoteWallpaperHost(read)).toBeUndefined();
		azul.desktop.backgroundImage = "";
		expect(classicyThemeLinkRemoteWallpaperHost(azul)).toBeUndefined();
	});
});

describe("withoutClassicyThemeLink", () => {
	it("drops the fragment and keeps the rest of the address", () => {
		expect(withoutClassicyThemeLink(`${PAGE}#classicy-theme=abc`)).toBe(PAGE);
	});
});

describe("encodeClassicyThemeLinkPayload", () => {
	it("decodes back to the same text", () => {
		const text = "Ünïcødé “quotes” ✓ and ASCII";
		const decoded = decodeClassicyThemeLinkPayload(
			encodeClassicyThemeLinkPayload(text),
			1024,
		);
		expect(decoded).toEqual({ ok: true, text });
	});

	it("accepts the payload with base64 padding", () => {
		const payload = encodeClassicyThemeLinkPayload("padded?");
		const padding = "=".repeat((4 - (payload.length % 4)) % 4);
		expect(
			decodeClassicyThemeLinkPayload(`${payload}${padding}`, 1024),
		).toEqual({ ok: true, text: "padded?" });
	});
});
