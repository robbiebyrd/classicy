import { desktopParameters, SB_ICON, StoryApp } from "@sb/helpers";
import { renamedParameters } from "@sb/renamed";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef } from "react";
import { fn } from "storybook/test";
import { useClassicyAppIdentity } from "@/Appearance/ClassicyAppIdentity";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { hasAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { MoviePlayerAppInfo } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils";
import {
	registerClassicyControlStripModule,
	unregisterClassicyControlStripModule,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
// Side effect: registers Movie Player's manifest and reducer, as a host's
// `import "classicy"` does, so its documents open and its description is
// the balloon fallback. Storybook's graph does not otherwise import it
// (story 0097-p8k tracks the general fix).
import "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
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

const APPLICATIONS_FOLDER = "Macintosh HD:Applications";

/** A Control Strip module the host app owns, so its label follows the app. */
const TV_CONTROL_STRIP_MODULE_ID = "storybook-tv";

/**
 * A movie for Movie Player to open, so it has a focused window publishing
 * its menus (and with them the Apple menu's About item). Opened as audio:
 * the window draws only the controller, never a video frame. Relative, so it
 * resolves under any Storybook base path (`staticDirs` serves /assets).
 */
const SAMPLE_MOVIE = {
	url: "assets/vid/quicktime/sample.mp4",
	name: "Sample",
	type: "audio",
} as const;

const RenamedByPackageDesktop = () => {
	const dispatch = useAppManagerDispatch();
	// A host app opts its own window into the package's identity the way the
	// bundled control panels do: the title and proxy icon are the display
	// identity, resolved at render, never stored.
	const tv = useClassicyAppIdentity("TV.app", { name: "TV", icon: SB_ICON });
	// Both windows register (and take focus) on mount, so Movie Player is
	// opened, and focused, only once they have.
	const windowsReady = useAppManager((state) => {
		const { apps } = state.System.Manager.Applications;
		return (
			hasAppWindow(apps["TV.app"], "main") &&
			hasAppWindow(apps["Finder.app"], APPLICATIONS_FOLDER)
		);
	});
	const moviePlayerOpened = useRef(false);

	useEffect(() => {
		// Owned by TV.app, so the strip, its control panel and the Control
		// Strip Modules folder show it under the app's display name.
		registerClassicyControlStripModule({
			id: TV_CONTROL_STRIP_MODULE_ID,
			appId: "TV.app",
			label: "TV",
			icon: SB_ICON,
			menuItems: [
				{
					id: "storybook-tv-channel",
					title: "Channel 8",
					disabled: true,
					className: "classicyControlStripStatus",
				},
			],
		});
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "TV.app", name: "TV", icon: SB_ICON },
		});
		dispatch({
			type: "ClassicyAppFinderOpenFolder",
			path: APPLICATIONS_FOLDER,
		});
		return () => {
			unregisterClassicyControlStripModule(TV_CONTROL_STRIP_MODULE_ID);
		};
	}, [dispatch]);

	useEffect(() => {
		if (!windowsReady || moviePlayerOpened.current) return;
		moviePlayerOpened.current = true;
		// Movie Player on the desktop too (a bundled app registers a hidden
		// icon): with no balloon of its own, its icon's balloon is the
		// package's `description` override.
		dispatch({
			type: "ClassicyDesktopIconAdd",
			app: MoviePlayerAppInfo,
			kind: "app_shortcut",
		});
		dispatch({ type: "ClassicyAppOpen", app: MoviePlayerAppInfo });
		dispatch({
			type: "ClassicyAppMoviePlayerOpenDocument",
			document: SAMPLE_MOVIE,
		});
	}, [dispatch, windowsReady]);

	return (
		<ClassicyApp
			id="TV.app"
			name="TV"
			icon={SB_ICON}
			showDesktopIcon
			addSystemMenu
			desktopIconBalloonHelp="Double-click to watch TV."
		>
			<ClassicyWindow
				id="main"
				appId="TV.app"
				title={tv.name}
				icon={tv.icon}
				initialSize={[300, 160]}
				initialPosition={[420, 400]}
			>
				<p style={{ padding: "1em" }}>Now playing on channel 8.</p>
			</ClassicyWindow>
		</ClassicyApp>
	);
};

/**
 * Under the Storybook-only `renamed` package, Movie Player is 'Media Player'
 * with its own icon (menu bar, App Switcher, Applications) and the host app
 * TV.app is 'Television' on the desktop. Switch the package back in the
 * Appearance control panel and every name and icon returns.
 *
 * Movie Player has a document open and focused, so the Apple menu offers
 * "About Media Player" and its About box; its desktop icon's balloon is the
 * package's description. The TV window titles itself with
 * `useClassicyAppIdentity`, as the bundled control panels do, so its title
 * and proxy icon follow the package too, and TV.app's Control Strip module
 * is labeled "Television" in the strip and its control panel. Persisted
 * state never changes: records, menus and the file system keep the apps'
 * own names.
 */
export const RenamedByPackage: Story = {
	parameters: renamedParameters,
	render: () => <RenamedByPackageDesktop />,
};
