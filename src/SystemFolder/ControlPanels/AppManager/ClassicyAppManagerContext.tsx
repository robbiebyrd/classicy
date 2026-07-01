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
import { ClassicyDefaultAppsContext } from "@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext";
import { ClassicyAnalyticsPrefixContext } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import {
	ClassicyDefaultFileSystemContext,
	type ClassicyDefaultFileSystemMode,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import type { ClassicyFileSystemTree } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

type ClassicyAppManagerProviderProps = {
	gaMeasurementIds?: string[];
	gtmContainerId?: string;
	appName?: string;
	eventPrefix?: string;
	defaultState?: DeepPartial<ClassicyStore>;
	defaultFileSystem?: ClassicyFileSystemTree;
	defaultFileSystemMode?: ClassicyDefaultFileSystemMode;
	disableSimpleText?: boolean;
	disablePDFViewer?: boolean;
	disableMoviePlayer?: boolean;
	disablePictureViewer?: boolean;
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
	disableSimpleText,
	disablePDFViewer,
	disableMoviePlayer,
	disablePictureViewer,
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
		}),
		[defaultFileSystem, defaultFileSystemMode],
	);

	const defaultAppsContextValue = useMemo(
		() => ({
			disableSimpleText: disableSimpleText ?? false,
			disablePDFViewer: disablePDFViewer ?? false,
			disableMoviePlayer: disableMoviePlayer ?? false,
			disablePictureViewer: disablePictureViewer ?? false,
		}),
		[
			disableSimpleText,
			disablePDFViewer,
			disableMoviePlayer,
			disablePictureViewer,
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
						<ClassicySoundManagerProvider>{children}</ClassicySoundManagerProvider>
					</AnalyticsProvider>
				</ClassicyDefaultAppsContext.Provider>
			</ClassicyDefaultFileSystemContext.Provider>
		</ClassicyAnalyticsPrefixContext.Provider>
	);
};
