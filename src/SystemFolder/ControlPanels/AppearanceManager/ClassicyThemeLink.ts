import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_THEME_FILE_MAX_LENGTH,
	type ClassicyThemeParseResult,
	compactClassicyThemeFile,
	parseClassicyThemeFile,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * Sharing a theme as a link: the theme file (`ClassicyThemeFile.ts`) in the
 * URL's fragment,
 *
 *     https://host/page#classicy-theme=<base64url(deflate(theme file JSON))>
 *
 * The JSON is the one Save Theme… writes, without its indentation; it is
 * deflated (raw DEFLATE, level 9), then written as unpadded base64url, so the
 * payload needs no escaping in a URL. A fragment never reaches the server.
 *
 * A link is untrusted input. Reading one runs it through
 * `parseClassicyThemeFile`, exactly as Load Theme… does (the schema, the
 * installed-package check, the wallpaper rules), after two bounds of its own:
 * a payload longer than `CLASSICY_THEME_LINK_MAX_LENGTH` is refused unread,
 * and so is one that inflates past `CLASSICY_THEME_FILE_MAX_LENGTH`. Opening a
 * link in a desktop is the host's choice (`ClassicyDesktop`'s `themeLinks`),
 * and the desktop asks the user before it adds the theme and again before
 * it uses a remote desktop picture (`classicyThemeLinkRemoteWallpaperHost`).
 *
 * The codec is loaded on first use (`import()`, a lazy chunk in the ES
 * build), so a host that never shares a theme never loads it.
 */

/** The fragment's key: `#classicy-theme=<payload>`. */
export const CLASSICY_THEME_LINK_KEY = "classicy-theme";

/**
 * The longest payload a theme link carries, in characters. Platinum's
 * themes take about 2,300 and System 7's about 3,400 (every package family
 * included); the cap leaves room for a theme with long font stacks, an
 * http(s) wallpaper and a disabled-sounds list, while keeping a link short
 * enough to paste into a message. It also bounds what a link can inflate to
 * (about 6 KB of DEFLATE, at most about 6 MB of text, which is refused past
 * `CLASSICY_THEME_FILE_MAX_LENGTH`).
 */
export const CLASSICY_THEME_LINK_MAX_LENGTH = 8192;

type ClassicyThemeLinkCodec =
	typeof import("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLinkCodec.internal");

let codecLoad: Promise<ClassicyThemeLinkCodec> | undefined;

/** The codec, loaded once; a failed load is not kept, so the next call tries
 * again. */
const loadCodec = (): Promise<ClassicyThemeLinkCodec> => {
	codecLoad ??= import(
		"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLinkCodec.internal"
	).catch((error: unknown) => {
		codecLoad = undefined;
		classicyLog(
			"warn",
			"ClassicyThemeLink",
			"The theme link codec could not be loaded.",
			error,
		);
		throw error;
	});
	return codecLoad;
};

const LINK_DAMAGED = "This link is damaged: it does not hold a theme.";
const LINK_TOO_LONG = "This theme link is too long to open.";
const LINK_TOO_LARGE = "This theme link holds more than a theme.";
const LINK_UNREADABLE =
	"Classicy could not load the code that reads and writes theme links.";

/** A theme link (`url`) and its fragment's payload, or why there is none. */
export type ClassicyThemeLinkResult =
	| { ok: true; url: string; payload: string }
	| { ok: false; error: string };

/**
 * The payload of `hash` (a URL's fragment, `location.hash`, with or without
 * its `#`) when it is a theme link, else `null`: the text after
 * `classicy-theme=`, unchecked.
 */
export const classicyThemeLinkPayload = (hash: string): string | null => {
	const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
	const prefix = `${CLASSICY_THEME_LINK_KEY}=`;
	return fragment.startsWith(prefix) ? fragment.slice(prefix.length) : null;
};

/**
 * `href` (default: the current page's URL) with its fragment replaced by
 * the theme link holding `payload` (`createClassicyThemeLink`'s), or
 * `undefined` when `href` is not an absolute URL.
 */
export const classicyThemeLinkUrl = (
	payload: string,
	href: string = globalThis.location?.href ?? "",
): string | undefined => {
	let url: URL;
	try {
		url = new URL(href);
	} catch {
		return undefined;
	}
	url.hash = `${CLASSICY_THEME_LINK_KEY}=${payload}`;
	return url.href;
};

/**
 * A link to `theme`: `href` (default: the current page's URL) with its
 * fragment replaced by the theme link. The theme is written as Save Theme…
 * writes it and checked by reading it back, so a theme that could not be
 * opened (its package not installed, say) gives an error instead; so does
 * one whose payload would pass `CLASSICY_THEME_LINK_MAX_LENGTH`.
 */
export const createClassicyThemeLink = async (
	theme: ClassicyTheme,
	href: string = globalThis.location?.href ?? "",
): Promise<ClassicyThemeLinkResult> => {
	const json = compactClassicyThemeFile(theme);
	const check = parseClassicyThemeFile(json, "link");
	if (!check.ok) return check;
	let codec: ClassicyThemeLinkCodec;
	try {
		codec = await loadCodec();
	} catch {
		return { ok: false, error: LINK_UNREADABLE };
	}
	const payload = codec.encodeClassicyThemeLinkPayload(json);
	if (payload.length > CLASSICY_THEME_LINK_MAX_LENGTH) {
		return {
			ok: false,
			error:
				"This theme is too large to share as a link. Save it as a file instead.",
		};
	}
	const url = classicyThemeLinkUrl(payload, href);
	if (url === undefined) {
		return { ok: false, error: "This page has no address to link to." };
	}
	return { ok: true, url, payload };
};

/**
 * Reads the theme link in `hash` (a URL's fragment): `null` when it is not a
 * theme link, else the validated, loadable theme or why it cannot be
 * opened — too long, damaged (not base64url, DEFLATE, UTF-8 or a theme
 * file), or anything `parseClassicyThemeFile` refuses.
 */
export const readClassicyThemeLink = async (
	hash: string,
): Promise<ClassicyThemeParseResult | null> => {
	const payload = classicyThemeLinkPayload(hash);
	if (payload === null) return null;
	if (payload.length > CLASSICY_THEME_LINK_MAX_LENGTH) {
		return { ok: false, error: LINK_TOO_LONG };
	}
	let codec: ClassicyThemeLinkCodec;
	try {
		codec = await loadCodec();
	} catch {
		return { ok: false, error: LINK_UNREADABLE };
	}
	const decoded = codec.decodeClassicyThemeLinkPayload(
		payload,
		CLASSICY_THEME_FILE_MAX_LENGTH,
	);
	if (!decoded.ok) {
		return {
			ok: false,
			error: decoded.problem === "too-large" ? LINK_TOO_LARGE : LINK_DAMAGED,
		};
	}
	return parseClassicyThemeFile(decoded.text, "link");
};

/**
 * The host of `theme`'s desktop picture when it is a remote http(s) URL (as
 * `URL.host` gives it, an international name in its ASCII form), else
 * `undefined`. A theme read from a link holds a registered wallpaper as its
 * filename or `<package>|<file>`, so any URL left is one no package
 * registered: showing it makes the browser fetch it from that host.
 */
export const classicyThemeLinkRemoteWallpaperHost = (
	theme: Pick<ClassicyTheme, "desktop">,
): string | undefined => {
	const image = theme.desktop.backgroundImage;
	if (!/^https?:\/\//i.test(image)) return undefined;
	try {
		return new URL(image).host;
	} catch {
		return undefined;
	}
};

/** `href` without its fragment, for `history.replaceState` once a link has
 * been handled. */
export const withoutClassicyThemeLink = (href: string): string => {
	const url = new URL(href);
	url.hash = "";
	return url.href;
};
