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
import {
	type ClassicyFindSourceResult,
	searchClassicyFindSources,
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
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const LOG = "ClassicyFindFile";

/** A search's results, and which kind of search made them. */
type FindFileFound =
	| { kind: "file"; results: ClassicyFindFileResult[] }
	| { kind: "channels"; bySource: Record<string, ClassicyFindSourceResult[]> };

type FindFileAlert = { type: ClassicyAlertType; label: string };

/** The kind a result's row shows: the Finder's word for a file. */
const fileRow = (result: ClassicyFindFileResult): FindFileResultRow => ({
	id: result.path,
	name: result.name,
	icon: result.entry._icon || iconImageByType(result.entry._type),
	kind: isClassicyFindFolder(result.entry)
		? "folder"
		: fileTypeDisplayName(String(result.entry._type ?? "")),
	size: isClassicyFindFolder(result.entry) ? undefined : result.size,
	modified: asFinderDate(result.entry._modifiedOn),
	path: result.path,
});

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
	const [running, setRunning] = useState(false);
	const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
	const [sortKey, setSortKey] = useState<FindFileSortKey>("name");
	const [alert, setAlert] = useState<FindFileAlert | undefined>(undefined);
	const controllerRef = useRef<AbortController | null>(null);

	// A search in flight ends with the session (Quit).
	useEffect(
		() => () => {
			controllerRef.current?.abort();
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

	const windowOpen = (windowId: string) => {
		const app =
			useAppManager.getState().System.Manager.Applications.apps[
				FIND_FILE_APP_ID
			];
		const record = getAppWindow(app, windowId);
		return !!record && !record.closed;
	};

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
		controllerRef.current?.abort();
		controllerRef.current = null;
		setRunning(false);
	}, []);

	/** A new search: the last one is aborted. */
	const begin = () => {
		controllerRef.current?.abort();
		const controller = new AbortController();
		controllerRef.current = controller;
		setRunning(true);
		return controller;
	};
	const finish = (controller: AbortController) => {
		if (controllerRef.current !== controller) return;
		controllerRef.current = null;
		setRunning(false);
	};
	const nothingFound = () =>
		setAlert({ type: "note", label: "No items were found." });

	const find = () => {
		const problem = classicyFindCriteriaProblem(rows);
		if (problem) {
			setAlert({ type: "caution", label: problem });
			return;
		}
		const controller = begin();
		searchClassicyFileSystem(getFs(), {
			location,
			criteria: rows,
			signal: controller.signal,
			timeZoneOffsetMinutes: offsetHours * 60,
		})
			.then((results) => {
				if (controller.signal.aborted) return;
				// Nothing found leaves the last results as they were (8.1).
				if (results.length === 0) {
					nothingFound();
					return;
				}
				setFound({ kind: "file", results });
				setSelectedId(results[0]?.path);
				setSortKey("name");
				setFoundSeq((n) => n + 1);
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted) return;
				classicyLog("error", LOG, "The search failed", { error });
			})
			.finally(() => finish(controller));
	};

	const searchChannels = () => {
		const chosen = sources
			.filter((s) => !channelsOff.includes(s.id))
			.map((s) => s.id);
		const controller = begin();
		let started = false;
		searchClassicyFindSources(words, {
			sourceIds: chosen,
			signal: controller.signal,
			onResults: (sourceId, results) => {
				if (results.length === 0) return;
				// The first answer replaces the last results; later ones join it.
				const first = !started;
				started = true;
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

	// The rows the results window lists.
	const resultRows = useMemo((): FindFileResultRow[] => {
		if (!found) return [];
		if (found.kind === "file") {
			// A found item that has since gone (moved, emptied from the Trash)
			// leaves the list: the results follow the live tree.
			return found.results.filter((r) => fs.resolve(r.path)).map(fileRow);
		}
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
	}, [found, fs, sources]);
	const selected = resultRows.find((r) => r.id === selectedId);

	const openRow = (row: FindFileResultRow | undefined) => {
		if (!row) return;
		if (row.path !== undefined) {
			openClassicyFileSystemPath(getFs(), row.path, dispatch);
			return;
		}
		try {
			row.result?.open();
		} catch (error) {
			classicyLog("error", LOG, "A search result failed to open", {
				source: row.result?.sourceId,
				error,
			});
		}
	};
	const openPath = (path: string) => {
		openClassicyFileSystemPath(getFs(), path, dispatch);
	};
	const reveal = (row: FindFileResultRow | undefined) => {
		if (row?.path === undefined) return;
		if (
			revealClassicyFileSystemPath(getFs(), row.path, dispatch) === "invisible"
		) {
			setAlert({
				type: "caution",
				label: `Unable to open enclosing folder for “${row.name}” because it is invisible (or is inside an invisible folder).`,
			});
		}
	};

	const showFind = useCallback(
		() => dispatch({ type: "ClassicyAppFindFileShowFind" }),
		[dispatch],
	);
	// Closing the last window quits Find File (8.1); closing one leaves the other.
	const afterFindClosed = () => {
		if (!windowOpen(FIND_FILE_RESULTS_WINDOW_ID)) dispatch(quit);
	};
	const afterResultsClosed = () => {
		setFound(undefined);
		setSelectedId(undefined);
		if (!windowOpen(FIND_FILE_WINDOW_ID)) dispatch(quit);
	};
	const closeWindow = (windowId: string) => {
		dispatch({
			type: "ClassicyWindowClose",
			app: { id: FIND_FILE_APP_ID },
			window: { id: windowId },
		});
		if (windowId === FIND_FILE_WINDOW_ID) afterFindClosed();
		else afterResultsClosed();
	};

	const setLabel = (label: string) => {
		if (selected?.path === undefined) return;
		getFs().setMetadata(selected.path, {
			_label: label === CLASSICY_FIND_NO_LABEL ? undefined : label,
		});
	};
	const selectedEntry =
		selected?.path === undefined ? undefined : fs.resolve(selected.path);
	const labelable =
		!!selectedEntry &&
		selectedEntry._readOnly !== true &&
		selectedEntry._system !== true &&
		selectedEntry._derived !== true;

	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		FIND_FILE_APP_ID,
		FIND_FILE_APP_NAME,
		appIcon,
	);
	const editMenu = useClassicyEditMenu(`${FIND_FILE_APP_ID}_edit`);
	const fileSearch = found?.kind !== "channels";

	/** The menus, on each window (its Close Window closes that window). */
	const appMenu = (windowId: string): ClassicyMenuItem[] => [
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
					disabled: running || rows.length >= CLASSICY_FIND_MAX_CRITERIA,
					onClickFunc: () => addRow(),
				},
				{
					id: `${FIND_FILE_APP_ID}_fewer_choices`,
					title: "Fewer Choices",
					keyboardShortcut: "⌥R",
					disabled: running || rows.length <= 1,
					onClickFunc: () => removeRow(),
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
					...quitMenuItemHelper(FIND_FILE_APP_ID, FIND_FILE_APP_NAME, appIcon),
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
				checked: !!found && sortKey === key,
				disabled: !found || (!fileSearch && (key === "size" || key === "date")),
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
							checked:
								!!selectedEntry && classicyFindLabelOf(selectedEntry) === value,
							disabled: !labelable,
							onClickFunc: () => setLabel(value),
						},
			),
		},
	];

	const addRow = () =>
		setRows((prev) =>
			prev.length >= CLASSICY_FIND_MAX_CRITERIA
				? prev
				: [
						...prev,
						classicyFindCriterion(classicyFindNextCriterionKey(prev), today),
					],
		);
	const removeRow = () =>
		setRows((prev) => (prev.length <= 1 ? prev : prev.slice(0, -1)));

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
			running={running}
			onFind={find}
			onStop={stop}
		/>
	);

	return (
		<>
			<ClassicyWindow
				id={FIND_FILE_WINDOW_ID}
				title={identity.name}
				icon={identity.icon}
				appId={FIND_FILE_APP_ID}
				closable={true}
				resizable={false}
				zoomable={false}
				collapsable={true}
				scrollable={false}
				initialSize={[460, 0]}
				minimumSize={[460, 0]}
				initialPosition={[140, 70]}
				appMenu={appMenu(FIND_FILE_WINDOW_ID)}
				onCloseFunc={afterFindClosed}
			>
				<div className="classicyFindFile">
					{sources.length > 0 ? (
						// The channels a site adds, after Sherlock (Mac OS 8.5).
						<ClassicyTabs
							tabs={[
								{ title: "Find File", children: criteriaForm },
								{
									title: "Search Internet",
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
											running={running}
											onSearch={searchChannels}
											onStop={stop}
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
					appMenu={appMenu(FIND_FILE_RESULTS_WINDOW_ID)}
					rows={resultRows}
					kind={found.kind}
					selectedId={selected?.id}
					onSelect={setSelectedId}
					onOpen={openRow}
					onOpenPath={openPath}
					sortKey={sortKey}
					onSortKeyChange={setSortKey}
					onClose={afterResultsClosed}
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
