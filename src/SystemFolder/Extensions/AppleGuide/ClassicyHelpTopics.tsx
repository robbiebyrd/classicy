import "./ClassicyHelpTopics.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent as ReactKeyboardEvent,
	type RefObject,
	useMemo,
	useRef,
	useState,
} from "react";
import { useClassicyAppIdentity } from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	APPLE_GUIDE_APP_ID,
	APPLE_GUIDE_APP_NAME,
	APPLE_GUIDE_HELP_TOPICS_WINDOW_ID,
	APPLE_GUIDE_SHOW_TOPIC_EVENT,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import {
	type HelpTopic,
	useAppleGuideTopics,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import { ClassicyScrollArea } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import {
	ClassicyTree,
	type ClassicyTreeNode,
} from "@/SystemFolder/SystemResources/Tree/ClassicyTree";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

/** One row of the Help Topics browser's Contents: a book of topics, or a topic. */
export type ClassicyHelpTopicsEntry =
	| { kind: "book"; id: string; title: string; topics: HelpTopic[] }
	| { kind: "topic"; id: string; title: string; topic: HelpTopic };

const BOOK_ID_PREFIX = "book:";
const TOPIC_ID_PREFIX = "topic:";

/**
 * The Contents tab's rows for `topics` (in the order given, as
 * `listAppleGuideTopics` lists them): a topic naming a `book` goes into that
 * book, which stands where its first topic stood; any other topic is a page
 * at the top level. Book rows are `book:<name>`, topic rows `topic:<id>`.
 */
export const classicyHelpTopicsContents = (
	topics: readonly HelpTopic[],
): ClassicyHelpTopicsEntry[] => {
	const entries: ClassicyHelpTopicsEntry[] = [];
	const books = new Map<string, HelpTopic[]>();
	for (const topic of topics) {
		if (topic.book === undefined || topic.book === "") {
			entries.push({
				kind: "topic",
				id: `${TOPIC_ID_PREFIX}${topic.id}`,
				title: topic.title,
				topic,
			});
			continue;
		}
		let book = books.get(topic.book);
		if (!book) {
			book = [];
			books.set(topic.book, book);
			entries.push({
				kind: "book",
				id: `${BOOK_ID_PREFIX}${topic.book}`,
				title: topic.book,
				topics: book,
			});
		}
		book.push(topic);
	}
	return entries;
};

type ClassicyHelpTopicsProps = {
	/** Extra class names, forwarded to the browser's `ClassicyWindow` root. */
	className?: string;
	/** Inline style, forwarded to the browser's `ClassicyWindow` root. */
	style?: CSSProperties;
};

/**
 * WinHelp's Help Topics browser (WIG Ch.12 "The Help Topics Browser" and
 * "The Help Topic Tabs", pp.284-288, Figure 12.13; winhlp32.exe on the
 * Windows 98 SE CD, whose dialog Windows 98 still showed for every
 * application's `.hlp` help): a dialog titled "Help Topics: <Apple Guide's
 * display name>" whose Contents tab lists the topics offered under the
 * active package (`listAppleGuideTopics`), a closed book row for each
 * `book` and a page row for each topic, over Display and Cancel.
 *
 * You normally do not render this yourself: under a package whose layout
 * says `help.topicWindow: "winhelp"` (Windows 98) the `AppleGuide`
 * extension renders it while `AppleGuide.app`'s `data.helpTopicsOpen` is
 * set, which `APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT` sets and
 * `ClassicyAppAppleGuideCloseTopics` clears.
 *
 * The first row starts selected. Display (the default button, also Return,
 * or a double-click on a topic) shows the selected topic
 * (`APPLE_GUIDE_SHOW_TOPIC_EVENT`) and closes the browser, as WinHelp does;
 * on a book the button reads Open, or Close once the book is open, and
 * opens or closes it (so does a double-click on the book). Cancel, Escape
 * and the close box close the browser. The prompt above the list follows
 * the selection, winhlp32's "Click a book, and then click Open." or "Click a
 * topic, and then click Display." The access keys are winhlp32's: the tab's
 * C, Display's D, Open's O, Close's L.
 *
 * Left out, with Classicy having nothing for them: the Index and Find tabs
 * (no keywords or full-text index; the prompt drops "Or click another tab,
 * such as Index."), Print… (no printing) and the "?" caption button's
 * What's This? (the shell's).
 */
export const ClassicyHelpTopics: FunctionalComponent<
	ClassicyHelpTopicsProps
> = ({ className, style }) => {
	const dispatch = useAppManagerDispatch();
	const topics = useAppleGuideTopics();
	const accessKey = useClassicyBundledAccessKeys();
	const guideIcon =
		useClassicyAsset("icons", "system.extensions.appleGuide") ?? "";
	// The help file's title is the help application's display name
	// (Windows 98 shows Apple Guide as Windows Help: "Help Topics: Windows
	// Help", as Windows 95's Start ▸ Help read).
	const { name } = useClassicyAppIdentity(APPLE_GUIDE_APP_ID, {
		name: APPLE_GUIDE_APP_NAME,
		icon: guideIcon,
	});
	// Rows by kind: a book is a category of topics, a page one topic.
	const bookIcon = useClassicyAsset("icons", "system.help") ?? "";
	const pageIcon = useClassicyAsset("icons", "system.files.document") ?? "";

	const entries = useMemo(() => classicyHelpTopicsContents(topics), [topics]);
	const [openIds, setOpenIds] = useState<string[]>([]);
	const [chosenId, setChosenId] = useState<string | undefined>(undefined);

	const nodes = useMemo<ClassicyTreeNode[]>(
		() =>
			entries.map((entry) =>
				entry.kind === "book"
					? {
							id: entry.id,
							label: entry.title,
							leftIcon: bookIcon,
							branchSelectable: true,
							children: entry.topics.map((topic) => ({
								id: `${TOPIC_ID_PREFIX}${topic.id}`,
								label: topic.title,
								leftIcon: pageIcon,
							})),
						}
					: {
							id: entry.id,
							label: entry.title,
							leftIcon: pageIcon,
						},
			),
		[entries, bookIcon, pageIcon],
	);

	// Every row a selection may name: the books and every topic in them.
	const rowIds = useMemo(
		() =>
			new Set(
				nodes.flatMap((node) => [
					node.id,
					...(node.children ?? []).map((child) => child.id),
				]),
			),
		[nodes],
	);
	// The chosen row while it is listed, else the first row.
	const selectedId =
		chosenId !== undefined && rowIds.has(chosenId) ? chosenId : nodes[0]?.id;
	// Read by Return, which the tree's own handler reaches first (it chooses
	// the keyboard's row), so the choice it reports is in here already.
	const selectedRef = useRef(selectedId);
	selectedRef.current = selectedId;

	// The tree's row holding the keyboard (its one tab stop) takes the focus
	// when the browser opens or comes forward, as WinHelp's tree does, so
	// the arrows, Return and Escape work at once.
	const listRef = useRef<HTMLDivElement>(null);
	const treeFocusRef = useMemo<RefObject<HTMLElement | null>>(
		() => ({
			get current() {
				return (
					listRef.current?.querySelector<HTMLElement>(
						'.classicyTreeNodeLabelHolder[tabindex="0"]',
					) ?? null
				);
			},
		}),
		[],
	);

	const close = () =>
		dispatch({
			type: "ClassicyAppAppleGuideCloseTopics",
			app: { id: APPLE_GUIDE_APP_ID },
		});

	const choose = (id: string) => {
		selectedRef.current = id;
		setChosenId(id);
	};

	const setBookOpen = (id: string, open: boolean) =>
		setOpenIds((ids) =>
			open
				? ids.includes(id)
					? ids
					: [...ids, id]
				: ids.filter((other) => other !== id),
		);

	const display = (rowId: string) => {
		if (!rowId.startsWith(TOPIC_ID_PREFIX)) return;
		dispatch({
			type: APPLE_GUIDE_SHOW_TOPIC_EVENT,
			app: { id: APPLE_GUIDE_APP_ID },
			topicId: rowId.slice(TOPIC_ID_PREFIX.length),
		});
		close();
	};

	// The default button's job on a row: open or close a book, show a topic.
	const run = (rowId: string | undefined) => {
		if (rowId === undefined) return;
		if (rowId.startsWith(BOOK_ID_PREFIX))
			setBookOpen(rowId, !openIds.includes(rowId));
		else display(rowId);
	};

	const onBook = selectedId?.startsWith(BOOK_ID_PREFIX) === true;
	const bookOpen = onBook && openIds.includes(selectedId ?? "");
	// winhlp32.exe's "&Display", "&Open", "C&lose".
	const action = !onBook
		? { label: "Display", key: "D" }
		: bookOpen
			? { label: "Close", key: "l" }
			: { label: "Open", key: "O" };

	const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
		if (e.altKey || e.ctrlKey || e.metaKey) return;
		if (e.key === "Escape") {
			e.preventDefault();
			close();
			return;
		}
		// Return is the default button's, except on a button of its own.
		if (
			e.key === "Enter" &&
			!(e.target instanceof Element && e.target.closest("button"))
		) {
			e.preventDefault();
			run(selectedRef.current);
		}
	};

	return (
		<ClassicyWindow
			id={APPLE_GUIDE_HELP_TOPICS_WINDOW_ID}
			appId={APPLE_GUIDE_APP_ID}
			title={`Help Topics: ${name}`}
			className={classNames("classicyHelpTopicsWindow", className)}
			style={style}
			hideIcon={true}
			closable={true}
			zoomable={false}
			collapsable={false}
			resizable={false}
			scrollable={false}
			// A modeless dialog: under Windows a ButtonFace face with no client
			// edge.
			contentFrame={true}
			// winhlp32.exe's dialog: 285 × 248 dialog units of MS Sans Serif
			// 8 (6 × 13 base units), 428 × 403 pixels inside the frame, with
			// the title bar's row above them.
			initialSize={[428, 423]}
			initialPosition={["center", "center"]}
			initialFocusRef={treeFocusRef}
			onCloseFunc={close}
		>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: the dialog's Return and Escape, which its controls' own keys reach first */}
			<div className={"classicyHelpTopics"} onKeyDown={onKeyDown}>
				<ClassicyTabs
					tabs={[
						{
							title: "Contents",
							accessKey: accessKey("C"),
							children: (
								<div className={"classicyHelpTopicsContents"}>
									<p className={"classicyHelpTopicsPrompt"}>
										{onBook
											? "Click a book, and then click Open."
											: "Click a topic, and then click Display."}
									</p>
									<ClassicyScrollArea
										ref={listRef}
										className={"classicyHelpTopicsList"}
										viewportClassName={"classicyHelpTopicsListViewport"}
									>
										<ClassicyTree
											nodes={nodes}
											selectionMode={"single"}
											selectedIds={selectedId === undefined ? [] : [selectedId]}
											openIds={openIds}
											onToggleNode={setBookOpen}
											onSelectNode={choose}
											onActivateNode={(id) => {
												choose(id);
												display(id);
											}}
										/>
									</ClassicyScrollArea>
								</div>
							),
						},
					]}
				/>
				<div className={"classicyHelpTopicsButtons"}>
					<ClassicyButton
						isDefault={true}
						disabled={selectedId === undefined}
						accessKey={accessKey(action.key)}
						onClickFunc={() => run(selectedRef.current)}
					>
						{action.label}
					</ClassicyButton>
					<ClassicyButton onClickFunc={close}>Cancel</ClassicyButton>
				</div>
			</div>
		</ClassicyWindow>
	);
};
