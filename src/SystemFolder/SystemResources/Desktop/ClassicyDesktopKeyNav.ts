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
		.sort((a, b) =>
			(a.label ?? a.appName).localeCompare(b.label ?? b.appName),
		);
	return matches[0]?.appId ?? null;
}
