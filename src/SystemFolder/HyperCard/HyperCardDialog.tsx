/**
 * Modal answer/ask dialog for the HyperCard interpreter, rendered while the
 * engine is suspended in `awaitingDialog`. Reuses the desktop dialog-overlay
 * styles. Responding dispatches DialogResponse, which resumes the interpreter.
 */

import {
	type ChangeEvent,
	type CSSProperties,
	type FC as FunctionalComponent,
	useEffect,
	useState,
} from "react";
import { useClassicyAppIdentity } from "@/Appearance/ClassicyAppIdentity";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { HCDialog } from "@/SystemFolder/HyperCard/HyperCardUtils";
import { HyperCardAppInfo } from "@/SystemFolder/HyperCard/HyperCardUtils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

interface HyperCardDialogProps {
	dialog: HCDialog;
	stackId: string;
	/** Extra class names, forwarded to the dialog's `ClassicyWindow` root. */
	className?: string;
	/** Inline style, forwarded to the dialog's `ClassicyWindow` root. */
	style?: CSSProperties;
}

export const HyperCardDialog: FunctionalComponent<HyperCardDialogProps> = ({
	dialog,
	stackId,
	className,
	style,
}) => {
	const dispatch = useAppManagerDispatch();
	// Display only: the dialog's window keeps HyperCard's internal app id.
	const appName = useClassicyAppIdentity(HyperCardAppInfo.id, {
		name: HyperCardAppInfo.name,
		icon: "",
	}).name;
	const [text, setText] = useState(dialog.defaultValue ?? "");

	useEffect(() => {
		setText(dialog.defaultValue ?? "");
	}, [dialog.defaultValue]);

	const respond = (result: string) => {
		dispatch({
			type: "ClassicyAppHyperCardDialogResponse",
			stackId,
			token: dialog.token,
			result,
		});
	};

	const buttons = dialog.buttons ?? ["OK"];

	// What the caption's Close box answers under a layout whose
	// `dialog.caption` is `"titled"` (Windows 98, where every dialog has a
	// Close box): an ask's Cancel (the empty answer), an answer's Cancel
	// button, else its only button, as a message box's Close is its Cancel,
	// else, with one button, that one; with neither the box is drawn
	// unavailable (none), as Windows grays a Yes/No box's Close.
	const captionAnswer =
		dialog.kind === "ask"
			? ""
			: (buttons.find((b) => b.trim().toLowerCase() === "cancel") ??
				(buttons.length === 1 ? buttons[0] : undefined));

	// The modal ClassicyWindow already portals to the desktop and dims the
	// background; it must NOT be wrapped in classicyDesktopDialogOverlay — that
	// overlay is a fixed, top-of-stack layer and, once the window portals out of
	// it, would sit empty over the whole screen and swallow clicks.
	return (
		<ClassicyWindow
			id={"hypercard_dialog"}
			appId={HyperCardAppInfo.id}
			className={className}
			style={style}
			title={dialog.kind === "ask" ? "Ask" : appName}
			closable={false}
			onCaptionClose={
				captionAnswer === undefined ? undefined : () => respond(captionAnswer)
			}
			resizable={false}
			zoomable={false}
			scrollable={false}
			collapsable={false}
			initialSize={[360, 0]}
			initialPosition={["center", "center"]}
			modal={true}
		>
			<div className={"classicyDesktopDialogContent"}>
				<div className={"classicyDesktopDialogBody"}>
					<ClassicyControlLabel label={dialog.message} />
					{dialog.kind === "ask" && (
						<ClassicyInput
							id={"hypercard_ask_input"}
							prefillValue={dialog.defaultValue}
							onChangeFunc={(e: ChangeEvent<HTMLInputElement>) =>
								setText(e.target.value)
							}
							onEnterFunc={() => respond(text)}
						/>
					)}
					<div className={"classicyDesktopDialogButtons"}>
						{dialog.kind === "ask" ? (
							<>
								<ClassicyButton onClickFunc={() => respond("")}>
									Cancel
								</ClassicyButton>
								<ClassicyButton
									isDefault={true}
									onClickFunc={() => respond(text)}
								>
									OK
								</ClassicyButton>
							</>
						) : (
							buttons.map((b, i) => (
								<ClassicyButton
									key={b}
									isDefault={i === buttons.length - 1}
									onClickFunc={() => respond(b)}
								>
									{b}
								</ClassicyButton>
							))
						)}
					</div>
				</div>
			</div>
		</ClassicyWindow>
	);
};
