import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import "./ClassicyPopUpMenu.scss";
import classNames from "classnames";
import {
	type ChangeEvent,
	type FC as FunctionalComponent,
	useEffect,
	useState,
} from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

const PLACEHOLDER_VALUE = "__classicy_placeholder__";

export type ClassicyPopUpMenuSize = ClassicyControlLabelSize | "mini";

type classicyPopUpMenuOptions = {
	value: string;
	label: string;
	icon?: string;
};

type classicyPopUpMenuProps = {
	id: string;
	label?: string;
	labelPosition?: ClassicyLabelPosition;
	options: classicyPopUpMenuOptions[];
	selected?: string;
	placeholder?: string;
	size?: ClassicyPopUpMenuSize;
	onChangeFunc?: (e: ChangeEvent<HTMLSelectElement>) => void;
	className?: string;
};
export const ClassicyPopUpMenu: FunctionalComponent<classicyPopUpMenuProps> = ({
	id,
	label,
	labelPosition = "above",
	options,
	selected,
	placeholder,
	className: extraClassName,
	size = "medium",
	onChangeFunc,
}) => {
	// For the control label, "mini" maps to "small" — "mini" is a menu-only size
	const controlLabelSize: ClassicyControlLabelSize =
		size === "mini" ? "small" : size;
	const [selectedItem, setSelectedItem] = useState(selected ?? (placeholder ? PLACEHOLDER_VALUE : undefined));
	// biome-ignore lint/correctness/useExhaustiveDependencies: placeholder is intentionally excluded — it does not change after mount
	useEffect(() => {
		setSelectedItem(selected ?? (placeholder ? PLACEHOLDER_VALUE : undefined)); // eslint-disable-line react-hooks/set-state-in-effect
	}, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
	const { track } = useClassicyAnalytics();
	const analyticsArgs = { id, label, options, selected };

	const onChangeHandler = (e: ChangeEvent<HTMLSelectElement>) => {
		if (e.target.value === PLACEHOLDER_VALUE) return;
		setSelectedItem(e.target.value);
		track("selected", {
			type: "ClassicyPopUpMenu",
			itemId: e.target.value,
			...analyticsArgs,
		});
		if (onChangeFunc) {
			onChangeFunc(e);
		}
	};

	return (
		<div
			className={classNames(
				"classicyPopUpMenuWrapper",
				labelPositionClass(labelPosition),
			)}
		>
			{label && <ClassicyControlLabel label={label} labelSize={controlLabelSize}></ClassicyControlLabel>}
			<div
				className={classNames(
					"classicyPopUpMenu",
					`classicyPopUpMenuSize${size.charAt(0).toUpperCase()}${size.slice(1)}`,
					extraClassName,
				)}
			>
				<select
					id={id}
					tabIndex={0}
					value={selectedItem}
					onChange={onChangeHandler}
				>
					{placeholder && (
						<option value={PLACEHOLDER_VALUE} disabled>
							{placeholder}
						</option>
					)}
					{options.map((o) => (
						<option key={id + o.label + o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
			</div>
		</div>
	);
};
