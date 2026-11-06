import { resolve } from "node:path";
import * as sass from "sass";
import {
	classicyCssRules,
	classicySelectorSpecificity,
	classicySelectorSubject,
	compareClassicySpecificity,
	splitClassicySelectorList,
} from "../../../bin/classicyCssCascade";

/**
 * Which declaration of `property` the cascade gives `element` from the
 * component stylesheets `files` (paths from the repo root), loaded in that
 * order: the strongest matching selector, the later one on a tie. jsdom does
 * no cascade, so tests that pin a winner across stylesheets compute it here,
 * matching selectors with jsdom's `Element.matches`. Pseudo-element rules and
 * at-rule context are ignored, as in the cross-file guard
 * (ClassicyCascade.repo.test.ts); `undefined` when nothing sets it.
 *
 * Call it with the files in both orders to prove a winner does not depend on
 * the order `dist/classicy.css` happens to concatenate them in.
 */
export const classicyCascadeWinner = (
	element: Element,
	files: string[],
	property: string,
): { value: string; selector: string; file: string } | undefined => {
	let best:
		| {
				value: string;
				selector: string;
				file: string;
				specificity: [number, number, number];
		  }
		| undefined;
	for (const file of files)
		for (const rule of classicyCssRules(compiled(file)))
			for (const selector of splitClassicySelectorList(rule.selector)) {
				if (classicySelectorSubject(selector).pseudoElement) continue;
				if (!element.matches(selector)) continue;
				const specificity = classicySelectorSpecificity(selector);
				for (const [prop, value] of rule.declarations) {
					if (prop !== property) continue;
					if (
						!best ||
						compareClassicySpecificity(specificity, best.specificity) >= 0
					)
						best = { value, selector, file, specificity };
				}
			}
	return (
		best && { value: best.value, selector: best.selector, file: best.file }
	);
};

const cache = new Map<string, string>();
const compiled = (file: string): string => {
	let css = cache.get(file);
	if (css === undefined) {
		css = sass.compile(resolve(process.cwd(), file), {
			style: "expanded",
			loadPaths: [resolve(process.cwd(), "src")],
			importers: [new sass.NodePackageImporter()],
		}).css;
		cache.set(file, css);
	}
	return css;
};
