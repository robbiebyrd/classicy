import "./ClassicyButton.scss";
import classNames from "classnames";
import type {
	FC as FunctionalComponent,
	MouseEvent,
	MouseEventHandler,
	PropsWithChildren,
} from "react";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

type ClassicyButtonProps = PropsWithChildren<{
	isDefault?: boolean;
	disabled?: boolean;
	onClickFunc?: MouseEventHandler<HTMLButtonElement>;
	buttonShape?: "rectangle" | "square";
	buttonSize?: "medium" | "small";
	buttonType?: "button" | "submit" | "reset";
}>;

export const ClassicyButton: FunctionalComponent<ClassicyButtonProps> = ({
	isDefault = false,
	buttonType = "button",
	buttonShape = "rectangle",
	buttonSize,
	disabled = false,
	onClickFunc,
	children,
}) => {
	const player = useSoundDispatch();

	const { track } = useClassicyAnalytics();
	const analyticsArgs = { type: "ClassicyButton", isDefault, disabled };

	const onHandleFunc = (e: MouseEvent<HTMLButtonElement>) => {
		track("click", { ...analyticsArgs });
		if (onClickFunc) {
			onClickFunc(e);
		}
	};

	return (
		<button
			type={buttonType}
			tabIndex={0}
			role={buttonType}
			className={classNames(
				"classicyButton",
				isDefault ? "classicyButtonDefault" : "",
				buttonShape === "square" ? "classicyButtonShapeSquare" : "",
				buttonSize === "small" ? "classicyButtonSmall" : "",
			)}
			onClick={onHandleFunc}
			onMouseDown={() => {
				player({ type: "ClassicySoundPlay", sound: "ClassicyButtonClickDown" });
			}}
			onMouseUp={() => {
				player({ type: "ClassicySoundPlay", sound: "ClassicyButtonClickUp" });
			}}
			disabled={disabled}
		>
			{children}
		</button>
	);
};
