import "./ClassicyTriangle.scss";
import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	useState,
} from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

export type ClassicyTriangleDirection = "up" | "right" | "down" | "left";

type ClassicyTriangleProps = {
	direction?: ClassicyTriangleDirection;
	open?: boolean;
	defaultOpen?: boolean;
	onToggle?: (open: boolean) => void;
	interactive?: boolean;
	className?: string;
};

export const ClassicyTriangle: FunctionalComponent<ClassicyTriangleProps> = ({
	direction = "right",
	open,
	defaultOpen = false,
	onToggle,
	interactive = true,
	className,
}) => {
	const [internalOpen, setInternalOpen] = useState(defaultOpen);
	const { track } = useClassicyAnalytics();
	const isControlled = open !== undefined;
	const resolvedOpen = isControlled ? open : internalOpen;

	const triangleClassOpenName =
		"classicyTriangle" +
		direction.charAt(0).toUpperCase() +
		direction.slice(1) +
		(resolvedOpen ? "Open" : "Closed");

	function toggle() {
		const next = !resolvedOpen;
		track("click", { expanded: next, type: "ClassicyTriangle", direction });
		if (!isControlled) {
			setInternalOpen(next);
		}
		onToggle?.(next);
	}

	function handleKeyPress(e: KeyboardEvent<HTMLDivElement>) {
		switch (e.key) {
			case "Enter":
			// falls through
			case " ": {
				toggle();
				break;
			}
		}
	}

	const svgElement = (
		<svg
			id="a"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 6.44 11.12"
			className={classNames(
				"classicyTriangle",
				triangleClassOpenName,
				!interactive && className,
			)}
		>
			<title>Toggle</title>
			<polygon
				className={"classicyTriangleDropShadow"}
				points="6.44 6.05 1.17 1.07 .93 11.12 6.44 6.05"
			/>
			<polygon
				className={"classicyTriangleOutline"}
				points="5.68 5.34 0 0 0 10.68 5.68 5.34"
			/>
			<polygon
				className={"classicyTriangleHighlight"}
				points="4.79 5.34 .76 1.82 .76 8.86 4.79 5.34"
			/>
			<polygon
				className={"classicyTriangleInner"}
				points="4.79 5.34 1.27 3.42 1.29 8.43 4.79 5.34"
			/>
			<polygon
				className={"classicyTriangleShadow"}
				points=".76 8.29 .76 8.86 4.79 5.34 4.47 5.05 .76 8.29"
			/>
		</svg>
	);

	if (!interactive) {
		return svgElement;
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: triangle wrapper is a block container with svg child incompatible with <button>
		<div
			role="button"
			aria-expanded={resolvedOpen}
			tabIndex={0}
			className={className}
			onClick={toggle}
			onKeyDown={handleKeyPress}
		>
			{svgElement}
		</div>
	);
};
