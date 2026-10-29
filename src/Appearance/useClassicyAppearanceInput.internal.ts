/**
 * How the user drove an appearance event that a component emits from both a
 * pointer path and a keyboard path: `detail.input` (ruling I-R14). A package
 * uses it to tell, say, a mouse press on a tab from an arrow key landing on
 * it.
 */
export type ClassicyAppearanceInput = "pointer" | "keyboard";

// The modality of the most recent press anywhere in the global `document`.
// Capture listeners on the document run before any component handler, so an
// emit made while handling a press, or right after it (a passive close
// effect, a native change event), sees that press. A modifier held for a
// click is pressed before the pointer goes down, so a Shift- or Ctrl-click
// still reads "pointer".
//
// Installed once per JavaScript realm and bound to that realm's global
// `document`: a control portaled into another same-realm document (an
// iframe's, a pop-out window's) does not see that document's presses.
let lastInput: ClassicyAppearanceInput = "pointer";
let installed = false;

const markPointer = () => {
	lastInput = "pointer";
};
const markKeyboard = () => {
	lastInput = "keyboard";
};

const LISTENER_OPTIONS = { capture: true, passive: true } as const;
const LISTENERS: [string, () => void][] = [
	["pointerdown", markPointer],
	["mousedown", markPointer],
	["keydown", markKeyboard],
];

/**
 * Starts tracking the press modality: three passive capture listeners on the
 * global `document`, added once per realm and never removed.
 * `useClassicyAppearance` calls it from an effect, so every wired control
 * installs it on mount, before anyone can press it, and none can forget it.
 * Not run at import: the package's `sideEffects` list could drop a top-level
 * call.
 * @internal
 */
export const installClassicyAppearanceInput = (): void => {
	if (installed || typeof document === "undefined") return;
	installed = true;
	for (const [type, listener] of LISTENERS) {
		document.addEventListener(type, listener, LISTENER_OPTIONS);
	}
};

/**
 * `detail` with the modality of the press behind the event merged in; with no
 * detail, `{ input }`. Pass it only for events the component emits from both
 * a pointer path and a keyboard path.
 * @internal
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
 * Test helper: remove the listeners, as if no control had mounted yet.
 * @internal
 */
export const uninstallClassicyAppearanceInputForTests = (): void => {
	if (!installed) return;
	installed = false;
	for (const [type, listener] of LISTENERS) {
		document.removeEventListener(type, listener, LISTENER_OPTIONS);
	}
	lastInput = "pointer";
};

/**
 * Test helper: forget the last press, so each test starts from "pointer".
 * @internal
 */
export const resetClassicyAppearanceInputForTests = (): void => {
	lastInput = "pointer";
};
