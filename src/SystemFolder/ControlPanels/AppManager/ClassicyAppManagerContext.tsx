import googleAnalytics from "@analytics/google-analytics";
import googleTagManager from "@analytics/google-tag-manager";
import Analytics, { type AnalyticsPlugin } from "analytics";
import {
	type FC as FunctionalComponent,
	type PropsWithChildren,
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

	return (
		<ClassicyAnalyticsPrefixContext.Provider value={eventPrefix}>
			<AnalyticsProvider instance={analytics}>
				<ClassicySoundManagerProvider>{children}</ClassicySoundManagerProvider>
			</AnalyticsProvider>
		</ClassicyAnalyticsPrefixContext.Provider>
	);
};
