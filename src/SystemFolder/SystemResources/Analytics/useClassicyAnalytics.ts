import type { AnalyticsInstance } from "analytics";
import { createContext, useContext, useMemo } from "react";
import { useAnalytics } from "use-analytics";

export const ClassicyAnalyticsPrefixContext =
	createContext<string>("classicy_");

const noOpAnalytics: AnalyticsInstance & {
	dispatch: (...args: unknown[]) => void;
} = {
	track: () => Promise.resolve(),
	page: () => Promise.resolve(),
	identify: () => Promise.resolve(),
	reset: () => Promise.resolve(),
	ready: () => () => {},
	dispatch: () => {},
	on: () => () => {},
	once: () => () => {},
	user: () => "",
	getState: () => ({ context: {}, user: {}, plugins: {} }),
	storage: {
		getItem: (): unknown => null,
		setItem: () => {},
		removeItem: () => {},
	},
	plugins: {
		enable: () => Promise.resolve(),
		disable: () => Promise.resolve(),
	},
};

/**
 * A wrapper around useAnalytics that provides a safe default when analytics context is not available.
 * This prevents errors when the library is used in environments without the Analytics provider.
 * All event names are prefixed with the value from ClassicyAnalyticsPrefixContext (default: "classicy_").
 *
 * The returned object (and its `track`) is referentially stable across renders
 * — consumers put `track` in effect dependency arrays, and an unstable identity
 * re-fires those effects every render (ClassicyAboutWindow's focus dispatch
 * looped into a "Maximum update depth exceeded" crash this way).
 */
export const useClassicyAnalytics = () => {
	const analytics = useAnalytics();
	const prefix = useContext(ClassicyAnalyticsPrefixContext);

	return useMemo(() => {
		// If analytics is not available (no provider), return a safe default
		if (!analytics) {
			if (process.env.NODE_ENV !== "production") {
				console.warn(
					"[ClassicyAnalytics] No analytics provider found. Using no-op fallback. Wrap your app in AnalyticsProvider to enable tracking.",
				);
			}
			return noOpAnalytics;
		}

		return {
			...analytics,
			track: (eventName: string, payload?: Record<string, unknown>) =>
				analytics.track(`${prefix}${eventName}`, payload),
		};
	}, [analytics, prefix]);
};
