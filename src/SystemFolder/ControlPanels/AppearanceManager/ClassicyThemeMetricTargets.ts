import type { ClassicyAppearanceKnobs } from "@/Appearance/ClassicyAppearancePackage";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { CLASSICY_MEASUREMENT_NAME } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";

/**
 * Every theme metric a user can edit, addressed by a flat, typed target. This
 * table is the single source the `ClassicyDesktopChangeMetric` reducer
 * validates against and a Metrics tab renders from, so a new metric is added
 * in exactly one place — the same shape as `ClassicyThemeColorTargets`.
 *
 * Keys are camelCase spellings of `measurements.<family>.<key>`
 * (`measurements.groupBox.marginSide` → `groupBoxMarginSide`). Only *inputs*
 * appear here; the variables `getThemeVars` derives from them (frames,
 * bevels, the edit-field height, …) have no target.
 */
export const CLASSICY_THEME_METRIC_KEYS = [
	"windowBorderSize",
	"windowControlSize",
	"windowPaddingSize",
	"windowScrollbarSize",
	"windowTitleBarHeight",
	"windowUtilityTitleBarHeight",
	"controlHeight",
	"controlLabelGap",
	"controlStaticTextHeight",
	"buttonMinWidth",
	"buttonTextPadding",
	"buttonGap",
	"groupBoxMarginSide",
	"groupBoxMarginTop",
	"groupBoxMarginBottom",
	"groupBoxTitlePad",
	"groupBoxGap",
	"layoutItemGap",
	"layoutGroupGap",
	"layoutDialogEdge",
] as const;

export type ClassicyThemeMetricKey =
	(typeof CLASSICY_THEME_METRIC_KEYS)[number];

/** Addresses exactly one theme metric. */
export type ClassicyThemeMetricTarget = { metricKey: ClassicyThemeMetricKey };

/** Payload of `ClassicyDesktopChangeMetric` (minus `type`). */
export type ClassicyThemeMetricChange = ClassicyThemeMetricTarget & {
	/** Whole CSS pixels, within the target's `min`–`max`. */
	value: number;
};

export type ClassicyThemeMetricGroupId =
	| "window"
	| "control"
	| "button"
	| "groupBox"
	| "layout";

export const CLASSICY_THEME_METRIC_GROUPS: readonly {
	id: ClassicyThemeMetricGroupId;
	label: string;
}[] = [
	{ id: "window", label: "Window" },
	{ id: "control", label: "Controls" },
	{ id: "button", label: "Buttons" },
	{ id: "groupBox", label: "Group Boxes" },
	{ id: "layout", label: "Layout" },
];

export type ClassicyThemeMetricTargetInfo = {
	target: ClassicyThemeMetricTarget;
	/** The CSS custom property `getThemeVars` emits 1:1 for this metric. */
	cssVar: string;
	/** Short label for a Metrics tab (its group supplies the context). */
	label: string;
	group: ClassicyThemeMetricGroupId;
	/** Inclusive bounds, in pixels. */
	min: number;
	max: number;
};

/** The theme-file validator's ceiling (`ClassicyThemeSchema`'s `measurement`). */
const MAX = 512;

const metric = (
	metricKey: ClassicyThemeMetricKey,
	cssVar: string,
	label: string,
	group: ClassicyThemeMetricGroupId,
	min: 0 | 1 = 0,
): ClassicyThemeMetricTargetInfo => ({
	target: { metricKey },
	cssVar,
	label,
	group,
	min,
	max: MAX,
});

/** All 20 editable theme metrics, in Metrics-tab order. A `min` of 1 marks
 * the sizes a zero would collapse (controls, bars and title bars). */
export const CLASSICY_THEME_METRIC_TARGETS: readonly ClassicyThemeMetricTargetInfo[] =
	[
		metric("windowBorderSize", "--window-border-size", "Border", "window"),
		metric(
			"windowControlSize",
			"--window-control-size",
			"Control box",
			"window",
			1,
		),
		metric("windowPaddingSize", "--window-padding-size", "Padding", "window"),
		metric(
			"windowScrollbarSize",
			"--window-scrollbar-size",
			"Scroll bar",
			"window",
			1,
		),
		metric(
			"windowTitleBarHeight",
			"--window-title-bar-height",
			"Title bar",
			"window",
			1,
		),
		metric(
			"windowUtilityTitleBarHeight",
			"--window-utility-title-bar-height",
			"Utility title bar",
			"window",
			1,
		),
		metric("controlHeight", "--control-height", "Height", "control", 1),
		metric("controlLabelGap", "--control-label-gap", "Label gap", "control"),
		metric(
			"controlStaticTextHeight",
			"--control-static-text-height",
			"Static text",
			"control",
			1,
		),
		metric("buttonMinWidth", "--button-min-width", "Minimum width", "button"),
		metric(
			"buttonTextPadding",
			"--button-text-padding",
			"Text padding",
			"button",
		),
		metric("buttonGap", "--button-gap", "Gap", "button"),
		metric(
			"groupBoxMarginSide",
			"--group-box-margin-side",
			"Side margin",
			"groupBox",
		),
		metric(
			"groupBoxMarginTop",
			"--group-box-margin-top",
			"Top margin",
			"groupBox",
		),
		metric(
			"groupBoxMarginBottom",
			"--group-box-margin-bottom",
			"Bottom margin",
			"groupBox",
		),
		metric(
			"groupBoxTitlePad",
			"--group-box-title-pad",
			"Title padding",
			"groupBox",
		),
		metric("groupBoxGap", "--group-box-gap", "Gap", "groupBox"),
		metric("layoutItemGap", "--layout-item-gap", "Item gap", "layout"),
		metric("layoutGroupGap", "--layout-group-gap", "Group gap", "layout"),
		metric("layoutDialogEdge", "--layout-dialog-edge", "Dialog edge", "layout"),
	];

const infoByKey = new Map(
	CLASSICY_THEME_METRIC_TARGETS.map((info) => [info.target.metricKey, info]),
);

/** Validates an untyped `{ metricKey }` as a metric target. Only the
 * allowlisted keys pass, so `__proto__`/`constructor` never reach a write. */
export const isThemeMetricTarget = (
	value: Readonly<Record<string, unknown>>,
): value is ClassicyThemeMetricTarget =>
	typeof value.metricKey === "string" &&
	(CLASSICY_THEME_METRIC_KEYS as readonly string[]).includes(value.metricKey);

/** True for a finite number within the target's inclusive bounds. */
export const isValidThemeMetric = (
	target: ClassicyThemeMetricTarget,
	value: unknown,
): value is number => {
	const info = infoByKey.get(target.metricKey);
	return (
		info !== undefined &&
		typeof value === "number" &&
		Number.isFinite(value) &&
		value >= info.min &&
		value <= info.max
	);
};

/** Reads the metric a target addresses. */
export const getThemeMetric = (
	theme: ClassicyTheme,
	target: ClassicyThemeMetricTarget,
): number => {
	const m = theme.measurements;
	switch (target.metricKey) {
		case "windowBorderSize":
			return m.window.borderSize;
		case "windowControlSize":
			return m.window.controlSize;
		case "windowPaddingSize":
			return m.window.paddingSize;
		case "windowScrollbarSize":
			return m.window.scrollbarSize;
		case "windowTitleBarHeight":
			return m.window.titleBarHeight;
		case "windowUtilityTitleBarHeight":
			return m.window.utilityTitleBarHeight;
		case "controlHeight":
			return m.control.height;
		case "controlLabelGap":
			return m.control.labelGap;
		case "controlStaticTextHeight":
			return m.control.staticTextHeight;
		case "buttonMinWidth":
			return m.button.minWidth;
		case "buttonTextPadding":
			return m.button.textPadding;
		case "buttonGap":
			return m.button.gap;
		case "groupBoxMarginSide":
			return m.groupBox.marginSide;
		case "groupBoxMarginTop":
			return m.groupBox.marginTop;
		case "groupBoxMarginBottom":
			return m.groupBox.marginBottom;
		case "groupBoxTitlePad":
			return m.groupBox.titlePad;
		case "groupBoxGap":
			return m.groupBox.gap;
		case "layoutItemGap":
			return m.layout.itemGap;
		case "layoutGroupGap":
			return m.layout.groupGap;
		case "layoutDialogEdge":
			return m.layout.dialogEdge;
	}
};

/**
 * Writes the metric a target addresses. Every write names its property
 * literally (as `setThemeColor` does): the payload is validated against the
 * allowlist first, but spelling each slot out means no part of an incoming
 * action is ever used as a property name.
 */
export const setThemeMetric = (
	theme: ClassicyTheme,
	target: ClassicyThemeMetricTarget,
	value: number,
): void => {
	const m = theme.measurements;
	switch (target.metricKey) {
		case "windowBorderSize":
			m.window.borderSize = value;
			return;
		case "windowControlSize":
			m.window.controlSize = value;
			return;
		case "windowPaddingSize":
			m.window.paddingSize = value;
			return;
		case "windowScrollbarSize":
			m.window.scrollbarSize = value;
			return;
		case "windowTitleBarHeight":
			m.window.titleBarHeight = value;
			return;
		case "windowUtilityTitleBarHeight":
			m.window.utilityTitleBarHeight = value;
			return;
		case "controlHeight":
			m.control.height = value;
			return;
		case "controlLabelGap":
			m.control.labelGap = value;
			return;
		case "controlStaticTextHeight":
			m.control.staticTextHeight = value;
			return;
		case "buttonMinWidth":
			m.button.minWidth = value;
			return;
		case "buttonTextPadding":
			m.button.textPadding = value;
			return;
		case "buttonGap":
			m.button.gap = value;
			return;
		case "groupBoxMarginSide":
			m.groupBox.marginSide = value;
			return;
		case "groupBoxMarginTop":
			m.groupBox.marginTop = value;
			return;
		case "groupBoxMarginBottom":
			m.groupBox.marginBottom = value;
			return;
		case "groupBoxTitlePad":
			m.groupBox.titlePad = value;
			return;
		case "groupBoxGap":
			m.groupBox.gap = value;
			return;
		case "layoutItemGap":
			m.layout.itemGap = value;
			return;
		case "layoutGroupGap":
			m.layout.groupGap = value;
			return;
		case "layoutDialogEdge":
			m.layout.dialogEdge = value;
			return;
	}
};

// ─── The family form: an Appearance Package's knobs ─────────────────────────
//
// `ClassicyDesktopChangeMetric { family, key, value }` edits
// `measurements.<family>.<key>` for a knob the ACTIVE package declares
// (`ClassicyAppearancePackage.knobs`). It is a separate shape from the 20 core
// targets above, which stay `{ metricKey }`: the knobs are the allowlist here,
// and the bounds are the knob's own.

/** Addresses one package knob, `measurements.<family>.<key>`. */
export type ClassicyThemeMetricFamilyTarget = { family: string; key: string };

/** Family-form payload of `ClassicyDesktopChangeMetric` (minus `type`). */
export type ClassicyThemeMetricFamilyChange =
	ClassicyThemeMetricFamilyTarget & {
		/** Whole CSS pixels, within the knob's `min`–`max` (and 0–512). */
		value: number;
	};

const CORE_GROUP_IDS: readonly string[] = CLASSICY_THEME_METRIC_GROUPS.map(
	(group) => group.id,
);

// Names CLASSICY_MEASUREMENT_NAME allows that still reach Object.prototype.
const FORBIDDEN_NAMES: readonly string[] = ["constructor", "prototype"];

const isKnobName = (value: unknown): value is string =>
	typeof value === "string" &&
	CLASSICY_MEASUREMENT_NAME.test(value) &&
	!FORBIDDEN_NAMES.includes(value);

/**
 * Validates an untyped `{ family, key }` as a family-form target: both are
 * measurement names (`CLASSICY_MEASUREMENT_NAME`), neither is `constructor`
 * or `prototype`, and `family` is not one of the five core groups (those are
 * edited by `metricKey`). Whether a package declares the knob is checked
 * against its knobs (`isValidThemeMetricFamily`).
 */
export const isThemeMetricFamilyTarget = (
	value: Readonly<Record<string, unknown>>,
): value is ClassicyThemeMetricFamilyTarget =>
	isKnobName(value.family) &&
	isKnobName(value.key) &&
	!CORE_GROUP_IDS.includes(value.family);

/** The knob `knobs` declares for a target, read through own properties only. */
export const getThemeMetricFamilyKnob = (
	knobs: ClassicyAppearanceKnobs | undefined,
	target: ClassicyThemeMetricFamilyTarget,
): ClassicyAppearanceKnobs[string][string] | undefined => {
	if (!knobs || !Object.hasOwn(knobs, target.family)) return undefined;
	const family = knobs[target.family];
	return family && Object.hasOwn(family, target.key)
		? family[target.key]
		: undefined;
};

/**
 * The values a knob accepts: its own inclusive `min`–`max` intersected with
 * the theme schema's 0–512 (J-R18). `undefined` when they do not meet (a
 * knob declared wholly outside 0–512), so the knob is not editable at all:
 * the reducer refuses every value and the Options tab leaves it out. The
 * single source for both.
 */
export const getThemeMetricFamilyBounds = (
	knob: ClassicyAppearanceKnobs[string][string],
): { min: number; max: number } | undefined => {
	const min = Math.max(knob.min, 0);
	const max = Math.min(knob.max, MAX);
	return min <= max ? { min, max } : undefined;
};

/**
 * True when `knobs` declares the target and `value` is a finite number within
 * the knob's inclusive bounds and the theme schema's 0–512.
 */
export const isValidThemeMetricFamily = (
	target: ClassicyThemeMetricFamilyTarget,
	value: unknown,
	knobs: ClassicyAppearanceKnobs | undefined,
): value is number => {
	const knob = getThemeMetricFamilyKnob(knobs, target);
	const bounds = knob && getThemeMetricFamilyBounds(knob);
	return (
		bounds !== undefined &&
		typeof value === "number" &&
		Number.isFinite(value) &&
		value >= bounds.min &&
		value <= bounds.max
	);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
};

/** The family object a theme carries for `family`; `undefined` when absent
 * or not a plain object (tampered or legacy state). */
const ownFamily = (
	theme: ClassicyTheme,
	family: string,
): Record<string, unknown> | undefined => {
	const m = theme.measurements;
	if (!Object.hasOwn(m, family)) return undefined;
	const value: unknown = m[family];
	return isPlainObject(value) ? value : undefined;
};

/** Reads `measurements.<family>.<key>` through own properties; `NaN` when
 * the theme does not carry it as a number. */
export const getThemeMetricFamily = (
	theme: ClassicyTheme,
	target: ClassicyThemeMetricFamilyTarget,
): number => {
	const family = ownFamily(theme, target.family);
	const value =
		family && Object.hasOwn(family, target.key)
			? family[target.key]
			: undefined;
	return typeof value === "number" ? value : Number.NaN;
};

/**
 * Writes a package knob when `isValidThemeMetricFamily` passes, creating the
 * family or key if the theme predates the knob; otherwise a no-op (so
 * `editActiveClassicyTheme` does not fork). A family the theme carries as
 * something other than a plain object (`null`, a number, an array — tampered
 * or legacy state) is left alone and the write refused. Returns whether it
 * wrote.
 */
export const setThemeMetricFamily = (
	theme: ClassicyTheme,
	target: ClassicyThemeMetricFamilyTarget,
	value: number,
	knobs: ClassicyAppearanceKnobs | undefined,
): boolean => {
	if (
		!isThemeMetricFamilyTarget(target) ||
		!isValidThemeMetricFamily(target, value, knobs)
	) {
		return false;
	}
	const m = theme.measurements;
	if (!Object.hasOwn(m, target.family)) m[target.family] = {};
	const family = ownFamily(theme, target.family);
	if (!family) return false;
	family[target.key] = value;
	return true;
};
