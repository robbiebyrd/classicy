import type { Decorator } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import { useActiveClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
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
	themeId,
	controlStrip,
	children,
}: {
	themeId: string;
	controlStrip: boolean;
	children: ReactNode;
}) => {
	const [ready, setReady] = useState(false);

	useLayoutEffect(() => {
		resetClassicyStore(themeId);
		setReady(true);
	}, [themeId]);

	if (!ready) return null;
	return (
		<ClassicyAppManagerProvider>
			<ClassicyDesktop startupScreen={false} controlStrip={controlStrip}>
				{children}
			</ClassicyDesktop>
		</ClassicyAppManagerProvider>
	);
};

/**
 * The non-desktop story frame: a `.classicyDesktop` scope carrying the active
 * Appearance Package (resolved, as on the desktop root), so package CSS
 * reaches Controls/* stories too. A component, so the store hook is legal.
 */
const StoryFrame = ({
	isCanvas,
	style,
	children,
}: {
	isCanvas: boolean;
	style: CSSProperties;
	children: ReactNode;
}) => {
	const appearancePackageId = useActiveClassicyAppearancePackage().id;
	return (
		<div
			id={isCanvas ? "classicyDesktop" : undefined}
			className="classicyDesktop classicyStorybookFrame"
			data-classicy-appearance={appearancePackageId}
			style={style}
		>
			{children}
		</div>
	);
};

export const withClassicy: Decorator = (Story, context) => {
	const themeId = (context.globals.theme as string) ?? "default";

	if (context.parameters.classicy?.desktop) {
		// Keyed on story + theme so any switch fully unmounts/remounts the frame,
		// guaranteeing the store-reset effect runs against a clean component tree
		// instead of leaking component-local state across resets.
		// `height` (not `minHeight`) is required here: ClassicyDesktop's root
		// element is styled `height: 100%`, and a percentage height only
		// resolves against an ancestor with an explicit `height`, not one that
		// merely ends up that tall via `min-height`.
		return (
			<div style={{ height: "100vh" }}>
				<ClassicyDesktopFrame
					key={`${context.id}-${themeId}`}
					themeId={themeId}
					// Stories that mount their own strip set `controlStrip: false`.
					controlStrip={context.parameters.classicy?.controlStrip ?? true}
				>
					<Story />
				</ClassicyDesktopFrame>
			</div>
		);
	}

	const vars = getThemeVars(getTheme(themeId)) as CSSProperties;
	const isCanvas = context.viewMode === "story";

	return (
		<ClassicySoundManagerProvider>
			<StoryFrame
				isCanvas={isCanvas}
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
			</StoryFrame>
		</ClassicySoundManagerProvider>
	);
};
