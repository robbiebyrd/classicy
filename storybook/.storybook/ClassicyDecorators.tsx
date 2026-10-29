import type { Decorator } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import { useActiveClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { useClassicyAssetVars } from "@/Appearance/ClassicyAssetRegistry";
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
 * The docs page's shared portal root. On a docs page every story renders
 * inline in one document, so no StoryFrame can be `#classicyDesktop` (the id
 * would repeat); without one, pop-up menus, combo-box lists, contextual menus
 * and balloons portal to `document.body`, outside every `.classicyDesktop`
 * scope, and lose the package look and the theme variables. Instead the docs
 * page gets ONE body-level `#classicyDesktop`, created by the first docs
 * StoryFrame to mount and removed with the last, carrying the same package
 * attribute and variables as the frames. Every portaled surface is
 * `position: fixed`, so a zero-size root places nothing; it only scopes. Not
 * created when the document already has a `#classicyDesktop`. Canvas
 * (`viewMode === "story"`) never mounts it: there the StoryFrame itself is
 * `#classicyDesktop`, as before.
 */
let docsPortalRoot: HTMLDivElement | null = null;
let docsPortalRootUsers = 0;

const DOCS_PORTAL_ROOT_LAYOUT: CSSProperties = {
	width: 0,
	height: 0,
	padding: 0,
	overflow: "visible",
	background: "none",
};

const applyDocsPortalRootStyle = (
	root: HTMLDivElement,
	style: Record<string, unknown>,
) => {
	root.removeAttribute("style");
	for (const [key, value] of Object.entries(style)) {
		if (value === undefined || value === null) continue;
		if (key.startsWith("--")) root.style.setProperty(key, String(value));
		else
			(root.style as unknown as Record<string, string>)[key] =
				typeof value === "number" && value !== 0 ? `${value}px` : String(value);
	}
};

const DocsPortalRoot = ({
	appearancePackageId,
	style,
}: {
	appearancePackageId: string;
	style: Record<string, unknown>;
}): null => {
	useLayoutEffect(() => {
		if (!docsPortalRoot) {
			if (document.getElementById("classicyDesktop")) return;
			docsPortalRoot = document.createElement("div");
			docsPortalRoot.id = "classicyDesktop";
			docsPortalRoot.className = "classicyDesktop classicyStorybookPortalRoot";
			document.body.appendChild(docsPortalRoot);
		}
		docsPortalRootUsers++;
		return () => {
			docsPortalRootUsers--;
			if (docsPortalRootUsers === 0 && docsPortalRoot) {
				docsPortalRoot.remove();
				docsPortalRoot = null;
			}
		};
	}, []);

	// Every story on a docs page shares the toolbar globals, so the frames all
	// carry the same package and variables; the latest render wins.
	useLayoutEffect(() => {
		if (!docsPortalRoot) return;
		docsPortalRoot.setAttribute(
			"data-classicy-appearance",
			appearancePackageId,
		);
		applyDocsPortalRootStyle(docsPortalRoot, {
			...style,
			...DOCS_PORTAL_ROOT_LAYOUT,
		});
	});

	return null;
};

/**
 * The non-desktop story frame: a `.classicyDesktop` scope carrying the active
 * Appearance Package (resolved, as on the desktop root), so package CSS
 * reaches Controls/* stories too, and the registered cursor and system-art
 * variables (`--classicy-cursor-*`, `--classicy-art-*`), which ClassicyDesktop
 * otherwise publishes only on its own root. On the canvas it is also
 * `#classicyDesktop`, the portal target; on a docs page it mounts the shared
 * DocsPortalRoot instead. A component, so the hooks are legal.
 */
const StoryFrame = ({
	isCanvas,
	style,
	portalStyle,
	children,
}: {
	isCanvas: boolean;
	style: CSSProperties;
	portalStyle: CSSProperties;
	children: ReactNode;
}) => {
	const appearancePackageId = useActiveClassicyAppearancePackage().id;
	const assetVars = useClassicyAssetVars();
	return (
		<div
			id={isCanvas ? "classicyDesktop" : undefined}
			className="classicyDesktop classicyStorybookFrame"
			data-classicy-appearance={appearancePackageId}
			style={{ ...assetVars, ...style }}
		>
			{!isCanvas && (
				<DocsPortalRoot
					appearancePackageId={appearancePackageId}
					style={{ ...assetVars, ...portalStyle }}
				/>
			)}
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
	const typography: CSSProperties = {
		fontFamily: "var(--ui-font)",
		fontSize: "var(--ui-font-size)",
		color: "var(--color-black)",
	};

	return (
		<ClassicySoundManagerProvider>
			<StoryFrame
				isCanvas={isCanvas}
				portalStyle={{ ...vars, ...typography }}
				style={{
					...vars,
					...typography,
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
