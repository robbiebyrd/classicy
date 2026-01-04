import { useAnalytics } from 'use-analytics'

/**
 * A wrapper around useAnalytics that provides a safe default when analytics context is not available.
 * This prevents errors when the library is used in environments without the Analytics provider.
 */
export const useClassicyAnalytics = () => {
    const analytics = useAnalytics()
    
    // If analytics is not available (no provider), return a safe default
    if (!analytics) {
        return {
            track: (..._args: any[]) => {},
            page: (..._args: any[]) => {},
            identify: (..._args: any[]) => {},
            reset: (..._args: any[]) => {},
            ready: (..._args: any[]) => {},
            dispatch: (..._args: any[]) => {},
            getState: (..._args: any[]) => ({ context: {}, user: {}, plugins: {} }),
            storage: {
                getItem: (..._args: any[]): any => null,
                setItem: (..._args: any[]) => {},
                removeItem: (..._args: any[]) => {}
            },
            plugins: {
                enable: (..._args: any[]) => {},
                disable: (..._args: any[]) => {}
            }
        }
    }
    
    return analytics
}
