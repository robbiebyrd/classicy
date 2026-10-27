import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

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
