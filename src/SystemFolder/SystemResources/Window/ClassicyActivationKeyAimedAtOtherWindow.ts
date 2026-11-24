/**
 * Whether a keyboard event is aimed at a control inside a window other than
 * `ownWindowDomId` (the DOM id of the listener's own window, `<appId>_<windowId>`).
 * Document-level key listeners of the front application (Calculator, the
 * Movie Player) use it to leave alone keys a focused control of another
 * window handles itself, such as Enter or Space on a button of a floating
 * Apple Guide window: only the front application's window gets keys that no
 * focused control handles.
 */
export const isKeyAimedAtOtherWindow = (
	event: Pick<KeyboardEvent, "target">,
	ownWindowDomId: string,
): boolean => {
	const target = event.target;
	if (!(target instanceof Element)) return false;
	const win = target.closest(".classicyWindow");
	return win !== null && win.id !== ownWindowDomId;
};
