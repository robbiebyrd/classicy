import googleAnalytics from "@analytics/google-analytics";
import googleTagManager from "@analytics/google-tag-manager";
import Analytics, { type AnalyticsPlugin } from "analytics";
import {
	type FC as FunctionalComponent,
	type PropsWithChildren,
	useEffect,
	useInsertionEffect,
	useMemo,
	useRef,
} from "react";
import { AnalyticsProvider } from "use-analytics";
import type {
	ClassicyStore,
	DeepPartial,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	useAppManager,
	wasDefaultStateSeedApplied,
	wasHydratedFromStorage,
	withClassicyDefaultStateSeed,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";
import { ClassicyAnalyticsPrefixContext } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import { ClassicyDefaultAppsContext } from "@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext";
import {
	publishClassicyDesktopFileSystemStorageKey,
	withdrawClassicyDesktopFileSystemStorageKey,
} from "@/SystemFolder/SystemResources/File/ClassicyDesktopFileSystemKey.internal";
import {
	ClassicyDefaultFileSystemContext,
	type ClassicyDefaultFileSystemMode,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import type { ClassicyFileSystemTree } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyFileSystemSeedMigration } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemSeedMigrations";

export type ClassicyAppManagerProviderProps = {
	gaMeasurementIds?: string[];
	gtmContainerId?: string;
	appName?: string;
	eventPrefix?: string;
	defaultState?: DeepPartial<ClassicyStore>;
	defaultFileSystem?: ClassicyFileSystemTree;
	defaultFileSystemMode?: ClassicyDefaultFileSystemMode;
	/** The localStorage key the desktop's file system is kept under (default
	 *  `"classicyStorage"`): the Finder's, every built-in app's and Recent
	 *  Items' file system, and any `useClassicyFileSystem()` or
	 *  `useClassicyFileSystemAccessor()` called without a key of its own. */
	fileSystemStorageKey?: string;
	/** One-time corrections applied to a returning visitor's persisted
	 *  filesystem tree — see ClassicyFileSystemSeedMigrations.ts. */
	defaultFileSystemSeedMigrations?: ClassicyFileSystemSeedMigration[];
	disableSimpleText?: boolean;
	disablePDFViewer?: boolean;
	disableMoviePlayer?: boolean;
	disablePictureViewer?: boolean;
	disableHyperCard?: boolean;
	disableWebViewer?: boolean;
	disableCalculator?: boolean;
	/** Boot with sound off. First-mount default only; user can unmute at runtime. */
	defaultMuted?: boolean;
};

const getOrCreateUserId = (storageKey: string): string => {
	const existing = localStorage.getItem(storageKey);
	if (existing) return existing;
	const secureFallbackId = () => {
		const bytes = new Uint8Array(16);
		crypto.getRandomValues(bytes);
		return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
	};
	const id = crypto?.randomUUID?.() ?? secureFallbackId();
	localStorage.setItem(storageKey, id);
	return id;
};

export const ClassicyAppManagerProvider: FunctionalComponent<
	PropsWithChildren<ClassicyAppManagerProviderProps>
> = ({
	children,
	gtmContainerId,
	gaMeasurementIds,
	appName = "classicy",
	eventPrefix = "classicy_",
	defaultState,
	defaultFileSystem,
	defaultFileSystemMode,
	defaultFileSystemSeedMigrations,
	fileSystemStorageKey,
	disableSimpleText,
	disablePDFViewer,
	disableMoviePlayer,
	disablePictureViewer,
	disableHyperCard,
	disableWebViewer,
	disableCalculator,
	defaultMuted,
}) => {
	const seeded = useRef(false);
	useEffect(() => {
		// Once per page session: a remount (a route, a `key`, Fast Refresh, a
		// second provider) must not seed again over the user's state.
		if (
			seeded.current ||
			!defaultState ||
			wasHydratedFromStorage() ||
			wasDefaultStateSeedApplied()
		) {
			return;
		}
		seeded.current = true;
		// Merged deeply over the live state (H-R17), a seed's theme tweaks on
		// the defaults of the package it names and forked into a custom theme,
		// so they persist (withClassicyDefaultStateSeed).
		useAppManager.setState((s) =>
			withClassicyDefaultStateSeed(s as ClassicyStore, defaultState),
		);
	}, [defaultState]);

	// For reducers, which read no context (Recent Items' documents):
	// published only when the provider commits, and before any child's
	// layout or passive effect runs (insertion effects run first in a
	// commit), so a child dispatching as it mounts reads it; a render that
	// never commits (an error above, a suspended tree) publishes nothing.
	// Withdrawn when the provider unmounts; a changed key keeps the
	// provider's place among mounted providers.
	const fileSystemKeyToken = useRef<symbol>(
		Symbol("ClassicyAppManagerProvider"),
	);
	useInsertionEffect(() => {
		const token = fileSystemKeyToken.current;
		return () => withdrawClassicyDesktopFileSystemStorageKey(token);
	}, []);
	useInsertionEffect(() => {
		publishClassicyDesktopFileSystemStorageKey(
			fileSystemKeyToken.current,
			fileSystemStorageKey,
		);
	}, [fileSystemStorageKey]);
	const fsContextValue = useMemo(
		() => ({
			storageKey: fileSystemStorageKey,
			defaultFileSystem,
			mode: defaultFileSystemMode ?? ("merge" as const),
			seedMigrations: defaultFileSystemSeedMigrations,
		}),
		[
			fileSystemStorageKey,
			defaultFileSystem,
			defaultFileSystemMode,
			defaultFileSystemSeedMigrations,
		],
	);

	const defaultAppsContextValue = useMemo(
		() => ({
			disableSimpleText: disableSimpleText ?? false,
			disablePDFViewer: disablePDFViewer ?? false,
			disableMoviePlayer: disableMoviePlayer ?? false,
			disablePictureViewer: disablePictureViewer ?? false,
			disableHyperCard: disableHyperCard ?? false,
			disableWebViewer: disableWebViewer ?? false,
			disableCalculator: disableCalculator ?? false,
		}),
		[
			disableSimpleText,
			disablePDFViewer,
			disableMoviePlayer,
			disablePictureViewer,
			disableHyperCard,
			disableWebViewer,
			disableCalculator,
		],
	);

	const analytics = useMemo(() => {
		const plugins: AnalyticsPlugin[] = [];

		if (gaMeasurementIds && gaMeasurementIds.length > 0) {
			plugins.push(googleAnalytics({ measurementIds: gaMeasurementIds }));
		}

		if (gtmContainerId) {
			plugins.push(googleTagManager({ containerId: gtmContainerId }));
		}

		return Analytics({ app: appName, plugins: plugins });
	}, [appName, gaMeasurementIds, gtmContainerId]);

	useEffect(() => {
		const userId = getOrCreateUserId(`${appName}_user_id`);
		analytics.identify(userId);
	}, [analytics, appName]);

	return (
		<ClassicyAnalyticsPrefixContext.Provider value={eventPrefix}>
			<ClassicyDefaultFileSystemContext.Provider value={fsContextValue}>
				<ClassicyDefaultAppsContext.Provider value={defaultAppsContextValue}>
					<AnalyticsProvider instance={analytics}>
						<ClassicySoundManagerProvider defaultMuted={defaultMuted}>
							{children}
						</ClassicySoundManagerProvider>
					</AnalyticsProvider>
				</ClassicyDefaultAppsContext.Provider>
			</ClassicyDefaultFileSystemContext.Provider>
		</ClassicyAnalyticsPrefixContext.Provider>
	);
};
