import "./ClassicyControlLabel.scss";
import classNames from "classnames";
import type {
	FC as FunctionalComponent,
	KeyboardEvent,
	MouseEvent,
	ReactNode,
} from "react";

type ClassicyControlLabelDirections = "left" | "right";
type ClassicyControlLabelSize = "small" | "medium" | "large";

export type ClassicyLabelPosition = "above" | "left" | "right" | "below";

export function labelPositionClass(position: ClassicyLabelPosition): string {
	const map: Record<ClassicyLabelPosition, string> = {
		above: "classicyLabelAbove",
		below: "classicyLabelBelow",
		left: "classicyLabelLeft",
		right: "classicyLabelRight",
	};
	return map[position];
}

interface ClassicyControlLabelProps {
	labelFor?: string;
	label?: string;
	labelSize?: ClassicyControlLabelSize;
	disabled?: boolean;
	icon?: string;
	iconSize?: string;
	direction?: ClassicyControlLabelDirections;
	children?: ReactNode;
	onClickFunc?: (e: MouseEvent) => void;
}

export const ClassicyControlLabel: FunctionalComponent<
	ClassicyControlLabelProps
> = ({
	labelFor = "",
	label = "",
	labelSize = "medium",
	disabled = false,
	direction = "left",
	icon,
	iconSize,
	children,
	onClickFunc,
}) => {
	if (label === "") {
		return null;
	}

	const sizeClassMap: Record<ClassicyControlLabelSize, string> = {
		small: "classicyControlLabelSizeSmall",
		medium: "classicyControlLabelSizeMedium",
		large: "classicyControlLabelSizeLarge",
	};

	const imageSize = (s: string | undefined) => {
		if (s === "sm") {
			return "16px";
		}
		if (s === "lg") {
			return "64px";
		}
		return "32px";
	};

	const isLeftOrBottom = ["left", "bottom"].includes(direction);

	return (
		// biome-ignore lint/a11y/useSemanticElements: contains <label> and block children that are incompatible with <button>
		<div
			role="button"
			tabIndex={0}
			className={classNames(
				"classicyControlLabelHolder",
				isLeftOrBottom
					? "classicyControlLabelHolderLeft"
					: "classicyControlLabelHolderRight",
			)}
			onClick={(e) => {
				if (onClickFunc) {
					e.preventDefault();
					onClickFunc(e);
				}
			}}
			onKeyDown={(e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					if (onClickFunc) {
						onClickFunc(e as unknown as MouseEvent);
					}
				}
			}}
		>
			{icon && <img src={icon} width={imageSize(iconSize)} alt={label} />}

			{isLeftOrBottom && children}

			<label
				htmlFor={labelFor}
				className={classNames(
					"classicyControlLabel",
					sizeClassMap[labelSize],
					disabled && "classicyControlLabelDisabled",
					direction === "right"
						? "classicyControlLabelMarginRight"
						: "classicyControlLabelMarginLeft",
				)}
			>
				{label}
			</label>

			{!isLeftOrBottom && children}
		</div>
	);
};
