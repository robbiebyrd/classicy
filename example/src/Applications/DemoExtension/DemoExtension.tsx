import {
	ClassicyApp,
	ClassicyMenuBarExtension,
	useAppManagerDispatch,
	useClassicyAsset,
} from "@classicy/classicy";
import { AppIcons } from "../../app";

/**
 * Minimal background extension: no desktop icon, no App Switcher entry, no
 * Applications-folder entry. It appears in the startup-screen parade and in
 * Macintosh HD:System Folder:Extensions, where double-clicking it shows the
 * "Library" error dialog.
 *
 * It also shows a menu bar extension: an item on the right of the menu bar
 * (Platinum, System 7), or a status indicator in the taskbar's status area
 * beside the clock under the Windows 98 shell, its name a tooltip and its
 * menu on a click or on button 2.
 */
export const DemoExtension = () => {
	const icon = useClassicyAsset("icons", "system.extension") ?? "";
	const dispatch = useAppManagerDispatch();
	return (
		<>
			<ClassicyApp
				id="DemoExtension.app"
				name="Demo Extension"
				icon={icon}
				extension
			/>
			<ClassicyMenuBarExtension
				id="demo-extension"
				icon={icon}
				title="Demo Extension"
				menuItems={[
					{
						id: "demo-extension-open-demo",
						title: "Open Demo",
						onClickFunc: () => {
							dispatch({
								type: "ClassicyAppOpen",
								app: { id: "Demo.app", name: "Demo", icon: AppIcons.demo.app },
							});
						},
					},
				]}
			/>
		</>
	);
};
