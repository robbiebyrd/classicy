// The Platinum fonts as a stylesheet a strict-CSP host can link. At runtime
// registerClassicyFonts writes the faces into `<style id="classicy-fonts-
// platinum">`, which a policy without `'unsafe-inline'` in `style-src`
// blocks, as it blocks the injected look. The look has its static twin in
// dist/classicy-platinum.css; this is the fonts', dist/classicy-platinum.fonts.css:
// the same rules (classicyFontFaceRule, the runtime's writer) for the same
// faces (PLATINUM_FONT_FACES, the runtime's list), each `url()` naming the
// emitted file relative to dist/. It is unlayered (`@font-face` ignores
// layers) and ASCII (invariant 9).
//
// The name keeps it out of the `classicy-<name>.css` namespace, which belongs
// to package stylesheets: invariant 7 reads every such file as one, and a
// package whose stylesheet were `fonts-platinum.scss` would be emitted as
// `classicy-fonts-platinum.css`. A dot can never appear in a package
// stylesheet's name (lowercase kebab-case), so `classicy-platinum.fonts.css`
// cannot collide, and it sorts beside the stylesheet it follows.
//
// Plain erasable TypeScript: check-dist-imports.mjs imports this file through
// Node's type stripping.

import { classicyFontFaceRule } from "../src/Appearance/ClassicyFontFaceCss.internal.ts";

/** dist/<this>: the Platinum fonts for hosts that link the stylesheets. */
export const CLASSICY_PLATINUM_FONT_STYLESHEET = "classicy-platinum.fonts.css";

/** A face to write: its family, its source file's basename and descriptors. */
export type ClassicyStylesheetFontFace = {
	family: string;
	file: string;
	weight: string;
	style: string;
};

const PLATINUM_FONT_SOURCE =
	/packages\/appearance\/platinum\/src\/assets\/fonts\/([^/]+)\.woff2$/;

/**
 * Each Platinum font's emitted file name (relative to dist/), keyed by its
 * source basename without `.woff2`, from the bundle's assets.
 */
export const classicyEmittedFontFiles = (
	assets: ReadonlyArray<{
		fileName: string;
		originalFileNames: readonly string[];
	}>,
): Map<string, string> => {
	const files = new Map<string, string>();
	for (const { fileName, originalFileNames } of assets) {
		for (const name of originalFileNames) {
			const match = PLATINUM_FONT_SOURCE.exec(name.replace(/\\/g, "/"));
			if (match) files.set(match[1], fileName);
		}
	}
	return files;
};

/**
 * The stylesheet: one rule per face, in order, one per line, exactly as the
 * runtime writes them, with `fileOf(face)` as the source. Throws naming a
 * face whose file was not emitted.
 */
export const classicyFontStylesheet = (
	faces: readonly ClassicyStylesheetFontFace[],
	fileOf: (face: ClassicyStylesheetFontFace) => string | undefined,
): string =>
	`${faces
		.map((face) => {
			const file = fileOf(face);
			if (!file)
				throw new Error(
					`${CLASSICY_PLATINUM_FONT_STYLESHEET}: no emitted file for ${face.file}.woff2 ("${face.family}" ${face.weight} ${face.style}).`,
				);
			return classicyFontFaceRule({ ...face, sources: [file] });
		})
		.join("\n")}\n`;

const RULE = /@font-face\{([^{}]*)\}/y;
const WHITESPACE = /\s*/y;
const DESCRIPTOR = /^\s*([a-z-]+)\s*:\s*(.*?)\s*$/;
const SOURCE_URL = /url\("([^"]*)"\)/g;
// A file directly in dist/assets: no directory, no traversal, no scheme.
const ASSET_URL = /^assets\/(?!\.\.?$)[^/\\:?#]+$/;

const faceName = (family: string, weight: string, style: string) =>
	`"${family}" ${weight} ${style}`;

/**
 * Invariant 12's problems with the font stylesheet `file` (its text, or
 * `null` when missing): it must hold only unlayered `@font-face` rules, one
 * per face in `faces` and no other, each exactly the rule the runtime writes
 * for its sources, and every `url()` must name the face's own file in
 * dist/assets, one that `exists` (called with the url as written, relative
 * to the stylesheet).
 */
export const findClassicyFontStylesheetProblems = (
	file: string,
	css: string | null,
	faces: readonly ClassicyStylesheetFontFace[],
	exists: (url: string) => boolean,
): string[] => {
	if (css === null)
		return [
			`${file}: missing -> check the font stylesheet in injectCssPlugin (vite.config.ts).`,
		];
	const problems: string[] = [];
	const seen = new Set<string>();
	const skip = (at: number) => {
		WHITESPACE.lastIndex = at;
		WHITESPACE.test(css);
		return WHITESPACE.lastIndex;
	};
	let at = skip(0);
	while (at < css.length) {
		RULE.lastIndex = at;
		const rule = RULE.exec(css);
		// Anything else makes the faces unreadable: report that alone.
		if (!rule)
			return [
				`${file}: holds something other than unlayered @font-face rules at offset ${at} -> @font-face ignores layers; write the rules bare.`,
			];
		at = skip(RULE.lastIndex);
		const descriptors = new Map<string, string>();
		for (const declaration of rule[1].split(";")) {
			const match = DESCRIPTOR.exec(declaration);
			if (match) descriptors.set(match[1], match[2]);
		}
		const family =
			/^"([^"]*)"$/.exec(descriptors.get("font-family") ?? "")?.[1] ?? "";
		const weight = descriptors.get("font-weight") ?? "";
		const style = descriptors.get("font-style") ?? "";
		const sources = [
			...(descriptors.get("src") ?? "").matchAll(SOURCE_URL),
		].map((m) => m[1]);
		const key = `${family}|${weight}|${style}`;
		const name = faceName(family, weight, style);
		if (seen.has(key)) {
			problems.push(`${file}: more than one @font-face for ${name}.`);
			continue;
		}
		seen.add(key);
		const registered = faces.find(
			(f) => `${f.family}|${f.weight}|${f.style}` === key,
		);
		if (!registered) {
			problems.push(
				`${file}: @font-face for ${name}, which the runtime does not register.`,
			);
			continue;
		}
		if (rule[0] !== classicyFontFaceRule({ family, weight, style, sources })) {
			problems.push(
				`${file}: the @font-face for ${name} is not the rule the runtime writes (${classicyFontFaceRule({ family, weight, style, sources })}) -> build it with classicyFontStylesheet.`,
			);
		}
		for (const url of sources) {
			if (!ASSET_URL.test(url) || !exists(url)) {
				problems.push(
					`${file}: url("${url}") does not resolve to a file in dist/assets.`,
				);
				continue;
			}
			// Its own file: `<file>.woff2`, or `<file>-<hash>.woff2` should the
			// emitted names ever be hashed (no face's file is another's prefix).
			const emitted = url.slice("assets/".length);
			if (
				emitted !== `${registered.file}.woff2` &&
				!(
					emitted.startsWith(`${registered.file}-`) &&
					emitted.endsWith(".woff2")
				)
			)
				problems.push(
					`${file}: the @font-face for ${name} points at "${url}", not its own file ${registered.file}.woff2.`,
				);
		}
	}
	for (const face of faces) {
		if (!seen.has(`${face.family}|${face.weight}|${face.style}`))
			problems.push(
				`${file}: no @font-face for ${faceName(face.family, face.weight, face.style)}, which the runtime registers.`,
			);
	}
	return problems;
};
