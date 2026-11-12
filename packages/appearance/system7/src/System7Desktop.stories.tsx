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
	ClassicyTabs,
	ClassicyWindow,
	useAppManagerDispatch,
	useClassicyAsset,
} from "@classicy/classicy";
import { StoryApp } from "@sb/helpers";
import { system7Parameters } from "@sb/system7";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactElement, type ReactNode, useEffect } from "react";

const meta = {
	title: "Appearance/System 7/Desktop",
	parameters: system7Parameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Activates one of the package's themes once the desktop has mounted. */
function WithTheme({ id, children }: { id: string; children: ReactNode }) {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: id });
	}, [dispatch, id]);
	return children;
}

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
 * The 1-bit desktop: the 50% checkerboard pattern (System `ppat` 16's
 * pattern), icons with opaque Geneva 9 labels, a selected icon inverted and
 * an opened one filled with the 25% pattern, and the Control Strip.
 */
export const Desktop: Story = {
	render: () => <Icons />,
};

/**
 * The color desktop: the #666666/#AAAAAA checkerboard, a selected icon
 * darkened, an opened one filled with the window color's dark lavender, and
 * the Control Strip in the 7.5 strip's grays.
 */
export const DesktopColor: Story = {
	render: () => themed(true, <Icons />),
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
 * control panels) and, once its window is up, presses the tab `tab`.
 */
function AppearancePanel({ tab }: { tab: AppearanceTab }) {
	const dispatch = useAppManagerDispatch();
	const icon =
		useClassicyAsset("icons", "controlPanels.appearanceManager.app") ?? "";
	useEffect(() => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: APPEARANCE_MANAGER_APP_ID, name: "Appearance", icon },
		});
	}, [dispatch, icon]);
	useEffect(() => {
		// Pressed until it shows as chosen: the window may mount more than
		// once as it opens. A tab is chosen on the release (ClassicyTabs'
		// `onMouseUp`).
		const timer = setInterval(() => {
			const button = [
				...document.querySelectorAll<HTMLButtonElement>(".classicyTabButton"),
			].find((b) => b.textContent === tab);
			if (!button || button.classList.contains("selected")) return;
			for (const type of ["mousedown", "mouseup"])
				button.dispatchEvent(new MouseEvent(type, { bubbles: true }));
		}, 50);
		const stop = setTimeout(() => clearInterval(timer), 2000);
		return () => {
			clearInterval(timer);
			clearTimeout(stop);
		};
	}, [tab]);
	return null;
}

const appearanceStory = (tab: AppearanceTab, color: boolean): Story => ({
	render: () => themed(color, <AppearancePanel tab={tab} />),
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
