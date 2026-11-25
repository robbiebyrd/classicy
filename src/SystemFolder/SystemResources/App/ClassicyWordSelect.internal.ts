import type { MouseEvent as ReactMouseEvent } from "react";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";

/** The spaces a double-click's word takes after it: U+0020 and U+00A0. */
const isWordSpace = (ch: string): boolean => ch === " " || ch === " ";

/**
 * Whether a double-click takes the spaces after its word (the package's
 * `layout.text.wordSelect` `"trailingSpace"`, Windows).
 * @internal
 */
export const classicyWordSelectTakesSpace = (
	layout: Pick<ClassicyAppearanceLayout, "text">,
): boolean => layout.text?.wordSelect === "trailingSpace";

/**
 * Where a word selection ending at `end` ends once it has taken the spaces
 * after it (U+0020, U+00A0), never a line break, a tab or a punctuation
 * mark: `end` itself when none follows.
 * @internal
 */
export const classicyTrailingSpaceEnd = (text: string, end: number): number => {
	let to = Math.max(0, Math.min(end, text.length));
	while (to < text.length && isWordSpace(text[to])) to++;
	return to;
};

/**
 * Extends `field`'s selection forward over the spaces after it (WIG Ch.5
 * "Selection Shortcuts", p.44: a double-click selects the word and the
 * space after it), keeping its start, the selection then running forward.
 * Leaves an empty selection, a field whose selection cannot be read (a
 * number field) and a selection no space follows alone. Returns whether it
 * moved the selection.
 * @internal
 */
export const extendClassicyWordSelection = (
	field: HTMLInputElement | HTMLTextAreaElement,
): boolean => {
	let start: number | null;
	let end: number | null;
	try {
		start = field.selectionStart;
		end = field.selectionEnd;
	} catch {
		return false;
	}
	if (start === null || end === null || start === end) return false;
	const to = classicyTrailingSpaceEnd(field.value, end);
	if (to === end) return false;
	try {
		field.setSelectionRange(start, to, "forward");
	} catch {
		return false;
	}
	return true;
};

const takeTrailingSpace = (
	e: ReactMouseEvent<HTMLInputElement | HTMLTextAreaElement>,
): void => {
	if (e.button !== 0) return;
	extendClassicyWordSelection(e.currentTarget);
};

/**
 * The `onDoubleClick` a text field (`ClassicyInput`, `ClassicyTextEditor`)
 * puts on its `<input>` or `<textarea>`: under `layout.text.wordSelect`
 * `"trailingSpace"` it extends the word the browser has just selected over
 * the spaces after it (`extendClassicyWordSelection`); on a Windows host
 * the browser has taken them already, and nothing changes. `undefined`
 * under any other layout, so the field keeps the browser's word.
 * @internal
 */
export const useClassicyWordSelect = ():
	| ((e: ReactMouseEvent<HTMLInputElement | HTMLTextAreaElement>) => void)
	| undefined =>
	classicyWordSelectTakesSpace(useClassicyAppearanceLayout())
		? takeTrailingSpace
		: undefined;
