// System 7's menus under each of its two themes (plan 0018-dbd §3.3): the
// menu bar with a menu pulled down (dimmed items, dividers, Command-key
// equivalents), a hierarchical menu, checkmarks and dashes, and a pop-up menu
// closed and open. Menus stay open only while something holds them, so each
// story opens its menu once the desktop has mounted, as a click would
// (Classicy's menus are sticky). Compare with the System 7.5 captures in
// docs/system7-reference-screenshots.md ("Desktop and menus", "Controls").
import {
	ClassicyContextualMenu,
	type ClassicyMenuItem,
	ClassicyPopUpMenu,
	ClassicyWindow,
	useAppManagerDispatch,
} from "@classicy/classicy";
import { StoryApp } from "@sb/helpers";
import { inColor, system7Parameters } from "@sb/system7";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { fn } from "storybook/test";

const meta = {
	title: "Appearance/System 7 Menus",
	parameters: system7Parameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Clicks each element `selectors` names, in order, once the desktop has
 * settled: a click opens a menu title, a submenu's parent item or a pop-up.
 */
function OpenOnMount({ selectors }: { selectors: string[] }) {
	useEffect(() => {
		const timer = window.setTimeout(() => {
			for (const selector of selectors)
				document.querySelector<HTMLElement>(selector)?.click();
		}, 300);
		return () => window.clearTimeout(timer);
	}, [selectors]);
	return null;
}

const item = (
	id: string,
	title: string,
	more: Partial<ClassicyMenuItem> = {},
): ClassicyMenuItem => ({
	id: `storybook.app_${id}`,
	title,
	onClickFunc: fn(),
	...more,
});

const spacer: ClassicyMenuItem = { id: "spacer" };

// The Finder's File and Edit menus with nothing selected, as in
// `*-menu-pulldown-edit.png`: most items dimmed, groups split by dividers;
// a View menu with every item unavailable, so its title is dimmed (HIG
// p.54); and a Style menu with checkmarks.
const appMenu: ClassicyMenuItem[] = [
	{
		id: "storybook.app_file",
		title: "File",
		menuChildren: [
			item("new", "New Folder", { keyboardShortcut: "⌘N" }),
			item("open", "Open", { keyboardShortcut: "⌘O", disabled: true }),
			item("print", "Print", { keyboardShortcut: "⌘P", disabled: true }),
			item("close", "Close Window", { keyboardShortcut: "⌘W" }),
			spacer,
			item("info", "Get Info", { keyboardShortcut: "⌘I", disabled: true }),
			item("recent", "Recent Folders", {
				onClickFunc: undefined,
				menuChildren: [
					item("recent-hd", "Macintosh HD"),
					item("recent-system", "System Folder"),
					item("recent-cp", "Control Panels", { disabled: true }),
				],
			}),
		],
	},
	{
		id: "storybook.app_edit",
		title: "Edit",
		menuChildren: [
			item("undo", "Undo", { keyboardShortcut: "⌘Z", disabled: true }),
			spacer,
			item("cut", "Cut", { keyboardShortcut: "⌘X", disabled: true }),
			item("copy", "Copy", { keyboardShortcut: "⌘C", disabled: true }),
			item("paste", "Paste", { keyboardShortcut: "⌘V", disabled: true }),
			item("clear", "Clear", { disabled: true }),
			item("select-all", "Select All", { keyboardShortcut: "⌘A" }),
			spacer,
			item("clipboard", "Show Clipboard"),
		],
	},
	{
		id: "storybook.app_view",
		title: "View",
		disabled: true,
		menuChildren: [item("by-icon", "by Icon"), item("by-name", "by Name")],
	},
	{
		id: "storybook.app_style",
		title: "Style",
		menuChildren: [
			item("plain", "Plain Text", { checked: true }),
			item("bold", "Bold", { checked: "mixed" }),
			item("italic", "Italic", { checked: false }),
			spacer,
			item("9", "9 Point", { checked: false }),
			item("12", "12 Point", { checked: true }),
		],
	},
];

/** The Storybook app with one window publishing `appMenu`, its menus open as `open` says. */
const menuScene = (open: string[]) => () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyWindow
			id="menus"
			appId="storybook.app"
			title="Untitled"
			appMenu={appMenu}
			initialSize={[379, 215]}
			initialPosition={[47, 260]}
		>
			<p style={{ padding: "1em" }}>Its menus are in the menu bar.</p>
		</ClassicyWindow>
		<OpenOnMount selectors={open} />
	</StoryApp>
);

const title = (id: string) => `[id="storybook.app_${id}"]`;

/**
 * The menu bar with the Edit menu pulled down: the title inverted, the white
 * menu hanging from the bar's bottom line with a 1 px shadow that starts
 * three pixels in, dimmed items (dithered in black and white, gray in color)
 * that never highlight, dividers (dotted, or a gray line) and the
 * Command-key column. As `*-menu-pulldown-edit.png`.
 */
export const PullDown: Story = { render: menuScene([title("edit")]) };
export const PullDownColor = inColor(menuScene([title("edit")]));

/**
 * A hierarchical menu: the parent item highlighted, its triangle, and the
 * submenu beside it with the same frame and shadow. As
 * `*-menu-hierarchical-controlpanels.png`.
 */
export const Hierarchical: Story = {
	render: menuScene([title("file"), title("recent")]),
};
export const HierarchicalColor = inColor(
	menuScene([title("file"), title("recent")]),
);

/**
 * Checkmarks and the mixed-state dash in the mark column, as in the Label and
 * Size menus (`color-menu-pulldown-checkmark-outline-sizes.png`).
 */
export const Checkmarks: Story = { render: menuScene([title("style")]) };
export const CheckmarksColor = inColor(menuScene([title("style")]));

const fonts = [
	"Chicago",
	"Courier",
	"Geneva",
	"Helvetica",
	"Monaco",
	"New York",
	"Palatino",
	"Symbol",
	"Times",
].map((label) => ({ value: label.toLowerCase(), label }));

/**
 * A window holding a titled pop-up menu, opened when `open` is set. It is
 * the Views control panel, framed where the capture frames it (x 151..488),
 * which has no size box (so no scroll bars while it fits,
 * `scrollBar.fitsBars` keeping them only in document windows) and no zoom
 * box.
 */
const popUpScene = (open: boolean) => () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyWindow
			id="views"
			appId="storybook.app"
			title="Views"
			initialSize={[336, 180]}
			initialPosition={[151, 36]}
			resizable={false}
			zoomable={false}
		>
			<div style={{ padding: "16px 12px", width: 300 }}>
				<ClassicyPopUpMenu
					id="system7-font"
					label="Font:"
					labelPosition="left"
					selected="geneva"
					options={fonts}
					onChangeFunc={fn()}
				/>
			</div>
		</ClassicyWindow>
		{open && <OpenOnMount selectors={["#system7-font"]} />}
	</StoryApp>
);

/**
 * A closed pop-up menu: a white box with a 1 px frame and shadow and the
 * 11 x 6 down triangle, its title beside it. As `*-controlpanel-views.png`.
 */
export const PopUp: Story = { render: popUpScene(false) };
export const PopUpColor = inColor(popUpScene(false));

/**
 * The pop-up menu open: its title inverted and its triangle hidden while the
 * menu, the current item checked, lies over it (HIG p.87). As
 * `*-popup-open-views-font.png`.
 */
export const PopUpOpen: Story = { render: popUpScene(true) };
export const PopUpOpenColor = inColor(popUpScene(true));

/**
 * Menus a host places after they mount, low on the screen: a contextual menu
 * opened near the bottom flips up above the point, and the Control Strip's
 * Screen Saver menu, placed below its module first, flips up above the
 * strip. Each menu's scroll cap follows it to its final place, so all of its
 * items show, with no scroll indicators.
 */
const lowMenusScene = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyContextualMenu
			name="system7-context-bottom"
			position={[420, 740]}
			menuItems={[
				item("open", "Open"),
				item("print", "Print"),
				spacer,
				item("info", "Get Info"),
				item("trash", "Move To Trash"),
			]}
			onClose={fn()}
		/>
		<OpenOnMount
			selectors={['.classicyControlStripModule[aria-label="Screen Saver"]']}
		/>
	</StoryApp>
);

export const LowMenus: Story = { render: lowMenusScene };
export const LowMenusColor = inColor(lowMenusScene);

/**
 * Brings the Finder to the front (quitting the Storybook app when `alone`,
 * so the Finder is the only application), then opens the Application menu.
 */
function FinderFrontSwitcherOpen({
	open,
	alone = false,
}: {
	open: boolean;
	alone?: boolean;
}) {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		const timer = window.setTimeout(() => {
			if (alone)
				dispatch({ type: "ClassicyAppClose", app: { id: "storybook.app" } });
			dispatch({ type: "ClassicyAppFocus", app: { id: "Finder.app" } });
			if (open)
				window.setTimeout(
					() =>
						document.querySelector<HTMLElement>("#app-switcher > p")?.click(),
					100,
				);
		}, 300);
		return () => window.clearTimeout(timer);
	}, [dispatch, open, alone]);
	return null;
}

/**
 * The Application menu with the Finder in front: its title the Finder's
 * small icon alone, 34 px wide and 6 px from the screen's right edge
 * (`*-755-appmenu-closed.png`), and, open, Hide Finder, Hide Others and Show
 * All, a divider, then each open application by its small icon, the Finder
 * checked (`*-755-appmenu-open.png`, where the Finder alone is open, so its
 * commands are dimmed; here the Storybook app is open too).
 */
const applicationMenuScene =
	(open: boolean, alone = false) =>
	() => (
		<StoryApp id="storybook.app" name="Storybook">
			<FinderFrontSwitcherOpen open={open} alone={alone} />
		</StoryApp>
	);

export const ApplicationMenu: Story = { render: applicationMenuScene(false) };
export const ApplicationMenuColor = inColor(applicationMenuScene(false));
export const ApplicationMenuOpen: Story = {
	render: applicationMenuScene(true),
};
export const ApplicationMenuOpenColor = inColor(applicationMenuScene(true));

/**
 * The Application menu with the Finder alone running, as
 * `*-755-appmenu-open.png` captures it: Hide Finder, Hide Others and Show All
 * all dimmed, then the Finder, checked.
 */
export const ApplicationMenuOpenFinderAlone: Story = {
	render: applicationMenuScene(true, true),
};
export const ApplicationMenuOpenFinderAloneColor = inColor(
	applicationMenuScene(true, true),
);

/**
 * Brings the Storybook app to the front, hides the others (the Finder), then
 * opens the Application menu: the Finder's icon dimmed, as
 * `*-755-appmenu-hidden-app.png` draws a hidden application (there with
 * Scrapbook in front).
 */
function HiddenAppSwitcherOpen() {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		const timer = window.setTimeout(() => {
			dispatch({ type: "ClassicyAppFocus", app: { id: "storybook.app" } });
			dispatch({ type: "ClassicyAppHideOthers", app: { id: "storybook.app" } });
			window.setTimeout(
				() => document.querySelector<HTMLElement>("#app-switcher > p")?.click(),
				100,
			);
		}, 300);
		return () => window.clearTimeout(timer);
	}, [dispatch]);
	return null;
}

const hiddenAppScene = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<HiddenAppSwitcherOpen />
	</StoryApp>
);

export const ApplicationMenuHiddenApp: Story = { render: hiddenAppScene };
export const ApplicationMenuHiddenAppColor = inColor(hiddenAppScene);
