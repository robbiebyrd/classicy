// The repo-wide literal-color sweep (Part G 1.2, Step 6): every color in
// Classicy's SCSS is a theme token or a classicy-tint/-shade/-alpha of one
// (src/Appearance/vocabulary/_color.scss), never a literal.
//
//   node bin/classicyLiteralColorSweep.ts   print each hit; exit 1 when any
//
// Build script, not library code: it reports through stdout/stderr and exit
// codes. Erasable TypeScript syntax only, so Node runs it directly. Part H's
// guard reuses findClassicyLiteralColors.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export type ClassicyLiteralColorHit = {
	/** Path relative to the root, with `/` separators. */
	file: string;
	/** 1-based line number. */
	line: number;
	text: string;
};

// A hex color, an rgb()/rgba() with numbers, a bare white/black keyword, or a
// groove border whose shades the browser derives from a fixed gray.
const LITERAL =
	/#[0-9a-fA-F]{3,8}\b|rgba?\([0-9]|(^|[ :,(])(white|black)([ ;,)]|$)|groove rgb/;

// Lines that hold a literal on purpose: a `var(--x, #hex)` or keyword
// fallback, art in a data URI, and the `white-space` property.
const EXEMPT_LINE =
	/var\(--[a-z0-9-]*, *(#|white\b|black\b)|data:image|white-space/;

// Files that hold colors as data: the color helpers' own definitions (their
// white/black mix targets), the screen savers (ported After Dark art) and the
// color picker's crayons and tracks.
const EXEMPT_FILE =
	/^src\/Appearance\/vocabulary\/_color\.scss$|Extensions\/ScreenSaver\/|ColorPicker/;

// G12: an Appearance Package may declare private constants, `--<package>-*:`,
// in its own folder (contract 0002-ldj: package CSS may hold
// `--platinum-*` constants). The package id is the folder name lowercased.
const PACKAGE_FILE = /^src\/Appearance\/([^/]+)\//;

const isPackageConstant = (file: string, line: string): boolean => {
	const folder = file.match(PACKAGE_FILE)?.[1];
	if (!folder || folder === "vocabulary") return false;
	return new RegExp(`^\\s*--${folder.toLowerCase()}-[a-z0-9-]+\\s*:`).test(
		line,
	);
};

// Blank out /* … */ comments, keeping every newline so line numbers hold.
const stripBlockComments = (source: string): string =>
	source.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
		comment.replace(/[^\n]/g, " "),
	);

/** The literal colors in one SCSS source; `file` is relative to the root. */
export function classicyLiteralColorHits(
	file: string,
	source: string,
): ClassicyLiteralColorHit[] {
	if (EXEMPT_FILE.test(file)) return [];
	const hits: ClassicyLiteralColorHit[] = [];
	stripBlockComments(source)
		.split("\n")
		.forEach((text, index) => {
			if (/^\s*\/\//.test(text)) return;
			if (!LITERAL.test(text) || EXEMPT_LINE.test(text)) return;
			if (isPackageConstant(file, text)) return;
			hits.push({ file, line: index + 1, text: text.trim() });
		});
	return hits;
}

const scssFiles = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true })
		.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
		.flatMap((entry) => {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) return scssFiles(full);
			return entry.name.endsWith(".scss") ? [full] : [];
		});

/** Every literal color in `<root>/src/**\/*.scss`, sorted by path. */
export function findClassicyLiteralColors(
	root: string,
): ClassicyLiteralColorHit[] {
	return scssFiles(join(root, "src")).flatMap((full) =>
		classicyLiteralColorHits(
			relative(root, full).split(sep).join("/"),
			readFileSync(full, "utf8"),
		),
	);
}

function main(): void {
	const hits = findClassicyLiteralColors(process.cwd());
	for (const hit of hits) {
		process.stdout.write(`${hit.file}:${hit.line}: ${hit.text}\n`);
	}
	if (hits.length > 0) {
		process.stderr.write(
			`${hits.length} literal color(s): use a --color-* token or classicy-tint/-shade/-alpha (src/Appearance/vocabulary/_color.scss)\n`,
		);
		process.exit(1);
	}
}

if (process.argv[1]?.endsWith("classicyLiteralColorSweep.ts")) {
	main();
}
