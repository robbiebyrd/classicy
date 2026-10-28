/**
 * Where an asset's bytes live: an imported URL (bundler output or a relative
 * path), an http(s) URL, or a `data:` URI. Always a plain string so it drops
 * straight into `url("…")`.
 */
export type ClassicyAssetSource = string;

const OTHER_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const UNSAFE_IN_CSS_URL = /["\\)\s]/;

/**
 * True for a string usable as a `ClassicyAssetSource`: a `data:` URI, an
 * http(s) URL, or a scheme-less (imported / relative) URL. Any other scheme
 * (`javascript:`, `file:`, …) and anything that could break out of a quoted
 * CSS `url("…")` is refused. `data:` URIs may contain spaces and parentheses
 * (inline SVG), so only quotes, backslashes and line breaks are refused there.
 */
export const isClassicyAssetSource = (
	value: unknown,
): value is ClassicyAssetSource => {
	if (typeof value !== "string" || value.length === 0) return false;
	if (/^data:/i.test(value)) return !/["\\\r\n]/.test(value);
	if (/^https?:\/\//i.test(value)) return !UNSAFE_IN_CSS_URL.test(value);
	if (OTHER_SCHEME.test(value)) return false;
	return !UNSAFE_IN_CSS_URL.test(value);
};
