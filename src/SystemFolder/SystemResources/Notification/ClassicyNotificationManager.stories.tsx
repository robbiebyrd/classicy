import smallAppIcon from "@img/icon-16x16.png";
import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type FC, useEffect, useRef, useState } from "react";
import { fn } from "storybook/test";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import {
	type ClassicyNotificationRequest,
	classicyNotify,
	removeClassicyNotification,
	useClassicyNotifications,
} from "./ClassicyNotificationManager";

/**
 * The Notification Manager (Inside Macintosh: Processes, ch. 5): an app or a
 * host asks for the user's attention with `classicyNotify`, from anywhere.
 * The app's name is marked with ◆ in the Application menu, its icon blinks
 * in the menu bar, its sound plays at the alert volume and its alert shows,
 * each as requested; `onResponse` is called after OK.
 */
const meta = {
	title: "Desktop/Notification Manager",
	parameters: desktopParameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const APP_ID = "storybook.mailbox.app";

/**
 * Opens a "Mailbox" app, puts the Finder in front, then posts `request` for
 * the Mailbox, as a background app would; the request is removed when the
 * story unmounts. With `openMenu`, the Application menu is opened after.
 */
const BackgroundRequest: FC<{
	request: Omit<ClassicyNotificationRequest, "appId">;
	openMenu?: boolean;
}> = ({ request, openMenu = false }) => {
	const dispatch = useAppManagerDispatch();
	const requestRef = useRef(request);
	useEffect(() => {
		let id = "";
		const timer = window.setTimeout(() => {
			dispatch({ type: "ClassicyAppFocus", app: { id: "Finder.app" } });
			id = classicyNotify({ ...requestRef.current, appId: APP_ID });
			if (openMenu) {
				window.setTimeout(
					() =>
						document.querySelector<HTMLElement>("#app-switcher > p")?.click(),
					100,
				);
			}
		}, 300);
		return () => {
			window.clearTimeout(timer);
			if (id) removeClassicyNotification(id);
		};
	}, [dispatch, openMenu]);
	return <StoryApp id={APP_ID} name="Mailbox" icon={smallAppIcon} />;
};

/**
 * A background app's full request: the ◆ beside "Mailbox" in the
 * Application menu, its icon alternating with the Application menu's once a
 * second (steady for users who prefer reduced motion), the user's alert
 * sound, and a note alert with an OK button (Figure 5-2). The mark and the
 * icon stay after OK, until the Mailbox comes to the front.
 */
export const BackgroundApp: Story = {
	render: () => (
		<BackgroundRequest
			request={{
				message: "Mailbox has received 3 new messages.",
				sound: true,
				onResponse: fn(),
			}}
		/>
	),
};

/**
 * The suggested default (Inside Macintosh, p. 5-5, level 2): the mark and
 * the blinking icon, no sound and no alert. The Application menu is open,
 * showing the ◆ in the mark column, where the Finder's check is.
 */
export const MarkInApplicationMenu: Story = {
	render: () => <BackgroundRequest request={{}} openMenu />,
};

/**
 * A request with `mark: false` blinks its icon over the Apple menu instead,
 * as one from a desk accessory or a driver did (p. 5-4).
 */
export const IconOverAppleMenu: Story = {
	render: () => <BackgroundRequest request={{ mark: false }} />,
};

const PlaygroundWindow = () => {
	const notifications = useClassicyNotifications();
	const [delay, setDelay] = useState(false);
	const post = (request: Omit<ClassicyNotificationRequest, "appId">) => {
		const send = () => classicyNotify({ ...request, appId: APP_ID });
		if (delay) window.setTimeout(send, 3000);
		else send();
	};
	// Take this story's requests down when it unmounts.
	const posted = useRef(notifications);
	posted.current = notifications;
	useEffect(
		() => () => {
			for (const n of posted.current)
				if (n.appId === APP_ID) removeClassicyNotification(n.id);
		},
		[],
	);
	return (
		<ClassicyWindow
			id="playground"
			appId={APP_ID}
			title="Notification Manager"
			initialSize={[340, 230]}
			initialPosition={[80, 60]}
		>
			<div
				style={{
					padding: "1em",
					display: "flex",
					flexDirection: "column",
					gap: "0.5em",
				}}
			>
				<label>
					<input
						type="checkbox"
						checked={delay}
						onChange={(e) => setDelay(e.target.checked)}
					/>{" "}
					Post 3 seconds later (switch to the Finder meanwhile)
				</label>
				<ClassicyButton onClickFunc={() => post({})}>
					Mark and icon
				</ClassicyButton>
				<ClassicyButton
					onClickFunc={() =>
						post({ sound: true, message: "Your download is complete." })
					}
				>
					Sound and alert
				</ClassicyButton>
				<ClassicyButton onClickFunc={() => post({ mark: false })}>
					Icon over the Apple menu
				</ClassicyButton>
				<p>Installed requests: {notifications.length}</p>
			</div>
		</ClassicyWindow>
	);
};

/**
 * Post requests from a window. A request for this app is removed when it
 * comes to the front, so check "Post 3 seconds later" and bring the Finder
 * forward to see a background app's mark and icon.
 */
export const Playground: Story = {
	render: () => (
		<StoryApp id={APP_ID} name="Mailbox" icon={smallAppIcon}>
			<PlaygroundWindow />
		</StoryApp>
	),
};
