// System 7's desktop (plan 0018-dbd §3.7), under each of its two themes: the
// desktop pattern, desktop icons in their states, the Control Strip, the tab
// control and the Appearance Manager. Compared with the System 7.5 captures
// in .playwright-mcp/parity/system7/reference/ (desktop pattern and icons;
// there is no capture of the Control Strip, and 7.5 had no tab control or
// Appearance Manager).
import {
	APPEARANCE_MANAGER_APP_ID,
	ClassicyCheckbox,
	ClassicyIcon,
	ClassicyInput,
	ClassicyStartupScreen,
	ClassicyTabs,
	ClassicyWindow,
	hasAppWindow,
	resetStartupScreenSession,
	useAppManager,
	useAppManagerDispatch,
	useClassicyAsset,
} from "@classicy/classicy";
import {
	dragClassicySelectionRectangle,
	dragClassicySelectionRectanglePastEdge,
	StoryApp,
} from "@sb/helpers";
import { system7Parameters, WithTheme } from "@sb/system7";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, useEffect } from "react";
import { fireEvent, waitFor } from "storybook/test";

const meta = {
	title: "Appearance/System 7/Desktop",
	parameters: system7Parameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The color theme around a story, or the 1-bit defaults as they are. */
const themed = (color: boolean, children: ReactElement): ReactElement =>
	color ? <WithTheme id="system7-color">{children}</WithTheme> : children;

/**
 * Desktop icons in a row along the top, each cell's corner on an even pixel
 * (as the captures' icons are), so the patterns line up with the captures':
 * the hard disk as it is, selected, opened, and both, and the Sound control
 * panel selected; and the same icons in a window (ClassicyIcon), which
 * a click selects. The desktop's own icons (Finder's disk and the Trash)
 * stay in their column on the right.
 */
function Icons() {
	const dispatch = useAppManagerDispatch();
	const disk = useClassicyAsset("icons", "system.drives.disk") ?? "";
	const sound =
		useClassicyAsset("icons", "controlPanels.soundManager.app") ?? "";
	useEffect(() => {
		if (!disk || !sound) return;
		const icons: [string, string, string][] = [
			["system7.disk", "Macintosh HD", disk],
			["system7.selected", "Selected", disk],
			["system7.opened", "Opened", disk],
			["system7.both", "Selected Opened", disk],
			["system7.sound", "Sound", sound],
		];
		icons.forEach(([id, name, icon], i) => {
			dispatch({
				type: "ClassicyDesktopIconAdd",
				app: { id, name, icon },
				kind: "icon",
				location: [40 + i * 100, 40],
			});
		});
		for (const id of ["system7.opened", "system7.both"])
			dispatch({
				type: "ClassicyAppOpen",
				app: { id, name: id, icon: disk },
			});
		dispatch({
			type: "ClassicyDesktopIconSelectBox",
			iconIds: ["system7.selected", "system7.both", "system7.sound"],
		});
	}, [dispatch, disk, sound]);
	return (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="system7-icons"
				appId="storybook.app"
				title="Control Panels"
				initialSize={[260, 120]}
				initialPosition={[560, 300]}
			>
				<div style={{ position: "relative", height: "100px" }}>
					<ClassicyIcon
						appId="system7.window.sound"
						name="Sound"
						icon={sound}
						initialPosition={[16, 8]}
					/>
					<ClassicyIcon
						appId="system7.window.disk"
						name="Macintosh HD"
						icon={disk}
						initialPosition={[112, 8]}
					/>
				</div>
			</ClassicyWindow>
		</StoryApp>
	);
}

/**
 * The 1-bit desktop: the 50% checkerboard pattern (System `ppat` 16's 1-bit
 * pattern, the theme's desktop picture), icons with opaque Geneva 9 labels, a selected icon inverted and
 * an opened one filled with the 25% pattern, and the Control Strip.
 */
export const Desktop: Story = {
	render: () => <Icons />,
};

/**
 * The color desktop: the #666666/#AAAAAA checkerboard (`ppat` 16 as a
 * 256-color screen draws it), a selected icon
 * darkened, an opened one filled with the window color's dark lavender, and
 * the Control Strip in the 7.5 strip's grays.
 */
export const DesktopColor: Story = {
	render: () => themed(true, <Icons />),
};

/** Docks the Control Strip at the desktop's right edge, at its bottom. */
function StripDockedRight() {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({
			type: "ClassicyDesktopControlStripSetPosition",
			edge: "right",
			bottom: 0,
		});
		return () =>
			dispatch({
				type: "ClassicyDesktopControlStripSetPosition",
				edge: "left",
				bottom: 0,
			});
	}, [dispatch]);
	return <StoryApp id="storybook.app" name="Storybook" />;
}

/**
 * The Control Strip docked at the right edge, as 7.5.5 draws it after an
 * Option-drag of its tab (`*-755-controlstrip-right.png`, story 0214-c61):
 * the tab at its left end, the collapse box at its right.
 */
export const ControlStripRight: Story = {
	render: () => <StripDockedRight />,
};

export const ControlStripRightColor: Story = {
	render: () => themed(true, <StripDockedRight />),
};

function TabsWindow() {
	const tabs = (prefix: string) => [
		{
			title: "General",
			children: <ClassicyInput id={`${prefix}-name`} labelTitle="Name" />,
		},
		{
			title: "Sharing",
			children: (
				<ClassicyCheckbox
					id={`${prefix}-share`}
					checked={true}
					label="File Sharing"
				/>
			),
		},
		{ title: "Memory", children: <p>Virtual memory is on.</p> },
	];
	return (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="system7-tabs"
				appId="storybook.app"
				title="Tabs"
				initialSize={[420, 330]}
				initialPosition={[80, 60]}
			>
				<div style={{ padding: "12px" }}>
					<ClassicyTabs tabs={tabs("medium")} />
					<br />
					<ClassicyTabs tabs={tabs("small")} size="small" />
					<br />
					<div style={{ width: "180px" }}>
						<ClassicyTabs tabs={tabs("scroll")} size="small" />
					</div>
				</div>
			</ClassicyWindow>
		</StoryApp>
	);
}

/**
 * The tab control. System 7.5 had none, so this look is invented from
 * System 7's own vocabulary: 1 px black lines on a white face, Chicago, no
 * bevel. Standard, small, and small with scroll arrows.
 */
export const Tabs: Story = {
	render: () => <TabsWindow />,
};

/** The tab control under System 7 Color: drawn the same, black on white. */
export const TabsColor: Story = {
	render: () => themed(true, <TabsWindow />),
};

/** Each Finder window this story opens, and where (Finder's 425 x 300). */
const FINDER_FOLDERS: [string, [number, number]][] = [
	["Macintosh HD", [16, 40]],
	["Macintosh HD:System Folder", [462, 40]],
	["Macintosh HD:System Folder:Control Strip Modules", [16, 356]],
];

/**
 * Finder windows on the startup disk, its System Folder and the Control
 * Strip Modules folder, in icon view (story 0193-801): the derived
 * Applications, Extensions and Control Strip Modules folders, the module
 * files and the seeded folders, which hold the core's icons and draw the
 * package's. The Storybook app gives the Applications folder an entry, so
 * it is derived.
 */
function FinderFolderWindows() {
	const dispatch = useAppManagerDispatch();
	const windowsReady = useAppManager((state) =>
		FINDER_FOLDERS.every(([path]) =>
			hasAppWindow(state.System.Manager.Applications.apps["Finder.app"], path),
		),
	);
	useEffect(() => {
		for (const [path] of FINDER_FOLDERS) {
			dispatch({
				type: "ClassicyAppFinderSetFolderView",
				path,
				viewType: "icons",
			});
			dispatch({ type: "ClassicyAppFinderOpenFolder", path });
		}
	}, [dispatch]);
	useEffect(() => {
		if (!windowsReady) return;
		for (const [path, position] of FINDER_FOLDERS)
			dispatch({
				type: "ClassicyWindowPosition",
				app: { id: "Finder.app" },
				window: { id: path },
				position,
			});
	}, [dispatch, windowsReady]);
	return <StoryApp id="storybook.app" name="Storybook" />;
}

/**
 * The 1-bit folder and file icons in Finder windows, and Finder's disk on
 * the desktop: the `bw` variant of System 7's icons.
 */
export const FinderFolders: Story = {
	render: () => <FinderFolderWindows />,
};

/** The same windows under System 7 Color: the color icons. */
export const FinderFoldersColor: Story = {
	render: () => themed(true, <FinderFolderWindows />),
};

/**
 * The selection rectangle in a Finder window (story 0228-e9l): a drag from
 * the empty space above the startup disk's first icon to the middle of its
 * second, the button still held. System 7 draws the 7.5 Finder's: a one-pixel
 * frame of the 50% checker in XOR.
 */
export const FinderSelectionRectangle: Story = {
	render: () => <FinderFolderWindows />,
	play: dragClassicySelectionRectangle,
};

/** The same rectangle under System 7 Color. */
export const FinderSelectionRectangleColor: Story = {
	render: () => themed(true, <FinderFolderWindows />),
	play: dragClassicySelectionRectangle,
};

/**
 * The rectangle held past the bottom edge of the first window's contents:
 * clipped there, its sides running to the edge.
 */
export const FinderSelectionRectanglePastEdge: Story = {
	render: () => <FinderFolderWindows />,
	play: dragClassicySelectionRectanglePastEdge,
};

/** The list-view window, and the item the story selects in it. */
const FINDER_LIST_FOLDER = "Macintosh HD:System Folder";
const FINDER_LIST_SELECTED = "Extensions";

/**
 * A Finder window in list view with one item selected (story 0197-s0z):
 * the Finder draws a selected item's small icon selected, System 7 Color's
 * through its color table (the package's pre-rendered selected images), and
 * its name inverted.
 */
function FinderListWindow() {
	const dispatch = useAppManagerDispatch();
	const windowReady = useAppManager((state) =>
		hasAppWindow(
			state.System.Manager.Applications.apps["Finder.app"],
			FINDER_LIST_FOLDER,
		),
	);
	useEffect(() => {
		dispatch({
			type: "ClassicyAppFinderSetFolderView",
			path: FINDER_LIST_FOLDER,
			viewType: "list",
		});
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: FINDER_LIST_FOLDER });
	}, [dispatch]);
	useEffect(() => {
		if (!windowReady) return;
		dispatch({
			type: "ClassicyWindowPosition",
			app: { id: "Finder.app" },
			window: { id: FINDER_LIST_FOLDER },
			position: [16, 40],
		});
	}, [dispatch, windowReady]);
	return <StoryApp id="storybook.app" name="Storybook" />;
}

/** Selects the list's item `name` with a click, as the user does. */
const selectListItem = (name: string) =>
	waitFor(
		() => {
			const row = [
				...document.querySelectorAll<HTMLElement>(
					".classicyFileBrowserViewTableRow",
				),
			].find((r) => r.textContent?.includes(name));
			if (!row) throw new Error(`no ${name} row yet`);
			if (row.classList.contains("selected")) return;
			fireEvent.click(row);
			throw new Error(`${name} is not selected yet`);
		},
		{ timeout: 10000 },
	);

/** A Finder list view, an item selected: the 1-bit icons. */
export const FinderListSelected: Story = {
	render: () => <FinderListWindow />,
	play: () => selectListItem(FINDER_LIST_SELECTED),
};

/** The same list under System 7 Color: the selected item's color icon. */
export const FinderListSelectedColor: Story = {
	render: () => themed(true, <FinderListWindow />),
	play: () => selectListItem(FINDER_LIST_SELECTED),
};

const APPEARANCE_TABS = [
	"Themes",
	"Packages",
	"Options",
	"Desktop",
	"Colors",
	"Fonts",
	"Metrics",
	"Sound",
] as const;
type AppearanceTab = (typeof APPEARANCE_TABS)[number];

/**
 * Opens the Appearance Manager (ClassicyDesktop mounts it with the other
 * control panels).
 */
function AppearancePanel() {
	const dispatch = useAppManagerDispatch();
	const icon =
		useClassicyAsset("icons", "controlPanels.appearanceManager.app") ?? "";
	useEffect(() => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: APPEARANCE_MANAGER_APP_ID, name: "Appearance", icon },
		});
	}, [dispatch, icon]);
	return null;
}

/**
 * Chooses the panel's tab `tab`, as a click does (ClassicyTabs chooses on the
 * release), until it shows as chosen: the window may mount more than once as
 * it opens, starting again on the first tab.
 */
const chooseTab = (tab: AppearanceTab) =>
	waitFor(
		() => {
			const button = [
				...document.querySelectorAll<HTMLButtonElement>(".classicyTabButton"),
			].find((b) => b.textContent === tab);
			if (!button) throw new Error(`no ${tab} tab yet`);
			if (button.classList.contains("selected")) return;
			fireEvent.mouseDown(button);
			fireEvent.mouseUp(button);
			throw new Error(`${tab} is not chosen yet`);
		},
		{ timeout: 10000 },
	);

const appearanceStory = (tab: AppearanceTab, color: boolean): Story => ({
	render: () => themed(color, <AppearancePanel />),
	play: () => chooseTab(tab),
});

/** The Appearance Manager (a Mac OS 8 control panel) drawn in System 7's controls: Themes. */
export const AppearanceThemes = appearanceStory("Themes", false);
/** The Appearance Manager under System 7 Color: Themes. */
export const AppearanceThemesColor = appearanceStory("Themes", true);
/** Packages. */
export const AppearancePackages = appearanceStory("Packages", false);
/** Packages, in color. */
export const AppearancePackagesColor = appearanceStory("Packages", true);
/** Options: System 7 declares no knobs. */
export const AppearanceOptions = appearanceStory("Options", false);
/** Options, in color. */
export const AppearanceOptionsColor = appearanceStory("Options", true);
/** Desktop. */
export const AppearanceDesktop = appearanceStory("Desktop", false);
/** Desktop, in color. */
export const AppearanceDesktopColor = appearanceStory("Desktop", true);
/** Colors. */
export const AppearanceColors = appearanceStory("Colors", false);
/** Colors, in color. */
export const AppearanceColorsColor = appearanceStory("Colors", true);
/** Fonts. */
export const AppearanceFonts = appearanceStory("Fonts", false);
/** Fonts, in color. */
export const AppearanceFontsColor = appearanceStory("Fonts", true);
/** Metrics. */
export const AppearanceMetrics = appearanceStory("Metrics", false);
/** Metrics, in color. */
export const AppearanceMetricsColor = appearanceStory("Metrics", true);
/** Sound. */
export const AppearanceSound = appearanceStory("Sound", false);
/** Sound, in color. */
export const AppearanceSoundColor = appearanceStory("Sound", true);

function StartupScreen() {
	resetStartupScreenSession();
	return <ClassicyStartupScreen duration={30000} />;
}

/**
 * The startup screen ("Welcome to Mac OS") over the desktop pattern, as 7.5
 * drew it, not over the flat desktop color.
 */
export const StartupScreenBlackAndWhite: Story = {
	render: () => <StartupScreen />,
};

/** The startup screen under System 7 Color. */
export const StartupScreenColor: Story = {
	render: () => themed(true, <StartupScreen />),
};
