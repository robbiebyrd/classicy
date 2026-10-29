import {
	type CSSProperties,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type {
	ClassicyAppearanceDecoration,
	ClassicyAppearanceEvent,
	ClassicyAppearancePackage,
} from "./ClassicyAppearancePackage";
import {
	CLASSICY_FALLBACK_APPEARANCE_PACKAGE,
	getClassicyAppearancePackage,
	subscribeClassicyAppearancePackages,
} from "./ClassicyAppearancePackageRegistry";
import { runWithClassicyAppearanceSoundDispatch } from "./ClassicyAppearanceSound";
import {
	getActiveClassicyAppearancePackageId,
	subscribeClassicyAssets,
} from "./ClassicyAssetRegistry";
import { installClassicyAppearanceInput } from "./useClassicyAppearanceInput.internal";
import {
	type ClassicyComponentName,
	type ClassicyState,
	classicyStateClasses,
} from "./vocabulary/ClassicyVocabulary";

const SUBSYSTEM = "ClassicyAppearance";

// The active package is read without the store: the asset registry already
// follows the store's resolved package id (`Appearance.packageId` through
// resolveClassicyAppearancePackage, which the store connects as the asset
// package source; its listeners fire on a switch), and the package registry
// fires on (re)registration. This module never
// imports the app manager's store (useClassicyAppearance.storeFree.test.ts),
// so wiring it into a component adds no store read and no store import; a
// store that never connects its source resolves to Platinum.
const subscribeActivePackage = (onChange: () => void): (() => void) => {
	const unsubscribeAssets = subscribeClassicyAssets(onChange);
	const unsubscribePackages = subscribeClassicyAppearancePackages(onChange);
	return () => {
		unsubscribeAssets();
		unsubscribePackages();
	};
};

// Stable: the registry stores package objects as registered.
const getActivePackage = (): ClassicyAppearancePackage =>
	getClassicyAppearancePackage(getActiveClassicyAppearancePackageId()) ??
	CLASSICY_FALLBACK_APPEARANCE_PACKAGE;

// A package may add data attributes, never others (`id`, `role`, `aria-*`)
// nor Classicy's own part attributes (`data-classicy-*`). Case-insensitive:
// HTML lowercases attribute names, so "data-Classicy-part" would land as
// "data-classicy-part".
const PACKAGE_ATTRIBUTE = /^data-(?!classicy-)/i;

// Dropped attributes are reported once per package and key, in development.
const reportedDroppedAttributes = new Set<string>();

/**
 * Test helper: forget which dropped attributes were already reported, so a
 * test can assert the once-per-package-and-key warning from a clean slate.
 * @internal
 */
export const resetClassicyAppearanceAttributeWarningsForTests = (): void => {
	reportedDroppedAttributes.clear();
};

const packageAttributes = (
	packageId: string,
	attrs: Record<string, string>,
): Record<string, string> => {
	const kept: Record<string, string> = {};
	for (const [key, value] of Object.entries(attrs)) {
		if (PACKAGE_ATTRIBUTE.test(key)) {
			kept[key] = value;
			continue;
		}
		const reportKey = `${packageId}\u0000${key}`;
		if (
			process.env.NODE_ENV !== "production" &&
			!reportedDroppedAttributes.has(reportKey)
		) {
			reportedDroppedAttributes.add(reportKey);
			classicyLog(
				"warn",
				SUBSYSTEM,
				`Package "${packageId}" set the attribute "${key}"; only data-* attributes outside data-classicy-* are applied.`,
			);
		}
	}
	return kept;
};

type EmittedDecoration = {
	/** The package whose handler returned it; a switch drops it. */
	packageId: string;
	decoration: ClassicyAppearanceDecoration;
};

/**
 * A component's participation in the active Appearance Package.
 *
 * Returns what the component spreads on its root: `className` (the state
 * classes, then the package's `decorate()` class, then the class of the last
 * decoration a handler returned), `style` and `attrs` (decorate's, then the
 * emitted one's), and `emit`, which runs the package's
 * `hooks.on[component][event]` handler synchronously with the latest state and
 * `ref.current`. Sounds a handler plays (`playClassicyAppearanceSound`) go
 * through this component's sound dispatch.
 *
 * - A handler that returns a decoration (even `{}`) replaces the emitted one;
 *   returning nothing keeps it. One returned from any emit while mounted
 *   applies, including an emit from a layout effect on the first commit or
 *   on a re-mount (StrictMode, an `<Activity>` shown again).
 * - The emitted decoration belongs to the package id whose handler returned
 *   it: switching to another package drops it (switching back does not bring
 *   it back), while re-registering the same id keeps it.
 * - `attrs` holds only `data-*` keys outside `data-classicy-*` (compared
 *   case-insensitively); anything else a package sets (`id`, `role`,
 *   `aria-*`, part attributes) is dropped and, in development, reported once
 *   per package and key. Spread `attrs` before the component's own
 *   attributes.
 * - Package code never breaks the component: a handler or `decorate()` that
 *   throws is logged as an error (subsystem "ClassicyAppearance") and counts
 *   as returning nothing.
 * - `mount` is emitted once after the first commit and `unmount` on unmount.
 *   React has detached refs by then, so an `unmount` handler sees
 *   `element: null`. In development StrictMode React runs that effect twice,
 *   so a handler sees mount, unmount, mount.
 *
 * With no package hooks the result is a pure function of `state`:
 * `className` is `classicyStateClasses(state)`, `style` is undefined and
 * `attrs` is `{}`.
 */
export function useClassicyAppearance<E extends HTMLElement = HTMLElement>(
	component: ClassicyComponentName,
	state: Partial<Record<ClassicyState, boolean>>,
	ref?: RefObject<E | null>,
): {
	className: string;
	style?: CSSProperties;
	attrs: Record<string, string>;
	emit: (event: ClassicyAppearanceEvent, detail?: unknown) => void;
} {
	const pkg = useSyncExternalStore(
		subscribeActivePackage,
		getActivePackage,
		getActivePackage,
	);
	const soundDispatch = useSoundDispatch();
	const [emitted, setEmitted] = useState<EmittedDecoration>();

	// A package switch clears the emitted decoration (adjusting state during
	// render, so the stale one is never committed).
	if (emitted && emitted.packageId !== pkg.id) setEmitted(undefined);
	const emittedDecoration =
		emitted?.packageId === pkg.id ? emitted.decoration : undefined;

	const packageRef = useRef(pkg);
	packageRef.current = pkg;
	const stateRef = useRef(state);
	stateRef.current = state;
	// Tracks unmount rather than mount, so a decoration returned before the
	// passive mount effect (a layout-effect emit) still applies. Kept in a
	// layout effect declared here, ahead of the component's own layout
	// effects, so it is current for their emits on the first mount and on a
	// re-mount (StrictMode, an <Activity> shown again); layout cleanups run
	// before passive ones, so the `unmount` emit already sees it set.
	const unmountedRef = useRef(false);
	useLayoutEffect(() => {
		unmountedRef.current = false;
		return () => {
			unmountedRef.current = true;
		};
	}, []);

	const emit = useCallback(
		(event: ClassicyAppearanceEvent, detail?: unknown) => {
			const active = packageRef.current;
			const handler = active.hooks?.on?.[component]?.[event];
			if (!handler) return;
			const result = runWithClassicyAppearanceSoundDispatch(
				soundDispatch,
				() => {
					try {
						return handler({
							component,
							event,
							element: ref?.current ?? null,
							state: stateRef.current,
							detail,
						});
					} catch (error) {
						classicyLog(
							"error",
							SUBSYSTEM,
							`${component}.${event} handler threw; ignored.`,
							error,
						);
						return undefined;
					}
				},
			);
			if (!result || typeof result !== "object" || unmountedRef.current) return;
			setEmitted({ packageId: active.id, decoration: result });
		},
		[component, soundDispatch, ref],
	);
	const emitRef = useRef(emit);
	emitRef.current = emit;

	// Every wired control installs the press-modality tracker that
	// `detail.input` reads (once per realm), so none can forget it.
	useEffect(installClassicyAppearanceInput, []);

	useEffect(() => {
		emitRef.current("mount");
		return () => {
			emitRef.current("unmount");
		};
	}, []);

	const stateClasses = classicyStateClasses(state);
	const decorate = pkg.hooks?.decorate;
	// Keyed on the state classes, which name exactly the true states, so the
	// returned style and attrs keep their identity between equal renders.
	// biome-ignore lint/correctness/useExhaustiveDependencies: stateClasses stands for state.
	const decorated = useMemo(() => {
		try {
			return decorate?.(component, state);
		} catch (error) {
			classicyLog(
				"error",
				SUBSYSTEM,
				`${component}.decorate threw; ignored.`,
				error,
			);
			return undefined;
		}
	}, [decorate, component, stateClasses]);

	return useMemo(() => {
		const className = [
			stateClasses,
			decorated?.className,
			emittedDecoration?.className,
		]
			.filter(Boolean)
			.join(" ");
		const style =
			decorated?.style || emittedDecoration?.style
				? { ...decorated?.style, ...emittedDecoration?.style }
				: undefined;
		const attrs = packageAttributes(pkg.id, {
			...decorated?.attrs,
			...emittedDecoration?.attrs,
		});
		return { className, style, attrs, emit };
	}, [pkg.id, stateClasses, decorated, emittedDecoration, emit]);
}
