import {
	ClassicyControlLabel,
	type ClassicyLabelPosition,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
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
	labelPosition?: ClassicyLabelPosition;
	children?: ReactNode;
};

export const ClassicyDisclosure: FunctionalComponent<
	ClassicyDisclosureProps
> = ({
	direction = "right",
	label = "",
	labelPosition = "right",
	children,
}) => {
	const [open, setOpen] = useState(false);
	const { track } = useClassicyAnalytics();
	const analyticsArgs = { type: "ClassicyLabel", label };

	const triangleClassOpenName =
		"classicyDisclosureTriangle" +
		direction.charAt(0).toUpperCase() +
		direction.slice(1) +
		(open ? "Open" : "Closed");

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
				{labelPosition === "left" && <ClassicyControlLabel label={label} />}
				<svg
					id="a"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 6.44 11.12"
					className={classNames(
						"classicyDisclosureTriangle",
						triangleClassOpenName,
					)}
				>
					<title>Disclosure triangle</title>
					<polygon
						className={"classicyDisclosureTriangleDropShadow"}
						points="6.44 6.05 1.17 1.07 .93 11.12 6.44 6.05"
					/>
					<polygon
						className={"classicyDisclosureTriangleOutline"}
						points="5.68 5.34 0 0 0 10.68 5.68 5.34"
					/>
					<polygon
						className={"classicyDisclosureTriangleHighlight"}
						points="4.79 5.34 .76 1.82 .76 8.86 4.79 5.34"
					/>
					<polygon
						className={"classicyDisclosureTriangleInner"}
						points="4.79 5.34 1.27 3.42 1.29 8.43 4.79 5.34"
					/>
					<polygon
						className={"classicyDisclosureTriangleShadow"}
						points=".76 8.29 .76 8.86 4.79 5.34 4.47 5.05 .76 8.29"
					/>
				</svg>
				{labelPosition !== "left" && <ClassicyControlLabel label={label} />}
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
