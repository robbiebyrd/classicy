import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { ClassicyAppearanceManager } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager";
import { ClassicyControlStripManager } from "@/SystemFolder/ControlPanels/ControlStripManager/ClassicyControlStripManager";
import { ClassicyDateAndTimeManager } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager";
import { ClassicyDriveSetup } from "@/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetup";
import { ClassicyKeyboardManager } from "@/SystemFolder/ControlPanels/KeyboardManager/ClassicyKeyboardManager";
import { ClassicyScreenSaverManager } from "@/SystemFolder/ControlPanels/ScreenSaverManager/ClassicyScreenSaverManager";
import { ClassicySoundManager } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManager";
import { classicyEditableShortcuts } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuShortcutOverrides";

export function ClassicyControlPanels() {
	// The Keyboard panel edits the bundled apps' shortcuts, which only a
	// package that lets the user change them has (`keyboard.editableShortcuts`,
	// Windows 98; WIG Ch.4 "Shortcut Keys", p.27): mounted only then, so the
	// Apple menu, the Control Panels folder and the Start menu list it only
	// then.
	const editableShortcuts = classicyEditableShortcuts(
		useClassicyAppearanceLayout(),
	);
	return (
		<>
			<ClassicyAppearanceManager />
			<ClassicySoundManager />
			<ClassicyDateAndTimeManager />
			<ClassicyDriveSetup />
			<ClassicyScreenSaverManager />
			<ClassicyControlStripManager />
			{editableShortcuts && <ClassicyKeyboardManager />}
		</>
	);
}
