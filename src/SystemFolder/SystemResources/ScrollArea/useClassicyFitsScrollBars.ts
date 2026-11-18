import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import type { ClassicyScrollBarPolicy } from "./ClassicyScrollAreaMetrics";

/**
 * Whether the active Appearance Package keeps scroll bars drawn while the
 * content fits (`layout.scrollBar.fitsBars: "shown"`, System 7: "If the
 * document is no larger than the window, the scroll bars are inactive",
 * HIG7 p.160). Re-renders when the package changes.
 */
export const useClassicyFitsScrollBars = (): boolean =>
	useClassicyAppearanceLayout().scrollBar?.fitsBars === "shown";

/**
 * The policy for a scrolling list's bar (`ClassicyScrollArea`'s `vertical`
 * or `horizontal`): `"always"` (drawn in the `fits` state while the rows
 * fit) when the package keeps the bars, else `"auto"`. `keep` overrides the
 * package for this list. `ClassicyListBox` and Standard File's list use it.
 */
export const useClassicyFitsBarPolicy = (
	keep?: boolean,
): ClassicyScrollBarPolicy => {
	const packageKeeps = useClassicyFitsScrollBars();
	return (keep ?? packageKeeps) ? "always" : "auto";
};
