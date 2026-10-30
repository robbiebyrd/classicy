// verify:dist invariant 9: every stylesheet in dist/ decodes the same way
// whatever serves it. A strict-CSP host links dist/classicy.css and
// dist/classicy-<id>.css itself, and CSS Syntax §3.2 picks a linked file's
// encoding from its BOM, then the HTTP charset, then a leading `@charset`,
// then the referring document's encoding. A server that sends `text/css` with
// no charset (the nginx and Apache defaults) from a page that is not UTF-8
// would decode raw UTF-8 bytes as windows-1252, so a ✓ drawn by a package's
// `content` rule renders as "âœ“". A file is safe when it is ASCII only, or
// when it opens with `@charset "UTF-8";`. vite.config.ts keeps them ASCII
// (`esbuild.charset: "ascii"` escapes every non-ASCII character).
//
// Plain erasable TypeScript: check-dist-imports.mjs imports this file through
// Node's type stripping.

/** The declaration a non-ASCII stylesheet must open with, byte for byte. */
export const CLASSICY_CSS_UTF8_CHARSET = '@charset "UTF-8";';

/** The first non-ASCII byte's offset, or -1 when every byte is ASCII. */
const firstNonAscii = (bytes: Uint8Array): number =>
	bytes.findIndex((byte) => byte > 0x7f);

/**
 * The problem with the stylesheet `file` (its raw `bytes`), or `null` when it
 * is ASCII only or starts with `@charset "UTF-8";`.
 */
export const findClassicyCssCharsetProblem = (
	file: string,
	bytes: Uint8Array,
): string | null => {
	const at = firstNonAscii(bytes);
	if (at === -1) return null;
	const head = new TextDecoder().decode(
		bytes.subarray(0, CLASSICY_CSS_UTF8_CHARSET.length),
	);
	if (head === CLASSICY_CSS_UTF8_CHARSET) return null;
	return `${file}: non-ASCII byte at offset ${at} and no leading ${CLASSICY_CSS_UTF8_CHARSET} -> a host page that is not UTF-8 mis-decodes it; check esbuild.charset in vite.config.ts.`;
};
