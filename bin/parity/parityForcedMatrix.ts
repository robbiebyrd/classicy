// The forced-state matrix: states a plain story render never shows (pressed,
// hovered, focused, dragging, inactive, ...), reached by class changes,
// property sets, clicks and CDP `CSS.forcePseudoState`. Each entry dumps the
// computed style of `target` and its descendants as `<story>__<state>.json`.
// A story id that no longer exists fails its entries loudly (FAIL lines).

export type ParityForcedOp = {
	sel?: string;
	add?: string[];
	remove?: string[];
	set?: Record<string, unknown>;
	/** Skip silently when `sel` matches nothing. */
	optional?: boolean;
	/** CDP forced pseudo-classes: "active", "hover", "focus", ... */
	force?: string[];
	/** Click this selector (then wait 300 ms). */
	click?: string;
};

export type ParityForcedState = {
	story: string;
	state: string;
	target: string;
	ops: ParityForcedOp[];
};

const M: ParityForcedState[] = [];
const add = (
	story: string,
	state: string,
	target: string,
	ops: ParityForcedOp[] = [],
) => M.push({ story, state, target, ops });
const force = (sel: string, pseudo: string[]): ParityForcedOp => ({
	sel,
	force: pseudo,
});

const W = "desktop-window--default";
const DIM: ParityForcedOp[] = [
	{ sel: ".classicyWindow", remove: ["active"], add: ["inactive"] },
	{
		sel: ".classicyWindowContents, .classicyWindowContentsModal",
		add: ["classicyWindowContentsDimmed"],
		optional: true,
	},
	{
		sel: ".classicyWindowResizer",
		add: ["classicyWindowResizerDimmed"],
		optional: true,
	},
	{
		sel: ".classicyWindowTitleBar",
		add: ["classicyWindowHeaderDimmed"],
		optional: true,
	},
];

// ClassicyWindow
add(W, "dragging", ".classicyWindow", [
	{ sel: ".classicyWindow", add: ["dragging"] },
]);
add(W, "resizing", ".classicyWindow", [
	{ sel: ".classicyWindow", add: ["classicyWindowResizing"] },
]);
add(W, "dragging-resizing", ".classicyWindow", [
	{ sel: ".classicyWindow", add: ["dragging", "classicyWindowResizing"] },
]);
add("desktop-app--two-windows", "inactive-natural", ".classicyWindow.inactive");
add(W, "inactive-forced", ".classicyWindow", DIM);
add("desktop-window--list-header", "list-header", ".classicyWindow");
add(
	"desktop-window--list-header",
	"list-header-inactive",
	".classicyWindow",
	DIM,
);
add(
	"dialogs-alert--stop",
	"red-modal-natural",
	".classicyWindow.classicyWindowRed",
);
add(W, "red-forced", ".classicyWindow", [
	{ sel: ".classicyWindow", add: ["classicyWindowRed"] },
]);
add(W, "red-forced-inactive", ".classicyWindow", [
	{ sel: ".classicyWindow", add: ["classicyWindowRed"] },
	...DIM,
]);
add("desktop-window--utility", "utility-active", ".classicyWindow");
add("desktop-window--utility", "utility-inactive", ".classicyWindow", DIM);
add("desktop-window--utility", "utility-dragging", ".classicyWindow", [
	{ sel: ".classicyWindow", add: ["dragging"] },
]);
add("desktop-window--utility", "utility-resizing", ".classicyWindow", [
	{ sel: ".classicyWindow", add: ["classicyWindowResizing"] },
]);
add("desktop-window--utility", "utility-collapsed", ".classicyWindow", [
	{ sel: ".classicyWindow", add: ["collapsed"] },
]);
add(
	"desktop-window--utility-always-on-top",
	"utility-aot-inactive",
	".classicyWindow.classicyWindowUtility",
	DIM,
);

// ClassicyButton
const B = "button.classicyButton";
add("controls-button--default-action", "default", B);
add("controls-button--default-action", "default-active", B, [
	force(B, ["active"]),
]);
add("controls-button--default-action", "default-hover", B, [
	force(B, ["hover"]),
]);
add("controls-button--default-action", "default-focus", B, [
	force(B, ["focus"]),
]);
add("controls-button--default-action", "default-active-disabled", B, [
	{ sel: B, set: { disabled: true } },
	force(B, ["active"]),
]);
add("controls-button--default", "plain-active", B, [force(B, ["active"])]);
add("controls-button--default", "plain-forced-default-active", B, [
	{ sel: B, add: ["default"] },
	force(B, ["active"]),
]);
add("controls-button--disabled", "disabled-active", B, [force(B, ["active"])]);
add("controls-button--square", "square", B);
add("controls-button--square", "square-active", B, [force(B, ["active"])]);
add("controls-button--small", "small", B);
add("controls-button--small", "small-active", B, [force(B, ["active"])]);
add("controls-button--default", "forced-square-small", B, [
	{ sel: B, add: ["classicyButtonShapeSquare", "classicyButtonSmall"] },
]);
add(
	"controls-button--ok-cancel-row",
	"ok-cancel-default-active",
	".classicyDesktop",
	[force("button.classicyButton.default", ["active"])],
);

// ClassicyCheckbox
const CB = "input.classicyCheckbox";
add("controls-checkbox--unchecked", "active", CB, [force(CB, ["active"])]);
add("controls-checkbox--unchecked", "focus", CB, [force(CB, ["focus"])]);
add("controls-checkbox--unchecked", "hover", CB, [force(CB, ["hover"])]);
add("controls-checkbox--disabled", "disabled-active", CB, [
	force(CB, ["active"]),
]);
add("controls-checkbox--unchecked", "default-active", CB, [
	{ sel: CB, add: ["default"] },
	force(CB, ["active"]),
]);
add("controls-checkbox--unchecked", "default-disabled", CB, [
	{ sel: CB, add: ["default"], set: { disabled: true } },
]);
add("controls-checkbox--default", "default-natural", CB);
add("controls-checkbox--default", "default-natural-active", CB, [
	force(CB, ["active"]),
]);
add("controls-checkbox--checked", "checked-active", CB, [
	force(CB, ["active"]),
]);

// Slider
const SL = "input.classicySliderIndicatorNondirectional";
add("controls-slider--nondirectional-knob", "nondirectional", SL);
add("controls-slider--nondirectional-knob", "nondirectional-active", SL, [
	force(SL, ["active"]),
]);
add("controls-slider--nondirectional-knob", "nondirectional-focus", SL, [
	force(SL, ["focus"]),
]);
add("controls-slider--nondirectional-knob", "nondirectional-hover", SL, [
	force(SL, ["hover"]),
]);
add("controls-slider--default", "default-active", "input.classicySlider", [
	force("input.classicySlider", ["active"]),
]);
add("controls-slider--disabled", "disabled", "input.classicySlider");

// BevelButton pop-up panel
add(
	"controls-bevelbutton--popup-vertical",
	"popup-menu-open",
	".classicyBevelButtonPopup",
	[{ click: "button.classicyBevelButtonModePopup" }],
);
add(
	"controls-bevelbutton--popup-slider",
	"popup-slider-open",
	".classicyBevelButtonPopup.classicyBevelButtonPopupPanel",
	[{ click: "button.classicyBevelButtonModePopup" }],
);
add("controls-bevelbutton--push", "push-active", "button.classicyBevelButton", [
	force("button.classicyBevelButton", ["active"]),
]);

// QuickTime movie embed controls
const QT = ".quickTimePlayerVideoControlsHolder";
for (const s of [
	"controls-quicktime--docked-controls",
	"controls-quicktime--overlay-controls",
]) {
	add(s, "controls", QT);
	add(s, "controls-button-active", QT, [
		force(".quickTimePlayerVideoControlsButton", ["active"]),
	]);
	add(s, "controls-button-hover", QT, [
		force(".quickTimePlayerVideoControlsButton", ["hover"]),
	]);
	add(s, "progress-focus", QT, [
		force(".quickTimePlayerVideoControlsProgressBar", ["focus"]),
	]);
}

// PopUpMenu
add("controls-popupmenu--disabled", "disabled", ".classicyPopUpMenuWrapper");
add(
	"controls-popupmenu--default",
	"forced-disabled",
	".classicyPopUpMenuWrapper",
	[
		{ sel: ".classicyPopUpMenu", add: ["disabled"] },
		{ sel: "button.classicyPopUpMenuButton", add: ["disabled"] },
	],
);
add(
	"controls-popupmenu--default",
	"button-active",
	".classicyPopUpMenuWrapper",
	[force("button.classicyPopUpMenuButton", ["active"])],
);

// Tabs
add("controls-tabs--overflowing", "scroller", ".classicyTabContainer");
add("controls-tabs--default", "scroller-default", ".classicyTabContainer");

// Alert and WindowFrame title bars
for (const s of [
	"dialogs-alert--stop",
	"dialogs-alert--caution",
	"dialogs-alert--note",
])
	add(s, "alert", ".classicyWindow");
add("dialogs-alert--stop", "alert-titlebar-inactive", ".classicyWindow", DIM);
add("desktop-windowframe--untitled", "frame", ".classicyWindowFrame");
add("desktop-windowframe--power-on", "frame", ".classicyWindowFrame");

export const PARITY_FORCED_STATES: readonly ParityForcedState[] = M;

/** Firefox-only reads Chromium cannot make: `scrollbar-width` of the tab
 * scroller and the `::-moz-range-*` computed style of the sliders. */
export const PARITY_FIREFOX_CASES: readonly (readonly [
	story: string,
	selector: string,
])[] = [
	["controls-tabs--overflowing", ".classicyTabScroller"],
	["controls-tabs--default", ".classicyTabScroller"],
	["controls-slider--nondirectional-knob", "input.classicySlider"],
	["controls-slider--default", "input.classicySlider"],
	["controls-slider--disabled", "input.classicySlider"],
	[
		"controls-quicktime--docked-controls",
		".quickTimePlayerVideoControlsHolder input",
	],
];
