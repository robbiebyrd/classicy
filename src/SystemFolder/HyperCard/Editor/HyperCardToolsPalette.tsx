/**
 * Tools palette content: Browse/Pointer mode buttons plus the parts list. Each
 * part entry supports both drag-to-canvas (HTML5 DnD with the part-type MIME)
 * and click-to-arm placement (ClassicyAppHCEditSetPlacing); a second press
 * on the armed entry disarms it.
 */

import classNames from "classnames";
import type { CSSProperties, FC as FunctionalComponent } from "react";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { HYPERCARD_PART_DRAG_MIME } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorOverlay";
import { paletteEntries } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorSchemas";
import type { HCEditState } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";

interface HyperCardToolsPaletteProps {
	stackId: string;
	edit: HCEditState;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}

export const HyperCardToolsPalette: FunctionalComponent<
	HyperCardToolsPaletteProps
> = ({ stackId, edit, className, style }) => {
	const dispatch = useAppManagerDispatch();

	const setTool = (tool: HCEditState["tool"]) =>
		dispatch({ type: "ClassicyAppHCEditSetTool", stackId, tool });

	const entries = paletteEntries();

	return (
		<div
			className={classNames("classicyHyperCardPalette", className)}
			style={style}
		>
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
				{entries.map((entry) => {
					const armed = edit.placing === entry.type;
					// Pressing the armed entry again disarms it: arming is a one-shot,
					// optional mode (nothing armed is the normal state), so each entry
					// is a toggle, not one of a set of radio buttons.
					const toggle = () =>
						dispatch({
							type: "ClassicyAppHCEditSetPlacing",
							stackId,
							partType: armed ? undefined : entry.type,
						});
					return (
						// A toggle button: aria-pressed carries the armed state, and the
						// package draws its ✓ after the aria-hidden mark.
						// biome-ignore lint/a11y/useSemanticElements: a <button> would bring its own box and break the palette's look; the div is draggable, focusable and keyboard-operable
						<div
							key={entry.type}
							role="button"
							tabIndex={0}
							aria-pressed={armed}
							className={classNames(
								"classicyHyperCardPaletteEntry",
								classicyStateClasses({ selected: armed }),
							)}
							data-part-type={entry.type}
							draggable
							onDragStart={(e) =>
								e.dataTransfer?.setData(HYPERCARD_PART_DRAG_MIME, entry.type)
							}
							onClick={toggle}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									toggle();
								}
							}}
						>
							{entry.label}
							<span
								className={"classicyHyperCardPaletteEntryMark"}
								aria-hidden={"true"}
							/>
						</div>
					);
				})}
			</div>
		</div>
	);
};
