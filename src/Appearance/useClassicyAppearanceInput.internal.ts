import { useEffect } from "react";

/**
 * How the user drove an appearance event that a component emits from both a
 * pointer path and a keyboard path: `detail.input` (ruling I-R14). A package
 * uses it to tell, say, a mouse press on a tab from an arrow key landing on
 * it.
 */
export type ClassicyAppearanceInput = "pointer" | "keyboard";

// The modality of the most recent press anywhere in the document. Capture
// listeners on the document run before any component handler, so an emit made
// while handling a press, or right after it (a passive close effect, a native
// change event), sees that press. A modifier held for a click is pressed
// before the pointer goes down, so a Shift- or Ctrl-click still reads
// "pointer".
let lastInput: ClassicyAppearanceInput = "pointer";
let installed = false;

const markPointer = () => {
	lastInput = "pointer";
};
const markKeyboard = () => {
	lastInput = "keyboard";
};

const install = () => {
	if (installed || typeof document === "undefined") return;
	installed = true;
	document.addEventListener("pointerdown", markPointer, true);
	document.addEventListener("mousedown", markPointer, true);
	document.addEventListener("keydown", markKeyboard, true);
};

/**
 * `detail` with the modality of the press behind the event merged in; with no
 * detail, `{ input }`.
 */
export function withClassicyAppearanceInput(): {
	input: ClassicyAppearanceInput;
};
export function withClassicyAppearanceInput<T extends object>(
	detail: T,
): T & { input: ClassicyAppearanceInput };
export function withClassicyAppearanceInput(detail?: object) {
	return { ...detail, input: lastInput };
}

/**
 * Starts tracking the press modality (once per document, never torn down:
 * three passive capture listeners) and returns `withClassicyAppearanceInput`.
 * Installed from the first mounted component rather than at import, so the
 * package's `sideEffects` list can never drop it; a mounted component exists
 * before any press on it.
 * @internal
 */
export function useClassicyAppearanceInput(): typeof withClassicyAppearanceInput {
	useEffect(install, []);
	return withClassicyAppearanceInput;
}

/**
 * Test helper: forget the last press, so each test starts from "pointer".
 * @internal
 */
export const resetClassicyAppearanceInputForTests = (): void => {
	lastInput = "pointer";
};
