import type { Decorator } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { stopAppManagerPersistence } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";

// Stories must not write desktop state into the user's localStorage.
stopAppManagerPersistence();

export const withClassicy: Decorator = (Story, context) => {
	const theme = getTheme((context.globals.theme as string) ?? "default");
	const vars = getThemeVars(theme) as CSSProperties;
	const isCanvas = context.viewMode === "story";

	return (
		<ClassicySoundManagerProvider>
			<div
				id={isCanvas ? "classicyDesktop" : undefined}
				className="classicyDesktop classicyStorybookFrame"
				style={{
					...vars,
					fontFamily: "var(--ui-font)",
					fontSize: "var(--ui-font-size)",
					color: "var(--color-black)",
					backgroundColor: "var(--color-system-03)",
					padding: "calc(var(--window-padding-size) * 4)",
					minHeight: isCanvas ? "100vh" : undefined,
					boxSizing: "border-box",
				}}
			>
				<Story />
			</div>
		</ClassicySoundManagerProvider>
	);
};
