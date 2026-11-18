// Where a menu goes across so it shows (owner report 2026-11-17, plan
// 0018-dbd Batch O). System 7.5's Menu Manager, measured: a pull-down hangs
// with its left side under its title's left side; one that would pass the
// screen's right edge hangs with its right side under its title's right
// side instead (`*-menu-help-and-selected-icon.png`: the Help title's box
// ends at x 605 and so does its menu's frame; `*-755-appmenu-open.png`, the
// Application menu, likewise; Mac OS 8.1's `platinum-81-appmenu-open.png`
// agrees); one still too wide is pinned inside the screen. A submenu flips
// to its parent's left side by the same test, and is pinned the same way.
// Down, every menu keeps to the same box: a pull-down's scroll cap ends at
// its bottom, and a menu still past it is pinned up. The screen is what
// shows of the desktop: its box (`.classicyDesktop`) where it overlaps the
// viewport, else the viewport. Pure measurement: the components publish the
// decision (ClassicyMenu's `classicySubMenuFlipLeft`, a contextual menu's
// `left` and `top`).

/** A box in viewport pixels. */
export type ClassicyMenuBox = {
	left: number;
	top: number;
	right: number;
	bottom: number;
};

// Within this of an edge counts as inside it: fractions a layout engine
// leaves behind, never a pixel column.
const EDGE_TOLERANCE = 0.01;

const px = (value: string | undefined | null) => {
	const n = Number.parseFloat(value ?? "");
	return Number.isFinite(n) ? n : 0;
};

const isFinitePx = (value: string | undefined | null) =>
	Number.isFinite(Number.parseFloat(value ?? ""));

const viewportBox = (): ClassicyMenuBox => ({
	left: 0,
	top: 0,
	right: window.innerWidth,
	bottom: window.innerHeight,
});

/**
 * The box a menu must show inside, on both axes: what shows of the desktop
 * (`.classicyDesktop`, the nearest one around `el`, else the page's), its
 * box where it overlaps the viewport. A desktop embedded in a page ends
 * inside the viewport; one wider or taller than the window (a host that
 * fixes its size, or a scrolled page) is cut to the viewport. With no
 * desktop, one with no box yet (not laid out) or one wholly outside the
 * viewport, the viewport's.
 */
export const classicyMenuBounds = (el: Element | null): ClassicyMenuBox => {
	const viewport = viewportBox();
	const desktop =
		el?.closest(".classicyDesktop") ??
		el?.ownerDocument?.querySelector(".classicyDesktop") ??
		null;
	if (!desktop) return viewport;
	const r = desktop.getBoundingClientRect();
	if (!(r.width > 0) || !(r.height > 0)) return viewport;
	const shown = {
		left: Math.max(r.left, viewport.left),
		top: Math.max(r.top, viewport.top),
		right: Math.min(r.right, viewport.right),
		bottom: Math.min(r.bottom, viewport.bottom),
	};
	return shown.right > shown.left && shown.bottom > shown.top
		? shown
		: viewport;
};

const union = (a: ClassicyMenuBox, b: ClassicyMenuBox): ClassicyMenuBox => ({
	left: Math.min(a.left, b.left),
	top: Math.min(a.top, b.top),
	right: Math.max(a.right, b.right),
	bottom: Math.max(a.bottom, b.bottom),
});

/** The shadows of a computed `box-shadow` list, split at its top-level commas. */
const splitShadows = (value: string) => {
	const shadows: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < value.length; i++) {
		if (value[i] === "(") depth++;
		else if (value[i] === ")") depth--;
		else if (value[i] === "," && depth === 0) {
			shadows.push(value.slice(start, i));
			start = i + 1;
		}
	}
	shadows.push(value.slice(start));
	return shadows;
};

/**
 * How far an element's outer `box-shadow`s reach past its border box on
 * each side (inset ones paint inside it).
 */
const boxShadowReach = (value: string | undefined) => {
	const reach = { left: 0, top: 0, right: 0, bottom: 0 };
	if (!value || value === "none") return reach;
	for (const shadow of splitShadows(value)) {
		if (/\binset\b/.test(shadow)) continue;
		// The lengths, once the color (a function or a word) is set aside.
		const lengths = shadow
			.replace(/[a-z-]+\([^)]*\)/gi, " ")
			.split(/\s+/)
			.filter((token) => /^-?[\d.]+(px)?$/.test(token))
			.map((token) => Number.parseFloat(token));
		const [x = 0, y = 0, blur = 0, spread = 0] = lengths;
		const out = Math.max(blur, 0) + spread;
		reach.left = Math.max(reach.left, out - x);
		reach.right = Math.max(reach.right, out + x);
		reach.top = Math.max(reach.top, out - y);
		reach.bottom = Math.max(reach.bottom, out + y);
	}
	return reach;
};

/**
 * Where an absolutely placed `::before` or `::after` of `el` paints (a menu
 * frame's shadow), from its computed insets and size against `el`'s padding
 * box, which is its containing block; null when it is not generated or is
 * in flow (inside the box).
 */
const pseudoBox = (
	el: Element,
	which: "::before" | "::after",
	padding: ClassicyMenuBox,
): ClassicyMenuBox | null => {
	const style = getComputedStyle(el, which);
	const content = style?.content;
	if (!content || content === "none" || content === "normal") return null;
	if (style.display === "none" || style.position !== "absolute") return null;
	const width =
		px(style.width) +
		(style.boxSizing === "border-box"
			? 0
			: px(style.paddingLeft) +
				px(style.paddingRight) +
				px(style.borderLeftWidth) +
				px(style.borderRightWidth));
	const height =
		px(style.height) +
		(style.boxSizing === "border-box"
			? 0
			: px(style.paddingTop) +
				px(style.paddingBottom) +
				px(style.borderTopWidth) +
				px(style.borderBottomWidth));
	const left = isFinitePx(style.left)
		? padding.left + px(style.left) + px(style.marginLeft)
		: padding.right - px(style.right) - px(style.marginRight) - width;
	const top = isFinitePx(style.top)
		? padding.top + px(style.top) + px(style.marginTop)
		: padding.bottom - px(style.bottom) - px(style.marginBottom) - height;
	return { left, top, right: left + width, bottom: top + height };
};

/**
 * What `el` paints: its border box, with its outer `box-shadow` and any
 * absolutely placed `::before`/`::after` (a menu frame's shadow, drawn past
 * the frame by every package's mixin) included.
 */
const inkOf = (el: Element): ClassicyMenuBox => {
	const r = el.getBoundingClientRect();
	let box: ClassicyMenuBox = {
		left: r.left,
		top: r.top,
		right: r.right,
		bottom: r.bottom,
	};
	const style = getComputedStyle(el);
	const shadow = boxShadowReach(style?.boxShadow);
	box = {
		left: box.left - shadow.left,
		top: box.top - shadow.top,
		right: box.right + shadow.right,
		bottom: box.bottom + shadow.bottom,
	};
	const padding: ClassicyMenuBox = {
		left: r.left + px(style?.borderLeftWidth),
		top: r.top + px(style?.borderTopWidth),
		right: r.right - px(style?.borderRightWidth),
		bottom: r.bottom - px(style?.borderBottomWidth),
	};
	for (const which of ["::before", "::after"] as const) {
		const pseudo = pseudoBox(el, which, padding);
		if (pseudo) box = union(box, pseudo);
	}
	return box;
};

/**
 * A menu's painted box, its frame's shadow included: the union of each
 * element's border box, outer `box-shadow` and absolutely placed
 * `::before`/`::after`. Pass the menu list, and anything that draws part of
 * its frame (a scrolling list's shadow sibling, `.classicyMenuScrollShadow`;
 * a bevel button's framed panel).
 */
export const classicyMenuInkBox = (
	...elements: (Element | null | undefined)[]
): ClassicyMenuBox | null => {
	let box: ClassicyMenuBox | null = null;
	for (const el of elements) {
		if (!el) continue;
		const ink = inkOf(el);
		box = box ? union(box, ink) : ink;
	}
	return box;
};

/** Whether a menu painted at `ink` passes the right edge of `bounds`. */
export const classicyMenuPassesEnd = (
	ink: ClassicyMenuBox,
	bounds: ClassicyMenuBox,
): boolean => ink.right > bounds.right + EDGE_TOLERANCE;

/**
 * How far across (px, right positive) a menu painted at `ink` moves to lie
 * inside `bounds`: back from the right edge, then, for one wider than the
 * bounds, its left side wins (its titles and marks start there). Zero for
 * one already inside.
 */
export const classicyMenuPinShift = (
	ink: ClassicyMenuBox,
	bounds: ClassicyMenuBox,
): number => {
	let shift = 0;
	if (ink.right > bounds.right + EDGE_TOLERANCE)
		shift = bounds.right - ink.right;
	if (ink.left + shift < bounds.left - EDGE_TOLERANCE)
		shift = bounds.left - ink.left;
	return shift;
};

/**
 * How far down (px, down positive) a menu painted at `ink` moves to lie
 * inside `bounds`: up from the bottom edge, then, for one taller than the
 * bounds, its top wins. Zero for one already inside.
 */
export const classicyMenuPinShiftDown = (
	ink: ClassicyMenuBox,
	bounds: ClassicyMenuBox,
): number => {
	let shift = 0;
	if (ink.bottom > bounds.bottom + EDGE_TOLERANCE)
		shift = bounds.bottom - ink.bottom;
	if (ink.top + shift < bounds.top - EDGE_TOLERANCE)
		shift = bounds.top - ink.top;
	return shift;
};

/**
 * Where a menu placed at `left` (its frame's left edge, viewport px) goes
 * across so it shows, for a menu placed by its host at a point (a
 * contextual menu, a menu bar extension's pull-down): left where asked when
 * it fits; else with its frame's right edge at `endAt` (the pointer, or the
 * title's right edge); then pinned inside `bounds`. `width` is its frame's,
 * and `inkLeft`/`inkRight` how far its shadow reaches past the frame on
 * each side.
 */
export const classicyMenuLeftAt = (
	left: number,
	endAt: number,
	width: number,
	inkLeft: number,
	inkRight: number,
	bounds: ClassicyMenuBox,
): number => {
	const inkAt = (at: number): ClassicyMenuBox => ({
		left: at - inkLeft,
		right: at + width + inkRight,
		top: 0,
		bottom: 0,
	});
	let at = left;
	if (classicyMenuPassesEnd(inkAt(at), bounds)) at = endAt - width;
	return at + classicyMenuPinShift(inkAt(at), bounds);
};

/**
 * `at` (a fixed menu's left or top edge), on a whole pixel that keeps the
 * menu inside `from`-`to` on that axis where the exact place did: a fixed
 * menu is drawn on whole pixels (a frame placed a fraction across blends
 * its one-pixel columns), and rounding half a pixel the wrong way would put
 * its shadow's last column past the edge. `size` is its frame's, `inkBefore`
 * and `inkAfter` how far its shadow reaches past each side.
 */
export const classicyMenuWholePixel = (
	at: number,
	size: number,
	inkBefore: number,
	inkAfter: number,
	from: number,
	to: number,
): number => {
	let whole = Math.round(at);
	if (whole + size + inkAfter > to + EDGE_TOLERANCE) whole = Math.floor(at);
	if (whole - inkBefore < from - EDGE_TOLERANCE) whole = Math.ceil(at);
	return whole;
};

/**
 * Where a fixed list hanging from a control (a pop-up menu's button, a combo
 * box's field) goes across, on a whole pixel: under the control's left side
 * where it fits, else with its right side under the control's right side,
 * then pinned inside `bounds` (`classicyMenuLeftAt`). Measured as the list is
 * drawn: its frame's width and its shadow's reach, wherever it is placed.
 */
export const classicyMenuListLeft = (
	list: Element,
	anchor: { left: number; right: number },
	bounds: ClassicyMenuBox,
): number => {
	const frame = list.getBoundingClientRect();
	const ink = classicyMenuInkBox(list) ?? frame;
	const inkLeft = Math.max(frame.left - ink.left, 0);
	const inkRight = Math.max(ink.right - frame.right, 0);
	return classicyMenuWholePixel(
		classicyMenuLeftAt(
			anchor.left,
			anchor.right,
			frame.width,
			inkLeft,
			inkRight,
			bounds,
		),
		frame.width,
		inkLeft,
		inkRight,
		bounds.left,
		bounds.right,
	);
};

/**
 * The top, on a whole pixel, that moves a fixed list drawn past `bounds`
 * down or up inside them (its shadow included, its top winning when it is
 * taller than they are), or null when it lies inside: a pop-up or combo
 * box list whose 64 px floor does not fit the room above or below its
 * control in a very short desktop.
 */
export const classicyMenuListPinTop = (
	list: Element,
	bounds: ClassicyMenuBox,
): number | null => {
	const frame = list.getBoundingClientRect();
	const ink = classicyMenuInkBox(list);
	if (!ink) return null;
	const shift = classicyMenuPinShiftDown(ink, bounds);
	if (shift === 0) return null;
	return classicyMenuWholePixel(
		frame.top + shift,
		frame.height,
		Math.max(frame.top - ink.top, 0),
		Math.max(ink.bottom - frame.bottom, 0),
		bounds.top,
		bounds.bottom,
	);
};
