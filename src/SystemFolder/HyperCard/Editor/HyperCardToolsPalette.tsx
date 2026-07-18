/**
 * Tools palette content: Browse/Pointer mode buttons plus the parts list. Each
 * part entry supports both drag-to-canvas (HTML5 DnD with the part-type MIME)
 * and click-to-arm placement (ClassicyAppHCEditSetPlacing).
 */

import type { FC as FunctionalComponent } from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { HYPERCARD_PART_DRAG_MIME } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorOverlay";
import {
	BUILTIN_PART_DESCRIPTORS,
	type HCEditState,
} from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";

interface HyperCardToolsPaletteProps {
	stackId: string;
	edit: HCEditState;
}

export const HyperCardToolsPalette: FunctionalComponent<
	HyperCardToolsPaletteProps
> = ({ stackId, edit }) => {
	const dispatch = useAppManagerDispatch();

	const setTool = (tool: HCEditState["tool"]) =>
		dispatch({ type: "ClassicyAppHCEditSetTool", stackId, tool });

	return (
		<div className={"classicyHyperCardPalette"}>
			<div className={"classicyHyperCardPaletteTools"}>
				<ClassicyButton
					isDefault={edit.tool === "browse"}
					onClickFunc={() => setTool("browse")}
				>
					Browse
				</ClassicyButton>
				<ClassicyButton
					isDefault={edit.tool === "pointer"}
					onClickFunc={() => setTool("pointer")}
				>
					Pointer
				</ClassicyButton>
			</div>
			<div className={"classicyHyperCardPaletteParts"}>
				{BUILTIN_PART_DESCRIPTORS.map((desc) => (
					// biome-ignore lint/a11y/noStaticElementInteractions: palette entry
					// biome-ignore lint/a11y/useKeyWithClickEvents: drag-first control
					<div
						key={desc.type}
						className={"classicyHyperCardPaletteEntry"}
						data-part-type={desc.type}
						draggable
						onDragStart={(e) =>
							e.dataTransfer?.setData(HYPERCARD_PART_DRAG_MIME, desc.type)
						}
						onClick={() =>
							dispatch({
								type: "ClassicyAppHCEditSetPlacing",
								stackId,
								partType: desc.type,
							})
						}
					>
						{desc.label}
						{edit.placing === desc.type ? " ✓" : ""}
					</div>
				))}
			</div>
		</div>
	);
};
