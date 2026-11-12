import {
	type FC as FunctionalComponent,
	type PropsWithChildren,
	type RefObject,
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
 *
 * Pass `rootRef`, the element that pads itself, and the claim holds only
 * while that element is the window's content root: a direct child of the
 * window's inner area (`.classicyWindowContentsInner`). Nested deeper among
 * other content, or rendered through a portal, it does not claim, and the
 * window keeps the package's inset. Without `rootRef` the window cannot
 * tell where the claimant is, so the claim covers its whole content
 * wherever in its tree (portals included) the caller renders: claim that
 * way only from the content root.
 */
export const useClassicyWindowSelfPadding = (
	enabled = true,
	rootRef?: RefObject<Element | null>,
): void => {
	const claim = useContext(ClassicyWindowSelfPaddingContext);
	// A layout effect, so the window re-renders with the marker before the
	// first paint and a package's inset never flashes. React attaches refs
	// before layout effects run, and an element never changes parent
	// without remounting, so the root's parent read here holds while the
	// claim does.
	useLayoutEffect(() => {
		if (!enabled || !claim) return;
		if (
			rootRef &&
			!rootRef.current?.parentElement?.classList.contains(
				"classicyWindowContentsInner",
			)
		)
			return;
		return claim();
	}, [claim, enabled, rootRef]);
};

/**
 * `useClassicyWindowSelfPadding` as a wrapper, for a component that renders
 * the `ClassicyWindow` itself and so sits outside it: wrap the content root
 * you pass the window, and give the wrapper that root as `rootRef`, so the
 * claim holds only while it is the window's content root. Renders its
 * children unchanged, adding no DOM.
 */
export const ClassicyWindowSelfPadding: FunctionalComponent<
	PropsWithChildren<{
		/**
		 * The element that pads itself. With it the claim holds only while
		 * that element is a direct child of the window's inner area; without
		 * it the claim covers the window's whole content.
		 */
		rootRef?: RefObject<Element | null>;
	}>
> = ({ rootRef, children }) => {
	useClassicyWindowSelfPadding(true, rootRef);
	return <>{children}</>;
};
