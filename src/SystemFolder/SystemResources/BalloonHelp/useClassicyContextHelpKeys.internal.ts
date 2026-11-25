import { useEffect } from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import {
	findClassicyHelpAnchor,
	showClassicyContextHelpBelow,
	startClassicyWhatsThis,
	stopClassicyWhatsThis,
} from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyWhatsThis.internal";

/**
 * F1 and Shift+F1 (WIG App. B Table B.2, p.358; Ch.12 "Context-Sensitive
 * Help", pp.273-275): Shift+F1 starts What's This? on the active window
 * (`startClassicyWhatsThis`; again, it ends it), and F1 shows the
 * context-sensitive Help of the focused element ("pressing F1 displays a
 * context-sensitive Help window for the object that has the input focus",
 * p.275): the help of its nearest described element
 * (`useClassicyBalloonHelp`'s anchors), below the focused element, or, with
 * none (focus on the desktop or on nothing described), the application's
 * Help, Help Topics (`APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT`). Both are taken
 * with `preventDefault`, so the browser's own Help never opens. Keys with
 * Control, Alt or Command, a key a handler already took
 * (`defaultPrevented`), and keys while focus is outside the desktop
 * (`#classicyDesktop`) are left alone; an auto-repeat is taken but does
 * nothing. Only while `enabled` (the package's
 * `layout.balloonHelp.contextHelp` "whatsThis": Windows'; Mac OS had no
 * F1, so Platinum and System 7 bind neither key). Mounted by
 * `ClassicyContextualMenuProvider`, as the context-menu key is.
 * @internal
 */
export const useClassicyContextHelpKeys = (enabled: boolean): void => {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		if (
			!enabled ||
			typeof window === "undefined" ||
			typeof document === "undefined"
		)
			return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (
				e.key !== "F1" ||
				e.defaultPrevented ||
				e.ctrlKey ||
				e.altKey ||
				e.metaKey
			)
				return;
			const desktop = document.getElementById("classicyDesktop");
			const focused = document.activeElement;
			const onNothing =
				!focused || focused === document.body || focused === desktop;
			if (!onNothing && desktop && !desktop.contains(focused)) return;
			e.preventDefault();
			if (e.repeat) return;
			if (e.shiftKey) {
				startClassicyWhatsThis();
				return;
			}
			stopClassicyWhatsThis();
			const anchor =
				!onNothing && focused ? findClassicyHelpAnchor(focused, desktop) : null;
			if (anchor && focused) {
				showClassicyContextHelpBelow(anchor, focused);
				return;
			}
			dispatch({ type: APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT });
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [enabled, dispatch]);
};
