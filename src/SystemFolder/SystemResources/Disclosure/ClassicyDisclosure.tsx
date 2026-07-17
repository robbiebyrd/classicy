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

	function setOpenState(next: boolean) {
		track("click", { expanded: next, ...analyticsArgs });
		setOpen(next);
	}

	function handleKeyPress(e: KeyboardEvent<HTMLDivElement>) {
		switch (e.key) {
			case "Enter":
			// falls through
			case " ": {
				e.preventDefault();
				setOpenState(!open);
				break;
			}
			// HIG list-view disclosure equivalents: Command-Right opens, Command-Left closes.
			case "ArrowRight": {
				if ((e.metaKey || e.ctrlKey) && !open) {
					e.preventDefault();
					setOpenState(true);
				}
				break;
			}
			case "ArrowLeft": {
				if ((e.metaKey || e.ctrlKey) && open) {
					e.preventDefault();
					setOpenState(false);
				}
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
				onClick={() => setOpenState(!open)}
				tabIndex={0}
				aria-expanded={open}
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
