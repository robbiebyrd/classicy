import { ClassicyAppearanceManager } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager";
import { ClassicyDateAndTimeManager } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager";
import { ClassicyDriveSetup } from "@/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetup";
import { ClassicySoundManager } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManager";

export function ClassicyControlPanels() {
	return (
		<>
			<ClassicyAppearanceManager />
			<ClassicySoundManager />
			<ClassicyDateAndTimeManager />
			<ClassicyDriveSetup />
		</>
	);
}
