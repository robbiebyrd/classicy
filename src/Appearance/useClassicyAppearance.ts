import {
	type CSSProperties,
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import {
	CLASSICY_FALLBACK_APPEARANCE_PACKAGE,
	type ClassicyAppearanceDecoration,
	type ClassicyAppearanceEvent,
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	subscribeClassicyAppearancePackages,
} from "./ClassicyAppearancePackage";
import { runWithClassicyAppearanceSoundDispatch } from "./ClassicyAppearanceSound";
import {
	getActiveClassicyAppearancePackageId,
	subscribeClassicyAssets,
} from "./ClassicyAssetRegistry";
import {
	type ClassicyComponentName,
	type ClassicyState,
	classicyStateClasses,
} from "./vocabulary/ClassicyVocabulary";

// The active package is read without the store: the asset registry already
// follows the store's resolved package id (its listeners fire on a switch),
// and the package registry fires on (re)registration. Components that wire
// this hook therefore never call `useAppManager`, so tests that mock the
// store with partial fixtures keep working; a store that never connects its
// source resolves to Platinum.
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
 * through this component's sound dispatch. A handler that returns a
 * decoration (even `{}`) replaces the emitted one; returning nothing keeps it.
 * A package switch drops it.
 *
 * `mount` is emitted once after the first commit and `unmount` on unmount
 * (in development StrictMode React runs that effect twice, so a handler sees
 * mount, unmount, mount). With no package hooks the result is a pure function
 * of `state`: `className` is `classicyStateClasses(state)`, `style` is
 * undefined and `attrs` is `{}`.
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
	const mountedRef = useRef(false);

	const emit = useCallback(
		(event: ClassicyAppearanceEvent, detail?: unknown) => {
			const active = packageRef.current;
			const handler = active.hooks?.on?.[component]?.[event];
			if (!handler) return;
			const result = runWithClassicyAppearanceSoundDispatch(soundDispatch, () =>
				handler({
					component,
					event,
					element: ref?.current ?? null,
					state: stateRef.current,
					detail,
				}),
			);
			if (!result || typeof result !== "object" || !mountedRef.current) return;
			setEmitted({ packageId: active.id, decoration: result });
		},
		[component, soundDispatch, ref],
	);
	const emitRef = useRef(emit);
	emitRef.current = emit;

	useEffect(() => {
		mountedRef.current = true;
		emitRef.current("mount");
		return () => {
			mountedRef.current = false;
			emitRef.current("unmount");
		};
	}, []);

	const stateClasses = classicyStateClasses(state);
	const decorate = pkg.hooks?.decorate;
	// Keyed on the state classes, which name exactly the true states, so the
	// returned style and attrs keep their identity between equal renders.
	// biome-ignore lint/correctness/useExhaustiveDependencies: stateClasses stands for state.
	const decorated = useMemo(
		() => decorate?.(component, state),
		[decorate, component, stateClasses],
	);

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
		const attrs = { ...decorated?.attrs, ...emittedDecoration?.attrs };
		return { className, style, attrs, emit };
	}, [stateClasses, decorated, emittedDecoration, emit]);
}
