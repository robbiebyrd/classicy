import type { AnalyticsInstance } from "analytics";
import { useAnalytics } from "use-analytics";

/**
 * A wrapper around useAnalytics that provides a safe default when analytics context is not available.
 * This prevents errors when the library is used in environments without the Analytics provider.
 */
export const useClassicyAnalytics = () => {
	const analytics = useAnalytics();

	// If analytics is not available (no provider), return a safe default
	if (!analytics) {
		if (process.env.NODE_ENV !== "production") {
			console.warn(
				"[ClassicyAnalytics] No analytics provider found. Using no-op fallback. Wrap your app in AnalyticsProvider to enable tracking.",
			);
		}
		const noOp: AnalyticsInstance & { dispatch: (...args: unknown[]) => void } =
			{
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
		return noOp;
	}

	return analytics;
};
