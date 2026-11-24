import type { Decorator } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import {
	useEffect,
	useLayoutEffect,
	useState,
	useSyncExternalStore,
} from "react";
import { useActiveClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { subscribeClassicyAppearancePackages } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { useClassicyAssetVars } from "@/Appearance/ClassicyAssetRegistry";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	stopAppManagerPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";
import { Classicy } from "@/SystemFolder/SystemResources/Desktop/Classicy";
import {
	isStorybookAppearancePackagePending,
	loadStorybookAppearancePackage,
	resolveStorybookThemeId,
	STORYBOOK_DEFAULT_PACKAGE_ID,
	STORYBOOK_PACKAGE_GLOBAL,
} from "./StorybookPackages";

// Stories must not write desktop state into the user's localStorage.
stopAppManagerPersistence();

const resetClassicyStore = (themeId: string) => {
	const fresh = structuredClone(DefaultAppManagerState);
	fresh.System.Manager.Appearance.activeTheme = getTheme(themeId);
	useAppManager.setState(fresh, true);
};

const currentThemeId = () =>
	useAppManager.getState().System.Manager.Appearance.activeTheme.id;

const ClassicyDesktopFrame = ({
	themeId,
	controlStrip,
	appearancePackage,
	children,
}: {
	themeId: string;
	controlStrip: boolean;
	appearancePackage?: string;
	children: ReactNode;
}) => {
	const [ready, setReady] = useState(false);

	useLayoutEffect(() => {
		resetClassicyStore(themeId);
		// After the reset, which would otherwise wipe it: the switch sets
		// Appearance.packageId and activates the package's defaults (so
		// activeTheme.package follows).
		if (appearancePackage) {
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: appearancePackage,
			});
			// The switch activates the package's defaults; a Theme toolbar
			// choice of one of the package's other themes then replaces them.
			// (A story's own theme, set in its effects, still runs later.)
			const theme = resolveStorybookThemeId(appearancePackage, themeId);
			if (theme !== currentThemeId())
				dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: theme });
		}
		setReady(true);
		// The store outlives the story: put the default package back when a
		// story that switched leaves, so the next non-desktop story (whose
		// frame reads the store's package) never inherits it.
		return () => {
			if (appearancePackage) resetClassicyStore(themeId);
		};
	}, [themeId, appearancePackage]);

	if (!ready) return null;
	return (
		// themeLinks: a story's address (its iframe's) opens a theme link
		// Copy Theme Link made, after asking.
		<Classicy startupScreen={false} controlStrip={controlStrip} themeLinks>
			{children}
		</Classicy>
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
	appearancePackage,
	style,
	portalStyle,
	children,
}: {
	isCanvas: boolean;
	/** A package id from `parameters.classicy.appearancePackage`, which wins over the store's. */
	appearancePackage?: string;
	style: CSSProperties;
	portalStyle: CSSProperties;
	children: ReactNode;
}) => {
	const activeAppearancePackageId = useActiveClassicyAppearancePackage().id;
	const appearancePackageId = appearancePackage ?? activeAppearancePackageId;
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

/**
 * Renders its children once `packageId` is registered: a package chosen in
 * the Package toolbar is imported on first use, and the story waits for it
 * (an empty frame for a moment) rather than drawing under Platinum first.
 */
const StorybookPackageGate = ({
	packageId,
	children,
}: {
	packageId: string;
	children: ReactNode;
}) => {
	const pending = useSyncExternalStore(
		subscribeClassicyAppearancePackages,
		() => isStorybookAppearancePackagePending(packageId),
		() => isStorybookAppearancePackagePending(packageId),
	);
	useEffect(() => {
		if (pending) void loadStorybookAppearancePackage(packageId);
	}, [pending, packageId]);
	return pending ? null : children;
};

/**
 * Lends a plain (non-desktop) story the Package toolbar's package beyond its
 * CSS: the store's `Appearance.packageId`, which package hooks, `decorate()`
 * and the layout read. Puts the default package back when the story leaves.
 */
const StoryPackageScope = ({
	packageId,
	themeId,
	children,
}: {
	packageId: string;
	themeId: string;
	children: ReactNode;
}) => {
	const [ready, setReady] = useState(false);
	useLayoutEffect(() => {
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId });
		if (themeId !== currentThemeId())
			dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: themeId });
		setReady(true);
		return () => resetClassicyStore("default");
	}, [packageId, themeId]);
	return ready ? children : null;
};

type ClassicyStoryProps = {
	Story: Parameters<Decorator>[0];
	context: Parameters<Decorator>[1];
	/** `parameters.classicy.appearancePackage`: the story's own package. */
	storyPackage?: string;
	/** The Package toolbar's choice. */
	chosenPackage: string;
};

const ClassicyStory = ({
	Story,
	context,
	storyPackage,
	chosenPackage,
}: ClassicyStoryProps) => {
	const toolbarThemeId = (context.globals.theme as string) ?? "default";
	// A story's own package wins over the toolbar's: it is what the story shows.
	const packageId = storyPackage ?? chosenPackage;
	// A switched package (one the story does not set itself) is drawn like a
	// story package, but in the Theme toolbar's theme when it is one of the
	// package's, else in its defaults. Under the default package nothing
	// changes: the toolbar theme as it is.
	const switched =
		storyPackage === undefined &&
		chosenPackage !== STORYBOOK_DEFAULT_PACKAGE_ID;
	const appearancePackage =
		storyPackage ?? (switched ? chosenPackage : undefined);
	const themeId = resolveStorybookThemeId(packageId, toolbarThemeId);

	if (context.parameters.classicy?.desktop) {
		// Keyed on story + package + theme so any switch fully unmounts/remounts
		// the frame, guaranteeing the store-reset effect runs against a clean
		// component tree instead of leaking component-local state across
		// resets. `height` (not `minHeight`) is required here: ClassicyDesktop's
		// root element is styled `height: 100%`, and a percentage height only
		// resolves against an ancestor with an explicit `height`, not one that
		// merely ends up that tall via `min-height`.
		return (
			<div style={{ height: "100vh" }}>
				<ClassicyDesktopFrame
					key={`${context.id}-${packageId}-${themeId}`}
					themeId={themeId}
					// Stories that mount their own strip set `controlStrip: false`.
					controlStrip={context.parameters.classicy?.controlStrip ?? true}
					appearancePackage={appearancePackage}
				>
					<Story />
				</ClassicyDesktopFrame>
			</div>
		);
	}

	// The plain frame scopes the package's CSS; the variables are the theme's
	// under it. A story's own package keeps the toolbar theme's variables
	// (its package swapped in) and leaves the store alone; a switched package
	// also takes the store (StoryPackageScope), so its hooks follow.
	const theme = getTheme(storyPackage ? toolbarThemeId : themeId);
	// Drawn by the frame's package, as the desktop frame draws (story
	// 0235-xgi): a theme of another package takes its knobs.
	const vars = getThemeVars(
		storyPackage ? { ...theme, package: storyPackage } : theme,
		packageId,
	) as CSSProperties;
	const isCanvas = context.viewMode === "story";
	const typography: CSSProperties = {
		fontFamily: "var(--ui-font)",
		fontSize: "var(--ui-font-size)",
		color: "var(--color-black)",
	};

	const frame = (
		<ClassicySoundManagerProvider>
			<StoryFrame
				isCanvas={isCanvas}
				appearancePackage={appearancePackage}
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

	return switched ? (
		// Keyed so a story remounts under each package and theme, re-running
		// its own setup after the scope's reset.
		<StoryPackageScope
			key={`${packageId}-${themeId}`}
			packageId={packageId}
			themeId={themeId}
		>
			{frame}
		</StoryPackageScope>
	) : (
		frame
	);
};

export const withClassicy: Decorator = (Story, context) => {
	// `parameters.classicy.appearancePackage`: render the story under that
	// registered Appearance Package (e.g. "mirrored", via mirroredParameters).
	const storyPackage = context.parameters.classicy?.appearancePackage as
		| string
		| undefined;
	const chosenPackage =
		(context.globals[STORYBOOK_PACKAGE_GLOBAL] as string | undefined) ??
		STORYBOOK_DEFAULT_PACKAGE_ID;
	return (
		<StorybookPackageGate packageId={storyPackage ?? chosenPackage}>
			<ClassicyStory
				Story={Story}
				context={context}
				storyPackage={storyPackage}
				chosenPackage={chosenPackage}
			/>
		</StorybookPackageGate>
	);
};
