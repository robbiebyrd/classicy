import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const EXTENSION_ID = "ExtensionModalStory.app";

declare global {
	interface Window {
		/** Button clicks of the story's dialogs, for the browser check. */
		__storyClicks?: string[];
	}
}

const click = (name: string) => {
	window.__storyClicks = [...(window.__storyClicks ?? []), name];
};

const ExtensionModal = () => {
	const dispatch = useAppManagerDispatch();
	const [alertOpen, setAlertOpen] = useState(true);
	// biome-ignore lint/correctness/useExhaustiveDependencies: opens once
	useEffect(() => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: EXTENSION_ID, name: "Extension", icon: "" },
		});
	}, []);
	return (
		<>
			<StoryApp id="storybook.app" name="Storybook">
				<ClassicyWindow
					id="front-window"
					appId="storybook.app"
					title="Front application"
					initialSize={[320, 0]}
					initialPosition={[40, 60]}
					scrollable={false}
				>
					<p>An ordinary application's window.</p>
				</ClassicyWindow>
			</StoryApp>
			<ClassicyApp id={EXTENSION_ID} name="Extension" icon="" extension>
				<ClassicyWindow
					id="extension-dialog"
					appId={EXTENSION_ID}
					modal
					title="Extension dialog"
					initialSize={[260, 120]}
					initialPosition={[120, 140]}
				>
					<button type="button" onClick={() => click("dialog")}>
						Dialog OK
					</button>
				</ClassicyWindow>
				{alertOpen && (
					<ClassicyAlert
						id="extension-alert"
						appId={EXTENSION_ID}
						alertType="stop"
						label="Extension alert"
						buttons={[
							{ id: "ok", label: "Alert OK", onClick: () => click("alert") },
						]}
						onClose={() => setAlertOpen(false)}
					/>
				)}
			</ClassicyApp>
		</>
	);
};

const meta = {
	title: "Desktop/Extension modal",
	parameters: desktopParameters,
	// Not an `extension` app's usual job: it shows that a modal window or alert
	// of an extension (no menus) keeps its modal bands above its own scrim,
	// clickable, as an ordinary app's does (they never float like Apple Guide's
	// windows). The browser check clicks both buttons.
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** An extension's modal dialog and alert over an ordinary app's window. */
export const OverFrontApp: Story = {
	render: () => <ExtensionModal />,
};
