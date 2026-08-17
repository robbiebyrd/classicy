import type {
	FinderIconSize,
	FinderSortKey,
} from "@/SystemFolder/Finder/FinderContext";

/**
 * Icon size as a multiple of the active theme's `desktop.iconSize`, so a
 * chunkier theme stays chunky. The Icons pane offers two steps, the list view
 * three; `medium` maps to the same scale as `large` for the icons view because
 * that pane has no middle radio and a stored `medium` must still resolve.
 */
const ICON_VIEW_SCALES: Record<FinderIconSize, number> = {
	small: 0.5,
	medium: 1,
	large: 1,
};

/** 0.375 x 48 = 18, the list view's long-standing hardcoded icon size. */
const LIST_VIEW_SCALES: Record<FinderIconSize, number> = {
	small: 0.25,
	medium: 0.375,
	large: 0.667,
};

export const iconViewIconSize = (
	themeBase: number,
	step: FinderIconSize,
): number => Math.round(themeBase * ICON_VIEW_SCALES[step]);

export const listViewIconSize = (
	themeBase: number,
	step: FinderIconSize,
): number => Math.round(themeBase * LIST_VIEW_SCALES[step]);

/**
 * The subset of file-system metadata the six Mac OS 8 sort keys need, named
 * without the `_` prefix so callers must map deliberately rather than passing
 * a raw entry and silently sorting by a field that does not exist.
 */
export type FinderSortableEntry = {
	name: string;
	modifiedOn?: Date;
	createdOn?: Date;
	size?: number;
	kind?: string;
	label?: string;
};

const byName = (a: FinderSortableEntry, b: FinderSortableEntry): number =>
	a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

/**
 * Comparators for "Keep arranged by". Entries missing the sort field always
 * sort last, and every comparator breaks ties by name so the layout is
 * deterministic — icon positions are derived from this order, and an unstable
 * sort would make icons jump between renders.
 */
export const finderEntryComparator =
	(key: FinderSortKey) =>
	(a: FinderSortableEntry, b: FinderSortableEntry): number => {
		if (key === "name") return byName(a, b);

		const value = (entry: FinderSortableEntry): number | string | undefined => {
			switch (key) {
				case "modified":
					return entry.modifiedOn?.getTime();
				case "created":
					return entry.createdOn?.getTime();
				case "size":
					return entry.size;
				case "kind":
					return entry.kind;
				case "label":
					return entry.label;
			}
		};

		const av = value(a);
		const bv = value(b);
		if (av === undefined && bv === undefined) return byName(a, b);
		if (av === undefined) return 1;
		if (bv === undefined) return -1;
		if (typeof av === "string" && typeof bv === "string") {
			const cmp = av.localeCompare(bv, undefined, { sensitivity: "base" });
			return cmp !== 0 ? cmp : byName(a, b);
		}
		const cmp = Number(av) - Number(bv);
		return cmp !== 0 ? cmp : byName(a, b);
	};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

const timeOfDay = (d: Date): string => {
	const hours = d.getHours();
	const suffix = hours >= 12 ? "PM" : "AM";
	const twelve = hours % 12 === 0 ? 12 : hours % 12;
	return `${twelve}:${String(d.getMinutes()).padStart(2, "0")} ${suffix}`;
};

const absoluteDate = (d: Date): string =>
	`${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

const isSameDay = (a: Date, b: Date): boolean =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();

/**
 * Formats a list-view date column. Both `value` and `now` must already be in
 * the SAME frame — the caller converts the store's virtual clock with
 * `toLocalDate(dateTime, tzOffset)` and passes the result as `now`. Mixing an
 * in-world "now" with a raw UTC file date would make "Today" wrong by the
 * timezone offset, so the conversion deliberately lives at the call site and
 * this function stays pure.
 *
 * Formatting is hand-rolled rather than Intl-based so the output is identical
 * in every locale the tests and the app might run under.
 */
export const formatFinderDate = (
	value: Date | undefined,
	now: Date,
	relative: boolean,
): string => {
	if (!value) return "—";
	if (!relative) return `${absoluteDate(value)}, ${timeOfDay(value)}`;
	if (isSameDay(value, now)) return `Today, ${timeOfDay(value)}`;

	// Constructed from now's calendar fields so month and year boundaries
	// fall out of Date's own normalization.
	const yesterday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() - 1,
	);
	if (isSameDay(value, yesterday)) return `Yesterday, ${timeOfDay(value)}`;
	return absoluteDate(value);
};

/**
 * Coerces a file-system date field into a Date. `ClassicyFileSystem` persists
 * its tree through JSON.stringify/JSON.parse, so a field seeded as a Date
 * comes back as an ISO string — calling Date methods on it would throw.
 * Everything reading `_modifiedOn` / `_createdOn` goes through here.
 */
export const asFinderDate = (value: unknown): Date | undefined => {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? undefined : value;
	}
	if (typeof value === "string" || typeof value === "number") {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? undefined : parsed;
	}
	return undefined;
};
