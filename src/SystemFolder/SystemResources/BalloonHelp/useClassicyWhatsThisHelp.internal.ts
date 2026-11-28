import { type RefObject, useEffect } from "react";
import { registerClassicyHelpAnchor } from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyWhatsThis.internal";
import type { ClassicyIconBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";

/** One control's What's This? help: the control, found under the root, and its text. */
export interface ClassicyWhatsThisHelpEntry {
	/** Finds the control's element under `root` (null when it is not drawn). */
	find: (root: HTMLElement) => Element | null;
	help: ClassicyIconBalloonHelp;
}

/**
 * Describes controls for What's This? alone (WIG Ch.12 "Context-Sensitive
 * Help", pp.273-275): each entry's element under `rootRef` is registered as
 * a help anchor (`registerClassicyHelpAnchor`), so the "?" caption box,
 * Shift+F1 and a right-click's What's This? show its text, and no ToolTip
 * shows it on hover, as a dialog's controls in Windows show none. Only the
 * What's This? machinery reads the registrations, so under a package
 * without `balloonHelp.contextHelp` "whatsThis" nothing changes. `entries`
 * should be stable (a module constant); the anchors are registered again
 * after each commit, since a page's controls come and go with its tab.
 */
export const useClassicyWhatsThisHelp = (
	rootRef: RefObject<HTMLElement | null>,
	entries: readonly ClassicyWhatsThisHelpEntry[],
): void => {
	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const releases: (() => void)[] = [];
		for (const { find, help } of entries) {
			const element = find(root);
			if (element) releases.push(registerClassicyHelpAnchor(element, help));
		}
		return () => {
			for (const release of releases) release();
		};
	});
};

/** Finds a check box's holder by its input's id, for an entry's `find`. */
export const classicyCheckboxHolderById =
	(id: string) =>
	(root: HTMLElement): Element | null =>
		root
			.querySelector(`#${CSS.escape(id)}`)
			?.closest(".classicyCheckboxHolder") ?? null;
