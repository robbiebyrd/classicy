/**
 * Moving the keyboard out of a group of elements that takes Tab for itself
 * (the desktop's icons and an icon view's, which select by name with Tab, as
 * the Mac OS 8.1 Finder did; story 0228-e9l). 8.1 owned the screen and
 * wrapped from the last name to the first; Classicy lives in a page, beside
 * a host's content and assistive technology, so at the ends Tab leaves the
 * group instead (WCAG 2.2 SC 2.1.2, No Keyboard Trap).
 * @internal
 */

const CANDIDATES = [
	"a[href]",
	"area[href]",
	"button",
	"input",
	"select",
	"textarea",
	"iframe",
	"summary",
	"audio[controls]",
	"video[controls]",
	"[contenteditable]",
	"[tabindex]",
].join(",");

// Drawn: not under `display: none` or `visibility: hidden` (a hidden app's
// windows stay mounted, `display: none`). `checkVisibility` where the
// browser has it; else the computed style up the tree (Safari before 17.4,
// and jsdom, which lays nothing out).
const isDrawn = (el: HTMLElement): boolean => {
	if (typeof el.checkVisibility === "function")
		return el.checkVisibility({ visibilityProperty: true });
	for (let node: Element | null = el; node; node = node.parentElement)
		if (getComputedStyle(node).display === "none") return false;
	return getComputedStyle(el).visibility !== "hidden";
};

const isTabbable = (el: HTMLElement): boolean =>
	el.tabIndex >= 0 &&
	!(el as HTMLButtonElement).disabled &&
	!(el instanceof HTMLInputElement && el.type === "hidden") &&
	el.closest("[inert]") === null &&
	isDrawn(el);

/**
 * The page's sequential focus order (`root`'s): elements with a positive
 * `tabIndex` first, in ascending order, then those at 0, each in document
 * order.
 * @internal
 */
export const classicyTabbableElements = (
	root: ParentNode = document,
): HTMLElement[] => {
	const all = Array.from(root.querySelectorAll<HTMLElement>(CANDIDATES)).filter(
		isTabbable,
	);
	const positive = all
		.filter((el) => el.tabIndex > 0)
		.sort((a, b) => a.tabIndex - b.tabIndex);
	return [...positive, ...all.filter((el) => el.tabIndex === 0)];
};

// Whether `el` lies after (before) `edge` in the document, outside it.
const lies = (el: Element, edge: Element, backward: boolean): boolean => {
	const at = edge.compareDocumentPosition(el);
	return backward
		? (at & Node.DOCUMENT_POSITION_PRECEDING) !== 0 &&
				(at & Node.DOCUMENT_POSITION_CONTAINS) === 0
		: (at & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 &&
				(at & Node.DOCUMENT_POSITION_CONTAINED_BY) === 0;
};

/**
 * Moves the keyboard from a group of elements (`members`, and anything inside
 * `container`) to the next element in the page's focus order after the group,
 * or with `backward` the previous one before it, never to another member: the
 * element a browser's Tab (Shift-Tab) would reach from the group's last
 * (first) member if the group were one stop. Returns true when it moved
 * focus, so the caller prevents the browser's own Tab. With nothing after
 * (before) the group in the page, it puts focus on the group's last (first)
 * member and returns false, so the browser's own Tab, let run, leaves the
 * page from there.
 * @internal
 */
export const moveClassicyFocusOutOf = (
	members: readonly HTMLElement[],
	backward: boolean,
	container?: Element,
): boolean => {
	if (members.length === 0) return false;
	const inGroup = (el: Element) =>
		members.includes(el as HTMLElement) || (container?.contains(el) ?? false);
	const byDocument = [...members].sort((a, b) => (lies(b, a, false) ? -1 : 1));
	const first = byDocument[0];
	const last = byDocument[byDocument.length - 1];
	const order = classicyTabbableElements();
	// The group's stops in the focus order; the target is the first stop past
	// them that is not the group's. With none of them a stop, by the
	// document.
	const stops = order.flatMap((el, at) => (inGroup(el) ? [at] : []));
	let target: HTMLElement | undefined;
	if (stops.length > 0) {
		const step = backward ? -1 : 1;
		for (
			let at = backward ? Math.min(...stops) - 1 : Math.max(...stops) + 1;
			at >= 0 && at < order.length;
			at += step
		)
			if (!inGroup(order[at])) {
				target = order[at];
				break;
			}
	} else {
		const edge = container ?? (backward ? first : last);
		const outside = order.filter(
			(el) => !inGroup(el) && lies(el, edge, backward),
		);
		target = backward ? outside.at(-1) : outside[0];
	}
	if (target) {
		target.focus();
		return true;
	}
	(backward ? first : last).focus();
	return false;
};
