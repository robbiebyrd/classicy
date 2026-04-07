import {useState, useCallback, useRef, useEffect} from "react";

const PROXY_BASE = "http://localhost:8765";
const DEFAULT_TIME = "20010911000000";

const PROXY_PORT = new URL(PROXY_BASE).port;

const formatArchiveTime = (time: string): string => {
	const match = time.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
	if (!match) return time;
	const [, y, mo, d, h, mi, s] = match;
	const utc = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
	return utc.toLocaleString(undefined, {
		dateStyle: "short",
		timeStyle: "short",
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	});
};

const extractOriginalUrl = (href: string): string | null => {
	// Proxy URL — extract the url query param (match on port to handle
	// localhost vs 127.0.0.1 vs 0.0.0.0 differences)
	try {
		const parsed = new URL(href);
		if (parsed.port === PROXY_PORT && parsed.searchParams.has("url")) {
			return parsed.searchParams.get("url");
		}
	} catch {
		/* not a valid URL, fall through */
	}

	// Archive.org link — extract the original URL after the timestamp
	const match = href.match(/\/web\/\d+\*?\/(.+)/);
	return match ? match[1] : null;
};

const isNavigableUrl = (href: string): boolean => {
	try {
		const url = new URL(href);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
};

interface UseBrowserNavigationOptions {
	defaultUrl: string;
	archiveTime?: string;
	onShowError: () => void;
	onRecordVisit: (url: string) => void;
}

export const useBrowserNavigation = ({
	defaultUrl,
	archiveTime = DEFAULT_TIME,
	onShowError,
	onRecordVisit,
}: UseBrowserNavigationOptions) => {
	const [history, setHistory] = useState<string[]>([defaultUrl]);
	const [historyIndex, setHistoryIndex] = useState(0);
	const [htmlContent, setHtmlContent] = useState<string>("");
	const [addressBarValue, setAddressBarValue] = useState(defaultUrl);
	const [isLoading, setIsLoading] = useState(true);
	const [statusText, setStatusText] = useState("");
	const [pageTitle, setPageTitle] = useState("");
	const abortControllerRef = useRef<AbortController | null>(null);

	const canGoBack = historyIndex > 0;
	const canGoForward = historyIndex < history.length - 1;

	const fetchPage = useCallback(
		async (url: string) => {
			abortControllerRef.current?.abort();
			const controller = new AbortController();
			abortControllerRef.current = controller;

			setIsLoading(true);
			setStatusText(`Loading ${url}...`);

			try {
				const proxyUrl = `${PROXY_BASE}/?url=${encodeURIComponent(url)}&time=${archiveTime}`;
				const response = await fetch(proxyUrl, { signal: controller.signal });

				if (!response.ok) {
					setStatusText(`Error: ${response.status}`);
					setHtmlContent(
						`<p>Could not load page: ${response.status} ${response.statusText}</p>`,
					);
					return;
				}

				const html = await response.text();
				setHtmlContent(html);
				const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
				setPageTitle(titleMatch ? titleMatch[1].trim() : "");
				const actualTime =
					response.headers.get("X-Archive-Time") || archiveTime;
				setStatusText(`Viewing page archived ${formatArchiveTime(actualTime)}`);
			} catch (e: unknown) {
				if (e instanceof DOMException && e.name === "AbortError") return;
				console.error("[Browser] Failed to fetch page", { url, error: e });
				setStatusText("Error loading page");
				setHtmlContent(
					"<p>Could not connect to TimeMachine server. Is it running?</p>",
				);
			} finally {
				if (!controller.signal.aborted) {
					setIsLoading(false);
				}
			}
		},
		[archiveTime],
	);

	// Load default page on mount
	useEffect(() => {
		onRecordVisit(defaultUrl);
		fetchPage(defaultUrl);
	}, [defaultUrl, fetchPage, onRecordVisit]);

	// Cleanup abort controller on unmount
	useEffect(() => {
		return () => abortControllerRef.current?.abort();
	}, []);

	const navigateTo = useCallback(
		(url: string) => {
			// Skip if already on this page (normalize trailing slash and www.)
			const normalize = (u: string) => {
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
			setHistory((h) => {
				const idx = historyIndexRef.current;
				const currentUrl = h[idx];
				if (currentUrl && normalize(currentUrl) === normalize(url)) {
					return h;
				}
				const newHistory = [...h.slice(0, idx + 1), url];
				setHistoryIndex(newHistory.length - 1);
				return newHistory;
			});
			setAddressBarValue(url);
			onRecordVisit(url);
			fetchPage(url);
		},
		[fetchPage, onRecordVisit],
	);

	// Stable refs so handleContentClick doesn't churn
	const navigateToRef = useRef(navigateTo);
	useEffect(() => {
		navigateToRef.current = navigateTo;
	}, [navigateTo]);

	const historyRef = useRef(history);
	useEffect(() => {
		historyRef.current = history;
	}, [history]);

	const historyIndexRef = useRef(historyIndex);
	useEffect(() => {
		historyIndexRef.current = historyIndex;
	}, [historyIndex]);

	const goTo = useCallback(
		(urlOverride?: string) => {
			const value = (urlOverride ?? addressBarValue).trim();
			if (!isNavigableUrl(value)) {
				onShowError();
				return;
			}
			navigateTo(value);
		},
		[addressBarValue, navigateTo, onShowError],
	);

	const goBack = useCallback(() => {
		if (!canGoBack) return;
		const newIndex = historyIndex - 1;
		setHistoryIndex(newIndex);
		setAddressBarValue(history[newIndex]);
		fetchPage(history[newIndex]);
	}, [canGoBack, historyIndex, history, fetchPage]);

	const goForward = useCallback(() => {
		if (!canGoForward) return;
		const newIndex = historyIndex + 1;
		setHistoryIndex(newIndex);
		setAddressBarValue(history[newIndex]);
		fetchPage(history[newIndex]);
	}, [canGoForward, historyIndex, history, fetchPage]);

	const refresh = useCallback(() => {
		fetchPage(history[historyIndex]);
	}, [history, historyIndex, fetchPage]);

	const handleContentClick = useCallback(
		(link: { href: string; rawHref: string }) => {
			if (!link.rawHref) return;

			// First check if the resolved href is a proxy/archive URL we can extract
			const originalUrl = extractOriginalUrl(link.href);
			if (originalUrl && isNavigableUrl(originalUrl)) {
				navigateToRef.current(originalUrl);
				return;
			}

			// Resolve relative URLs against the current page URL
			const currentUrl = historyRef.current[historyIndexRef.current];
			try {
				const resolved = new URL(link.rawHref, currentUrl).href;
				if (isNavigableUrl(resolved)) {
					navigateToRef.current(resolved);
					return;
				}
			} catch {
				/* invalid URL, fall through */
			}

			if (isNavigableUrl(link.href)) {
				navigateToRef.current(link.href);
			}
		},
		[],
	);

	return {
		htmlContent,
		pageTitle,
		addressBarValue,
		setAddressBarValue,
		isLoading,
		statusText,
		canGoBack,
		canGoForward,
		goTo,
		goBack,
		goForward,
		refresh,
		handleContentClick,
	};
};
