import {
	ClassicyAlert,
	ClassicyApp,
	ClassicyWindow,
	useAppManagerDispatch,
} from "@classicy/classicy";
import { useEffect, useState } from "react";

const APP_ID = "ExtensionModalFixture.app";

/**
 * Browser test fixture (story 0233-c79), mounted only with
 * `?fixture=extension-modal`: an `extension` app that opens itself and shows
 * a modal window and an alert, neither with menus. Both must draw in their
 * modal bands above their own scrims, clickable (a floating z-index would
 * bury them). `window.__fixtureClicks` counts the button clicks.
 */
export const ExtensionModalFixture = () => {
	const dispatch = useAppManagerDispatch();
	const [alertOpen, setAlertOpen] = useState(true);
	// biome-ignore lint/correctness/useExhaustiveDependencies: opens once
	useEffect(() => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: APP_ID, name: "Fixture", icon: "" },
		});
	}, []);
	const click = (name: string) => {
		const w = window as unknown as { __fixtureClicks?: string[] };
		w.__fixtureClicks = [...(w.__fixtureClicks ?? []), name];
	};
	return (
		<ClassicyApp id={APP_ID} name="Fixture" icon="" extension>
			<ClassicyWindow
				id="fixture-dialog"
				appId={APP_ID}
				modal
				title="Fixture dialog"
				initialSize={[260, 120]}
				initialPosition={[200, 120]}
			>
				<button type="button" onClick={() => click("dialog")}>
					Fixture OK
				</button>
			</ClassicyWindow>
			{alertOpen && (
				<ClassicyAlert
					id="fixture-alert"
					appId={APP_ID}
					alertType="stop"
					label="Fixture alert"
					buttons={[
						{
							id: "ok",
							label: "Fixture Alert OK",
							onClick: () => click("alert"),
						},
					]}
					onClose={() => setAlertOpen(false)}
				/>
			)}
		</ClassicyApp>
	);
};
