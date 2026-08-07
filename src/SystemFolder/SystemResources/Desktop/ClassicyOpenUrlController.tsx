import { type FC, useEffect } from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

/**
 * Performs the browser-side half of ClassicyDesktopOpenUrl.
 *
 * Reducers are pure, so window.open and location.assign cannot run inside one.
 * This consumes each request exactly once, keyed on the monotonic
 * openUrlRequestId — the same rail DriveSetupController uses. The id rather
 * than the payload is the trigger, so opening the same shortcut twice in a row
 * still opens two tabs.
 *
 * Unlike DriveSetupController, which lives inside the Drive Setup control panel
 * and only runs while that panel is mounted, this must be mounted for the whole
 * session: a shortcut can be opened at any time.
 */
export const ClassicyOpenUrlController: FC = () => {
	const dispatch = useAppManagerDispatch();
	const requestId = useAppManager(
		(s) => s.System.Manager.Desktop.openUrlRequestId ?? 0,
	);

	// requestId is the intentional trigger; the request itself is read fresh via
	// getState rather than subscribed to, so the deps below are already complete.
	useEffect(() => {
		if (requestId === 0) return;
		const request =
			useAppManager.getState().System.Manager.Desktop.openUrlRequest;
		if (!request) return;
		dispatch({ type: "ClassicyDesktopClearOpenUrlRequest" });

		if (request.disposition === "browser-new") {
			// noopener matters: without it the new tab keeps a live
			// window.opener handle back into the desktop.
			window.open(request.url, "_blank", "noopener,noreferrer");
			return;
		}
		window.location.assign(request.url);
	}, [requestId, dispatch]);

	return null;
};
