// Side-effect module: registers an example search source, so the example's
// Find File shows a "Search Internet" tab (story 0227-815). A host's source
// would search its own archive or API; this one searches a small catalog,
// after a short wait (as a network search would), and stops as soon as the
// search is aborted (a new search, Stop, or Find File quitting).
import {
	type ClassicyFindResult,
	dispatch,
	registerClassicyFindSource,
} from "@classicy/classicy";

// Classic Mac OS releases, each opening on Infinite Mac in a new browser tab
// (a site's own page may refuse to be framed in the Web Viewer).
const release = (name: string, year: number, disk: string) => ({
	name: `${name} (${year})`,
	kind: "system software",
	url: `https://infinitemac.org/${year}/${encodeURIComponent(disk)}`,
});

const CATALOG: readonly { name: string; kind: string; url: string }[] = [
	release("System 6.0.8", 1991, "System 6.0.8"),
	release("System 7.1", 1992, "System 7.1"),
	release("System 7.5.3", 1996, "System 7.5.3"),
	release("Mac OS 8.1", 1998, "Mac OS 8.1"),
	release("Mac OS 8.5", 1998, "Mac OS 8.5"),
	release("Mac OS 9.0.4", 2000, "Mac OS 9.0.4"),
];

/** Wait `ms`, or reject at once when `signal` aborts. */
const wait = (ms: number, signal: AbortSignal) =>
	new Promise<void>((resolve, reject) => {
		const timer = setTimeout(resolve, ms);
		signal.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				reject(signal.reason);
			},
			{ once: true },
		);
	});

registerClassicyFindSource({
	id: "example-mac-os-releases",
	name: "Mac OS Releases",
	search: async (query, { signal }) => {
		await wait(300, signal);
		const words = query.toLowerCase().split(/\s+/).filter(Boolean);
		return CATALOG.filter((item) =>
			words.every((w) => item.name.toLowerCase().includes(w)),
		).map(
			(item): ClassicyFindResult => ({
				name: item.name,
				kind: item.kind,
				// Opens the release in a new browser tab.
				open: () =>
					dispatch({
						type: "ClassicyDesktopOpenUrl",
						url: item.url,
						disposition: "browser-new",
						title: item.name,
					}),
			}),
		);
	},
});
