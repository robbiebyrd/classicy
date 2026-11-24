/**
 * The controls that act on Enter or Space themselves: native ones and those
 * given a role that does.
 */
const INTERACTIVE_CONTROL = [
	"button",
	"a[href]",
	"input",
	"select",
	"textarea",
	"summary",
	"[contenteditable='true']",
	"[role='button']",
	"[role='link']",
	"[role='checkbox']",
	"[role='radio']",
	"[role='switch']",
	"[role='tab']",
	"[role='menuitem']",
	"[role='option']",
].join(",");

/**
 * Whether a keyboard event is Enter or Space aimed at an interactive control
 * (a button, link, form control, or anything with a role that handles them)
 * inside a window other than `ownWindowDomId` (the DOM id of the listener's
 * own window, `<appId>_<windowId>`). Document-level key listeners of the
 * front application (Calculator, the Movie Player) use it to leave alone the
 * activation keys a focused control of a floating Apple Guide window handles
 * itself. Every other key, plain typing included, stays with the front
 * application's window, as keystrokes go to the active application under a
 * floating window; a key a control consumes says so with `preventDefault`,
 * which the listeners check.
 */
export const isActivationKeyAimedAtOtherWindowControl = (
	event: Pick<KeyboardEvent, "target" | "key">,
	ownWindowDomId: string,
): boolean => {
	if (event.key !== "Enter" && event.key !== " ") return false;
	const target = event.target;
	if (!(target instanceof Element)) return false;
	if (target.closest(INTERACTIVE_CONTROL) === null) return false;
	const win = target.closest(".classicyWindow");
	return win !== null && win.id !== ownWindowDomId;
};
