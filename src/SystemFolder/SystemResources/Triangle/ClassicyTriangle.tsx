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
	/**
	 * Which way the triangle points while closed. Opening turns it to point
	 * down (or up, for `down`). Defaults to `right`, the HIG's closed state.
	 */
	direction?: ClassicyTriangleDirection;
	/** Controlled open state. When set, the triangle only reports clicks through `onToggle`. */
	open?: boolean;
	/** Initial open state when uncontrolled. Defaults to `false`. */
	defaultOpen?: boolean;
	/** Called with the new open state on click, Enter or Space. */
	onToggle?: (open: boolean) => void;
	/**
	 * `true` wraps the triangle in a focusable `role="button"` with
	 * `aria-expanded`; `false` renders the bare SVG, for a parent row that
	 * handles the toggling itself. Defaults to `true`.
	 */
	interactive?: boolean;
	/** Extra class names: on the button wrapper, or on the SVG when not interactive. */
	className?: string;
};

/**
 * The Mac OS 8 disclosure triangle (HIGOS8 Ch.2 "Disclosure Triangles",
 * p.37): points right when closed and turns down when open to reveal more
 * detail. This is the bare marker — for a labelled collapsible section (the
 * `<details>`/`<summary>` replacement) use `ClassicyDisclosure`, and for
 * hierarchical lists `ClassicyTree`, which both draw it.
 *
 * Works controlled (`open` + `onToggle`) or uncontrolled (`defaultOpen`). When
 * `interactive` it is a focusable button toggled by click, Enter or Space,
 * with `aria-expanded` and an analytics `click` event; set
 * `interactive={false}` to draw it inside a row that owns the interaction.
 *
 * ```tsx
 * <ClassicyTriangle open={expanded} onToggle={setExpanded} />
 * ```
 */
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
