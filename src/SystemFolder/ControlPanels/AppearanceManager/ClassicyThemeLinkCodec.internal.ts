import { deflateSync, inflateSync } from "fflate";

// The byte half of a theme link (`ClassicyThemeLink.ts`): UTF-8 text to
// raw DEFLATE to base64url, and back. This module imports nothing from
// Classicy (only fflate), because ClassicyThemeLink.ts loads it with
// import(): in the ES build it is a lazy chunk, which must never import the
// entry (a host serving the entry under another URL would load a second
// copy of the library; verify:dist's invariant 17 checks it), and fflate
// stays out of the entry, where the pdf.js worker's lazy chunk would import
// it from. CompressionStream is not used: Safari 16.2 lacks it.

/** Why a payload could not be decoded. */
export type ClassicyThemeLinkDecodeProblem = "damaged" | "too-large";

export type ClassicyThemeLinkDecodeResult =
	| { ok: true; text: string }
	| { ok: false; problem: ClassicyThemeLinkDecodeProblem };

const BASE64URL = /^[A-Za-z0-9_-]*={0,2}$/;

const toBase64Url = (bytes: Uint8Array): string => {
	let binary = "";
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
};

const fromBase64Url = (payload: string): Uint8Array | undefined => {
	if (!BASE64URL.test(payload)) return undefined;
	const base64 = payload
		.replace(/=+$/, "")
		.replace(/-/g, "+")
		.replace(/_/g, "/");
	// A base64 string's length is never 1 more than a multiple of 4.
	if (base64.length % 4 === 1) return undefined;
	let binary: string;
	try {
		binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
	} catch {
		return undefined;
	}
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
};

/** `text` as UTF-8, deflated at level 9, as unpadded base64url. */
export const encodeClassicyThemeLinkPayload = (text: string): string =>
	toBase64Url(deflateSync(new TextEncoder().encode(text), { level: 9 }));

/**
 * The text `payload` holds, or why it holds none: `damaged` for anything
 * that is not base64url, raw DEFLATE and UTF-8, `too-large` when the
 * inflated text passes `maxBytes`. The caller caps the payload's length,
 * which bounds what it can inflate to (DEFLATE expands at most about 1032
 * to 1), so the inflate never needs a bound of its own.
 */
export const decodeClassicyThemeLinkPayload = (
	payload: string,
	maxBytes: number,
): ClassicyThemeLinkDecodeResult => {
	const deflated = fromBase64Url(payload);
	if (!deflated || deflated.length === 0) {
		return { ok: false, problem: "damaged" };
	}
	let bytes: Uint8Array;
	try {
		bytes = inflateSync(deflated);
	} catch {
		return { ok: false, problem: "damaged" };
	}
	if (bytes.length > maxBytes) return { ok: false, problem: "too-large" };
	try {
		return {
			ok: true,
			text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
		};
	} catch {
		return { ok: false, problem: "damaged" };
	}
};
