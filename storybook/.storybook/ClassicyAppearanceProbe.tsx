import type { FC, ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import { action } from "storybook/actions";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	CLASSICY_APPEARANCE_EVENTS,
	type ClassicyAppearanceEvent,
	type ClassicyAppearanceHandler,
	type ClassicyAppearanceHooks,
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
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
// AppearanceHooks stories render through ClassicyAppearanceProbe, which
// registers the package only while it is mounted, so the Appearance
// Manager's Packages tab never lists it in any other story.

export const STORYBOOK_PROBE_PACKAGE_ID = "storybook-probe";

const PROBE_CSS =
	'@layer classicy.package { .classicyDesktop[data-classicy-appearance="storybook-probe"] .sbProbe { outline: 1px dashed #ff00ff; outline-offset: 1px; } .classicyDesktop[data-classicy-appearance="storybook-probe"] .sbProbePressed { outline-color: #00aa00; } }';

/** Logs the event; a press decorates (green), a release clears it. */
const logEvent: ClassicyAppearanceHandler = (ctx) => {
	action(`${ctx.component}.${ctx.event}`)(ctx.detail ?? null);
	if (ctx.event === "press") return { className: "sbProbePressed" };
	if (ctx.event === "release") return {};
};

const everyEvent: Partial<
	Record<ClassicyAppearanceEvent, ClassicyAppearanceHandler>
> = Object.fromEntries(
	CLASSICY_APPEARANCE_EVENTS.map((event) => [event, logEvent]),
);

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

const PROBE_PACKAGE: ClassicyAppearancePackage = {
	id: STORYBOOK_PROBE_PACKAGE_ID,
	name: "Storybook Probe",
	css: PROBE_CSS,
	defaults: { ...getTheme("default"), package: STORYBOOK_PROBE_PACKAGE_ID },
	presets: [],
	// Platinum's arrangement.
	layout: CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
	hooks: probeHooks,
};

const PROBE_NOTE =
	'Rendered under the "storybook-probe" package: Platinum CSS is off (structure only — audit §8.2; the window control boxes, menu dividers and depressable ::after geometry live in Platinum\'s look mixins, Part B ruling R10, and collapse here), every root is outlined by decorate(), and every emitted event is logged in the Actions panel.';

// Probes mounted in this realm, and what the first one found before it took
// over: the probe registration and the store switch are shared, made by the
// first mount and undone by the last unmount, so two probes in one page
// neither drop each other's package nor leak it.
let mountedProbes = 0;
let restore: (() => void) | undefined;

type AppManagerDispatch = ReturnType<typeof useAppManagerDispatch>;

/** Registers the probe and switches to it; returns how to undo both. */
const activateProbe = (dispatch: AppManagerDispatch): (() => void) => {
	const previousPackage = getClassicyAppearancePackage(
		STORYBOOK_PROBE_PACKAGE_ID,
	);
	registerClassicyAppearancePackage(PROBE_PACKAGE);
	const previousTheme =
		useAppManager.getState().System.Manager.Appearance.activeTheme;
	dispatch({
		type: "ClassicyDesktopChangeAppearancePackage",
		packageId: STORYBOOK_PROBE_PACKAGE_ID,
	});
	return () => {
		const appearance = useAppManager.getState().System.Manager.Appearance;
		if (appearance.packageId === STORYBOOK_PROBE_PACKAGE_ID) {
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: PLATINUM_APPEARANCE_PACKAGE_ID,
			});
			if (previousTheme.package === PLATINUM_APPEARANCE_PACKAGE_ID)
				dispatch({
					type: "ClassicyDesktopChangeTheme",
					activeTheme: previousTheme.id,
				});
		}
		if (previousPackage) registerClassicyAppearancePackage(previousPackage);
		else unregisterClassicyAppearancePackage(STORYBOOK_PROBE_PACKAGE_ID);
	};
};

/**
 * Renders `children` under the probe package. The first probe to mount
 * registers "storybook-probe", makes it the active package, and each probe
 * renders `children` only then, so their `mount` events are logged too. When
 * the last probe unmounts it switches back to Platinum and the theme that was
 * active before (unless something else switched the package meanwhile), then
 * unregisters the probe, or restores the package registered under its id
 * before, so a story opened next in the same iframe, whose frame keeps the
 * store and the registry, renders under Platinum and lists no probe.
 */
export const ClassicyAppearanceProbe: FC<{ children?: ReactNode }> = ({
	children,
}) => {
	const dispatch = useAppManagerDispatch();
	const [active, setActive] = useState(false);

	useLayoutEffect(() => {
		if (mountedProbes++ === 0) restore = activateProbe(dispatch);
		setActive(true);
		return () => {
			if (--mountedProbes > 0) return;
			restore?.();
			restore = undefined;
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
