import { useMemo } from "react";
import { useActiveClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { APPLE_GUIDE_SHOW_TOPIC_EVENT } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import { ABOUT_BALLOON_HELP_TOPIC_ID } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/** The Apple Guide topic that lists the keyboard equivalents in effect. */
export const KEYBOARD_SHORTCUTS_TOPIC_ID = "keyboard-shortcuts";

/**
 * The Help menu's Show/Hide Balloons equivalent: Option-H, because the
 * browser keeps most Command and Control letters.
 */
export const BALLOON_HELP_SHORTCUT = "⌥H";

/** The Help menu's first item when the active package words none. */
export const CLASSICY_DEFAULT_HELP_ABOUT_TITLE = "About Balloon Help…";

/** Drop leading/trailing dividers and collapse runs left behind by a removal. */
export const trimMenuSpacers = (
	items: ClassicyMenuItem[],
): ClassicyMenuItem[] => {
	const trimmed: ClassicyMenuItem[] = [];
	for (const item of items) {
		if (
			item.id === "spacer" &&
			(trimmed.length === 0 || trimmed[trimmed.length - 1].id === "spacer")
		) {
			continue;
		}
		trimmed.push(item);
	}
	while (trimmed.length > 0 && trimmed[trimmed.length - 1].id === "spacer") {
		trimmed.pop();
	}
	return trimmed;
};

/** A top-level menu titled "Help": the standard Help menu absorbs it. */
const isOwnHelpMenu = (item: ClassicyMenuItem): boolean =>
	item.title === "Help";

/** The items a top-level "Help" menu contributes: its children, or itself. */
const ownHelpItems = (menu: ClassicyMenuItem): ClassicyMenuItem[] =>
	menu.menuChildren && menu.menuChildren.length > 0
		? menu.menuChildren
		: [menu];

export type ClassicyStandardHelpMenu = {
	/** The standard Help menu, to draw after the app's own menus. */
	helpItem: ClassicyMenuItem;
	/** The app's menus without the top-level "Help" menus the standard one absorbed. */
	appMenu: ClassicyMenuItem[] | undefined;
};

/**
 * The standard Help menu (HIGOS8 Ch. 4, Figure 4-2; HIGOS7 Figure 4-88),
 * built once for both menu placements: the screen bar and each window's own
 * bar (`ClassicyWindowMenuBar`). In order, in three groups divided as the
 * figures divide them:
 *
 * 1. the About item (worded by the active package's `helpMenu.aboutTitle`),
 * 2. Show/Hide Balloons (⌥H),
 * 3. Keyboard Shortcuts (the Apple Guide topic listing the equivalents in
 *    effect), then the app's `useClassicyHelpMenu` items and the items of any
 *    top-level "Help" menu in `appMenu` (Finder publishes one), which are
 *    taken out of the returned `appMenu` so the bar draws one Help menu.
 *
 * Pass `appMenu` after any About item has been hoisted out of it (the screen
 * bar moves the app's About into the Apple menu); `appId` names the app whose
 * `useClassicyHelpMenu` items to include.
 */
export function useClassicyStandardHelpMenu({
	appMenu,
	appId,
}: {
	appMenu: ClassicyMenuItem[] | undefined;
	appId: string | undefined;
}): ClassicyStandardHelpMenu {
	const titleArt = useClassicyAsset("systemArt", "helpMenuTitle");
	const disableBalloonHelp = useAppManager(
		(s) => s.System.Manager.Desktop.disableBalloonHelp,
	);
	const appHelp = useAppManager((s) =>
		appId ? s.System.Manager.Desktop?.helpMenu?.[appId] : undefined,
	);
	const aboutTitle =
		useActiveClassicyAppearancePackage().helpMenu?.aboutTitle ??
		CLASSICY_DEFAULT_HELP_ABOUT_TITLE;

	return useMemo(() => {
		const own = (appMenu ?? []).filter(isOwnHelpMenu).flatMap(ownHelpItems);
		const content = trimMenuSpacers([
			{
				id: "help-keyboard-shortcuts",
				title: "Keyboard Shortcuts",
				event: APPLE_GUIDE_SHOW_TOPIC_EVENT,
				eventData: { topicId: KEYBOARD_SHORTCUTS_TOPIC_ID },
			},
			...(appHelp ?? []),
			...own,
		]);
		const helpItem: ClassicyMenuItem = {
			id: "help-menu",
			// The art replaces the word, which stays its accessible name.
			...(titleArt ? { image: titleArt, imageAlt: "Help" } : { title: "Help" }),
			className: "classicyDesktopMenuHelp",
			part: "help",
			menuChildren: [
				{
					id: "help-about-balloon",
					title: aboutTitle,
					event: APPLE_GUIDE_SHOW_TOPIC_EVENT,
					eventData: { topicId: ABOUT_BALLOON_HELP_TOPIC_ID },
				},
				{ id: "spacer" },
				{
					id: "help-toggle-balloons",
					title: disableBalloonHelp ? "Show Balloons" : "Hide Balloons",
					// Real working equivalent: Option-H rather than a Command
					// combination, since the browser reserves most of those.
					keyboardShortcut: BALLOON_HELP_SHORTCUT,
					event: "ClassicyDesktopSetBalloonHelp",
					eventData: { disableBalloonHelp: !disableBalloonHelp },
				},
				{ id: "spacer" },
				...content,
			],
		};
		return {
			helpItem,
			appMenu: appMenu?.filter((item) => !isOwnHelpMenu(item)),
		};
	}, [appMenu, appHelp, titleArt, disableBalloonHelp, aboutTitle]);
}
