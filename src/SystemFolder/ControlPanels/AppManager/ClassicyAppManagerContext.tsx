import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import googleAnalytics from "@analytics/google-analytics";
import googleTagManager from "@analytics/google-tag-manager";
import Analytics, { AnalyticsPlugin } from "analytics";
import React, { useEffect, useMemo, useReducer, useState } from "react";
import { AnalyticsProvider } from "use-analytics";
import {
  classicyDesktopStateEventReducer,
  ClassicyStore,
  DefaultAppManagerState,
} from "./ClassicyAppManager";
import {
  ClassicyAppManagerContext,
  ClassicyAppManagerDispatchContext,
} from "./ClassicyAppManagerUtils";

type ClassicyAppManagerProviderProps = {
  gaMeasurementIds?: string[];
  gtmContainerId?: string;
  appName?: string;
};

export const ClassicyAppManagerProvider: React.FC<
  React.PropsWithChildren<ClassicyAppManagerProviderProps>
> = ({ children, gtmContainerId, gaMeasurementIds, appName = "classicy" }) => {
  const [appManagerState, setAppManagerState] = useState<ClassicyStore>(
    DefaultAppManagerState,
  );

  const [appManager, dispatch] = useReducer(
    classicyDesktopStateEventReducer,
    appManagerState,
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
    if (typeof window !== "undefined") {
      try {
        const storedState = localStorage.getItem("classicyDesktopState");
        setAppManagerState(
          storedState ? JSON.parse(storedState) : DefaultAppManagerState,
        );
      } catch (error) {
        console.log(error);
      }
    } else {
      setAppManagerState(DefaultAppManagerState);
    }
  }, []);

  // Debounce localStorage writes to prevent blocking main thread
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem("classicyDesktopState", JSON.stringify(appManager));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [appManager]);

  return (
    <AnalyticsProvider instance={analytics}>
      <ClassicyAppManagerContext.Provider value={appManager}>
        <ClassicyAppManagerDispatchContext.Provider value={dispatch}>
          <ClassicySoundManagerProvider>
            {children}
          </ClassicySoundManagerProvider>
        </ClassicyAppManagerDispatchContext.Provider>
      </ClassicyAppManagerContext.Provider>
    </AnalyticsProvider>
  );
};
