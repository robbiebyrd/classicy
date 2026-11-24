/**
 * Search sources: a host's own content made findable in Find File (story
 * 0227-815), as Mac OS 8.5's Sherlock searched its Internet plug-ins.
 * `registerClassicyFindSource({ id, name, search })` adds one; Find File
 * lists every source as a channel the user can switch on or off, sends each
 * the words typed, and shows what each returns.
 *
 * A source searches asynchronously: `search(query, { signal })` returns a
 * promise of results, and `signal` aborts when a new search starts, when the
 * user stops it, when Find File quits, or when the source has not answered
 * within its `timeoutMs`. One source failing never stops the others: its
 * error is logged through `classicyLog` and its results are simply missing.
 *
 * The tab and the list that hold the sources take Sherlock's words, "Search
 * Internet" and "Search Sites", unless a source was registered with its own
 * (`registerClassicyFindSource(source, { labels })`), for a host whose
 * content is not on the Internet.
 */
import { useSyncExternalStore } from "react";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/** One item a source found. */
export interface ClassicyFindResult {
	/** The name the results list shows. */
	name: string;
	/** What it is, in the list's Kind column ("web page", "photo", …). */
	kind: string;
	/** An optional small icon (URL or data URI). */
	icon?: string;
	/**
	 * Open it: called when the user opens the result. It may return a
	 * promise; one that rejects is logged, as a throw is.
	 */
	open: () => unknown;
}

export interface ClassicyFindSearchOptions {
	/** Aborted when the search is superseded or stopped: stop work and settle. */
	signal: AbortSignal;
}

/** A host's search channel. */
export interface ClassicyFindSource {
	/** Unique; registering an id again replaces that source. */
	id: string;
	/** The channel's name, in Find File's list and the results' Site column. */
	name: string;
	/** An optional small icon for the channel list. */
	icon?: string;
	/** Search for `query` (the words typed); resolve with the results. */
	search: (
		query: string,
		options: ClassicyFindSearchOptions,
	) => Promise<readonly ClassicyFindResult[]>;
	/**
	 * How long a search may take, in milliseconds, before Find File gives up
	 * on this source: its `signal` aborts, its late answer is dropped and a
	 * warning is logged. Defaults to `CLASSICY_FIND_SOURCE_TIMEOUT_MS`.
	 */
	timeoutMs?: number;
}

/**
 * How long a source may take before Find File gives up on it (30 seconds).
 * Classicy's own bound, so a source that never settles cannot hold a search
 * open; Sherlock's own limit was not observed.
 */
export const CLASSICY_FIND_SOURCE_TIMEOUT_MS = 30_000;

/** The words of the tab and the list that hold the sources. */
export interface ClassicyFindSourceLabels {
	/** The tab's title (Sherlock: "Search Internet"). */
	tab: string;
	/** The title of the list of sources (Sherlock: "Search Sites"). */
	sites: string;
	/** The results' column naming each result's source (Sherlock: "Site"). */
	site: string;
}

/** Sherlock's words (Mac OS 8.5), the labels when no source names its own. */
export const CLASSICY_FIND_SOURCE_LABELS: Readonly<ClassicyFindSourceLabels> =
	Object.freeze({
		tab: "Search Internet",
		sites: "Search Sites",
		site: "Site",
	});

export interface ClassicyFindSourceRegistrationOptions {
	/**
	 * Words of the host's own for the tab, the list of sources and the
	 * results' site column, in place of Sherlock's ("Search Internet",
	 * "Search Sites", "Site"): for content that is not on the Internet. The
	 * first source registered with labels names them; a label left out keeps
	 * Sherlock's word.
	 */
	labels?: Partial<ClassicyFindSourceLabels>;
}

const LOG = "ClassicyFindFile";

const sources = new Map<string, ClassicyFindSource>();
const sourceLabels = new Map<string, Partial<ClassicyFindSourceLabels>>();
const listeners = new Set<() => void>();
let snapshot: readonly ClassicyFindSource[] = [];
let labelsSnapshot: Readonly<ClassicyFindSourceLabels> =
	CLASSICY_FIND_SOURCE_LABELS;

/** The labels of the first source (in registration order) that has some. */
const currentLabels = (): Readonly<ClassicyFindSourceLabels> => {
	for (const id of sources.keys()) {
		const own = sourceLabels.get(id);
		if (own) return Object.freeze({ ...CLASSICY_FIND_SOURCE_LABELS, ...own });
	}
	return CLASSICY_FIND_SOURCE_LABELS;
};

const publish = () => {
	snapshot = Object.freeze([...sources.values()]);
	const next = currentLabels();
	if (
		next.tab !== labelsSnapshot.tab ||
		next.sites !== labelsSnapshot.sites ||
		next.site !== labelsSnapshot.site
	) {
		labelsSnapshot = next;
	}
	for (const listener of listeners) listener();
};

/** Remove the source `id`. Returns whether one was registered. */
export function unregisterClassicyFindSource(id: string): boolean {
	if (!sources.delete(id)) return false;
	sourceLabels.delete(id);
	publish();
	return true;
}

/** A label is a short line of text: kept when it is one, else dropped. */
const usableLabel = (value: unknown): value is string =>
	typeof value === "string" &&
	value.trim() !== "" &&
	value.length <= 64 &&
	!/[\n\r]/.test(value);

const labelsOf = (
	options: ClassicyFindSourceRegistrationOptions | undefined,
	id: string,
): Partial<ClassicyFindSourceLabels> | undefined => {
	const given = options?.labels;
	if (given === undefined) return undefined;
	const kept: Partial<ClassicyFindSourceLabels> = {};
	for (const key of ["tab", "sites", "site"] as const) {
		const value = given?.[key];
		if (value === undefined) continue;
		if (usableLabel(value)) kept[key] = value.trim();
		else {
			classicyLog(
				"warn",
				LOG,
				`Ignoring search source "${id}"'s ${key} label: give a single line of 1 to 64 characters`,
				{ id, label: key },
			);
		}
	}
	return Object.keys(kept).length > 0 ? kept : undefined;
};

/**
 * Make a host's content findable: Find File shows `source` as a channel.
 * Call it at module scope or from an effect; registering an `id` again
 * replaces that source in its place. Returns the unregister.
 */
export function registerClassicyFindSource(
	source: ClassicyFindSource,
	options?: ClassicyFindSourceRegistrationOptions,
): () => void {
	if (
		!source ||
		typeof source.id !== "string" ||
		source.id === "" ||
		typeof source.name !== "string" ||
		source.name === "" ||
		typeof source.search !== "function"
	) {
		classicyLog(
			"warn",
			LOG,
			"Ignoring a search source without an id, a name and a search function",
			{ id: source?.id },
		);
		return () => {};
	}
	sources.set(source.id, source);
	const labels = labelsOf(options, source.id);
	if (labels) sourceLabels.set(source.id, labels);
	else sourceLabels.delete(source.id);
	publish();
	return () => {
		if (sources.get(source.id) === source)
			unregisterClassicyFindSource(source.id);
	};
}

/** Every registered source, in registration order. */
export function listClassicyFindSources(): readonly ClassicyFindSource[] {
	return snapshot;
}

/** Be told when a source registers or unregisters. */
export function subscribeClassicyFindSources(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The registered sources, live (a component re-renders when they change). */
export const useClassicyFindSources = (): readonly ClassicyFindSource[] =>
	useSyncExternalStore(
		subscribeClassicyFindSources,
		listClassicyFindSources,
		listClassicyFindSources,
	);

/**
 * The words of the sources' tab, list and site column: the first labeled
 * source's, else Sherlock's (`CLASSICY_FIND_SOURCE_LABELS`).
 */
export function getClassicyFindSourceLabels(): Readonly<ClassicyFindSourceLabels> {
	return labelsSnapshot;
}

/** `getClassicyFindSourceLabels`, live. */
export const useClassicyFindSourceLabels =
	(): Readonly<ClassicyFindSourceLabels> =>
		useSyncExternalStore(
			subscribeClassicyFindSources,
			getClassicyFindSourceLabels,
			getClassicyFindSourceLabels,
		);

/** One result as Find File keeps it: tagged with the source it came from. */
export interface ClassicyFindSourceResult extends ClassicyFindResult {
	sourceId: string;
}

/** How a source's search ended. */
export type ClassicyFindSourceOutcome =
	| { sourceId: string; status: "found"; count: number }
	| { sourceId: string; status: "failed"; error: unknown }
	| { sourceId: string; status: "timedOut" }
	| { sourceId: string; status: "aborted" };

export interface ClassicyFindSourcesRunOptions {
	/** The sources to ask, by id (default: every registered source). */
	sourceIds?: readonly string[];
	signal: AbortSignal;
	/** Called once per source that answers before the signal aborts. */
	onResults?: (sourceId: string, results: ClassicyFindSourceResult[]) => void;
}

const isResult = (value: unknown): value is ClassicyFindResult => {
	if (typeof value !== "object" || value === null) return false;
	const result = value as Partial<ClassicyFindResult>;
	return (
		typeof result.name === "string" &&
		typeof result.kind === "string" &&
		typeof result.open === "function" &&
		(result.icon === undefined || typeof result.icon === "string")
	);
};

/**
 * Ask each source for `query`, all at once. Each source is isolated: one that
 * throws, rejects or resolves with no array is logged (`error`) and gives no
 * results; malformed results are dropped with a warning; one that has not
 * settled within its `timeoutMs` is given up (its signal aborts, `warn`).
 * Nothing is reported once `signal` aborts, whatever the source does then.
 * Resolves when every source has settled or been given up, with how each
 * ended.
 */
export async function searchClassicyFindSources(
	query: string,
	{ sourceIds, signal, onResults }: ClassicyFindSourcesRunOptions,
): Promise<ClassicyFindSourceOutcome[]> {
	const chosen = [...sources.values()].filter(
		(s) => sourceIds === undefined || sourceIds.includes(s.id),
	);
	return Promise.all(
		chosen.map(async (source): Promise<ClassicyFindSourceOutcome> => {
			const sourceId = source.id;
			if (signal.aborted) return { sourceId, status: "aborted" };
			// The source's own signal: the search's, or its time running out.
			const own = new AbortController();
			const onAbort = () => own.abort(signal.reason);
			signal.addEventListener("abort", onAbort, { once: true });
			const limit =
				typeof source.timeoutMs === "number" &&
				Number.isFinite(source.timeoutMs) &&
				source.timeoutMs > 0
					? source.timeoutMs
					: CLASSICY_FIND_SOURCE_TIMEOUT_MS;
			let timer: ReturnType<typeof setTimeout> | undefined;
			const timedOut = new Promise<"timedOut">((resolve) => {
				timer = setTimeout(() => resolve("timedOut"), limit);
			});
			const settled = new Promise<"aborted">((resolve) => {
				if (signal.aborted) resolve("aborted");
				signal.addEventListener("abort", () => resolve("aborted"), {
					once: true,
				});
			});
			try {
				const answer = await Promise.race([
					(async () =>
						source.search(query, { signal: own.signal }))() as Promise<unknown>,
					timedOut,
					settled,
				]);
				if (signal.aborted || answer === "aborted") {
					return { sourceId, status: "aborted" };
				}
				if (answer === "timedOut") {
					own.abort(
						new DOMException(
							`Search source "${sourceId}" took longer than ${limit} ms`,
							"TimeoutError",
						),
					);
					classicyLog(
						"warn",
						LOG,
						`Search source "${sourceId}" did not answer within ${limit} ms; its results were left out`,
						{ source: sourceId, timeoutMs: limit },
					);
					return { sourceId, status: "timedOut" };
				}
				const found = answer;
				if (!Array.isArray(found)) {
					throw new TypeError("search() resolved with no array of results");
				}
				const results = found.filter(isResult);
				if (results.length < found.length) {
					classicyLog(
						"warn",
						LOG,
						`Search source "${sourceId}" returned results without a name, a kind and an open function; they were left out`,
						{ source: sourceId, dropped: found.length - results.length },
					);
				}
				onResults?.(
					sourceId,
					results.map((r) => ({ ...r, sourceId })),
				);
				return { sourceId, status: "found", count: results.length };
			} catch (error) {
				if (signal.aborted) return { sourceId, status: "aborted" };
				classicyLog("error", LOG, `Search source "${sourceId}" failed`, {
					source: sourceId,
					error,
				});
				return { sourceId, status: "failed", error };
			} finally {
				clearTimeout(timer);
				signal.removeEventListener("abort", onAbort);
			}
		}),
	);
}

/**
 * Open a source's result, isolated: an `open` that throws or returns a
 * promise that rejects is logged (`error`), never left unhandled.
 */
export function openClassicyFindSourceResult(
	result: ClassicyFindSourceResult,
): void {
	const fail = (error: unknown) =>
		classicyLog("error", LOG, "A search result failed to open", {
			source: result.sourceId,
			error,
		});
	try {
		const opened = result.open();
		if (
			opened !== null &&
			typeof opened === "object" &&
			typeof (opened as PromiseLike<unknown>).then === "function"
		) {
			Promise.resolve(opened).catch(fail);
		}
	} catch (error) {
		fail(error);
	}
}
