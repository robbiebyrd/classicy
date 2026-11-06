import type { Plugin } from "vite";
import {
	type ClassicyStylesheetFontFace,
	classicyEmittedFontFiles,
	classicyFontStylesheet,
	classicyFontStylesheetFile,
} from "./classicyFontStylesheet";
import { classicyPackageStylesheets } from "./classicyPackageCss";
import { prependLayerOrder } from "./classicyStyleInjector";

// An Appearance Package's static stylesheets, for hosts whose
// Content-Security-Policy forbids inline <style> (plan 0015-kxa §3.4; until
// then the core's injectCssPlugin emitted Platinum's). A package's stylesheet
// ships in its bundle as a string (its `?inline` import) that the package
// registry injects at runtime as `<style id="classicy-appearance-<id>">`, and
// its fonts are files that registerClassicyFonts writes `@font-face` rules
// for into `<style id="classicy-fonts-<id>">`. A strict CSP blocks both, so
// the package's own build emits them as files too:
//
// - dist/classicy-<name>.css, one per package stylesheet module, read from the
//   module's final transformed code, so it is byte for byte what the bundle
//   injects, starting with CLASSICY_LAYER_ORDER (the package's verify-dist
//   compares the two);
// - dist/classicy-<id>.fonts.css, the same `@font-face` rules the runtime
//   writes (the package's face list and classicyFontStylesheet), each url()
//   naming the font's emitted file relative to dist/.
//
// Such hosts link the core's classicy.css, then these two, in that order.

export type ClassicyPackageStylesheetsOptions = {
	/** The package's id: its font stylesheet is classicy-<id>.fonts.css. */
	packageId: string;
	/**
	 * The faces the package registers at runtime, and their folder as the
	 * build sees it (relative to the build's root). Omitted: no fonts.
	 */
	fonts?: {
		faces: readonly ClassicyStylesheetFontFace[];
		dir: string;
	};
};

export function classicyPackageStylesheetsPlugin({
	packageId,
	fonts,
}: ClassicyPackageStylesheetsOptions): Plugin {
	return {
		name: "classicy-package-stylesheets",
		enforce: "post",
		generateBundle(_options, bundle) {
			for (const { fileName, css } of classicyPackageStylesheets(
				Array.from(this.getModuleIds(), (id) => ({
					id,
					code: this.getModuleInfo(id)?.code ?? null,
				})),
			)) {
				this.emitFile({
					type: "asset",
					fileName,
					source: prependLayerOrder(css),
				});
			}
			if (!fonts) return;
			const stylesheet = classicyFontStylesheetFile(packageId);
			const fontFiles = classicyEmittedFontFiles(
				Object.values(bundle).flatMap((output) =>
					output.type === "asset" ? [output] : [],
				),
				fonts.dir,
			);
			try {
				this.emitFile({
					type: "asset",
					fileName: stylesheet,
					source: classicyFontStylesheet(
						fonts.faces,
						(face) => fontFiles.get(face.file),
						stylesheet,
					),
				});
			} catch (error) {
				this.error(error instanceof Error ? error.message : String(error));
			}
		},
	};
}
