export type ClassicyCrayon = {
	color: number;
	name: string;
};

// Approximate Mac OS 8 / Mac OS X Color Picker crayon palette, 8 columns × 8 rows.
export const MAC_OS_8_CRAYONS: ClassicyCrayon[] = [
	// Row 1 — light tints
	{ name: "Snow", color: 0xffffff },
	{ name: "Honeydew", color: 0xd4ffd4 },
	{ name: "Banana", color: 0xffffb8 },
	{ name: "Cantaloupe", color: 0xffcb8e },
	{ name: "Salmon", color: 0xff9898 },
	{ name: "Carnation", color: 0xff98c3 },
	{ name: "Bubblegum", color: 0xff98ff },
	{ name: "Lavender", color: 0xc398ff },
	// Row 2 — vivid saturated
	{ name: "Mercury", color: 0xe8e8e8 },
	{ name: "Flora", color: 0x73ff98 },
	{ name: "Lemon", color: 0xfeff00 },
	{ name: "Tangerine", color: 0xff9300 },
	{ name: "Maraschino", color: 0xff2600 },
	{ name: "Strawberry", color: 0xff2f92 },
	{ name: "Magenta", color: 0xff44ff },
	{ name: "Grape", color: 0x9400d3 },
	// Row 3 — cool vivid
	{ name: "Silver", color: 0xd4d4d4 },
	{ name: "Spindrift", color: 0x73fdc8 },
	{ name: "Seafoam", color: 0x73fdfd },
	{ name: "Sky", color: 0x76d7ff },
	{ name: "Orchid", color: 0x7a7fff },
	{ name: "Blueberry", color: 0x0433ff },
	{ name: "Aqua", color: 0x0096ff },
	{ name: "Ocean", color: 0x0062a3 },
	// Row 4 — mid greens / blues
	{ name: "Aluminum", color: 0xaaaaaa },
	{ name: "Lime", color: 0x00f900 },
	{ name: "Spring", color: 0x00fa92 },
	{ name: "Turquoise", color: 0x00c3c3 },
	{ name: "Teal", color: 0x007d7b },
	{ name: "Midnight", color: 0x011993 },
	{ name: "Eggplant", color: 0x3f0066 },
	{ name: "Plum", color: 0x700070 },
	// Row 5 — dark saturated
	{ name: "Magnesium", color: 0x888888 },
	{ name: "Fern", color: 0x43a200 },
	{ name: "Clover", color: 0x007400 },
	{ name: "Moss", color: 0x53650a },
	{ name: "Asparagus", color: 0x829600 },
	{ name: "Mocha", color: 0x774201 },
	{ name: "Maroon", color: 0x600008 },
	{ name: "Cayenne", color: 0x942017 },
	// Row 6 — deep darks
	{ name: "Nickel", color: 0x686868 },
	{ name: "Sage", color: 0x7c8b6a },
	{ name: "Cypress", color: 0x4a5d3f },
	{ name: "Cedar", color: 0x6b3d2d },
	{ name: "Umber", color: 0x543b28 },
	{ name: "Sepia", color: 0x5b4134 },
	{ name: "Crimson", color: 0xdc143c },
	{ name: "Indigo", color: 0x4b0082 },
	// Row 7 — accent + extra
	{ name: "Tin", color: 0x505050 },
	{ name: "Jade", color: 0x00a86b },
	{ name: "Cobalt", color: 0x0047ab },
	{ name: "Amber", color: 0xffbf00 },
	{ name: "Violet", color: 0x7f00ff },
	{ name: "Rose", color: 0xff007f },
	{ name: "Chartreuse", color: 0x7fff00 },
	{ name: "Cerulean", color: 0x007ba7 },
	// Row 8 — near-blacks
	{ name: "Steel", color: 0x3c3c3c },
	{ name: "Peach", color: 0xffcba4 },
	{ name: "Mint", color: 0x98ff98 },
	{ name: "Lilac", color: 0xc8a2c8 },
	{ name: "Gold", color: 0xffd700 },
	{ name: "Sienna", color: 0xa0522d },
	{ name: "Slate", color: 0x708090 },
	{ name: "Licorice", color: 0x000000 },
];
