import type { FC as FunctionalComponent } from "react";
import {
	ClassicyFileDialog,
	type ClassicyFileDialogOpenProps,
} from "./ClassicyFileDialog";

/** Props for `ClassicyFileOpenDialog`: the open-mode props minus `mode`. */
export type ClassicyFileOpenDialogProps = Omit<
	ClassicyFileDialogOpenProps,
	"mode"
>;

/**
 * Mac OS 8 standard Open dialog: a movable modal window (no close box, HIGOS8
 * Ch.3 "Movable Modal Dialog Boxes", p.59) for choosing files from the
 * Classicy file system. Use it when an app opens documents; for files from the
 * host computer use `ClassicyFileInput` (`<input type="file">`) instead.
 *
 * - A Volume pop-up switches between `volumes`; folders expand lazily in a
 *   tree, and a folder that fails to load offers Retry.
 * - `fileTypeFilters` adds a Show pop-up; files outside the active filter are
 *   dimmed and cannot be chosen.
 * - Open (the default button), Return or a double-click on a file calls
 *   `onOpenFunc`; Cancel, Escape or Command-period calls `onCancelFunc`.
 * - `selectionMode="multi"` adds Command/Ctrl-click and Shift-click selection.
 *
 * Controlled by `open`: the dialog never closes itself, so set `open` false in
 * both callbacks. Must sit inside a `ClassicyApp`.
 *
 * ```tsx
 * const volumes = useMemo(() => [desktopVolume(fs), fileSystemVolume(fs, "Macintosh HD")], [fs]);
 * <ClassicyFileOpenDialog
 *   id="myapp_open" appId={appId} open={dialogOpen} volumes={volumes}
 *   fileTypeFilters={[{ label: "Text", types: ["text_file", "markdown"] }]}
 *   onOpenFunc={(files) => { openFiles(files); setDialogOpen(false); }}
 *   onCancelFunc={() => setDialogOpen(false)}
 * />
 * ```
 */
export const ClassicyFileOpenDialog: FunctionalComponent<
	ClassicyFileOpenDialogProps
> = (props) => <ClassicyFileDialog mode={"open"} {...props} />;
