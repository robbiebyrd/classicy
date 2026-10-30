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

// The CSS named colors (CSS Color 4).
const NAMED_COLORS =
	"aliceblue antiquewhite aqua aquamarine azure beige bisque black " +
	"blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse " +
	"chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan " +
	"darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta " +
	"darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen " +
	"darkslateblue darkslategray darkslategrey darkturquoise darkviolet " +
	"deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite " +
	"forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green " +
	"greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender " +
	"lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan " +
	"lightgoldenrodyellow lightgray lightgreen lightgrey lightpink " +
	"lightsalmon lightseagreen lightskyblue lightslategray lightslategrey " +
	"lightsteelblue lightyellow lime limegreen linen magenta maroon " +
	"mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen " +
	"mediumslateblue mediumspringgreen mediumturquoise mediumvioletred " +
	"midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive " +
	"olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise " +
	"palevioletred papayawhip peachpuff peru pink plum powderblue purple " +
	"rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown " +
	"seagreen seashell sienna silver skyblue slateblue slategray slategrey " +
	"snow springgreen steelblue tan teal thistle tomato turquoise violet " +
	"wheat white whitesmoke yellow yellowgreen";

// A literal color: a hex color; a color function whose first argument is a
// literal number (whitespace allowed): rgb()/rgba(), hsl()/hsla(), hwb(),
// lab(), lch(), oklab(), oklch(), or color() with a color space; or a CSS
// named color as a bare keyword, in any case. (A groove border's literal is
// its rgb().)
const LITERAL = new RegExp(
	[
		String.raw`#[0-9a-fA-F]{3,8}\b`,
		String.raw`\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[-+.0-9]`,
		String.raw`\bcolor\(\s*(?:srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz|xyz-d50|xyz-d65)\b`,
		`(?:^|[\\s:,(])(?:${NAMED_COLORS.split(" ").join("|")})(?=[\\s;,)!]|$)`,
	].join("|"),
	"i",
);

// Spans that hold a literal on purpose, blanked before LITERAL is tested so
// the rest of their line is still checked: a `var(--x, <fallback>)` (one
// level of nested parentheses, so `rgba()` and `var()` fallbacks too) and art
// in a data URI.
const EXEMPT_SPANS: readonly RegExp[] = [
	/var\(--[a-z0-9-]+\s*,[^()]*(?:\([^()]*(?:\([^()]*\)[^()]*)*\)[^()]*)*\)/gi,
	/"data:[^"]*"|'data:[^']*'|url\(\s*data:[^)]*\)/g,
];

// Files that hold colors as data: the color helpers' own definitions (their
// white/black mix targets) and the screen savers (ported After Dark art).
const EXEMPT_FILE =
	/^src\/Appearance\/vocabulary\/_color\.scss$|Extensions\/ScreenSaver\//;

// Declarations that hold colors as art, by file. The color picker's crayon
// box is drawn as a physical object, not chrome: the dark cardboard interior
// and its bevel, the gray front lip and its edge. Its RGB/CMYK slider tracks
// run from black or white to each channel's pure color, which no theme token
// means. Every other line of the file is swept.
const EXEMPT_DECLARATIONS: Readonly<Record<string, readonly RegExp[]>> = {
	"src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss": [
		/background: #0e0906;/,
		/\binset .* rgba\(255, 255, 255, 0\.06\),/,
		/\binset .* rgba\(0, 0, 0, 0\.55\);/,
		/background: linear-gradient\(to bottom, #bbbbbb, #888888\);/,
		/border-top: var\(--control-frame-width\) solid #d4d4d4;/,
		/@include color-track\(#[0-9a-f]{6}, #[0-9a-f]{6}\);/,
	],
};

// G12, widened for Part E: an Appearance Package's own folder holds its
// values as custom-property declarations, `--<name>: <value>;`, whether a
// private constant (`--platinum-stripe-dark`) or a component-interface
// variable it supplies (`--classicy-color-picker-crosshair`; contract
// 0002-ldj: package CSS may hold constants). Only the declaration is exempt:
// a property rule (`color: #c00`) in a package partial is still a hit.
const PACKAGE_FILE = /^src\/Appearance\/([^/]+)\//;
const CUSTOM_PROPERTY_DECLARATION = /(^|[{;])\s*--[a-z0-9-]+\s*:[^;{}]*/gi;

const isPackageFile = (file: string): boolean => {
	const folder = file.match(PACKAGE_FILE)?.[1];
	return folder !== undefined && folder !== "vocabulary";
};

// Blank out /* … */ comments, keeping every newline so line numbers hold.
const stripBlockComments = (source: string): string =>
	source.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
		comment.replace(/[^\n]/g, " "),
	);

// A `//` comment to the end of the line; a `://` (a URL) is not one.
const LINE_COMMENT = /(^|[^:])\/\/.*$/;

// The line with every exempt span and its comment blanked. Data URIs go
// first, so a `//` inside one never reads as a comment.
const sweptText = (file: string, line: string): string => {
	let text = line;
	for (const span of EXEMPT_SPANS) text = text.replace(span, " ");
	text = text.replace(LINE_COMMENT, "$1");
	for (const span of EXEMPT_DECLARATIONS[file] ?? []) {
		text = text.replace(span, " ");
	}
	if (isPackageFile(file)) {
		text = text.replace(CUSTOM_PROPERTY_DECLARATION, "$1 ");
	}
	return text;
};

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
			if (!LITERAL.test(sweptText(file, text))) return;
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
