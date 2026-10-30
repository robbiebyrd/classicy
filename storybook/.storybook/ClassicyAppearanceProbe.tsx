import type { FC, ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import { action } from "storybook/actions";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	type ClassicyAppearanceEvent,
	type ClassicyAppearanceHandler,
	type ClassicyAppearanceHooks,
	registerClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
// Importing Platinum registers it, and with it the "platinum" sound pack that
// the probe's default theme names (a package's defaults are validated).
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
import {
	CLASSICY_COMPONENT,
	type ClassicyState,
	classicyStateClasses,
} from "@/Appearance/vocabulary/ClassicyVocabulary";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

// The Storybook probe package: the package hook surface made visible. Every
// decorated root gets a dashed magenta outline from decorate() (green while
// pressed: the press decoration, which release clears), and every event any
// component emits is logged in the Actions panel as `<Component>.<event>`.
// It has no look of its own, so Platinum's CSS is off under it. The
// AppearanceHooks stories render through ClassicyAppearanceProbe.

export const STORYBOOK_PROBE_PACKAGE_ID = "storybook-probe";

const PROBE_CSS =
	'@layer classicy.package { .classicyDesktop[data-classicy-appearance="storybook-probe"] .sbProbe { outline: 1px dashed #ff00ff; outline-offset: 1px; } .classicyDesktop[data-classicy-appearance="storybook-probe"] .sbProbePressed { outline-color: #00aa00; } }';

const EVENTS = [
	"mount",
	"unmount",
	"press",
	"release",
	"click",
	"open",
	"close",
	"focus",
	"blur",
	"collapse",
	"expand",
	"zoom",
	"select",
	"change",
	"dragStart",
	"dragEnd",
] as const satisfies readonly ClassicyAppearanceEvent[];

// Fails to compile if ClassicyAppearanceEvent gains an event EVENTS lacks.
type AssertTrue<T extends true> = T;
type _EveryEventListed = AssertTrue<
	[Exclude<ClassicyAppearanceEvent, (typeof EVENTS)[number]>] extends [never]
		? true
		: false
>;

/** Logs the event; a press decorates (green), a release clears it. */
const logEvent: ClassicyAppearanceHandler = (ctx) => {
	action(`${ctx.component}.${ctx.event}`)(ctx.detail ?? null);
	if (ctx.event === "press") return { className: "sbProbePressed" };
	if (ctx.event === "release") return {};
};

const everyEvent: Partial<
	Record<ClassicyAppearanceEvent, ClassicyAppearanceHandler>
> = Object.fromEntries(EVENTS.map((event) => [event, logEvent]));

const probeHooks: ClassicyAppearanceHooks = {
	decorate: (_component, state: Partial<Record<ClassicyState, boolean>>) => ({
		className: "sbProbe",
		attrs: { "data-sb-state": classicyStateClasses(state) },
	}),
	// Every component in the vocabulary, every event.
	on: Object.fromEntries(
		Object.keys(CLASSICY_COMPONENT).map((component) => [component, everyEvent]),
	),
};

registerClassicyAppearancePackage({
	id: STORYBOOK_PROBE_PACKAGE_ID,
	name: "Storybook Probe",
	css: PROBE_CSS,
	defaults: { ...getTheme("default"), package: STORYBOOK_PROBE_PACKAGE_ID },
	presets: [],
	// Platinum's arrangement.
	layout: CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
	hooks: probeHooks,
});

const PROBE_NOTE =
	'Rendered under the "storybook-probe" package: Platinum CSS is off (structure only — audit §8.2; the window control boxes, menu dividers and depressable ::after geometry live in Platinum\'s look mixins, Part B ruling R10, and collapse here), every root is outlined by decorate(), and every emitted event is logged in the Actions panel.';

/**
 * Renders `children` under the probe package. On mount it makes
 * "storybook-probe" the active package and renders `children` only then, so
 * their `mount` events are logged too. On unmount it switches back to
 * Platinum and the theme that was active before (unless something else
 * switched the package meanwhile), so a story opened next in the same
 * iframe, whose frame keeps the store, renders under Platinum.
 */
export const ClassicyAppearanceProbe: FC<{ children?: ReactNode }> = ({
	children,
}) => {
	const dispatch = useAppManagerDispatch();
	const [active, setActive] = useState(false);

	useLayoutEffect(() => {
		const previousTheme =
			useAppManager.getState().System.Manager.Appearance.activeTheme;
		dispatch({
			type: "ClassicyDesktopChangeAppearancePackage",
			packageId: STORYBOOK_PROBE_PACKAGE_ID,
		});
		setActive(true);
		return () => {
			const appearance = useAppManager.getState().System.Manager.Appearance;
			if (appearance.packageId !== STORYBOOK_PROBE_PACKAGE_ID) return;
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: PLATINUM_APPEARANCE_PACKAGE_ID,
			});
			if (previousTheme.package === PLATINUM_APPEARANCE_PACKAGE_ID)
				dispatch({
					type: "ClassicyDesktopChangeTheme",
					activeTheme: previousTheme.id,
				});
		};
	}, [dispatch]);

	return (
		<>
			<p className="sbProbeNote">{PROBE_NOTE}</p>
			{active && children}
		</>
	);
};

/**
 * The AppearanceHooks stories' parameters: their docs description, and an
 * iframe (not inline) on the docs page, so the probe's switch of the shared
 * store never reaches the other stories rendered there.
 */
export const appearanceHooksParameters = (height = "320px") => ({
	docs: {
		description: {
			story:
				"The package hook surface: decorations from decorate() (magenta outline; green while pressed) and the events the component emits (Actions panel).",
		},
		story: { inline: false, height },
	},
});
