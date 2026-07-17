/**
 * Modal answer/ask dialog for the HyperCard interpreter, rendered while the
 * engine is suspended in `awaitingDialog`. Reuses the desktop dialog-overlay
 * styles. Responding dispatches DialogResponse, which resumes the interpreter.
 */

import {
	type ChangeEvent,
	type FC as FunctionalComponent,
	useEffect,
	useState,
} from "react";
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
}

export const HyperCardDialog: FunctionalComponent<HyperCardDialogProps> = ({
	dialog,
	stackId,
}) => {
	const dispatch = useAppManagerDispatch();
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

	// The modal ClassicyWindow already portals to the desktop and dims the
	// background; it must NOT be wrapped in classicyDesktopDialogOverlay — that
	// overlay is a fixed, top-of-stack layer and, once the window portals out of
	// it, would sit empty over the whole screen and swallow clicks.
	return (
		<ClassicyWindow
			id={"hypercard_dialog"}
			appId={HyperCardAppInfo.id}
			title={dialog.kind === "ask" ? "Ask" : HyperCardAppInfo.name}
			closable={false}
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
