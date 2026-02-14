declare module "*.svg" {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

declare module "*.png" {
  const value: unknown;
  export default value;
}

declare module "@analytics/google-tag-manager" {
  type AnalyticsPlugin = import("analytics").AnalyticsPlugin;

  type GoogleTagManagerConfig = {
    auth?: string;
    containerId: string;
    customScriptSrc?: string;
    dataLayerName?: string;
    debug?: boolean;
    execution?: string;
    preview?: string;
  };

  function googleTagManager(config: GoogleTagManagerConfig): AnalyticsPlugin;

  export default googleTagManager;
}

declare module "@analytics/google-analytics" {
  type GoogleAnalyticsOptions = {
    /** Google Analytics MEASUREMENT IDs */
    measurementIds: string[];

    /** Enable Google Analytics debug mode */
    debug?: boolean;

    /** The optional name for dataLayer object. Defaults to 'ga4DataLayer'. */
    dataLayerName?: string;

    /** The optional name for the global gtag function. Defaults to 'gtag'. */
    gtagName?: string;

    /** Configuration for gtag, including anonymizing IP and cookie settings */
    gtagConfig?: {
      anonymize_ip?: boolean;
      cookie_domain?: string;
      cookie_expires?: number;
      cookie_prefix?: string;
      cookie_update?: boolean;
      cookie_flags?: string;
    };

    /** Custom URL for google analytics script, if proxying calls */
    customScriptSrc?: string;
  };

  type AnalyticsPlugin = {
    /** Name of plugin */
    name: string;

    /** Exposed events of the plugin */
    EVENTS?: unknown;

    /** Configuration of the plugin */
    config?: unknown;

    /** Method to load analytics scripts */
    initialize?: (...params: unknown[]) => unknown;

    /** Page visit tracking method */
    page?: (...params: unknown[]) => unknown;

    /** Custom event tracking method */
    track?: (...params: unknown[]) => unknown;

    /** User identify method */
    identify?: (...params: unknown[]) => unknown;

    /** Function to determine if analytics script is loaded */
    loaded?: (...params: unknown[]) => unknown;

    /** Fire function when the plugin is ready */
    ready?: (...params: unknown[]) => unknown;
  };

  function GoogleAnalytics(options: GoogleAnalyticsOptions): AnalyticsPlugin;

  export default GoogleAnalytics;
}
