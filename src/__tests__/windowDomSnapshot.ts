/**
 * A `ClassicyWindow`'s DOM as a snapshot string (plan 0020-w98 §8): the
 * root's own tag and attributes, each direct child's, and the title bar's
 * whole subtree, one opening tag per line. The contents are left out, so a
 * snapshot pins exactly what the window itself draws: a new class, part,
 * state, attribute or element on the root, the title bar or the frame is a
 * change the snapshot shows.
 */
const shallow = (el: Element): string =>
	(el.cloneNode(false) as Element).outerHTML;

export function classicyWindowDomSnapshot(root: Element): string {
	const titleBar = root.querySelector(":scope > .classicyWindowTitleBar");
	return [
		`root: ${shallow(root)}`,
		"children:",
		...Array.from(root.children, (child) => `  ${shallow(child)}`),
		"titleBar:",
		// A line per opening tag; an empty element stays on its line.
		(titleBar?.outerHTML ?? "(none)").replace(/>(?=<[^/])/g, ">\n"),
	].join("\n");
}
