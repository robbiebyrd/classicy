import { type FC, useContext, useEffect, useState } from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import {
	ClassicyDefaultFileSystemContext,
	resolveDefaultFileSystem,
	useClassicyFileSystem,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import {
	isDriveSyncConnected,
	resetDriveInTree,
} from "./ClassicyDriveSetupUtils";

const APP_ID = "DriveSetup.app";

type Feedback = { label: string; message: string; type: "note" | "stop" };

export const DriveSetupController: FC = () => {
	const dispatch = useAppManagerDispatch();
	const fs = useClassicyFileSystem();
	const { defaultFileSystem, mode } = useContext(
		ClassicyDefaultFileSystemContext,
	);

	const requestId = useAppManager(
		(s) => s.System.Manager.Desktop.driveSetupRequestId ?? 0,
	);

	const [pendingInitialize, setPendingInitialize] = useState<string | null>(
		null,
	);
	const [feedback, setFeedback] = useState<Feedback | null>(null);

	// Consume each new request exactly once, keyed on the monotonic id.
	// biome-ignore lint/correctness/useExhaustiveDependencies: requestId is the intentional trigger; the request itself is read fresh via getState
	useEffect(() => {
		if (requestId === 0) return;
		const request =
			useAppManager.getState().System.Manager.Desktop.driveSetupRequest;
		if (!request) return;
		dispatch({ type: "ClassicyDesktopDriveSetupClearRequest" });

		if (request.action === "initialize") {
			setPendingInitialize(request.drive);
			return;
		}
		if (!isDriveSyncConnected()) {
			// Sync/Backup need a registered filesystem adapter ("logged in").
			// The window buttons and drive-icon menu items are disabled when
			// disconnected, but a directly dispatched event can still land here —
			// tell the user rather than silently doing nothing.
			setFeedback({
				label: "Not connected",
				message:
					"No server is configured. Log in to sync or back up your files.",
				type: "stop",
			});
			return;
		}
		if (request.action === "sync") {
			void fs
				.reconcileWithAdapters()
				.then((replaced) => {
					if (replaced) {
						dispatch({ type: "ClassicyDesktopFileSystemVersionBump" });
					}
					setFeedback({
						label: "Sync complete",
						message: replaced
							? "The filesystem was updated from the server."
							: "The filesystem is already up to date.",
						type: "note",
					});
				})
				.catch(() =>
					setFeedback({
						label: "Sync failed",
						message:
							"Could not sync from the server. Your local data is unchanged.",
						type: "stop",
					}),
				);
		} else if (request.action === "backup") {
			fs.flushNow();
			setFeedback({
				label: "Backup complete",
				message: "The filesystem was pushed to the server.",
				type: "note",
			});
		}
	}, [requestId]);

	const confirmInitialize = () => {
		const drive = pendingInitialize;
		setPendingInitialize(null);
		if (!drive) return;
		const resolved = resolveDefaultFileSystem(defaultFileSystem, mode);
		const currentTree = JSON.parse(fs.snapshot());
		const nextTree = resetDriveInTree(currentTree, drive, resolved);
		fs.load(JSON.stringify(nextTree));
		fs.flushNow();
		window.location.reload();
	};

	return (
		<>
			{pendingInitialize ? (
				<div className="classicyDesktopDialogOverlay">
					<ClassicyAlert
						id="drive_setup_initialize"
						appId={APP_ID}
						alertType="caution"
						label="Initialize this disk?"
						message={`Initializing “${pendingInitialize}” will erase all data on it. This cannot be undone.`}
						defaultButtonId="cancel"
						buttons={[
							{ id: "cancel", label: "Cancel", role: "cancel" },
							{
								id: "initialize",
								label: "Initialize",
								role: "normal",
								onClick: confirmInitialize,
							},
						]}
						onClose={() => setPendingInitialize(null)}
					/>
				</div>
			) : null}
			{feedback ? (
				<div className="classicyDesktopDialogOverlay">
					<ClassicyAlert
						id="drive_setup_feedback"
						appId={APP_ID}
						alertType={feedback.type}
						label={feedback.label}
						message={feedback.message}
						buttons={[{ id: "ok", label: "OK", role: "default" }]}
						onClose={() => setFeedback(null)}
					/>
				</div>
			) : null}
		</>
	);
};
