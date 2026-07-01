import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyTriangle } from "@/SystemFolder/SystemResources/Triangle/ClassicyTriangle";
import "./ClassicyDisclosure.scss";
import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type ReactNode,
	useState,
} from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

type ClassicyDisclosureTriangleDirections = "up" | "right" | "down" | "left";

type ClassicyDisclosureProps = {
	direction?: ClassicyDisclosureTriangleDirections;
	label?: string;
	labelSize?: ClassicyControlLabelSize;
	labelPosition?: ClassicyLabelPosition;
	children?: ReactNode;
};

export const ClassicyDisclosure: FunctionalComponent<
	ClassicyDisclosureProps
> = ({
	direction = "right",
	label = "",
	labelSize = "medium",
	labelPosition = "right",
	children,
}) => {
	const [open, setOpen] = useState(false);
	const { track } = useClassicyAnalytics();
	const analyticsArgs = { type: "ClassicyLabel", label };

	function handleKeyPress(e: KeyboardEvent<HTMLDivElement>) {
		switch (e.key) {
			case "Enter":
			// falls through
			case " ": {
				track("click", { expanded: !open, ...analyticsArgs });
				setOpen(!open);
				break;
			}
		}
	}

	return (
		<div className={classNames("classicyDisclosure")}>
			{/* biome-ignore lint/a11y/useSemanticElements: disclosure header is a block container with svg child incompatible with <button> */}
			<div
				role="button"
				className={"classicyDisclosureHeader"}
				onClick={() => {
					track("click", { expanded: !open, ...analyticsArgs });
					setOpen(!open);
				}}
				tabIndex={0}
				onKeyDown={(e) => handleKeyPress(e)}
			>
				{labelPosition === "left" && (
					<ClassicyControlLabel label={label} labelSize={labelSize} />
				)}
				<ClassicyTriangle
					direction={direction}
					open={open}
					interactive={false}
				/>
				{labelPosition !== "left" && (
					<ClassicyControlLabel label={label} labelSize={labelSize} />
				)}
			</div>
			<div
				className={classNames(
					"classicyDisclosureInner",
					open ? "classicyDisclosureInnerOpen" : "classicyDisclosureInnerClose",
				)}
			>
				{children}
			</div>
		</div>
	);
};
