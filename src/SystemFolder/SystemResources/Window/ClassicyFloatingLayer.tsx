import {
	type CSSProperties,
	createContext,
	type FC as FunctionalComponent,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";

/** The id of the desktop's floating layer. */
export const CLASSICY_FLOATING_LAYER_ID = "classicy-floating-layer";

/**
 * The floating layer's z-index: above the palettes (350) and the Control
 * Strip (355), under the modal bands (360 and up). Mac OS 8.5's Application
 * Switcher palette, a system-wide floating window ("appears as a floating
 * window", TN1142), is drawn above the Control Strip when dropped over it,
 * hiding the strip's modules beneath it (integration review G round 6, B5;
 * audit-85 `im85/sw-overstrip-rel.png`, `o4-overstrip-rel.png`).
 */
export const CLASSICY_FLOATING_LAYER_Z_INDEX = 356;

/**
 * The layer's box: it spans the desktop (a floating window's percentage sizes
 * resolve against it) at `CLASSICY_FLOATING_LAYER_Z_INDEX`, and catches no
 * pointer itself: its windows opt back in.
 */
export const CLASSICY_FLOATING_LAYER_STYLE: CSSProperties = {
	position: "absolute",
	left: 0,
	top: 0,
	width: "100%",
	height: "100%",
	zIndex: CLASSICY_FLOATING_LAYER_Z_INDEX,
	pointerEvents: "none",
};

type FloatingLayerContextValue = {
	/** The live layer element; `null` until the desktop has committed it. */
	element: HTMLElement | null;
	setElement: (element: HTMLElement | null) => void;
};

/**
 * Set by `ClassicyDesktop`, which owns the one floating layer: a floating
 * extension window (Apple Guide's topics) portals into `element`. Without a
 * provider (a window rendered outside a desktop) it is `undefined`.
 */
export const ClassicyFloatingLayerContext = createContext<
	FloatingLayerContextValue | undefined
>(undefined);

/** Provides the floating layer's element to the desktop's windows. */
export const ClassicyFloatingLayerProvider: FunctionalComponent<{
	children?: ReactNode;
}> = ({ children }) => {
	const [element, setElement] = useState<HTMLElement | null>(null);
	const value = useMemo(() => ({ element, setElement }), [element]);
	return (
		<ClassicyFloatingLayerContext.Provider value={value}>
			{children}
		</ClassicyFloatingLayerContext.Provider>
	);
};

/**
 * The floating layer itself, an element of the desktop's own React tree: one
 * per desktop, removed with it, no DOM access during render (so a server
 * render is untouched), and registered with the provider once committed.
 */
export const ClassicyFloatingLayer: FunctionalComponent = () => {
	const ctx = useContext(ClassicyFloatingLayerContext);
	return (
		<div
			id={CLASSICY_FLOATING_LAYER_ID}
			ref={ctx?.setElement}
			style={CLASSICY_FLOATING_LAYER_STYLE}
		/>
	);
};

/**
 * The layer for a window rendered with no desktop around it (a story or a
 * test): found among the root's own children or appended there once, never
 * under a desktop that is still mounting.
 */
export const classicyFallbackFloatingLayer = (
	root: HTMLElement,
): HTMLElement => {
	const existing = Array.from(root.children).find(
		(c): c is HTMLElement =>
			c instanceof HTMLElement && c.id === CLASSICY_FLOATING_LAYER_ID,
	);
	if (existing) return existing;
	const layer = document.createElement("div");
	layer.id = CLASSICY_FLOATING_LAYER_ID;
	Object.assign(layer.style, {
		position: "absolute",
		left: "0",
		top: "0",
		width: "100%",
		height: "100%",
		zIndex: String(CLASSICY_FLOATING_LAYER_Z_INDEX),
		pointerEvents: "none",
	});
	root.appendChild(layer);
	return layer;
};
