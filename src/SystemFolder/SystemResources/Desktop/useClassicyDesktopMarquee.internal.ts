import type { RefObject } from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type ClassicyMarqueeItem,
	useClassicyMarqueeSelection,
} from "@/SystemFolder/SystemResources/File/useClassicyMarqueeSelection.internal";

/**
 * The desktop's selection rectangle: a drag from the bare desktop selects
 * the desktop icons it touches (`useClassicyMarqueeSelection`), through the
 * store's `Desktop.selectedIcons` (`ClassicyDesktopIconSelectBox`). The
 * desktop calls `start` from its mousedown and renders `marquee` in its root,
 * where it lies under every window, as the Finder drew it.
 * @internal
 */
export function useClassicyDesktopMarquee(
	desktopRef: RefObject<HTMLElement | null>,
) {
	const dispatch = useAppManagerDispatch();
	return useClassicyMarqueeSelection({
		surfaceRef: desktopRef,
		getItems: () =>
			Array.from(
				desktopRef.current?.querySelectorAll<HTMLElement>(
					":scope > .classicyDesktopIcon",
				) ?? [],
				(el): ClassicyMarqueeItem => ({
					id: el.id.replace(/\.shortcut$/, ""),
					image: el.querySelector<HTMLImageElement>(
						".classicyDesktopIconMask img",
					),
					label: el.querySelector("p"),
				}),
			),
		getSelection: () =>
			useAppManager.getState().System.Manager.Desktop.selectedIcons ?? [],
		onSelect: (iconIds) =>
			dispatch({ type: "ClassicyDesktopIconSelectBox", iconIds }),
		// The desktop's own name for it, kept for hosts that style it.
		className: "classicyDesktopSelect",
	});
}
