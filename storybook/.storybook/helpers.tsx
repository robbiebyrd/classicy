import type { FC, ReactNode } from "react";
import { useEffect } from "react";
import { fireEvent, waitFor } from "storybook/test";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

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

/**
 * Hosts a control in one open document window of a Storybook app, for a
 * Controls/* story rendered on a desktop (`desktopParameters`,
 * `mirroredParameters` from ./mirrored), where a bare control would sit
 * loose on the desktop.
 */
export const StoryWindow: FC<{
	title: string;
	size?: [number, number];
	children?: ReactNode;
}> = ({ title, size = [420, 260], children }) => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyWindow
			id="story"
			appId="storybook.app"
			title={title}
			initialSize={size}
			initialPosition={[200, 80]}
		>
			<div style={{ padding: "calc(var(--window-padding-size) * 2)" }}>
				{children}
			</div>
		</ClassicyWindow>
	</StoryApp>
);

/**
 * A story's `play`: presses on the empty space above and left of the first
 * icon in a file browser's icon view and drags to the middle of its second
 * icon, holding the button, so the selection rectangle stays drawn over the
 * icons it selects (story 0228-e9l). Waits for the icons to be laid out.
 */
export const dragClassicySelectionRectangle = (): Promise<void> =>
	waitFor(
		() => {
			const holder = [
				...document.querySelectorAll<HTMLElement>(
					".classicyFileBrowserFill .classicyFileBrowserFill",
				),
			].find((h) => h.querySelectorAll(".classicyIcon img").length > 1);
			const images = holder
				? [...holder.querySelectorAll(":scope > .classicyIcon img")].map(
						(img) => img.getBoundingClientRect(),
					)
				: [];
			const [first, second] = images;
			if (!holder || !first || !second || first.width === 0)
				throw new Error("the icons are not laid out yet");
			fireEvent.mouseDown(holder, {
				button: 0,
				clientX: Math.round(first.left) - 5,
				clientY: Math.round(first.top) - 5,
			});
			fireEvent.mouseMove(document, {
				clientX: Math.round(second.left + second.width / 2),
				clientY: Math.round(second.top + second.height / 2),
			});
		},
		{ timeout: 10000 },
	);
