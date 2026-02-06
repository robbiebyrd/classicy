import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import googleAnalytics from "@analytics/google-analytics";
import googleTagManager from "@analytics/google-tag-manager";
import Analytics, { AnalyticsPlugin } from "analytics";
import React, { useMemo } from "react";
import { AnalyticsProvider } from "use-analytics";

type ClassicyAppManagerProviderProps = {
  gaMeasurementIds?: string[];
  gtmContainerId?: string;
  appName?: string;
};

export const ClassicyAppManagerProvider: React.FC<
  React.PropsWithChildren<ClassicyAppManagerProviderProps>
> = ({ children, gtmContainerId, gaMeasurementIds, appName = "classicy" }) => {
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
    <AnalyticsProvider instance={analytics}>
      <ClassicySoundManagerProvider>{children}</ClassicySoundManagerProvider>
    </AnalyticsProvider>
  );
};
