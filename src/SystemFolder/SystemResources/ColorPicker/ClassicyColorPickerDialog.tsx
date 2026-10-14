import "./ClassicyColorPicker.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC,
	type KeyboardEvent,
	useContext,
	useEffect,
	useId,
	useState,
} from "react";
import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import { ClassicyAppIdContext } from "@/SystemFolder/SystemResources/App/ClassicyAppIdContext";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyColorPickerCMYK } from "./ClassicyColorPickerCMYK";
import { ClassicyColorPickerCrayon } from "./ClassicyColorPickerCrayon";
import {
	type ClassicyCrayon,
	MAC_OS_8_CRAYONS,
} from "./ClassicyColorPickerCrayons";
import { ClassicyColorPickerHLS } from "./ClassicyColorPickerHLS";
import { ClassicyColorPickerHSV } from "./ClassicyColorPickerHSV";
import { ClassicyColorPickerRGB } from "./ClassicyColorPickerRGB";

type PickerMode = "Crayons" | "RGB" | "HSV" | "HLS" | "CMYK";
const PICKER_MODES: PickerMode[] = ["Crayons", "RGB", "HSV", "HLS", "CMYK"];

interface ClassicyColorPickerDialogProps {
	id: string;
	/** The app this dialog's window registers under. Precedence: this prop,
	 *  then the lexically enclosing {@link ClassicyAppIdContext}, then
	 *  unregistered (the window opens without an app record — today's
	 *  behavior when neither is available). Deliberately NOT derived from
	 *  the store's global focused app: that would register the dialog under
	 *  whichever app happens to be focused, which can be the wrong app (the
	 *  owner is open but unfocused) or can migrate mid-session (a focus
	 *  change elsewhere while the dialog stays open), stealing focus either
	 *  way. */
	appId?: string;
	open: boolean;
	initialColor?: number;
	crayons?: ClassicyCrayon[];
	onSelectFunc?: (color: number) => void;
	onCancelFunc?: () => void;
}

export const ClassicyColorPickerDialog: FC<ClassicyColorPickerDialogProps> = ({
	id,
	appId,
	open,
	initialColor = 0x000000,
	crayons = MAC_OS_8_CRAYONS,
	onSelectFunc,
	onCancelFunc,
}) => {
	const [pendingColor, setPendingColor] = useState(initialColor);
	const listId = useId();
	const [mode, setMode] = useState<PickerMode>("Crayons");
	// Lexical, not global: see the `appId` doc comment above for why this
	// must not fall back to the store's focused app.
	const contextAppId = useContext(ClassicyAppIdContext);
	const resolvedAppId = appId ?? contextAppId;

	// Reset to initialColor whenever the dialog is freshly opened.
	// biome-ignore lint/correctness/useExhaustiveDependencies: a new initialColor while open must not discard the user's pending choice
	useEffect(() => {
		if (open) setPendingColor(initialColor);
	}, [open]);

	const onModeKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		const at = PICKER_MODES.indexOf(mode);
		const next =
			e.key === "ArrowDown"
				? Math.min(at + 1, PICKER_MODES.length - 1)
				: e.key === "ArrowUp"
					? Math.max(at - 1, 0)
					: e.key === "Home"
						? 0
						: e.key === "End"
							? PICKER_MODES.length - 1
							: null;
		if (next === null) return;
		e.preventDefault();
		setMode(PICKER_MODES[next]);
	};

	if (!open) return null;

	const handleOK = () => {
		onSelectFunc?.(pendingColor);
	};

	const activePanel = (() => {
		switch (mode) {
			case "Crayons":
				return (
					<ClassicyColorPickerCrayon
						color={pendingColor}
						crayons={crayons}
						onChangeFunc={setPendingColor}
					/>
				);
			case "RGB":
				return (
					<ClassicyColorPickerRGB
						color={pendingColor}
						onChangeFunc={setPendingColor}
					/>
				);
			case "HSV":
				return (
					<ClassicyColorPickerHSV
						color={pendingColor}
						onChangeFunc={setPendingColor}
					/>
				);
			case "HLS":
				return (
					<ClassicyColorPickerHLS
						color={pendingColor}
						onChangeFunc={setPendingColor}
					/>
				);
			case "CMYK":
				return (
					<ClassicyColorPickerCMYK
						color={pendingColor}
						onChangeFunc={setPendingColor}
					/>
				);
		}
	})();

	return (
		<ClassicyWindow
			id={id}
			appId={resolvedAppId ?? id}
			title="Color Picker"
			modal={true}
			closable={true}
			zoomable={false}
			collapsable={false}
			resizable={false}
			scrollable={false}
			initialSize={[520, 430]}
			initialPosition={[200, 100]}
			onCloseFunc={() => onCancelFunc?.()}
			analyticsExclude
		>
			{/* A full-height column so the body takes the space left over and the
			    preview and OK/Cancel footer always stay inside the window. */}
			<div className="classicyColorPickerDialog">
				<div className="classicyColorPickerDialogBody">
					{/* A single-select listbox: focus stays on the list and the arrow
				    keys move the selection (aria-activedescendant). */}
					<div
						className="classicyColorPickerModeList"
						role="listbox"
						aria-label="Color picker mode"
						tabIndex={0}
						aria-activedescendant={`${listId}_${mode}`}
						onKeyDown={onModeKeyDown}
					>
						{PICKER_MODES.map((m) => (
							// Options take no focus of their own: the listbox holds focus
							// and handles the keys (aria-activedescendant).
							// biome-ignore lint/a11y/useFocusableInteractive: see above
							// biome-ignore lint/a11y/useKeyWithClickEvents: see above
							<div
								key={m}
								id={`${listId}_${m}`}
								role="option"
								aria-selected={m === mode}
								className={classNames(
									"classicyColorPickerModeListItem",
									m === mode && "classicyColorPickerModeListItemSelected",
								)}
								onClick={() => setMode(m)}
							>
								{m}
							</div>
						))}
					</div>
					<div className="classicyColorPickerActivePanel">{activePanel}</div>
				</div>
				<div
					className="classicyColorPickerPreview"
					style={
						{
							"--classicy-preview-color": intToHex(pendingColor),
						} as CSSProperties
					}
					role="img"
					aria-label={`Selected color: ${intToHex(pendingColor)}`}
				/>
				<div className="classicyColorPickerDialogFooter">
					<ClassicyButton onClickFunc={onCancelFunc}>Cancel</ClassicyButton>
					<ClassicyButton isDefault={true} onClickFunc={handleOK}>
						OK
					</ClassicyButton>
				</div>
			</div>
		</ClassicyWindow>
	);
};
