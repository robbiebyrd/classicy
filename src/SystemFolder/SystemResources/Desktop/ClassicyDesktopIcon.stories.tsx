import { desktopParameters, SB_ICON } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { fn } from "storybook/test";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopIcon } from "./ClassicyDesktopIcon";

const meta = {
	title: "Desktop/DesktopIcon",
	component: ClassicyDesktopIcon,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyDesktopIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

const AddIcon = () => {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({
			type: "ClassicyDesktopIconAdd",
			app: { id: "storybook.app", name: "Storybook", icon: SB_ICON },
			kind: "icon",
		});
	}, [dispatch]);
	return null;
};

/**
 * A plain (non-alias) icon added with `ClassicyDesktopIconAdd`; the desktop
 * renders one `ClassicyDesktopIcon` per icon record. Click to select, drag to
 * move, double-click to open the app. Kind `icon` gets no alias arrow and no
 * stock balloon.
 */
export const Default: Story = {
	render: () => <AddIcon />,
};

const AddIconWithBalloonHelp = () => {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({
			type: "ClassicyDesktopIconAdd",
			app: { id: "storybook.app", name: "Storybook", icon: SB_ICON },
			kind: "app_shortcut",
			balloonHelp: {
				title: "Storybook",
				content: "Rest the pointer here to see balloon help.",
				delay: 300,
			},
		});
	}, [dispatch]);
	return null;
};

/**
 * An icon with explicit `balloonHelp` and a short 300 ms delay: rest the
 * pointer on it. Without `balloonHelp`, only the Trash and drive icons show a
 * (stock) balloon. Balloons follow Help › Show/Hide Balloons.
 */
export const WithBalloonHelp: Story = {
	render: () => <AddIconWithBalloonHelp />,
};

const AddAliasIcon = () => {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({
			type: "ClassicyDesktopIconAdd",
			app: { id: "storybook.app", name: "Storybook", icon: SB_ICON },
			kind: "app_shortcut",
		});
	}, [dispatch]);
	return null;
};

/**
 * Alias badging: an `app_shortcut` icon — what every `ClassicyApp` registers —
 * draws the Mac OS 8 alias arrow over its bottom-left corner and italicizes its
 * label. The badge follows the selected and open states with the icon.
 */
export const Alias: Story = {
	render: () => <AddAliasIcon />,
};

const AddWebShortcutIcon = () => {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({
			type: "ClassicyDesktopIconAdd",
			app: {
				id: "shortcut_example",
				name: "Example Site",
				icon: ClassicyIcons.applications.internetExplorer.documentShortcut,
			},
			kind: "shortcut",
			noLaunch: true,
			event: "ClassicyDesktopOpenUrl",
			eventData: {
				url: "https://example.com/",
				disposition: "classicy",
			},
		});
	}, [dispatch]);
	return null;
};

/**
 * A web shortcut: a `shortcut` icon (alias-badged) with `noLaunch`, so opening
 * it runs only its `event` — here `ClassicyDesktopOpenUrl`, which opens the
 * page in the Web Viewer instead of launching an app.
 */
export const WebShortcut: Story = {
	render: () => <AddWebShortcutIcon />,
};

const AddIconWithContextMenu = () => {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({
			type: "ClassicyDesktopIconAdd",
			app: { id: "storybook.app", name: "Storybook", icon: SB_ICON },
			kind: "app_shortcut",
			contextMenu: [
				{ id: "open", title: "Open", onClickFunc: fn() },
				{ id: "get-info", title: "Get Info", onClickFunc: fn() },
			],
		});
	}, [dispatch]);
	return null;
};

/**
 * An icon with its own `contextMenu`. Right-clicking selects the icon and
 * opens the menu, with the HIG's Help item placed first; an icon without one
 * shows nothing.
 */
export const WithContextMenu: Story = {
	render: () => <AddIconWithContextMenu />,
};
