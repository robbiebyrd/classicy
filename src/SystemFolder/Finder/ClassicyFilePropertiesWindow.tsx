import "./ClassicyFilePropertiesWindow.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useClassicyAppIdentity } from "@/Appearance/ClassicyAppIdentity";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { classicyWindowPagePath } from "@/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath";
import { useClassicyWindowClose } from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	classicyCheckboxHolderById,
	useClassicyWhatsThisHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyWhatsThisHelp.internal";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import {
	iconImageByType,
	useClassicyFileTypeDisplayName,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import { classicyCanRename } from "@/SystemFolder/SystemResources/File/ClassicyFileCommands.internal";
import { renameClassicyFileSystemItem } from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import {
	CLASSICY_PROPERTIES_CLOSE_ACTION,
	CLASSICY_PROPERTIES_MULTIPLE_TYPES,
	CLASSICY_PROPERTIES_UNKNOWN,
	CLASSICY_PROPERTIES_VARIOUS_FOLDERS,
	classicyCountFolderContents,
	classicyFormatPropertiesDate,
	classicyParentPath,
	classicyPropertiesAllIn,
	classicyPropertiesAllOfType,
	classicyPropertiesAttributesEditable,
	classicyPropertiesCaption,
	classicyPropertiesCount,
	classicyPropertiesKey,
	classicyPropertiesMultipleName,
	classicyPropertiesSize,
	classicyPropertiesWindowId,
} from "@/SystemFolder/SystemResources/File/ClassicyFileProperties";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { CLASSICY_TRASH_PATH } from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import { useClassicyTrashName } from "@/SystemFolder/SystemResources/File/ClassicyTrashName";
import { useClassicyDisplayFileName } from "@/SystemFolder/SystemResources/File/useClassicyDisplayFileName";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import { useKeyboardEquivalents } from "@/SystemFolder/SystemResources/Keyboard/useKeyboardEquivalents";
import { ClassicySeparator } from "@/SystemFolder/SystemResources/Separator/ClassicySeparator";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

/** Props for `ClassicyFilePropertiesWindow`. */
export type ClassicyFilePropertiesWindowProps = {
	/** The owning app's id (Finder's, which renders the sheets). */
	appId: string;
	/** The file system the items live in. */
	fs: ClassicyFileSystem;
	/** The paths of the items the sheet describes; one or more. */
	paths?: readonly string[];
	/** Or the application whose desktop icon the sheet describes. */
	targetAppId?: string;
	/** The sheet's place among the open sheets, for its cascaded position. */
	index?: number;
	/** The Trash's art as the active package draws it, for the Trash's sheet. */
	trashIcon?: string;
	/** Extra class names, merged onto the window's root after its own. */
	className?: string;
	/** Inline style, merged onto the window's root after its own. */
	style?: CSSProperties;
};

/** One labeled row of the General page. */
const Row: FunctionalComponent<{ label: string; children: ReactNode }> = ({
	label,
	children,
}) => (
	<>
		<span className={"classicyFilePropertiesLabel"}>{label}</span>
		<span className={"classicyFilePropertiesValue"}>{children}</span>
	</>
);

/** A tri-state attribute: every item has it, none has it, or some do. */
type Attribute = boolean | "mixed";

const attributeOf = (
	entries: readonly ClassicyFileSystemEntry[],
	key: "_readOnly" | "_invisible",
): Attribute => {
	const set = entries.filter((entry) => entry[key] === true).length;
	return set === 0 ? false : set === entries.length ? true : "mixed";
};

/**
 * One item's size: a folder's or a drive's all the way down (what the
 * Finder's Get Info sums, `calculateSizeDir`; `fs.size` knows no drive's),
 * any other item's its own; -1 when it is not known.
 */
const itemSize = (fs: ClassicyFileSystem, path: string): Promise<number> => {
	const entry = fs.resolve(path);
	if (!entry) return Promise.resolve(-1);
	return entry._type === ClassicyFileSystemEntryFileType.Directory ||
		entry._type === ClassicyFileSystemEntryFileType.Drive
		? fs.calculateSizeDir(entry)
		: fs.size(path);
};

/**
 * The combined size of the items (a folder's or a drive's all the way
 * down), worked out once the sheet shows: undefined while it is, null when
 * no item's size is known.
 */
const useItemsSize = (
	fs: ClassicyFileSystem,
	paths: readonly string[],
): number | null | undefined => {
	const [size, setSize] = useState<number | null | undefined>(undefined);
	const pathsKey = paths.join("\n");
	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the paths' text, not the array's identity; `fs` changes with every edit of the tree, which may change a size
	useEffect(() => {
		let canceled = false;
		setSize(undefined);
		Promise.all(paths.map((path) => itemSize(fs, path))).then((sizes) => {
			if (canceled) return;
			const known = sizes.filter((n) => n >= 0);
			setSize(known.length === 0 ? null : known.reduce((a, b) => a + b, 0));
		});
		return () => {
			canceled = true;
		};
	}, [fs, pathsKey]);
	return size;
};

const sizeText = (size: number | null | undefined): string =>
	size === undefined
		? "Calculating…"
		: size === null
			? CLASSICY_PROPERTIES_UNKNOWN
			: classicyPropertiesSize(size);

/** What's This? on the Read-only check box (shell32's help text). */
export const CLASSICY_PROPERTIES_READ_ONLY_HELP =
	"Specifies whether this item is read-only, which means that it cannot be changed or accidentally deleted.";
/** What's This? on the Hidden check box (shell32's help text). */
export const CLASSICY_PROPERTIES_HIDDEN_HELP =
	"Specifies whether this item is hidden, which means you cannot see or use it unless you know its name.";

/**
 * Windows' property sheet for items of the tree or an application, its
 * General page (WIG Ch.2 "Putting Theory into Practice", pp.12-13; Ch.5
 * "Properties", p.51; Windows 98 SE's General pages, shell32.dll): Finder
 * renders one for each sheet open (`ClassicyAppFinderPropertiesOpen`,
 * Explorer's Properties under `layout.finder.commands` "windows"). A
 * modeless window with no Minimize or Maximize (WIG Ch.8 "Property Sheets",
 * p.145), titled "<name> Properties", its window id `properties:<key>`
 * (`classicyPropertiesWindowId`), its pageview path
 * `/Finder/properties` (the id holds a path, which never reaches analytics).
 *
 * - One file or folder: its icon and name (edited in place, under the
 *   package's naming rules, when it may be renamed; a hidden extension
 *   kept), Type (the package's `fileTypeNames`), Location, Size (a
 *   folder's all the way down), a folder's Contains ("%1 Files, %2
 *   Folders"), Created, a file's Modified, and the Read-only and Hidden
 *   attributes (`_readOnly`, `_invisible`).
 * - A drive: its label, Type ("Local Disk" under Windows 98) and the space
 *   its items use. The Trash: the folder's page, nothing editable.
 * - Several items: "%1 Files, %2 Folders", "All of type …" or "Multiple
 *   Types", "All in …" or "Various Folders", their size, and the
 *   attributes, a mixed one drawn mixed and left as it is unless changed.
 * - An application's desktop icon: its icon, name and Type "Application".
 *
 * OK applies and closes, Cancel (Escape) closes, Apply applies and stays,
 * dimmed until something changes; writes go through `fs.setMetadata` and
 * a rename through `renameClassicyFileSystemItem`, whose refusals it shows.
 * Windows 98's MS-DOS name, Accessed, Archive and System, a drive's file
 * system, free space and capacity, and the Recycle Bin's settings have no
 * Classicy data and are not shown.
 */
export const ClassicyFilePropertiesWindow: FunctionalComponent<
	ClassicyFilePropertiesWindowProps
> = ({
	appId,
	fs,
	paths = [],
	targetAppId,
	index = 0,
	trashIcon,
	className,
	style,
}) => {
	const dispatch = useAppManagerDispatch();
	const closeWindow = useClassicyWindowClose(appId);
	const ak = useClassicyBundledAccessKeys();
	const typeName = useClassicyFileTypeDisplayName();
	const shownNames = useClassicyDisplayFileName();
	// The Trash as the package names it (Windows 98's Recycle Bin, 1.15):
	// its own sheet's name and caption, and its items' Location.
	const trashName = useClassicyTrashName();
	const contentRef = useRef<HTMLDivElement | null>(null);

	const key = classicyPropertiesKey(
		targetAppId !== undefined ? { appId: targetAppId } : { paths },
	);
	const windowId = classicyPropertiesWindowId(key);

	// The items still in the tree, as the sheet opened on them.
	const items = useMemo(
		() =>
			paths.flatMap((path) => {
				const entry = fs.resolve(path);
				return entry ? [{ path, entry }] : [];
			}),
		[fs, paths],
	);
	const entries = useMemo(() => items.map((item) => item.entry), [items]);
	const single = items.length === 1 ? items[0] : undefined;

	// An application's desktop icon: its record, shown as the package shows
	// the app.
	const appRecord = useAppManager((state) =>
		targetAppId !== undefined
			? state.System.Manager.Applications.apps[targetAppId]
			: undefined,
	);
	const appIdentity = useClassicyAppIdentity(targetAppId, {
		name: appRecord?.name ?? targetAppId ?? "",
		icon: appRecord?.icon ?? "",
	});

	const singleName = single
		? single.path === CLASSICY_TRASH_PATH
			? trashName
			: (single.path.split(fs.separator).pop() ?? single.path)
		: "";
	const hiddenExtension = single
		? shownNames.hiddenExtension(singleName, single.entry)
		: "";
	const shownSingleName = singleName.slice(
		0,
		singleName.length - hiddenExtension.length,
	);
	const isDrive = single?.entry._type === ClassicyFileSystemEntryFileType.Drive;
	const isTrash = single?.path === CLASSICY_TRASH_PATH;
	const isFolder =
		single?.entry._type === ClassicyFileSystemEntryFileType.Directory;
	const renamable = !!single && !isTrash && classicyCanRename(fs, single.path);
	const attributesEditable =
		items.length > 0 &&
		entries.every((entry) => classicyPropertiesAttributesEditable(entry)) &&
		!isTrash;

	// What the page edits, from what the items hold.
	const storedReadOnly = attributeOf(entries, "_readOnly");
	const storedHidden = attributeOf(entries, "_invisible");
	const [name, setName] = useState(shownSingleName);
	const [readOnly, setReadOnly] = useState<Attribute>(storedReadOnly);
	const [hidden, setHidden] = useState<Attribute>(storedHidden);
	const dirty =
		(renamable && name !== shownSingleName) ||
		readOnly !== storedReadOnly ||
		hidden !== storedHidden;

	const size = useItemsSize(
		fs,
		targetAppId !== undefined ? [] : items.map((item) => item.path),
	);

	// Writes what changed; the rename last but one, so an item made
	// read-only here is still renamed. Returns the sheet's key afterward (a
	// rename gives it a new one), or undefined when a rename was refused.
	const apply = useCallback((): string | undefined => {
		let current = items.map((item) => item.path);
		if (single && renamable && name !== shownSingleName) {
			const renamed = renameClassicyFileSystemItem(
				fs,
				single.path,
				name + hiddenExtension,
				dispatch,
			);
			if (renamed === undefined) return undefined;
			current = [renamed];
		}
		if (attributesEditable) {
			for (const path of current) {
				const patch: { _readOnly?: boolean; _invisible?: boolean } = {};
				if (readOnly !== storedReadOnly && readOnly !== "mixed")
					patch._readOnly = readOnly;
				if (hidden !== storedHidden && hidden !== "mixed")
					patch._invisible = hidden;
				if (Object.keys(patch).length > 0) fs.setMetadata(path, patch);
			}
		}
		return classicyPropertiesKey({ paths: current });
	}, [
		items,
		single,
		renamable,
		name,
		shownSingleName,
		fs,
		hiddenExtension,
		dispatch,
		attributesEditable,
		readOnly,
		storedReadOnly,
		hidden,
		storedHidden,
	]);

	const close = useCallback(
		(closeKey: string) =>
			closeWindow(classicyPropertiesWindowId(closeKey), {
				type: CLASSICY_PROPERTIES_CLOSE_ACTION,
				key: closeKey,
			}),
		[closeWindow],
	);
	const ok = useCallback(() => {
		if (targetAppId !== undefined) {
			close(key);
			return;
		}
		const after = dirty ? apply() : key;
		if (after !== undefined) close(after);
	}, [targetAppId, close, key, dirty, apply]);
	const cancel = useCallback(() => close(key), [close, key]);

	useKeyboardEquivalents({
		onDefault: ok,
		onCancel: cancel,
		targetRef: contentRef,
	});
	// The attributes' What's This? help (Windows 98 SE's shell32 text), for
	// the sheet's "?" box (`contextHelp`).
	const whatsThis = useMemo(
		() => [
			{
				find: classicyCheckboxHolderById(`${windowId}-read-only`),
				help: { content: CLASSICY_PROPERTIES_READ_ONLY_HELP },
			},
			{
				find: classicyCheckboxHolderById(`${windowId}-hidden`),
				help: { content: CLASSICY_PROPERTIES_HIDDEN_HELP },
			},
		],
		[windowId],
	);
	useClassicyWhatsThisHelp(contentRef, whatsThis);
	// The keyboard starts on the sheet's selected tab, as a property sheet's
	// does (comctl32 PropertySheet), so ENTER and ESC reach OK and Cancel at
	// once, without a click into the sheet first.
	const initialFocusRef = useMemo(
		() => ({
			get current(): HTMLElement | null {
				return (
					contentRef.current?.querySelector<HTMLElement>(
						'[role="tab"][tabindex="0"]',
					) ?? null
				);
			},
		}),
		[],
	);

	// Every item gone (emptied from the Trash): the sheet goes too.
	const gone = targetAppId === undefined && items.length === 0;
	useEffect(() => {
		if (gone) dispatch({ type: CLASSICY_PROPERTIES_CLOSE_ACTION, key });
	}, [gone, dispatch, key]);
	if (gone) return null;

	const caption =
		targetAppId !== undefined
			? appIdentity.name
			: single
				? shownSingleName
				: classicyPropertiesMultipleName(
						shownNames.display(
							items[0].path.split(fs.separator).pop() ?? "",
							items[0].entry,
						),
					);

	const icon =
		targetAppId !== undefined
			? appIdentity.icon
			: isTrash
				? trashIcon || single?.entry._icon || iconImageByType("directory")
				: single
					? single.entry._icon || iconImageByType(single.entry._type)
					: iconImageByType(ClassicyFileSystemEntryFileType.File);

	const types = new Set(entries.map((entry) => entry._type));
	const parents = new Set(
		items.map((item) => classicyParentPath(fs, item.path)),
	);
	const folderCount = entries.filter(
		(entry) =>
			entry._type === ClassicyFileSystemEntryFileType.Directory ||
			entry._type === ClassicyFileSystemEntryFileType.Drive,
	).length;
	const counts = { files: entries.length - folderCount, folders: folderCount };
	const contains = isFolder ? classicyCountFolderContents(single?.entry) : null;
	const parentFolder = single ? classicyParentPath(fs, single.path) : "";
	const location =
		parentFolder === CLASSICY_TRASH_PATH ? trashName : parentFolder;

	const general = (
		<div className={"classicyFilePropertiesGeneral"}>
			<div className={"classicyFilePropertiesHead"}>
				<ClassicyIconImage
					className={"classicyFilePropertiesIcon"}
					src={icon}
					drawnAt={Number.POSITIVE_INFINITY}
					alt={""}
				/>
				{renamable ? (
					<ClassicyInput
						id={`${windowId}-name`}
						className={"classicyFilePropertiesName"}
						prefillValue={shownSingleName}
						onChangeFunc={(e) => setName(e.target.value)}
					/>
				) : (
					<span className={"classicyFilePropertiesName"}>
						{targetAppId !== undefined
							? appIdentity.name
							: single
								? shownSingleName
								: classicyPropertiesCount(counts.files, counts.folders)}
					</span>
				)}
			</div>
			<ClassicySeparator />
			<div className={"classicyFilePropertiesRows"}>
				{targetAppId !== undefined ? (
					<Row label={"Type:"}>
						{typeName(ClassicyFileSystemEntryFileType.AppShortcut)}
					</Row>
				) : single ? (
					<>
						<Row label={"Type:"}>{typeName(single.entry._type)}</Row>
						{location !== "" && <Row label={"Location:"}>{location}</Row>}
						<Row label={isDrive ? "Used space:" : "Size:"}>
							{sizeText(size)}
						</Row>
						{contains && (
							<Row label={"Contains:"}>
								{classicyPropertiesCount(contains.files, contains.folders)}
							</Row>
						)}
					</>
				) : (
					<>
						<Row label={"Type:"}>
							{types.size === 1
								? classicyPropertiesAllOfType(typeName(entries[0]._type))
								: CLASSICY_PROPERTIES_MULTIPLE_TYPES}
						</Row>
						<Row label={"Location:"}>
							{parents.size === 1
								? classicyPropertiesAllIn([...parents][0])
								: CLASSICY_PROPERTIES_VARIOUS_FOLDERS}
						</Row>
						<Row label={"Size:"}>{sizeText(size)}</Row>
					</>
				)}
			</div>
			{single && !isDrive && (
				<>
					<ClassicySeparator />
					<div className={"classicyFilePropertiesRows"}>
						<Row label={"Created:"}>
							{classicyFormatPropertiesDate(single.entry._createdOn)}
						</Row>
						{!isFolder && (
							<Row label={"Modified:"}>
								{classicyFormatPropertiesDate(single.entry._modifiedOn)}
							</Row>
						)}
					</div>
				</>
			)}
			{targetAppId === undefined && !isDrive && (
				<>
					<ClassicySeparator />
					<div className={"classicyFilePropertiesRows"}>
						<Row label={"Attributes:"}>
							<span className={"classicyFilePropertiesAttributes"}>
								<ClassicyCheckbox
									id={`${windowId}-read-only`}
									label={"Read-only"}
									accessKey={ak("R")}
									checked={readOnly === true}
									mixed={readOnly === "mixed"}
									disabled={!attributesEditable}
									onClickFunc={(checked) => setReadOnly(checked)}
								/>
								<ClassicyCheckbox
									id={`${windowId}-hidden`}
									label={"Hidden"}
									accessKey={ak("d")}
									checked={hidden === true}
									mixed={hidden === "mixed"}
									disabled={!attributesEditable}
									onClickFunc={(checked) => setHidden(checked)}
								/>
							</span>
						</Row>
					</div>
				</>
			)}
		</div>
	);

	return (
		<ClassicyWindow
			id={windowId}
			appId={appId}
			title={classicyPropertiesCaption(caption)}
			hideIcon={true}
			closable={true}
			resizable={false}
			zoomable={false}
			collapsable={false}
			scrollable={false}
			modal={false}
			initialSize={[360, 0]}
			initialPosition={[80 + index * 24, 60 + index * 24]}
			initialFocusRef={initialFocusRef}
			contextHelp={true}
			// The id holds a path, which never reaches analytics.
			analyticsPath={classicyWindowPagePath(appId, "properties")}
			onCloseFunc={() =>
				dispatch({ type: CLASSICY_PROPERTIES_CLOSE_ACTION, key })
			}
			className={className}
			style={style}
		>
			<div ref={contentRef} className={classNames("classicyFileProperties")}>
				<ClassicyTabs tabs={[{ title: "General", children: general }]} />
				<div className={"classicyFilePropertiesButtons"}>
					<ClassicyButton isDefault={true} onClickFunc={ok}>
						OK
					</ClassicyButton>
					<ClassicyButton onClickFunc={cancel}>Cancel</ClassicyButton>
					<ClassicyButton
						accessKey={ak("A")}
						disabled={!dirty}
						onClickFunc={() => {
							apply();
						}}
					>
						Apply
					</ClassicyButton>
				</div>
			</div>
		</ClassicyWindow>
	);
};
