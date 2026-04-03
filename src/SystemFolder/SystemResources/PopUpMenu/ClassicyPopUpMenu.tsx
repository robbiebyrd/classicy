import {
	ClassicyControlLabel,
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
	small?: boolean;
	onChangeFunc?: (e: ChangeEvent<HTMLSelectElement>) => void;
	className?: string;
};
export const ClassicyPopUpMenu: FunctionalComponent<classicyPopUpMenuProps> = ({
	id,
	label,
	labelPosition = "above",
	options,
	selected,
	className: extraClassName,
	small = false,
	onChangeFunc,
}) => {
	const [selectedItem, setSelectedItem] = useState(selected);
	useEffect(() => {
		setSelectedItem(selected);
	}, [selected]);
	const { track } = useClassicyAnalytics();
	const analyticsArgs = { id, label, options, selected };

	const onChangeHandler = (e: ChangeEvent<HTMLSelectElement>) => {
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
			{label && <ClassicyControlLabel label={label}></ClassicyControlLabel>}
			<div
				className={classNames(
					"classicyPopUpMenu",
					small ? "classicyPopUpMenuSmall" : "",
					extraClassName,
				)}
			>
				<select
					id={id}
					tabIndex={0}
					value={selectedItem}
					onChange={onChangeHandler}
				>
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
