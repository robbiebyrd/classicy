import type {
	ClassicyTheme,
	ClassicyThemeCoreMeasurements,
	ClassicyThemeMeasurements,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { intToPx } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicySize";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { DeepPartial } from "@/SystemFolder/SystemResources/Utils/deepMerge";

/**
 * The Platinum layout metrics (Mac OS 8 HIG, Ch. 3 "Layout Guidelines"),
 * grouped per control family. These are the theme *inputs*; `getThemeVars`
 * derives frames, bevels, the edit-field height and the rest from them.
 *
 * Every built-in theme carries this block in `themes.json`; a theme loaded
 * from an older build or an older theme file is completed with these values
 * by `withDefaultThemeMetrics`.
 */
export const CLASSICY_DEFAULT_THEME_METRICS: Readonly<ClassicyThemeCoreMeasurements> =
	{
		window: {
			borderSize: 1,
			controlSize: 12,
			paddingSize: 6,
			scrollbarSize: 17,
			titleBarHeight: 19,
			utilityTitleBarHeight: 10,
		},
		control: { height: 20, labelGap: 5, staticTextHeight: 16 },
		button: { minWidth: 58, textPadding: 8, gap: 12 },
		groupBox: {
			marginSide: 10,
			marginTop: 12,
			marginBottom: 10,
			titlePad: 3,
			gap: 12,
		},
		layout: { itemGap: 4, groupGap: 16, dialogEdge: 12 },
	};

/** A theme whose `measurements` may be missing groups or keys (persisted by
 * an older build, or read from an older theme file). */
export type ClassicyThemeWithPartialMetrics = Omit<
	ClassicyTheme,
	"measurements"
> & {
	measurements?: DeepPartial<ClassicyThemeCoreMeasurements> & {
		[family: string]: unknown;
	};
};

// The core families only: a package family has no defaults to fill from.
type MetricGroupId = keyof ClassicyThemeCoreMeasurements;

const METRIC_GROUPS = Object.keys(
	CLASSICY_DEFAULT_THEME_METRICS,
) as MetricGroupId[];

const isMetricNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

/**
 * Fills one group from its defaults. Returns the input group itself when it
 * already carries every key as a finite number, so callers can detect "nothing
 * to do" by reference.
 */
const fillGroup = <G extends MetricGroupId>(
	group: G,
	value: DeepPartial<ClassicyThemeCoreMeasurements>[G] | undefined,
): ClassicyThemeCoreMeasurements[G] => {
	const defaults = CLASSICY_DEFAULT_THEME_METRICS[group];
	const present = (value ?? {}) as Record<string, unknown>;
	let complete = value !== undefined;
	const filled: Record<string, number> = {};
	for (const key of Object.keys(defaults)) {
		const v = present[key];
		if (isMetricNumber(v)) {
			filled[key] = v;
		} else {
			filled[key] = (defaults as Record<string, number>)[key];
			complete = false;
		}
	}
	return (complete ? value : filled) as ClassicyThemeCoreMeasurements[G];
};

/**
 * Completes a theme's `measurements` from `CLASSICY_DEFAULT_THEME_METRICS`.
 *
 * Copy-on-write: returns **the same object** when every group and key is
 * already present (so idempotent passes over live store state change
 * nothing), otherwise a shallow copy of the theme with a new `measurements`
 * object in which present values win and only the missing ones are filled.
 * Families outside the core five (an Appearance Package's) are carried over
 * as they are. The input is never mutated.
 */
export function withDefaultThemeMetrics<
	T extends ClassicyThemeWithPartialMetrics,
>(theme: T): T & { measurements: ClassicyThemeMeasurements } {
	const current = theme.measurements;
	let changed = current === undefined;
	const next = { ...current } as ClassicyThemeMeasurements;
	for (const group of METRIC_GROUPS) {
		const filled = fillGroup(group, current?.[group]);
		if (filled !== current?.[group]) changed = true;
		(next as Record<string, unknown>)[group] = filled;
	}
	if (!changed) {
		return theme as T & { measurements: ClassicyThemeMeasurements };
	}
	return { ...theme, measurements: next };
}

/**
 * `withDefaultThemeMetrics` over a list, copy-on-write: the same array back
 * when no entry needed completing, otherwise a copy with only the completed
 * entries replaced. Non-object entries are left as they are.
 */
export function withDefaultThemeMetricsList<
	T extends ClassicyThemeWithPartialMetrics,
>(themes: readonly T[]): T[] {
	let next: T[] | undefined;
	themes.forEach((theme, i) => {
		if (!theme || typeof theme !== "object") return;
		const filled = withDefaultThemeMetrics(theme);
		if (filled === theme) return;
		next ??= [...themes];
		next[i] = filled;
	});
	return next ?? (themes as T[]);
}

/**
 * The only measurement family or key name that becomes a CSS variable: a
 * lowercase-first camelCase name (`controlStrip`, `cellHeight`). The theme
 * schema refuses any other package family or key name; the walker skips them
 * too, for state that never passed the schema.
 */
export const CLASSICY_MEASUREMENT_NAME = /^[a-z][A-Za-z0-9]*$/;

/** `groupBox` → `group-box`, `titleBarHeight` → `title-bar-height`. */
const kebab = (name: string): string =>
	name.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`);

// Collisions already reported, so a re-render never repeats a warning.
const reportedCollisions = new Set<string>();

/**
 * The CSS custom properties for a theme's measurement *inputs*: every numeric
 * leaf `measurements.<family>.<key>` as `--<family>-<key>` (kebab-case) in
 * whole pixels — the core families and any family an Appearance Package adds
 * (`controlStrip.cellHeight` → `--control-strip-cell-height`).
 *
 * - Non-numeric leaves emit nothing, and neither does a family or key that
 *   is not a `CLASSICY_MEASUREMENT_NAME`: package families reach here from
 *   theme files and persisted state, and a name becomes part of a CSS
 *   declaration.
 * - Kebab-casing can map two leaves to one variable (`windowTitle.barHeight`
 *   and `window.titleBarHeight`). The first wins: the core families are
 *   walked first, so a core input always wins, then package families in key
 *   order. Each collision is logged once.
 *
 * The variables derived from the inputs (frames, bevels, `--button-height`,
 * …) stay in `getThemeVars`.
 */
export function classicyMeasurementVars(
	measurements: ClassicyThemeMeasurements,
): Record<string, string> {
	const vars: Record<string, string> = {};
	const sources = new Map<string, string>();
	const families = [
		...METRIC_GROUPS,
		...Object.keys(measurements).filter(
			(family) => !(METRIC_GROUPS as string[]).includes(family),
		),
	];
	for (const family of families) {
		const keys: unknown = measurements[family];
		if (
			!CLASSICY_MEASUREMENT_NAME.test(family) ||
			!keys ||
			typeof keys !== "object"
		) {
			continue;
		}
		for (const [key, n] of Object.entries(keys)) {
			if (typeof n !== "number" || !CLASSICY_MEASUREMENT_NAME.test(key)) {
				continue;
			}
			const name = `--${kebab(family)}-${kebab(key)}`;
			const source = `${family}.${key}`;
			const winner = sources.get(name);
			if (winner !== undefined) {
				const collision = `${winner}|${source}`;
				if (!reportedCollisions.has(collision)) {
					reportedCollisions.add(collision);
					classicyLog(
						"warn",
						"ClassicyAppearance",
						`Measurement ${source} and ${winner} both make ${name}; ${winner} is used.`,
					);
				}
				continue;
			}
			sources.set(name, source);
			vars[name] = intToPx(n);
		}
	}
	return vars;
}
