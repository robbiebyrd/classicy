// Test-only (the core's vitest project, vitest.config.ts): what Platinum's
// source imports from `@classicy/classicy`, re-exported from the core modules
// that define it. Platinum is a workspace package that reaches the core only
// through its public name (plan 0015-kxa §3.1); in a host that is the barrel,
// which the host has loaded anyway. A core unit test that loads Platinum
// should load only these modules, as it did while Platinum imported them by
// path: the barrel's side-effect registrations (the Sound Control Strip
// module, the bundled apps' manifests) and its evaluation would defeat the
// tests' `vi.mock`s. The package's own tests load the whole barrel.
// platinumCoreImports.test.ts pins that every value Platinum imports is here
// and is the barrel's.

export { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
export { classicyKnobsToSchema } from "@/Appearance/ClassicyAppearancePackageSchema";
export { playClassicyAppearanceSound } from "@/Appearance/ClassicyAppearanceSound";
export {
	registerClassicyCursors,
	registerClassicyFonts,
	registerClassicySystemArt,
	registerClassicyWallpapers,
	resolveClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";
export { encodeClassicyPixelArtRows } from "@/Appearance/ClassicyPixelArtSource";
export { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
export { withDefaultThemeMetrics } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
export {
	ClassicySoundPackSchema,
	registerClassicySoundPack,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
// Platinum's screen savers (plan 0016-vbq §2.1).
export {
	getClassicyScreenSaver,
	listClassicyScreenSavers,
	registerClassicyScreenSaver,
	resolveScreenSaverConfig,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
export { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
export { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
export { ClassicySpinner } from "@/SystemFolder/SystemResources/Spinner/ClassicySpinner";
