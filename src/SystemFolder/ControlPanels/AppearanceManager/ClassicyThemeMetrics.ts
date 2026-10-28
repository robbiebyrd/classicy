import type {
	ClassicyTheme,
	ClassicyThemeMeasurements,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
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
export const CLASSICY_DEFAULT_THEME_METRICS: Readonly<ClassicyThemeMeasurements> =
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
	measurements?: DeepPartial<ClassicyThemeMeasurements>;
};

type MetricGroupId = keyof ClassicyThemeMeasurements;

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
	value: DeepPartial<ClassicyThemeMeasurements>[G] | undefined,
): ClassicyThemeMeasurements[G] => {
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
	return (complete ? value : filled) as ClassicyThemeMeasurements[G];
};

/**
 * Completes a theme's `measurements` from `CLASSICY_DEFAULT_THEME_METRICS`.
 *
 * Copy-on-write: returns **the same object** when every group and key is
 * already present (so idempotent passes over live store state change
 * nothing), otherwise a shallow copy of the theme with a new `measurements`
 * object in which present values win and only the missing ones are filled.
 * The input is never mutated.
 */
export function withDefaultThemeMetrics<
	T extends ClassicyThemeWithPartialMetrics,
>(theme: T): T & { measurements: ClassicyThemeMeasurements } {
	const current = theme.measurements;
	let changed = current === undefined;
	const next = {} as ClassicyThemeMeasurements;
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
