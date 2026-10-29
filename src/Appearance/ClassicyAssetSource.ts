/**
 * Where an asset's bytes live: an imported URL (bundler output or a relative
 * path), an http(s) or `blob:` URL, a `data:` URI, or a URL on the host's own
 * scheme (`file:` in Electron, `app:`, `tauri:`, `chrome-extension:`, …).
 * Always a plain string so it drops straight into `url("…")`.
 */
export type ClassicyAssetSource = string;

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
/** Characters that could end or escape a quoted CSS `url("…")`. */
const UNSAFE_IN_QUOTED_CSS_URL = /["\\\r\n]/;
const SCRIPT_SCHEMES = new Set(["javascript:", "vbscript:"]);
const ALWAYS_ALLOWED_SCHEMES = new Set(["http:", "https:", "blob:", "data:"]);

/**
 * The library module's own protocol. The build resolves package assets to
 * `new URL("assets/…", import.meta.url)`, so on a `file:`/`app:`/`tauri:`/
 * extension host every bundled asset carries this scheme.
 */
const MODULE_PROTOCOL: string | undefined = (() => {
	try {
		return new URL(import.meta.url).protocol.toLowerCase();
	} catch {
		return undefined;
	}
})();

const pageProtocol = (): string | undefined =>
	globalThis.location?.protocol?.toLowerCase();

/**
 * True for a string usable as a `ClassicyAssetSource`. Every emitter quotes
 * the source (`url("…")`), so only a quote, backslash or line break is
 * refused anywhere. `javascript:` and `vbscript:` are refused outright
 * (case-insensitive, after trimming, as a URL parser reads them). Relative
 * URLs, `http:`, `https:`, `blob:` and `data:` are accepted, as is any other
 * absolute URL whose scheme is the library module's own protocol or the
 * page's; every other scheme is refused.
 */
export const isClassicyAssetSource = (
	value: unknown,
): value is ClassicyAssetSource => {
	if (typeof value !== "string" || value.length === 0) return false;
	if (UNSAFE_IN_QUOTED_CSS_URL.test(value)) return false;
	const scheme = SCHEME.exec(value.replace(/\t/g, "").trim())?.[0];
	if (scheme === undefined) return true;
	const protocol = scheme.toLowerCase();
	if (SCRIPT_SCHEMES.has(protocol)) return false;
	return (
		ALWAYS_ALLOWED_SCHEMES.has(protocol) ||
		protocol === MODULE_PROTOCOL ||
		protocol === pageProtocol()
	);
};
