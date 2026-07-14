import type { FC, ReactNode } from "react";
import { useEffect } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";

export const SB_ICON: string = ClassicyIcons.system.macClassic as string;

/** Spread into a story or meta `parameters` to render inside a real ClassicyDesktop. */
export const desktopParameters = {
	layout: "fullscreen",
	classicy: { desktop: true },
	docs: { story: { inline: false, height: "600px" } },
};

/**
 * Wraps children in ClassicyApp and immediately opens the app, so
 * ClassicyWindow children render without a desktop-icon double-click.
 */
export const StoryApp: FC<{
	id: string;
	name: string;
	icon?: string;
	children?: ReactNode;
}> = ({ id, name, icon = SB_ICON, children }) => {
	const dispatch = useAppManagerDispatch();

	useEffect(() => {
		dispatch({ type: "ClassicyAppOpen", app: { id, name, icon } });
	}, [dispatch, id, name, icon]);

	return (
		<ClassicyApp id={id} name={name} icon={icon}>
			{children}
		</ClassicyApp>
	);
};
