import { act } from "@testing-library/react";
import { produce } from "immer";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	type ClassicyAppearanceEvent,
	type ClassicyAppearanceHandler,
	type ClassicyAppearanceHooks,
	listClassicyAppearancePackages,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	CLASSICY_COMPONENT,
	type ClassicyComponentName,
	classicyStateClasses,
} from "@/Appearance/vocabulary/ClassicyVocabulary";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

// Test helper: an Appearance Package that decorates every component visibly
// (`probe-<Component>` and `data-probe-state`) and records every event every
// component emits. Not shipped (src/Appearance/__tests__ is outside the
// barrels and package.json `files`).

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
const everyEvent: Exclude<
	ClassicyAppearanceEvent,
	(typeof EVENTS)[number]
> extends never
	? true
	: never = true;
void everyEvent;

export type ClassicyAppearanceProbeEvent = {
	component: ClassicyComponentName;
	event: ClassicyAppearanceEvent;
	detail: unknown;
};

const setPackageId = (packageId: string) =>
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Appearance.packageId = packageId;
			}),
		);
	});

/**
 * Registers the "probe" package and makes it active. Every handler records
 * `{ component, event, detail }` in `events`, then delegates to
 * `options.on[event]` (whose return value is the handler's). `uninstall`
 * restores the packages registered before install and the previous
 * `packageId`, so Platinum is never left unregistered.
 */
export function installClassicyAppearanceProbe(options?: {
	on?: Partial<Record<ClassicyAppearanceEvent, ClassicyAppearanceHandler>>;
}): {
	events: ClassicyAppearanceProbeEvent[];
	uninstall: () => void;
} {
	const previousPackages = [...listClassicyAppearancePackages()];
	const previousPackageId =
		useAppManager.getState().System.Manager.Appearance.packageId;
	const events: ClassicyAppearanceProbeEvent[] = [];

	const on: NonNullable<ClassicyAppearanceHooks["on"]> = {};
	for (const component of Object.keys(
		CLASSICY_COMPONENT,
	) as ClassicyComponentName[]) {
		const handlers: Partial<
			Record<ClassicyAppearanceEvent, ClassicyAppearanceHandler>
		> = {};
		for (const event of EVENTS) {
			handlers[event] = (ctx) => {
				events.push({ component, event, detail: ctx.detail });
				return options?.on?.[event]?.(ctx);
			};
		}
		on[component] = handlers;
	}

	act(() => {
		registerClassicyAppearancePackage({
			id: "probe",
			name: "Probe",
			css: "",
			defaults: { ...getTheme("default"), package: "probe" },
			layout: CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
			hooks: {
				decorate: (component, state) => ({
					className: `probe-${component}`,
					attrs: { "data-probe-state": classicyStateClasses(state) },
				}),
				on,
			},
		});
	});
	setPackageId("probe");

	return {
		events,
		uninstall: () => {
			act(() => {
				resetClassicyAppearancePackagesForTests();
				for (const pkg of previousPackages)
					registerClassicyAppearancePackage(pkg);
			});
			setPackageId(previousPackageId);
		},
	};
}
