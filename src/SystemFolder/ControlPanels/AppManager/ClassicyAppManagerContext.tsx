import googleAnalytics from "@analytics/google-analytics";
import googleTagManager from "@analytics/google-tag-manager";
import Analytics, { type AnalyticsPlugin } from "analytics";
import {
	type FC as FunctionalComponent,
	type PropsWithChildren,
	useEffect,
	useMemo,
} from "react";
import { AnalyticsProvider } from "use-analytics";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";
import { ClassicyAnalyticsPrefixContext } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

type ClassicyAppManagerProviderProps = {
	gaMeasurementIds?: string[];
	gtmContainerId?: string;
	appName?: string;
	eventPrefix?: string;
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
> = ({ children, gtmContainerId, gaMeasurementIds, appName = "classicy", eventPrefix = "classicy_" }) => {
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
			<AnalyticsProvider instance={analytics}>
				<ClassicySoundManagerProvider>{children}</ClassicySoundManagerProvider>
			</AnalyticsProvider>
		</ClassicyAnalyticsPrefixContext.Provider>
	);
};
