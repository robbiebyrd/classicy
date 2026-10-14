// Strip trailing slashes with a scan rather than /\/+$/, which backtracks
// quadratically on a string with many slashes not at its end.
const trimTrailingSlashes = (s: string): string => {
	let end = s.length;
	while (end > 0 && s.charCodeAt(end - 1) === 47 /* "/" */) end--;
	return s.slice(0, end);
};

export const normalizeUrl = (u: string): string => {
	try {
		const parsed = new URL(u);
		if (parsed.hostname.startsWith("www.")) {
			parsed.hostname = parsed.hostname.slice(4);
		}
		return trimTrailingSlashes(parsed.toString());
	} catch {
		return trimTrailingSlashes(u);
	}
};
