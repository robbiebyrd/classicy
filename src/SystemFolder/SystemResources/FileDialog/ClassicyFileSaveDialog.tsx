import type { FC as FunctionalComponent } from "react";
import {
	ClassicyFileDialog,
	type ClassicyFileDialogSaveProps,
} from "./ClassicyFileDialog";

export type ClassicyFileSaveDialogProps = Omit<
	ClassicyFileDialogSaveProps,
	"mode"
>;

/** Save-mode wrapper around ClassicyFileDialog. */
export const ClassicyFileSaveDialog: FunctionalComponent<
	ClassicyFileSaveDialogProps
> = (props) => <ClassicyFileDialog mode={"save"} {...props} />;
