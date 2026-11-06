// The data: URIs classicy 2.x library builds inlined Platinum's wallpapers
// as, by `classicyWallpaperDigest` (payload length, FNV-1a 64). A 2.x save
// holds such a URI; the digests let the wallpaper index map it to the
// filename once the wallpapers ship as files, whose URLs match nothing a 2.x
// build wrote. Derived from the tarball of 2.1.8, the last release published
// under the old package name (each of its 46 inlined wallpapers is the file's
// own bytes, base64), plus default.jpg, which 2.1.8 did not ship;
// platinumLegacyWallpapers.test.ts pins the 2.1.8 digests.

/** Legacy `data:` URI digests per Platinum wallpaper file. */
export const PLATINUM_LEGACY_WALLPAPER_DIGESTS: Readonly<
	Record<string, readonly string[]>
> = {
	"azul_dark.png": ["932:7a4c986fa1d898f4"],
	"azul_extra_light.png": ["932:e72b8cbad7bdc937"],
	"azul_light.png": ["932:33469f447fbfc8c4"],
	"bondi.png": ["932:3cde50d77f94985b"],
	"bondi_dark.png": ["932:c7f28cc74b807d3c"],
	"bondi_extra_dark.png": ["932:dba19e2c4bc8e3b7"],
	"bondi_light.png": ["932:a7766ce877365352"],
	"bondi_medium.png": ["932:227422eb523988f9"],
	"bossanova_bondi.png": ["25448:941b35a4bcd14785"],
	"bossanova_poppy.png": ["28688:f210fc25bea58f05"],
	"bossanova_poppy_2.png": ["24340:a5aa782bc9fa7264"],
	"bubbles_bondi.png": ["18344:65d30c59d57ee413"],
	"bubbles_poppy.png": ["9328:ed4e26527cbe7c8a"],
	"candy_bar.png": ["22000:09dbc754570f404a"],
	"candy_bar_azul.png": ["21184:c4236035e26d63b4"],
	"candy_bar_pistachio.png": ["24980:763415abf37fa44a"],
	"candy_bar_sunny.png": ["18820:a631ba0d5e21736c"],
	"default.jpg": ["28532:ffc9c30a5e94db76"],
	"default.png": ["5780:1305a4f9719dd409"],
	"diagonals_bondi.png": ["24676:8dd93f2c1ad2323a"],
	"diagonals_bondi_dark.png": ["26432:4c1c145fb0da728d"],
	"diagonals_poppy.png": ["17024:7459a1a7afa3a50b"],
	"flat_peanuts.png": ["22048:d8ca61b5787237a9"],
	"flat_peanuts_poppy.png": ["16752:c097c0c185a8d33a"],
	"french_blue_dark.png": ["932:a7adbd3726231c33"],
	"french_blue_light.png": ["932:ba756c4e7d2f7389"],
	"macos.png": ["36308:847cc516f062d5e5"],
	"peanuts_azul.png": ["19864:a9a337728c7cfdaf"],
	"peanuts_pistachio.png": ["25100:10c5e3f43e45f91b"],
	"pistachio_dark.png": ["932:83112f7a18005b63"],
	"pistachio_light.png": ["932:e8a9f65fed29b9e0"],
	"pistachio_medium.png": ["932:e16662f5584c2121"],
	"poppy.png": ["932:65eeca145e6238c4"],
	"poppy_dark.png": ["932:59f8d9f669a25257"],
	"poppy_light.png": ["932:d22e289933642d08"],
	"poppy_medium.png": ["932:c7c13f8029764a4e"],
	"rio_azul.png": ["19572:c961710800916649"],
	"rio_pistachio.png": ["17716:d4f5fd9c8ddd2706"],
	"ripple_azul.png": ["25056:2769ae6c1c33cbd3"],
	"ripple_bondi.png": ["33072:9d769f1d1dcd8e5d"],
	"ripple_poppy.png": ["26584:228098302a3906c4"],
	"sunny.png": ["932:c43e9049b56ccc1b"],
	"sunny_dark.png": ["932:1a6ec62448a3a982"],
	"sunny_light.png": ["932:e637453907e47e7a"],
	"waves_azul.png": ["21420:94530b675786cafc"],
	"waves_bondi.png": ["26628:3cc813434b632c40"],
	"waves_sunny.png": ["23348:5accdddbdab362ce"],
};
