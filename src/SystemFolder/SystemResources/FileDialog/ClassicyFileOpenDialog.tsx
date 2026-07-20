import type { FC as FunctionalComponent } from "react";
import {
	ClassicyFileDialog,
	type ClassicyFileDialogOpenProps,
} from "./ClassicyFileDialog";

export type ClassicyFileOpenDialogProps = Omit<
	ClassicyFileDialogOpenProps,
	"mode"
>;

/** Back-compat wrapper around ClassicyFileDialog's open mode. */
export const ClassicyFileOpenDialog: FunctionalComponent<
	ClassicyFileOpenDialogProps
> = (props) => <ClassicyFileDialog mode={"open"} {...props} />;
