import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import "./ClassicyRadioInput.scss";
import classNames from "classnames";
import { type FC as FunctionalComponent, useEffect, useState } from "react";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

type ClassicyRadioInputProps = {
	/** Shared native `name` for every button in the group. */
	name: string;
	/** Optional group title shown beside the buttons (e.g. "Mouse Speed:"). */
	label?: string;
	/** Size of the group title. Defaults to `medium`. */
	labelSize?: ClassicyControlLabelSize;
	/** Where the group title sits relative to the buttons. Defaults to `above`. */
	labelPosition?: ClassicyLabelPosition;
	/**
	 * Button layout: `columns` stacks the buttons in one vertical column;
	 * `rows` lays them out side by side in one row. Defaults to `columns`.
	 */
	align?: "rows" | "columns";
	/**
	 * Disables the whole group: the title and every button are dimmed, and no
	 * button can be selected by mouse or keyboard. Combines with each entry's
	 * own `disabled`. Defaults to `false`.
	 */
	disabled?: boolean;
	/** Called with the `id` of the button the user turns on. */
	onClickFunc?: (id: string) => void;
	/**
	 * The buttons, in order. The last entry with `checked: true` starts on; if
	 * none is, the first button does. Passing a new array re-applies that rule.
	 */
	inputs: ClassicyRadioInputValueProps[];
};

type ClassicyRadioInputValueProps = {
	/** DOM id and value of this button; also what `onClickFunc` receives. */
	id: string;
	/** Starts this button on. */
	checked?: boolean;
	/** Draws the mixed-state dash (a selection spanning several values). */
	mixed?: boolean;
	/** Rings the button in the theme accent colour while on or pressed. */
	isDefault?: boolean;
	/** Dims this button and its label and ignores clicks. */
	disabled?: boolean;
	/** Text label; clicking it selects the button. */
	label?: string;
};

// HIGOS8 Ch.2 "Radio Buttons" (p.24): a radio group always has exactly one
// button on. When no input is pre-marked, fall back to the first button so the
// group is never rendered with zero selection. Presentational only — selecting
// the fallback does not dispatch onClickFunc, matching the prior mount behavior.
const initialRadioCheck = (list: ClassicyRadioInputValueProps[]): string =>
	list.findLast((input) => input.checked === true)?.id ?? list[0]?.id ?? "";

/**
 * A Platinum radio-button group (HIGOS8 Ch.2 "Radio Buttons", p.24) — use it
 * instead of raw `<input type="radio">` elements. One component renders the
 * whole group from `inputs`, sharing one `name`, and keeps exactly one button
 * on, as the HIG requires: if no entry is `checked` the first one starts on.
 * Radio buttons choose a setting; they never start an action.
 *
 * Clicking a button or its label turns it on, plays the radio click sounds,
 * reports to analytics and calls `onClickFunc` with that entry's `id`. The
 * selection is held internally and re-derived from `inputs` whenever a new
 * array is passed: keep `inputs` stable (memoised) or rebuild it with the
 * current `checked` flags, since a fresh inline array on every parent render
 * resets the user's choice. For button-shaped radios (a palette or toolbar)
 * use `ClassicyBevelButton mode="radio"`.
 *
 * ```tsx
 * <ClassicyRadioInput
 *     name="speed"
 *     label="Mouse Speed"
 *     inputs={[
 *         { id: "slow", label: "Slow" },
 *         { id: "fast", label: "Fast", checked: true },
 *     ]}
 *     onClickFunc={setSpeed}
 * />
 * ```
 */
export const ClassicyRadioInput: FunctionalComponent<
	ClassicyRadioInputProps
> = ({
	name,
	label,
	labelSize = "medium",
	labelPosition = "above",
	align = "columns",
	disabled = false,
	onClickFunc,
	inputs,
}) => {
	const [check, setCheck] = useState<string>(() => initialRadioCheck(inputs));
	useEffect(() => {
		setCheck(initialRadioCheck(inputs));
	}, [inputs]);
	const player = useSoundDispatch();

	const { track } = useClassicyAnalytics();
	const analyticsArgs = { name, label, disabled, inputs };

	const handleOnChange = (id: string) => {
		setCheck(id);
		track("selected", {
			type: "ClassicyRadioInput",
			itemId: id,
			...analyticsArgs,
		});
		if (onClickFunc) {
			onClickFunc(id);
		}
	};

	// The group is a radiogroup named by its title (#310); a <label for> can't
	// name a group, and no element has the group's name as its id.
	const titleId = label ? `${name}_label` : undefined;
	const group = (
		<div
			role="radiogroup"
			aria-labelledby={titleId}
			aria-disabled={disabled || undefined}
			className={classNames(
				"classicyRadioInputGroup",
				align === "columns" ? "classicyRadioInputGroupColumns" : "",
			)}
		>
			{inputs?.map((item) => {
				const itemDisabled = disabled || item.disabled === true;
				return (
					<div key={name + item.id} className={"classicyRadioInputMargin"}>
						<div
							className={classNames(
								"classicyRadioInputWrapper",
								classicyStateClasses({
									checked: check === item.id,
									disabled: itemDisabled,
								}),
							)}
						>
							<input
								id={item.id}
								name={name}
								disabled={itemDisabled}
								className={classNames(
									"classicyRadioInput",
									classicyStateClasses({
										default: item.isDefault,
										mixed: item.mixed,
									}),
								)}
								type={"radio"}
								value={item.id}
								// Controlled from `check` so the native checked state matches
								// the visual ring (and the group always has exactly one on).
								checked={check === item.id}
								tabIndex={0}
								onChange={() => !itemDisabled && handleOnChange(item.id)}
								onMouseDown={() => {
									if (itemDisabled) return;
									track("click", {
										type: "ClassicyRadioInput",
										itemId: item.id,
										...analyticsArgs,
									});
									player({
										type: "ClassicySoundPlay",
										sound: "ClassicyInputRadioClickDown",
									});
								}}
								onMouseUp={() => {
									if (itemDisabled) return;
									player({
										type: "ClassicySoundPlay",
										sound: "ClassicyInputRadioClickUp",
									});
								}}
							/>
						</div>
						<ClassicyControlLabel
							labelFor={item.id}
							disabled={itemDisabled}
							label={item.label}
							onMouseDown={() => {
								if (itemDisabled) return;
								track("click", {
									type: "ClassicyRadioInput",
									itemId: item.id,
									...analyticsArgs,
								});
								player({
									type: "ClassicySoundPlay",
									sound: "ClassicyInputRadioClickDown",
								});
							}}
							onMouseUp={() => {
								if (itemDisabled) return;
								player({
									type: "ClassicySoundPlay",
									sound: "ClassicyInputRadioClickUp",
								});
							}}
						/>
					</div>
				);
			})}
		</div>
	);

	if (!label) return group;

	return (
		<div className={labelPositionClass(labelPosition)}>
			<ClassicyControlLabel
				id={titleId}
				disabled={disabled}
				labelSize={labelSize}
				label={label}
			/>
			{group}
		</div>
	);
};
