import type { Decorator } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	stopAppManagerPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

// Stories must not write desktop state into the user's localStorage.
stopAppManagerPersistence();

const resetClassicyStore = (themeId: string) => {
	const fresh = structuredClone(DefaultAppManagerState);
	fresh.System.Manager.Appearance.activeTheme = getTheme(themeId);
	useAppManager.setState(fresh, true);
};

const ClassicyDesktopFrame = ({
	storyId,
	themeId,
	children,
}: {
	storyId: string;
	themeId: string;
	children: ReactNode;
}) => {
	const [ready, setReady] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: storyId is an intentional invalidation key — it forces the store reset to rerun when switching stories even if themeId is unchanged
	useLayoutEffect(() => {
		resetClassicyStore(themeId);
		setReady(true);
		return () => setReady(false);
	}, [storyId, themeId]);

	if (!ready) return null;
	return (
		<ClassicyAppManagerProvider>
			<ClassicyDesktop startupScreen={false}>{children}</ClassicyDesktop>
		</ClassicyAppManagerProvider>
	);
};

export const withClassicy: Decorator = (Story, context) => {
	const themeId = (context.globals.theme as string) ?? "default";

	if (context.parameters.classicy?.desktop) {
		return (
			<ClassicyDesktopFrame storyId={context.id} themeId={themeId}>
				<Story />
			</ClassicyDesktopFrame>
		);
	}

	const vars = getThemeVars(getTheme(themeId)) as CSSProperties;
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
