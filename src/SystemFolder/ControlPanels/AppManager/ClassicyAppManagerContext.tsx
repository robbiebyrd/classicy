import googleAnalytics from "@analytics/google-analytics";
import googleTagManager from "@analytics/google-tag-manager";
import Analytics, { type AnalyticsPlugin } from "analytics";
import {
	type FC as FunctionalComponent,
	type PropsWithChildren,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { AnalyticsProvider } from "use-analytics";
import type {
	ClassicyStore,
	DeepPartial,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { mergeClassicyState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	useAppManager,
	wasHydratedFromStorage,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";
import { ClassicyAnalyticsPrefixContext } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import { ClassicyDefaultAppsContext } from "@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext";
import {
	ClassicyDefaultFileSystemContext,
	type ClassicyDefaultFileSystemMode,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import type { ClassicyFileSystemTree } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyFileSystemSeedMigration } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemSeedMigrations";

type ClassicyAppManagerProviderProps = {
	gaMeasurementIds?: string[];
	gtmContainerId?: string;
	appName?: string;
	eventPrefix?: string;
	defaultState?: DeepPartial<ClassicyStore>;
	defaultFileSystem?: ClassicyFileSystemTree;
	defaultFileSystemMode?: ClassicyDefaultFileSystemMode;
	/** One-time corrections applied to a returning visitor's persisted
	 *  filesystem tree — see ClassicyFileSystemSeedMigrations.ts. */
	defaultFileSystemSeedMigrations?: ClassicyFileSystemSeedMigration[];
	disableSimpleText?: boolean;
	disablePDFViewer?: boolean;
	disableMoviePlayer?: boolean;
	disablePictureViewer?: boolean;
	disableHyperCard?: boolean;
	disableWebViewer?: boolean;
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
	disableSimpleText,
	disablePDFViewer,
	disableMoviePlayer,
	disablePictureViewer,
	disableHyperCard,
	disableWebViewer,
	defaultMuted,
}) => {
	const seeded = useRef(false);
	useEffect(() => {
		if (seeded.current || !defaultState || wasHydratedFromStorage()) return;
		seeded.current = true;
		useAppManager.setState((s) =>
			mergeClassicyState(s as ClassicyStore, defaultState),
		);
	}, [defaultState]);

	const fsContextValue = useMemo(
		() => ({
			defaultFileSystem,
			mode: defaultFileSystemMode ?? ("merge" as const),
			seedMigrations: defaultFileSystemSeedMigrations,
		}),
		[defaultFileSystem, defaultFileSystemMode, defaultFileSystemSeedMigrations],
	);

	const defaultAppsContextValue = useMemo(
		() => ({
			disableSimpleText: disableSimpleText ?? false,
			disablePDFViewer: disablePDFViewer ?? false,
			disableMoviePlayer: disableMoviePlayer ?? false,
			disablePictureViewer: disablePictureViewer ?? false,
			disableHyperCard: disableHyperCard ?? false,
			disableWebViewer: disableWebViewer ?? false,
		}),
		[
			disableSimpleText,
			disablePDFViewer,
			disableMoviePlayer,
			disablePictureViewer,
			disableHyperCard,
			disableWebViewer,
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
