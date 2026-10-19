import type { FC as FunctionalComponent } from "react";
import {
	ClassicyFileDialog,
	type ClassicyFileDialogSaveProps,
} from "./ClassicyFileDialog";

/** Props for `ClassicyFileSaveDialog`: the save-mode props minus `mode`. */
export type ClassicyFileSaveDialogProps = Omit<
	ClassicyFileDialogSaveProps,
	"mode"
>;

/**
 * Mac OS 8 standard Save dialog: a movable modal window (no close box, HIGOS8
 * Ch.3 "Movable Modal Dialog Boxes", p.59) for writing a document into the
 * Classicy file system.
 *
 * - The tree is a folder picker: clicking a folder makes it the target (the
 *   volume root when none is selected); files are shown dimmed for context.
 * - "Save As:" takes the name; the active format's extension is shown after
 *   the field and appended on save (a typed copy is not doubled). A Format
 *   pop-up appears when `formats` has more than one entry.
 * - Save (the default button, or Return in the name field) is dimmed while the
 *   name is blank or contains a colon, or the volume has no `write`.
 * - New Folder (dimmed when the volume has no `mkDir`) asks for a name in a
 *   `ClassicyInputDialog` and selects the new folder.
 * - A same-named file triggers a movable caution alert ("Replace?") whose
 *   default is Cancel; a same-named folder is refused with a stop alert.
 *
 * A format's `data()` is called only when the save is committed. Controlled
 * by `open`: the dialog never closes itself, so set `open` false in
 * `onSaveFunc` and `onCancelFunc`. Must sit inside a `ClassicyApp`.
 */
export const ClassicyFileSaveDialog: FunctionalComponent<
	ClassicyFileSaveDialogProps
> = (props) => <ClassicyFileDialog mode={"save"} {...props} />;
