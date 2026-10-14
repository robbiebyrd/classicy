import "./ClassicyKeyboardEquivalent.scss";
import { type FC as FunctionalComponent, useState } from "react";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import {
	ClassicyKeyboardEquivalentDialog,
	type ClassicyKeyboardEquivalentDialogProps,
} from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentDialog";
import { spellKeyboardEquivalent } from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentRules";

export type ClassicyKeyboardEquivalentFieldProps = Omit<
	ClassicyKeyboardEquivalentDialogProps,
	"id" | "initialValue" | "current" | "onConfirm" | "onCancel"
> & {
	id: string;
	/** Group-box title. */
	label?: string;
	/** The current keyboard equivalent, in any form `parseKeyboardShortcut` reads. */
	value?: string;
	/** Called with the newly defined equivalent, in display form ("⌃⌘S"). */
	onChange: (shortcut: string) => void;
	/** Label of the button that opens the dialog. */
	buttonLabel?: string;
	disabled?: boolean;
};

/**
 * A user-definable keyboard equivalent (HIGOS8 Ch.6 "Keyboard Equivalent
 * Support", p.120, Figure 6-8): the current equivalent displayed in a group
 * box with a button for redefining it. The button opens
 * ClassicyKeyboardEquivalentDialog; a confirmed combination is handed to
 * `onChange`, and the field shows whatever `value` it is given back.
 *
 * Pass the owning app's id as `appId`: the dialog is a window of that app, and
 * only an open app's windows are positioned (and centred) by the store.
 */
export const ClassicyKeyboardEquivalentField: FunctionalComponent<
	ClassicyKeyboardEquivalentFieldProps
> = ({
	id,
	label = "Current keyboard equivalent",
	value = "",
	onChange,
	buttonLabel = "Change keyboard equivalent…",
	disabled = false,
	...dialogProps
}) => {
	const [editing, setEditing] = useState(false);

	return (
		<ClassicyControlGroup label={label}>
			<div className="classicyKeyboardEquivalentField">
				<output
					id={`${id}-value`}
					className="classicyKeyboardEquivalentDisplay"
					aria-label={label}
				>
					{spellKeyboardEquivalent(value) || " "}
				</output>
				<ClassicyButton
					id={id}
					disabled={disabled}
					onClickFunc={() => setEditing(true)}
				>
					{buttonLabel}
				</ClassicyButton>
			</div>
			{editing && (
				<ClassicyKeyboardEquivalentDialog
					{...dialogProps}
					id={`${id}-dialog`}
					initialValue={value}
					current={value}
					onConfirm={(shortcut) => {
						setEditing(false);
						onChange(shortcut);
					}}
					onCancel={() => setEditing(false)}
				/>
			)}
		</ClassicyControlGroup>
	);
};
