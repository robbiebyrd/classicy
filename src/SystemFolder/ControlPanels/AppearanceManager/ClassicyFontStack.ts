/**
 * Helpers for the CSS `font-family` stacks a theme's typography stores
 * (e.g. `"Charcoal", "ChicagoFLF", "Geneva", sans-serif`) versus the bare
 * family names the Appearance Manager's Fonts menus offer (`Charcoal`).
 */

/** CSS generic font families — always kept unquoted and at the end. */
const GENERIC_FONT_FAMILIES = new Set([
	"serif",
	"sans-serif",
	"monospace",
	"cursive",
	"fantasy",
	"system-ui",
	"ui-serif",
	"ui-sans-serif",
	"ui-monospace",
	"ui-rounded",
	"math",
	"emoji",
	"fangsong",
]);

export type ClassicyFontStackEntry = {
	/** Family name with any surrounding quotes removed. */
	name: string;
	/** True for an unquoted CSS generic family keyword such as `serif`. */
	generic: boolean;
};

/**
 * Split a `font-family` value into its families, honouring quotes so a comma
 * inside a quoted name never splits it. Empty entries are dropped.
 */
export const parseFontStack = (stack: string): ClassicyFontStackEntry[] => {
	const entries: ClassicyFontStackEntry[] = [];
	let current = "";
	let quote: string | null = null;
	const flush = () => {
		const raw = current.trim();
		current = "";
		if (!raw) return;
		const quoted = /^(["']).*\1$/.test(raw);
		const name = (quoted ? raw.slice(1, -1) : raw).trim();
		if (!name) return;
		entries.push({
			name,
			generic: !quoted && GENERIC_FONT_FAMILIES.has(name.toLowerCase()),
		});
	};
	for (const ch of stack ?? "") {
		if (quote) {
			if (ch === quote) quote = null;
			current += ch;
		} else if (ch === '"' || ch === "'") {
			quote = ch;
			current += ch;
		} else if (ch === ",") {
			flush();
		} else {
			current += ch;
		}
	}
	flush();
	return entries;
};

/**
 * The first family of a `font-family` stack, unquoted — what the Fonts menus
 * match against. `"Charcoal", "ChicagoFLF", sans-serif` → `Charcoal`;
 * `VCR OSD Mono` → `VCR OSD Mono`; an empty stack → `""`.
 */
export const primaryFontFamily = (stack: string): string =>
	parseFontStack(stack)[0]?.name ?? "";

const serializeFontFamily = ({ name, generic }: ClassicyFontStackEntry) =>
	generic ? name : `"${name.replace(/["\\]/g, "")}"`;

/**
 * Put `family` first in `stack` without losing its fallbacks: the remaining
 * named families keep their order (minus any duplicate of `family`, compared
 * case-insensitively), and generic families move to the end.
 *
 * `withPrimaryFontFamily('"Charcoal", "ChicagoFLF", "Geneva", sans-serif', "Geneva")`
 * → `"Geneva", "Charcoal", "ChicagoFLF", sans-serif`
 */
export const withPrimaryFontFamily = (
	stack: string,
	family: string,
): string => {
	const chosen = family.trim().replace(/^(["'])(.*)\1$/, "$2");
	const entries = parseFontStack(stack);
	if (!chosen) return entries.map(serializeFontFamily).join(", ");
	const isChosen = (e: ClassicyFontStackEntry) =>
		e.name.toLowerCase() === chosen.toLowerCase();
	const generic = GENERIC_FONT_FAMILIES.has(chosen.toLowerCase());
	const named = entries.filter((e) => !e.generic && !isChosen(e));
	const generics = entries.filter((e) => e.generic && !isChosen(e));
	return [{ name: chosen, generic }, ...named, ...generics]
		.map(serializeFontFamily)
		.join(", ");
};
