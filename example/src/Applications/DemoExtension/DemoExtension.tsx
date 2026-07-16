import { ClassicyApp, ClassicyIcons } from "classicy";

/**
 * Minimal background extension: no desktop icon, no App Switcher entry, no
 * Applications-folder entry. It appears in the startup-screen parade and in
 * Macintosh HD:System Folder:Extensions, where double-clicking it shows the
 * "Library" error dialog.
 */
export const DemoExtension = () => (
	<ClassicyApp
		id="DemoExtension.app"
		name="Demo Extension"
		icon={ClassicyIcons.system.extension}
		extension
	/>
);
