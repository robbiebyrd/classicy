import type { Plugin } from "vite";
import { CLASSICY_IMAGE_TOOLS_EXCLUDES } from "./classicyImageTools";

// Appearance Package assets (the Platinum fonts and system art) must ship as
// files in dist/assets, not as base64 inside the bundle. Lib mode inlines every
// asset regardless of `assetsInlineLimit` (`shouldInline` returns true for
// `build.lib`), but a per-import `?no-inline` query short-circuits that check.
// This resolver appends the query to every asset import that resolves under a
// package's source (src/Appearance in the core, packages/appearance/<id> for a
// workspace package), so source files keep plain imports. The emitted files
// are referenced as `new URL("assets/...", import.meta.url)`, relative to the
// bundle. Imports that already carry a Vite query (the halftone mask's
// `?inline`, ruling E17) are left alone. Shared by the core's and Platinum's
// library builds (vite.config.ts, packages/appearance/platinum/vite.config.ts);
// `isPackageAsset` can narrow what counts as a package's asset. Since the core
// stopped bundling Platinum (plan 0015-kxa §3.4) both builds use the default:
// every package source file, the sound sprites, wallpapers, art and cursors
// under packages/appearance/<id>/src/assets included, and the screen savers'
// .webp art under packages/appearance/<id>/src/screenSavers (plan 0016-vbq).

const ASSET_RE =
	/\.(woff2?|ttf|otf|png|jpe?g|gif|svg|webp|ogg|m4a|mp3|ac3|wav)$/i;

/**
 * Whether a resolved file is an Appearance Package's own source file: the one
 * matcher (bin/classicyImageTools.ts), on a path with forward slashes.
 */
export const isClassicyAppearanceSourcePath = (file: string): boolean =>
	CLASSICY_IMAGE_TOOLS_EXCLUDES.test(file.replace(/\\/g, "/"));

export function noInlineAppearanceAssetsPlugin(
	isPackageAsset: (file: string) => boolean = isClassicyAppearanceSourcePath,
): Plugin {
	return {
		name: "classicy-no-inline-appearance-assets",
		enforce: "pre",
		async resolveId(source, importer, options) {
			if (!importer || source.includes("?")) return null;
			const resolved = await this.resolve(source, importer, {
				...options,
				skipSelf: true,
			});
			if (!resolved) return null;
			const [file] = resolved.id.split("?");
			if (!ASSET_RE.test(file) || !isPackageAsset(file)) {
				return null;
			}
			return `${resolved.id}${resolved.id.includes("?") ? "&" : "?"}no-inline`;
		},
	};
}
