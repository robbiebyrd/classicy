import {
	type FC as FunctionalComponent,
	type PropsWithChildren,
	useContext,
	useLayoutEffect,
} from "react";
import { ClassicyWindowSelfPaddingContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowSelfPadding.internal";

/**
 * Tells the nearest `ClassicyWindow` that this content lays itself out from
 * the window's edge (it pads its own root), for as long as the calling
 * component is mounted and `enabled` holds. A modal window then marks its
 * inner area, `.classicyWindowContentsModalInner`, with
 * `classicyWindowContentsSelfPadded`, so an Appearance Package that insets a
 * dialog's items itself (System 7's `dialogFrame.inset`) gives this content
 * no second inset. `ClassicyAlert`, `ClassicyInputDialog`,
 * `ClassicyKeyboardEquivalentDialog` and `ClassicyForm layout="dialog"`
 * claim it; a host's own self-padding dialog content may too. Only the
 * nearest window is marked, and only while the window is modal. A no-op
 * outside any window.
 */
export const useClassicyWindowSelfPadding = (enabled = true): void => {
	const claim = useContext(ClassicyWindowSelfPaddingContext);
	// A layout effect, so the window re-renders with the marker before the
	// first paint and a package's inset never flashes.
	useLayoutEffect(() => {
		if (!enabled || !claim) return;
		return claim();
	}, [claim, enabled]);
};

/**
 * `useClassicyWindowSelfPadding` as a wrapper, for a component that renders
 * the `ClassicyWindow` itself and so sits outside it: wrap the content you
 * pass the window. Renders its children unchanged, adding no DOM.
 */
export const ClassicyWindowSelfPadding: FunctionalComponent<
	PropsWithChildren
> = ({ children }) => {
	useClassicyWindowSelfPadding();
	return <>{children}</>;
};
