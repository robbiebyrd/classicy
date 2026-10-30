import { desktopParameters, SB_ICON, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { fn } from "storybook/test";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyApp } from "./ClassicyApp";

const meta = {
	title: "Desktop/App",
	component: ClassicyApp,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyApp>;

export default meta;
// Every story here draws the component itself in `render` and ignores the
// args, so the stories are typed against the component (every arg optional),
// not `typeof meta`, which would demand its required props as story args.
type Story = StoryObj<typeof ClassicyApp>;

/**
 * One open app with two document windows. Clicking a window focuses it and
 * brings it to the front, while the other takes the inactive (dimmed)
 * treatment. Both belong to one app, with one App Switcher entry.
 */
export const TwoWindows: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="doc1"
				appId="storybook.app"
				title="Document 1"
				initialSize={[360, 240]}
				initialPosition={[60, 60]}
			>
				<p style={{ padding: "1em" }}>First document window.</p>
			</ClassicyWindow>
			<ClassicyWindow
				id="doc2"
				appId="storybook.app"
				title="Document 2"
				initialSize={[360, 240]}
				initialPosition={[160, 140]}
			>
				<p style={{ padding: "1em" }}>
					Second document window — click to focus.
				</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

/**
 * A closed app as it first appears: only its desktop icon, an `app_shortcut`
 * drawn with the alias arrow and an italic label. Rest the pointer on it for
 * the `desktopIconBalloonHelp` balloon; double-click it to open the app, which
 * renders its children.
 */
export const DesktopIcon: Story = {
	render: () => (
		<ClassicyApp
			id="tv.app"
			name="TV"
			icon={SB_ICON}
			desktopIconBalloonHelp="Double-click to watch TV."
		>
			<ClassicyWindow
				id="main"
				appId="tv.app"
				title="TV"
				initialSize={[320, 200]}
				initialPosition={[120, 80]}
			>
				<p style={{ padding: "1em" }}>The app opened from its icon.</p>
			</ClassicyWindow>
		</ClassicyApp>
	),
};

const AppWithContextMenu = () => {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "menus.app", name: "Menus", icon: SB_ICON },
		});
	}, [dispatch]);
	return (
		<ClassicyApp
			id="menus.app"
			name="Menus"
			icon={SB_ICON}
			contextMenu={[
				{ id: "about-menus", title: "About Menus…", onClickFunc: fn() },
			]}
		>
			<ClassicyWindow
				id="plain"
				appId="menus.app"
				title="Uses the App Menu"
				initialSize={[320, 160]}
				initialPosition={[60, 60]}
			>
				<p style={{ padding: "1em" }}>
					No window menu: right-click shows the app&apos;s.
				</p>
			</ClassicyWindow>
			<ClassicyWindow
				id="own"
				appId="menus.app"
				title="Has Its Own Menu"
				initialSize={[320, 160]}
				initialPosition={[200, 200]}
				contextMenu={[
					{ id: "window-only", title: "Window Command", onClickFunc: fn() },
				]}
			>
				<p style={{ padding: "1em" }}>
					This window&apos;s own menu wins over the app&apos;s.
				</p>
			</ClassicyWindow>
		</ClassicyApp>
	);
};

/**
 * The app-level `contextMenu` is the fallback for windows without their own:
 * right-click each window to compare. Resolution is innermost-first — control
 * target, then window, then app.
 */
export const AppContextMenu: Story = {
	render: () => <AppWithContextMenu />,
};
