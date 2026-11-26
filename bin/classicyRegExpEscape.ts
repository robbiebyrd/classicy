/**
 * `text` with every regular-expression syntax character escaped (`.*+?^${}()|[]\`
 * and `/`), so a RegExp built from a path, a file URL or any other text
 * matches it literally. Escaping only some of them (the dots, say) lets a
 * backslash in a Windows path or a `+` or `(` in a temporary directory
 * change what the pattern means (CodeQL js/incomplete-sanitization).
 */
export const escapeClassicyRegExp = (text: string): string =>
	text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
