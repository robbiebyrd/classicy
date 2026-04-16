export const normalizeUrl = (u: string): string => {
	try {
		const parsed = new URL(u);
		if (parsed.hostname.startsWith("www.")) {
			parsed.hostname = parsed.hostname.slice(4);
		}
		return parsed.toString().replace(/\/+$/, "");
	} catch {
		return u.replace(/\/+$/, "");
	}
};
