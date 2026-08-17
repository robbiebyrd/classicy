import "./ClassicyIcon.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type RefObject,
	useId,
	useRef,
	useState,
} from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import {
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

interface ClassicyIconProps {
	appId: string;
	name: string;
	icon: string;
	label?: string;
	labelPosition?: ClassicyLabelPosition;
	initialPosition?: [number, number];
	holder?: RefObject<HTMLElement | null>;
	onClickFunc?: () => void;
	invisible?: boolean;
	/** Explicit icon size in px. Falls back to the theme's desktop icon size. */
	size?: number;
	/** Grid pitch. When set, a dropped icon rounds to the nearest cell. */
	snapTo?: [number, number];
	/** Disables dragging — used by "Keep arranged", where position is derived. */
	positionLocked?: boolean;
}

/**
 * Rounds a dropped icon's position to the nearest grid cell. Exported so the
 * rounding can be unit-tested directly — jsdom has no layout engine, so a
 * simulated drag would only ever measure zeros.
 */
export const snapToGrid = (
	position: [number, number],
	pitch: [number, number],
): [number, number] => [
	Math.round(position[0] / pitch[0]) * pitch[0],
	Math.round(position[1] / pitch[1]) * pitch[1],
];

export const ClassicyIcon: FunctionalComponent<ClassicyIconProps> = ({
	appId,
	name,
	icon,
	label,
	labelPosition = "below",
	initialPosition = [0, 0],
	holder,
	onClickFunc,
	invisible = false,
	size,
	snapTo,
	positionLocked = false,
}) => {
	const [position, setPosition] = useState<[number, number]>(initialPosition);
	const [dragging, setDragging] = useState<boolean>(false);
	const [active, setActive] = useState<boolean>(false);

	const iconRef = useRef<HTMLDivElement>(null);

	const id = `${appId}.shortcut`;

	const { track } = useClassicyAnalytics();
	const analyticsArgs = { type: "ClassicyIcon", appId, name, icon, label };

	const toggleFocus = () => {
		track("focus", analyticsArgs);
		setActive(!active);
	};
	const setFocus = (active: boolean) => {
		track("focus", analyticsArgs);
		setActive(active);
	};

	const clearFocus = () => {
		track("blur", analyticsArgs);
		setActive(false);
	};

	const doDoubleClick = () => {
		if (onClickFunc) {
			clearFocus();
			onClickFunc();
		}
	};

	const stopChangeIcon = () => {
		if (snapTo) setPosition((p) => snapToGrid(p, snapTo));
		setDragging(false);
	};

	const startDrag = () => {
		if (positionLocked) return;
		setDragging(true);
	};

	const changeIcon = (e: MouseEvent<HTMLDivElement>) => {
		if (holder?.current && dragging && iconRef.current) {
			setFocus(true);
			setPosition([
				e.clientX -
					holder.current.getBoundingClientRect().left -
					iconRef.current.getBoundingClientRect().width / 2,
				e.clientY -
					holder.current.getBoundingClientRect().top -
					iconRef.current.getBoundingClientRect().height / 2,
			]);
		}
	};
	const iconId = useId();

	const labelEl = (
		<p className={classNames(invisible ? "classicyIconInvisible" : "")}>
			{label ? label : name}
		</p>
	);

	const iconEl = (
		<div
			className={classNames(
				"classicyIconMaskOuter",
				invisible ? "classicyIconInvisible" : "",
			)}
			style={{ "--classicy-icon-mask": `url(${icon})` } as CSSProperties}
		>
			<div className={"classicyIconMask"}>
				<img
					src={icon}
					alt={name}
					{...(size === undefined ? {} : { width: size, height: size })}
				/>
			</div>
		</div>
	);

	return (
		// biome-ignore lint/a11y/useSemanticElements: icon is a draggable div with ref and complex mouse handling incompatible with <button>
		<div
			role="button"
			tabIndex={0}
			ref={iconRef}
			id={`${id}-${iconId}`}
			draggable={false}
			className={classNames(
				"classicyIcon",
				dragging ? "classicyIconDragging" : "",
				active ? "classicyIconActive" : "",
				labelPositionClass(labelPosition),
			)}
			style={{
				left: `${position[0]}px`,
				top: `${position[1]}px`,
			}}
			onClick={toggleFocus}
			onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					doDoubleClick();
				}
			}}
			onMouseDown={startDrag}
			onMouseMove={changeIcon}
			onMouseUp={stopChangeIcon}
			onDoubleClick={doDoubleClick}
		>
			{labelPosition === "above" ? labelEl : iconEl}
			{labelPosition === "above" ? iconEl : labelEl}
		</div>
	);
};
