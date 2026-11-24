import "./FindFile.scss";
import {
	type FC as FunctionalComponent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useClassicyAppIdentity } from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { asFinderDate } from "@/SystemFolder/Finder/FinderViewOptions";
import {
	CLASSICY_FIND_LABELS,
	CLASSICY_FIND_MAX_CRITERIA,
	CLASSICY_FIND_NO_LABEL,
	type ClassicyFindCriterion,
	classicyFindClockDay,
	classicyFindCriteriaProblem,
	classicyFindCriterion,
	classicyFindLabelOf,
	classicyFindNextCriterionKey,
	isClassicyFindFolder,
} from "@/SystemFolder/FindFile/ClassicyFindCriteria";
import {
	type ClassicyFindFileResult,
	classicyFindLocationChoices,
	classicyFindUsableLocation,
	searchClassicyFileSystem,
} from "@/SystemFolder/FindFile/ClassicyFindFileSearch";
import { createClassicyFindLookupMemory } from "@/SystemFolder/FindFile/ClassicyFindLookups.internal";
import {
	type ClassicyFindSourceResult,
	openClassicyFindSourceResult,
	searchClassicyFindSources,
	useClassicyFindSourceLabels,
	useClassicyFindSources,
} from "@/SystemFolder/FindFile/ClassicyFindSources";
import {
	FIND_FILE_APP_ID,
	FIND_FILE_APP_NAME,
	FIND_FILE_RESULTS_WINDOW_ID,
	FIND_FILE_WINDOW_ID,
	type FindFileData,
} from "@/SystemFolder/FindFile/FindFileContext";
import {
	FindFileChannelsForm,
	FindFileCriteriaForm,
} from "@/SystemFolder/FindFile/FindFileForm.internal";
import {
	type FindFileResultRow,
	FindFileResults,
	type FindFileSortKey,
} from "@/SystemFolder/FindFile/FindFileResults.internal";
import {
	ClassicyAlert,
	type ClassicyAlertType,
} from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyEditMenu,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeWindowMenuItemHelper,
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import {
	fileTypeDisplayName,
	iconImageByType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import {
	openClassicyFileSystemPath,
	revealClassicyFileSystemPath,
} from "@/SystemFolder/SystemResources/File/ClassicyFileOpen";
import {
	useClassicyFileSystem,
	useClassicyFileSystemAccessor,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import type { ClassicyFileSystemEntry } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const LOG = "ClassicyFindFile";

/** A search's results, and which kind of search made them. */
type FindFileFound =
	| {
			kind: "file";
			results: ClassicyFindFileResult[];
			/** The search's signal: Items Found's size reads stop with it. */
			signal: AbortSignal;
	  }
	| { kind: "channels"; bySource: Record<string, ClassicyFindSourceResult[]> };

type FindFileAlert = { type: ClassicyAlertType; label: string };

/** Which tab's search runs. */
type FindFileRunning = "file" | "channels" | undefined;

const NO_ROWS: readonly FindFileResultRow[] = [];

/** What a file's size follows: a size read under another stamp is read again. */
const sizeStamp = (entry: ClassicyFileSystemEntry): string =>
	[
		entry._type,
		typeof entry._data === "string" ? entry._data.length : "",
		typeof entry._size === "number" ? entry._size : "",
		typeof entry._url === "string" ? entry._url : "",
		String(entry._modifiedOn ?? ""),
	].join("\n");

/** A result's row, from the entry now at its path (the tree is live). */
const fileRow = (
	result: ClassicyFindFileResult,
	entry: ClassicyFileSystemEntry,
): FindFileResultRow => {
	const folder = isClassicyFindFolder(entry);
	return {
		id: result.path,
		name: result.name,
		icon: entry._icon || iconImageByType(entry._type),
		kind: folder ? "folder" : fileTypeDisplayName(String(entry._type ?? "")),
		folder,
		modified: asFinderDate(entry._modifiedOn),
		path: result.path,
		...(folder ? {} : { stamp: sizeStamp(entry) }),
	};
};

/** Whether two rows draw the same. */
const sameRow = (a: FindFileResultRow, b: FindFileResultRow): boolean =>
	a.id === b.id &&
	a.name === b.name &&
	a.icon === b.icon &&
	a.kind === b.kind &&
	a.folder === b.folder &&
	a.path === b.path &&
	a.stamp === b.stamp &&
	a.modified?.getTime() === b.modified?.getTime();

/**
 * Everything a running Find File holds: its rows and results live only
 * while it runs (they go when it quits, as on Mac OS 8.1); the location is
 * kept in the store.
 */
const FindFileSession: FunctionalComponent<{ appIcon: string }> = ({
	appIcon,
}) => {
	const dispatch = useAppManagerDispatch();
	const identity = useClassicyAppIdentity(FIND_FILE_APP_ID, {
		name: FIND_FILE_APP_NAME,
		icon: appIcon,
	});
	// The desktop's own file system (its `fileSystemStorageKey`), live.
	const fs = useClassicyFileSystem();
	const getFs = useClassicyFileSystemAccessor();
	const sources = useClassicyFindSources();
	const labels = useClassicyFindSourceLabels();

	const storedLocation = useAppManager(
		(s) =>
			(
				s.System.Manager.Applications.apps[FIND_FILE_APP_ID]?.data as
					| FindFileData
					| undefined
			)?.location,
	);
	const location = classicyFindUsableLocation(fs, storedLocation);
	// Today's day on Classicy's clock: selected as a day, so the clock's
	// ticks re-render nothing until the day changes.
	const offsetHours = useAppManager(
		(s) =>
			Number.parseFloat(String(s.System.Manager.DateAndTime.timeZoneOffset)) ||
			0,
	);
	const today = useAppManager((s) =>
		classicyFindClockDay(
			String(s.System.Manager.DateAndTime.dateTime),
			Number.parseFloat(String(s.System.Manager.DateAndTime.timeZoneOffset)) ||
				0,
		),
	);

	const [rows, setRows] = useState<ClassicyFindCriterion[]>(() => [
		classicyFindCriterion("name", today),
	]);
	const [words, setWords] = useState("");
	const [channelsOff, setChannelsOff] = useState<string[]>([]);
	const [found, setFound] = useState<FindFileFound | undefined>(undefined);
	const [foundSeq, setFoundSeq] = useState(0);
	const [running, setRunning] = useState<FindFileRunning>(undefined);
	const [progress, setProgress] = useState(0);
	const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
	const [sortKey, setSortKey] = useState<FindFileSortKey>("name");
	const [alert, setAlert] = useState<FindFileAlert | undefined>(undefined);
	/** The search running. */
	const searchRef = useRef<AbortController | null>(null);
	/** The search whose results Items Found shows (its size reads). */
	const shownRef = useRef<AbortController | null>(null);
	/** Sizes that could not be read, not asked again while Find File runs. */
	const memory = useMemo(() => createClassicyFindLookupMemory(), []);

	// A search in flight, and the reads for its results, end with the
	// session (Quit).
	useEffect(
		() => () => {
			searchRef.current?.abort();
			shownRef.current?.abort();
		},
		[],
	);
	// Results are the session's: an Items Found window saved open by a
	// reload has nothing to show, so it closes.
	useEffect(() => {
		const app =
			useAppManager.getState().System.Manager.Applications.apps[
				FIND_FILE_APP_ID
			];
		const results = getAppWindow(app, FIND_FILE_RESULTS_WINDOW_ID);
		if (results && !results.closed) {
			dispatch({
				type: "ClassicyWindowClose",
				app: { id: FIND_FILE_APP_ID },
				window: { id: FIND_FILE_RESULTS_WINDOW_ID },
			});
		}
	}, [dispatch]);

	const windowOpen = useCallback((windowId: string) => {
		const app =
			useAppManager.getState().System.Manager.Applications.apps[
				FIND_FILE_APP_ID
			];
		const record = getAppWindow(app, windowId);
		return !!record && !record.closed;
	}, []);

	// New results come to the front: a window already open is focused; one
	// that is not opens focused as it mounts.
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs once per new result set
	useEffect(() => {
		if (foundSeq === 0 || !windowOpen(FIND_FILE_RESULTS_WINDOW_ID)) return;
		dispatch({
			type: "ClassicyWindowFocus",
			app: { id: FIND_FILE_APP_ID },
			window: { id: FIND_FILE_RESULTS_WINDOW_ID },
		});
	}, [foundSeq]);

	const quit = useMemo(
		() => quitAppHelper(FIND_FILE_APP_ID, FIND_FILE_APP_NAME, appIcon),
		[appIcon],
	);

	const stop = useCallback(() => {
		searchRef.current?.abort();
		searchRef.current = null;
		setRunning(undefined);
	}, []);

	/** A new search, of one tab or the other: the last one is aborted. */
	const begin = (kind: Exclude<FindFileRunning, undefined>) => {
		searchRef.current?.abort();
		const controller = new AbortController();
		searchRef.current = controller;
		setRunning(kind);
		setProgress(0);
		return controller;
	};
	const finish = (controller: AbortController) => {
		if (searchRef.current !== controller) return;
		searchRef.current = null;
		setRunning(undefined);
	};
	/** `controller`'s results are shown now: the last ones' reads stop. */
	const show = (controller: AbortController) => {
		if (shownRef.current !== controller) shownRef.current?.abort();
		shownRef.current = controller;
	};
	const nothingFound = () =>
		setAlert({ type: "note", label: "No items were found." });

	const find = () => {
		const problem = classicyFindCriteriaProblem(rows);
		if (problem) {
			setAlert({ type: "caution", label: problem });
			return;
		}
		const controller = begin("file");
		searchClassicyFileSystem(getFs(), {
			location,
			criteria: rows,
			signal: controller.signal,
			timeZoneOffsetMinutes: offsetHours * 60,
			onProgress: setProgress,
			memory,
		})
			.then((results) => {
				if (controller.signal.aborted) return;
				// Nothing found leaves the last results as they were (8.1).
				if (results.length === 0) {
					nothingFound();
					return;
				}
				show(controller);
				setFound({ kind: "file", results, signal: controller.signal });
				setSelectedId(results[0]?.path);
				setSortKey("name");
				setFoundSeq((n) => n + 1);
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted) return;
				classicyLog("error", LOG, "The search failed", { error });
				// A stop alert: "an action cannot be completed" (HIG7 p.196),
				// saying what went wrong and why (p.310). Find File's own
				// failure could not be produced on 8.1 to copy its words.
				setAlert({
					type: "stop",
					label:
						"The search could not be completed because an unexpected error occurred.",
				});
			})
			.finally(() => finish(controller));
	};

	const searchChannels = () => {
		const chosen = sources
			.filter((s) => !channelsOff.includes(s.id))
			.map((s) => s.id);
		const controller = begin("channels");
		let started = false;
		searchClassicyFindSources(words, {
			sourceIds: chosen,
			signal: controller.signal,
			onResults: (sourceId, results) => {
				if (results.length === 0) return;
				// The first answer replaces the last results; later ones join it.
				const first = !started;
				started = true;
				if (first) show(controller);
				setFound((prev) => ({
					kind: "channels",
					bySource: {
						...(first || prev?.kind !== "channels" ? {} : prev.bySource),
						[sourceId]: results,
					},
				}));
				if (first) {
					// The first row shown: the list starts sorted by name.
					const firstShown = results
						.map((r, i) => ({ name: r.name, i }))
						.sort((a, b) =>
							a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
						)[0];
					setSelectedId(`${sourceId}:${firstShown?.i ?? 0}`);
					setSortKey("name");
					setFoundSeq((n) => n + 1);
				}
			},
		})
			.then(() => {
				if (!controller.signal.aborted && !started) nothingFound();
			})
			.finally(() => finish(controller));
	};

	// The rows Items Found lists. A row whose item draws the same keeps its
	// object, and an unchanged list keeps its array, so a write elsewhere in
	// the tree draws nothing again.
	const rowCache = useRef<{
		found: FindFileFound | undefined;
		rows: ReadonlyMap<string, FindFileResultRow>;
		list: readonly FindFileResultRow[];
	}>({ found: undefined, rows: new Map(), list: NO_ROWS });
	const resultRows = useMemo((): readonly FindFileResultRow[] => {
		if (!found) return NO_ROWS;
		if (found.kind === "channels") {
			return sources.flatMap((source) =>
				(found.bySource[source.id] ?? []).map((result, i) => ({
					id: `${source.id}:${i}`,
					name: result.name,
					icon: result.icon,
					kind: result.kind,
					site: source.name,
					siteIcon: source.icon,
					result,
				})),
			);
		}
		const cache = rowCache.current;
		const before = cache.found === found ? cache.rows : new Map();
		const next = new Map<string, FindFileResultRow>();
		const list: FindFileResultRow[] = [];
		for (const result of found.results) {
			// A found item that has since gone (moved, emptied from the Trash)
			// leaves the list: the results follow the live tree.
			const entry = fs.resolve(result.path);
			if (!entry) continue;
			const fresh = fileRow(result, entry);
			const kept = before.get(result.path);
			const row = kept && sameRow(kept, fresh) ? kept : fresh;
			next.set(result.path, row);
			list.push(row);
		}
		const unchanged =
			cache.found === found &&
			list.length === cache.list.length &&
			list.every((row, i) => row === cache.list[i]);
		const kept = unchanged ? cache.list : list;
		rowCache.current = { found, rows: next, list: kept };
		return kept;
	}, [found, fs, sources]);
	const selected = resultRows.find((r) => r.id === selectedId);

	const openPath = useCallback(
		(path: string) => {
			openClassicyFileSystemPath(getFs(), path, dispatch);
		},
		[getFs, dispatch],
	);
	const openRow = useCallback(
		(row: FindFileResultRow | undefined) => {
			if (!row) return;
			if (row.path !== undefined) {
				openPath(row.path);
				return;
			}
			if (row.result) openClassicyFindSourceResult(row.result);
		},
		[openPath],
	);
	const reveal = useCallback(
		(row: FindFileResultRow | undefined) => {
			if (row?.path === undefined) return;
			if (
				revealClassicyFileSystemPath(getFs(), row.path, dispatch) ===
				"invisible"
			) {
				setAlert({
					type: "caution",
					label: `Unable to open enclosing folder for “${row.name}” because it is invisible (or is inside an invisible folder).`,
				});
			}
		},
		[getFs, dispatch],
	);

	const showFind = useCallback(
		() => dispatch({ type: "ClassicyAppFindFileShowFind" }),
		[dispatch],
	);
	// Closing the last window quits Find File (8.1); closing one leaves the other.
	const afterFindClosed = useCallback(() => {
		if (!windowOpen(FIND_FILE_RESULTS_WINDOW_ID)) dispatch(quit);
	}, [windowOpen, dispatch, quit]);
	const afterResultsClosed = useCallback(() => {
		shownRef.current?.abort();
		shownRef.current = null;
		setFound(undefined);
		setSelectedId(undefined);
		if (!windowOpen(FIND_FILE_WINDOW_ID)) dispatch(quit);
	}, [windowOpen, dispatch, quit]);
	const closeWindow = useCallback(
		(windowId: string) => {
			dispatch({
				type: "ClassicyWindowClose",
				app: { id: FIND_FILE_APP_ID },
				window: { id: windowId },
			});
			if (windowId === FIND_FILE_WINDOW_ID) afterFindClosed();
			else afterResultsClosed();
		},
		[dispatch, afterFindClosed, afterResultsClosed],
	);

	const selectedPath = selected?.path;
	const selectedEntry =
		selectedPath === undefined ? undefined : fs.resolve(selectedPath);
	const labelable =
		!!selectedEntry &&
		selectedEntry._readOnly !== true &&
		selectedEntry._system !== true &&
		selectedEntry._derived !== true;
	const selectedLabel = selectedEntry
		? classicyFindLabelOf(selectedEntry)
		: undefined;
	const setLabel = useCallback(
		(label: string) => {
			if (selectedPath === undefined) return;
			getFs().setMetadata(selectedPath, {
				_label: label === CLASSICY_FIND_NO_LABEL ? undefined : label,
			});
		},
		[selectedPath, getFs],
	);

	const addRow = useCallback(
		() =>
			setRows((prev) =>
				prev.length >= CLASSICY_FIND_MAX_CRITERIA
					? prev
					: [
							...prev,
							classicyFindCriterion(classicyFindNextCriterionKey(prev), today),
						],
			),
		[today],
	);
	const removeRow = useCallback(
		() => setRows((prev) => (prev.length <= 1 ? prev : prev.slice(0, -1))),
		[],
	);

	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		FIND_FILE_APP_ID,
		FIND_FILE_APP_NAME,
		appIcon,
	);
	const editMenu = useClassicyEditMenu(`${FIND_FILE_APP_ID}_edit`);
	const hasFound = found !== undefined;
	const fileSearch = found?.kind !== "channels";
	const rowCount = rows.length;
	const fileRunning = running === "file";

	/**
	 * The menus, on each window (its Close Window closes that window). Built
	 * from what they show, not the rows' text, so typing in the Find window
	 * leaves Items Found's menus, and Items Found, as they are.
	 */
	const appMenu = useCallback(
		(windowId: string): ClassicyMenuItem[] => [
			{
				id: `${FIND_FILE_APP_ID}_${windowId}_file`,
				title: "File",
				menuChildren: [
					// Hoisted into the Apple menu by the menu bar.
					{ ...aboutMenuItem, title: `About ${FIND_FILE_APP_NAME}` },
					{
						id: `${FIND_FILE_APP_ID}_find`,
						title: "Find…",
						keyboardShortcut: "⌥F",
						onClickFunc: showFind,
					},
					{
						...closeWindowMenuItemHelper(
							`${FIND_FILE_APP_ID}_${windowId}_close_window`,
							() => closeWindow(windowId),
						),
						keyboardShortcut: "⌥W",
					},
					{ id: "spacer" },
					{
						id: `${FIND_FILE_APP_ID}_more_choices`,
						title: "More Choices",
						keyboardShortcut: "⌥M",
						disabled: fileRunning || rowCount >= CLASSICY_FIND_MAX_CRITERIA,
						onClickFunc: addRow,
					},
					{
						id: `${FIND_FILE_APP_ID}_fewer_choices`,
						title: "Fewer Choices",
						keyboardShortcut: "⌥R",
						disabled: fileRunning || rowCount <= 1,
						onClickFunc: removeRow,
					},
					{ id: "spacer" },
					{
						id: `${FIND_FILE_APP_ID}_open_item`,
						title: "Open Item",
						keyboardShortcut: "⌥O",
						disabled: !selected,
						onClickFunc: () => openRow(selected),
					},
					{
						id: `${FIND_FILE_APP_ID}_open_enclosing_folder`,
						title: "Open Enclosing Folder",
						keyboardShortcut: "⌥E",
						disabled: selected?.path === undefined,
						onClickFunc: () => reveal(selected),
					},
					{ id: "spacer" },
					{
						...quitMenuItemHelper(
							FIND_FILE_APP_ID,
							FIND_FILE_APP_NAME,
							appIcon,
						),
						keyboardShortcut: "⌥Q",
					},
				],
			},
			editMenu,
			{
				id: `${FIND_FILE_APP_ID}_${windowId}_view`,
				title: "View",
				menuChildren: (
					[
						["name", "by Name"],
						["size", "by Size"],
						["kind", "by Kind"],
						["date", "by Date"],
					] as const
				).map(([key, title]) => ({
					id: `${FIND_FILE_APP_ID}_view_${key}`,
					title,
					checked: hasFound && sortKey === key,
					disabled:
						!hasFound || (!fileSearch && (key === "size" || key === "date")),
					onClickFunc: () => setSortKey(key),
				})),
			},
			{
				id: `${FIND_FILE_APP_ID}_${windowId}_label`,
				title: "Label",
				menuChildren: [
					{
						value: CLASSICY_FIND_NO_LABEL,
						title: "None",
					},
					{ value: "spacer", title: "" },
					...CLASSICY_FIND_LABELS.map((l) => ({
						value: l.value,
						title: l.label,
					})),
				].map(({ value, title }) =>
					value === "spacer"
						? { id: "spacer" }
						: {
								id: `${FIND_FILE_APP_ID}_label_${value.replaceAll(" ", "_")}`,
								title,
								checked: selectedLabel === value,
								disabled: !labelable,
								onClickFunc: () => setLabel(value),
							},
				),
			},
		],
		[
			aboutMenuItem,
			showFind,
			closeWindow,
			fileRunning,
			rowCount,
			addRow,
			removeRow,
			selected,
			openRow,
			reveal,
			appIcon,
			editMenu,
			hasFound,
			sortKey,
			fileSearch,
			selectedLabel,
			labelable,
			setLabel,
		],
	);
	const findMenu = useMemo(() => appMenu(FIND_FILE_WINDOW_ID), [appMenu]);
	const resultsMenu = useMemo(
		() => appMenu(FIND_FILE_RESULTS_WINDOW_ID),
		[appMenu],
	);

	const locationChoices = classicyFindLocationChoices(fs);
	const locationIcons = Object.fromEntries(
		locationChoices.flatMap((c) =>
			c?.value.startsWith("disk:")
				? [
						[
							c.value,
							fs.resolve(c.value.slice("disk:".length))?._icon as
								| string
								| undefined,
						],
					]
				: [],
		),
	);

	const criteriaForm = (
		<FindFileCriteriaForm
			location={location}
			locationChoices={locationChoices}
			locationIcons={locationIcons}
			onLocationChange={(next) =>
				dispatch({ type: "ClassicyAppFindFileSetLocation", location: next })
			}
			rows={rows}
			today={today}
			onRowChange={(index, row) =>
				setRows((prev) => prev.map((r, i) => (i === index ? row : r)))
			}
			canAddRow={rows.length < CLASSICY_FIND_MAX_CRITERIA}
			onMoreChoices={addRow}
			onFewerChoices={removeRow}
			running={fileRunning}
			progress={progress}
			onFind={find}
			onStop={stop}
		/>
	);

	return (
		<>
			<ClassicyWindow
				id={FIND_FILE_WINDOW_ID}
				title={identity.name}
				// 8.1's Find File window has no title-bar icon.
				hideIcon={true}
				appId={FIND_FILE_APP_ID}
				closable={true}
				resizable={false}
				zoomable={false}
				collapsable={true}
				scrollable={false}
				initialSize={[460, 0]}
				minimumSize={[460, 0]}
				initialPosition={[140, 70]}
				appMenu={findMenu}
				onCloseFunc={afterFindClosed}
			>
				<div className="classicyFindFile">
					{sources.length > 0 ? (
						// The channels a site adds, after Sherlock (Mac OS 8.5).
						<ClassicyTabs
							tabs={[
								{ title: "Find File", children: criteriaForm },
								{
									title: labels.tab,
									children: (
										<FindFileChannelsForm
											sources={sources}
											off={channelsOff}
											onToggle={(id, on) =>
												setChannelsOff((prev) =>
													on ? prev.filter((x) => x !== id) : [...prev, id],
												)
											}
											words={words}
											onWordsChange={setWords}
											running={running === "channels"}
											onSearch={searchChannels}
											onStop={stop}
											sitesLabel={labels.sites}
										/>
									),
								},
							]}
						/>
					) : (
						criteriaForm
					)}
				</div>
			</ClassicyWindow>
			{found && (
				<FindFileResults
					appMenu={resultsMenu}
					rows={resultRows}
					kind={found.kind}
					selectedId={selected?.id}
					onSelect={setSelectedId}
					onOpen={openRow}
					onOpenPath={openPath}
					sortKey={sortKey}
					onSortKeyChange={setSortKey}
					onClose={afterResultsClosed}
					signal={found.kind === "file" ? found.signal : undefined}
					memory={memory}
					siteLabel={labels.site}
					timeZoneOffsetMinutes={offsetHours * 60}
				/>
			)}
			{alert && (
				<ClassicyAlert
					id={`${FIND_FILE_APP_ID}_alert`}
					appId={FIND_FILE_APP_ID}
					alertType={alert.type}
					label={alert.label}
					defaultButtonId="ok"
					buttons={[
						{
							id: "ok",
							label: "OK",
							role: "default",
							onClick: () => setAlert(undefined),
						},
					]}
					onClose={() => setAlert(undefined)}
				/>
			)}
			{aboutWindow}
		</>
	);
};

/**
 * Find File (Mac OS 8.1's, story 0227-815): the Finder's File ▸ Find…
 * (⌥F) opens it. It searches the desktop's file system by name, kind,
 * dates, size, label and more, under one disk, every disk or the desktop,
 * and lists what it finds in Items Found, whose path pane shows where each
 * item is. Open Item opens a result through the Finder's routing; Open
 * Enclosing Folder shows it selected in its Finder window. With search
 * sources registered (`registerClassicyFindSource`), a second tab searches
 * them, after Sherlock's Search Internet. Mounted by `ClassicyDesktop`.
 * The captures it was built from (Mac OS 8.0, 8.1 and 8.5, System 7.5.3) are
 * in `packages/appearance/platinum/resources/screenshots/find-file/`.
 */
export const FindFile: FunctionalComponent = () => {
	const appIcon = useClassicyAsset("icons", "applications.findFile.app") ?? "";
	return (
		<ClassicyApp
			id={FIND_FILE_APP_ID}
			name={FIND_FILE_APP_NAME}
			icon={appIcon}
			defaultWindow={FIND_FILE_WINDOW_ID}
			showDesktopIcon={false}
			showInApplicationsFolder={false}
			// In the Apple menu, as in Mac OS 8.1.
			addSystemMenu={true}
		>
			<FindFileSession appIcon={appIcon} />
		</ClassicyApp>
	);
};
