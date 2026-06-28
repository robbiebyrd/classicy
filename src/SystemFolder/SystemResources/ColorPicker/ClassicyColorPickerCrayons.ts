export type ClassicyCrayon = {
  color: number;
  name: string;
};

// Approximate Mac OS 8 / Mac OS X Color Picker crayon palette, 8 columns × 8 rows.
export const MAC_OS_8_CRAYONS: ClassicyCrayon[] = [
  // Row 1 — light tints
  { name: "Snow",        color: 0xFFFFFF }, { name: "Honeydew",   color: 0xD4FFD4 },
  { name: "Banana",      color: 0xFFFFB8 }, { name: "Cantaloupe", color: 0xFFCB8E },
  { name: "Salmon",      color: 0xFF9898 }, { name: "Carnation",  color: 0xFF98C3 },
  { name: "Bubblegum",   color: 0xFF98FF }, { name: "Lavender",   color: 0xC398FF },
  // Row 2 — vivid saturated
  { name: "Mercury",     color: 0xE8E8E8 }, { name: "Flora",      color: 0x73FF98 },
  { name: "Lemon",       color: 0xFEFF00 }, { name: "Tangerine",  color: 0xFF9300 },
  { name: "Maraschino",  color: 0xFF2600 }, { name: "Strawberry", color: 0xFF2F92 },
  { name: "Magenta",     color: 0xFF44FF }, { name: "Grape",      color: 0x9400D3 },
  // Row 3 — cool vivid
  { name: "Silver",      color: 0xD4D4D4 }, { name: "Spindrift",  color: 0x73FDC8 },
  { name: "Seafoam",     color: 0x73FDFD }, { name: "Sky",        color: 0x76D7FF },
  { name: "Orchid",      color: 0x7A7FFF }, { name: "Blueberry",  color: 0x0433FF },
  { name: "Aqua",        color: 0x0096FF }, { name: "Ocean",      color: 0x0062A3 },
  // Row 4 — mid greens / blues
  { name: "Aluminum",    color: 0xAAAAAA }, { name: "Lime",       color: 0x00F900 },
  { name: "Spring",      color: 0x00FA92 }, { name: "Turquoise",  color: 0x00C3C3 },
  { name: "Teal",        color: 0x007D7B }, { name: "Midnight",   color: 0x011993 },
  { name: "Eggplant",    color: 0x3F0066 }, { name: "Plum",       color: 0x700070 },
  // Row 5 — dark saturated
  { name: "Magnesium",   color: 0x888888 }, { name: "Fern",       color: 0x43A200 },
  { name: "Clover",      color: 0x007400 }, { name: "Moss",       color: 0x53650A },
  { name: "Asparagus",   color: 0x829600 }, { name: "Mocha",      color: 0x774201 },
  { name: "Maroon",      color: 0x600008 }, { name: "Cayenne",    color: 0x942017 },
  // Row 6 — deep darks
  { name: "Nickel",      color: 0x686868 }, { name: "Sage",       color: 0x7C8B6A },
  { name: "Cypress",     color: 0x4A5D3F }, { name: "Cedar",      color: 0x6B3D2D },
  { name: "Umber",       color: 0x543B28 }, { name: "Sepia",      color: 0x5B4134 },
  { name: "Crimson",     color: 0xDC143C }, { name: "Indigo",     color: 0x4B0082 },
  // Row 7 — accent + extra
  { name: "Tin",         color: 0x505050 }, { name: "Jade",       color: 0x00A86B },
  { name: "Cobalt",      color: 0x0047AB }, { name: "Amber",      color: 0xFFBF00 },
  { name: "Violet",      color: 0x7F00FF }, { name: "Rose",       color: 0xFF007F },
  { name: "Chartreuse",  color: 0x7FFF00 }, { name: "Cerulean",   color: 0x007BA7 },
  // Row 8 — near-blacks
  { name: "Steel",       color: 0x3C3C3C }, { name: "Peach",      color: 0xFFCBA4 },
  { name: "Mint",        color: 0x98FF98 }, { name: "Lilac",      color: 0xC8A2C8 },
  { name: "Gold",        color: 0xFFD700 }, { name: "Sienna",     color: 0xA0522D },
  { name: "Slate",       color: 0x708090 }, { name: "Licorice",   color: 0x000000 },
];
