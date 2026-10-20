import type { FC as FunctionalComponent } from "react";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import type { ClassicyDesktopSystemDialog } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/** Window ids of the Special menu's alerts (they focus like windows). */
export const SYSTEM_DIALOG_WINDOW_IDS: Record<
	ClassicyDesktopSystemDialog,
	string
> = {
	emptyTrash: "empty_trash",
	resetPram: "reset_pram",
};

/**
 * The Finder's Special menu: Empty Trash… and, below it, Reset PRAM… — each
 * opens its confirmation alert, which `ClassicyDesktop` draws. Shared by the
 * desktop's menu bar and every Finder window's, so the commands are there
 * whichever has focus. `idPrefix` keeps the item ids unique per menu bar.
 */
export const classicySpecialMenuItems = (
	dispatch: (action: ActionMessage) => void,
	idPrefix: string,
): ClassicyMenuItem[] => [
	{
		id: `${idPrefix}_special_empty_trash`,
		title: "Empty Trash…",
		onClickFunc: () => {
			dispatch({
				type: "ClassicyDesktopShowSystemDialog",
				dialog: "emptyTrash",
			});
		},
	},
	{ id: "spacer" },
	{
		id: `${idPrefix}_special_reset_pram`,
		title: "Reset PRAM…",
		onClickFunc: () => {
			dispatch({
				type: "ClassicyDesktopShowSystemDialog",
				dialog: "resetPram",
			});
		},
	},
];

type ClassicyEmptyTrashAlertProps = {
	/** Items directly in the Trash. */
	itemCount: number;
	/** Remove them for good (called after the user confirms). */
	onEmpty: () => void;
	/** Close the alert (after either button). */
	onClose: () => void;
};

/**
 * The warning before the Trash is emptied, worded as in Mac OS 8: how much
 * is in the Trash, and that removing it is permanent. An empty Trash gets a
 * plain note instead.
 */
export const ClassicyEmptyTrashAlert: FunctionalComponent<
	ClassicyEmptyTrashAlertProps
> = ({ itemCount, onEmpty, onClose }) => {
	if (itemCount === 0) {
		return (
			<ClassicyAlert
				id={SYSTEM_DIALOG_WINDOW_IDS.emptyTrash}
				appId={"Finder.app"}
				alertType={"note"}
				label={"The Trash is empty."}
				buttons={[{ id: "ok", label: "OK", role: "default" }]}
				onClose={onClose}
			/>
		);
	}
	const items = itemCount === 1 ? "1 item" : `${itemCount} items`;
	return (
		<ClassicyAlert
			id={SYSTEM_DIALOG_WINDOW_IDS.emptyTrash}
			appId={"Finder.app"}
			alertType={"caution"}
			label={`The Trash contains ${items}. Are you sure you want to permanently remove ${itemCount === 1 ? "it" : "these items"}?`}
			message={"You can’t undo this action."}
			defaultButtonId={"ok"}
			buttons={[
				{ id: "cancel", label: "Cancel", role: "cancel" },
				{ id: "ok", label: "OK", role: "default", onClick: onEmpty },
			]}
			onClose={onClose}
		/>
	);
};
