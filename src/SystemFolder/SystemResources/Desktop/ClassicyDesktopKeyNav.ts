export type ArrowDirection =
	| "ArrowUp"
	| "ArrowDown"
	| "ArrowLeft"
	| "ArrowRight";

export interface KeyNavIcon {
	appId: string;
	appName: string;
	label?: string;
	location?: [number, number];
}

/**
 * Returns the appId of the nearest icon in the given direction from `currentId`,
 * or null if nothing qualifies.
 *
 * Direction is determined by a 45° sector: an icon is "to the right" of the
 * current one when its horizontal offset dominates (|dx| ≥ |dy|), and "above"
 * when its vertical offset dominates (|dy| > |dx|).
 *
 * location tuple is [x, y] where x = left, y = top.
 */
export function nearestIconInDirection(
	icons: KeyNavIcon[],
	currentId: string,
	direction: ArrowDirection,
): string | null {
	const current = icons.find((i) => i.appId === currentId);
	if (!current?.location) return null;
	const [cx, cy] = current.location;

	let best: string | null = null;
	let bestDist = Infinity;

	for (const icon of icons) {
		if (icon.appId === currentId || !icon.location) continue;
		const dx = icon.location[0] - cx;
		const dy = icon.location[1] - cy;

		const inSector =
			direction === "ArrowRight"
				? dx > 0 && Math.abs(dx) >= Math.abs(dy)
				: direction === "ArrowLeft"
					? dx < 0 && Math.abs(dx) >= Math.abs(dy)
					: direction === "ArrowDown"
						? dy > 0 && Math.abs(dy) > Math.abs(dx)
						: dy < 0 && Math.abs(dy) > Math.abs(dx); // ArrowUp

		if (!inSector) continue;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < bestDist) {
			bestDist = dist;
			best = icon.appId;
		}
	}
	return best;
}

/**
 * Returns the appId of the first icon (sorted alphabetically by display name)
 * whose display name starts with `prefix` (case-insensitive), or null if none match.
 */
export function typeaheadMatch(
	icons: KeyNavIcon[],
	prefix: string,
): string | null {
	if (!prefix) return null;
	const lower = prefix.toLowerCase();
	const matches = icons
		.filter((i) => (i.label ?? i.appName).toLowerCase().startsWith(lower))
		.sort((a, b) => (a.label ?? a.appName).localeCompare(b.label ?? b.appName));
	return matches[0]?.appId ?? null;
}

/**
 * The icon an arrow key selects, as the Mac OS 8.1 Finder chose it on the
 * desktop and in an icon-view window (Infinite Mac; story 0228-e9l): the
 * nearest icon that way (`nearestIconInDirection`), from the icon selected
 * last for Right and Down and from the one selected first for Left and Up.
 * With nothing selected, Left and Up select the first icon and Right and
 * Down the last, in reading order (top to bottom, then left to right: on the
 * 8.1 desktop Left chose Macintosh HD, the top icon, not Infinite HD, the
 * first by name). Null when nothing lies that way: the selection stays.
 * `selected` is the selection in the order it was made; icons without a
 * `location` take no part.
 */
export function iconForArrowKey(
	icons: KeyNavIcon[],
	selected: readonly string[],
	direction: ArrowDirection,
): string | null {
	const placed = icons.filter((i) => i.location);
	const ids = new Set(placed.map((i) => i.appId));
	const from = selected.filter((id) => ids.has(id));
	const backward = direction === "ArrowLeft" || direction === "ArrowUp";
	if (from.length === 0) {
		const reading = [...placed].sort(
			(a, b) =>
				(a.location?.[1] ?? 0) - (b.location?.[1] ?? 0) ||
				(a.location?.[0] ?? 0) - (b.location?.[0] ?? 0),
		);
		return (backward ? reading[0] : reading.at(-1))?.appId ?? null;
	}
	return nearestIconInDirection(
		placed,
		backward ? from[0] : from[from.length - 1],
		direction,
	);
}

/**
 * The icon Tab (or Shift-Tab, `backward`) selects, as the Mac OS 8.1 Finder
 * chose it on the desktop and in an icon-view window (Infinite Mac; story
 * 0228-e9l): the next (previous) icon by the name it shows after the icon
 * selected last; with nothing selected, the first (last) name. Null past the
 * ends, Tab at the last name and Shift-Tab at the first, and with no icons:
 * there the keyboard leaves the icons (the caller moves it on,
 * `moveClassicyFocusOutOf`). 8.1, which owned the screen, wrapped to the
 * other end; in a page that would trap the keyboard (WCAG 2.2 SC 2.1.2).
 */
export function iconForTabKey(
	icons: KeyNavIcon[],
	selected: readonly string[],
	backward: boolean,
): string | null {
	const byName = [...icons].sort((a, b) =>
		(a.label ?? a.appName).localeCompare(b.label ?? b.appName),
	);
	if (byName.length === 0) return null;
	const ids = new Set(byName.map((i) => i.appId));
	const from = selected.filter((id) => ids.has(id)).at(-1);
	if (from === undefined)
		return (backward ? byName[byName.length - 1] : byName[0]).appId;
	const next = byName.findIndex((i) => i.appId === from) + (backward ? -1 : 1);
	return byName[next]?.appId ?? null;
}
