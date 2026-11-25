import "./AppleGuide.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type MouseEvent as ReactMouseEvent,
	useRef,
} from "react";
import { useClassicyAppIdentity } from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	APPLE_GUIDE_APP_ID,
	APPLE_GUIDE_APP_NAME,
	APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT,
	isAppleGuideData,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import {
	appleGuideWindowId,
	useAppleGuideTopic,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import {
	ClassicyAssistant,
	type ClassicyAssistantPage,
} from "@/SystemFolder/SystemResources/Assistant/ClassicyAssistant";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuContext.internal";
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

/**
 * The text of the page an Apple Guide window shows, as WinHelp's Options ▸
 * Copy puts it on the clipboard: the topic's title, a blank line, then the
 * page's text as drawn (`innerText`, where the browser lays it out; else its
 * `textContent`), the closing "- End -" marker left out.
 */
export const classicyAppleGuidePageText = (
	title: string,
	body: HTMLElement | null | undefined,
): string => {
	if (!body) return title;
	const drawn =
		typeof body.innerText === "string" && body.innerText !== ""
			? body.innerText
			: (body.textContent ?? "");
	const end = body.querySelector(".appleGuideEnd")?.textContent ?? "";
	let text = drawn.trimEnd();
	if (end !== "" && text.endsWith(end)) text = text.slice(0, -end.length);
	text = text.trim();
	return text === "" ? title : `${title}\n\n${text}`;
};

type AppleGuideWindowProps = {
	/**
	 * Id of a topic registered with `registerAppleGuideTopic`. Also derives the
	 * window id (`apple_guide_<topicId>`). Unknown ids render nothing.
	 */
	topicId: string;
	/** Extra class names, forwarded to the topic's `ClassicyWindow` root. */
	className?: string;
	/** Inline style, forwarded to the topic's `ClassicyWindow` root. */
	style?: CSSProperties;
};

/**
 * One Apple Guide help topic in its own window: the Mac OS 8 step-by-step
 * help system behind the Help menu (its "About Balloon Help…" item opens the
 * built-in topic). The topic's `title` heads every page, its `pages` are
 * paged with the assistant's arrows, and the last page ends with "- End -".
 *
 * You normally do not render this yourself: `ClassicyDesktop` mounts the
 * `AppleGuide` extension, which renders one of these per open topic. Register
 * a topic at module scope and open it by dispatching
 * `APPLE_GUIDE_SHOW_TOPIC_EVENT`:
 *
 * ```tsx
 * registerAppleGuideTopic({ id: "my-app-basics", title: "My App Basics",
 *   pages: [<p>Step one…</p>, <p>Step two…</p>] });
 * dispatch({ type: APPLE_GUIDE_SHOW_TOPIC_EVENT, topicId: "my-app-basics" });
 * ```
 *
 * Under the hood it is a `ClassicyAssistant` driven in controlled mode: the
 * page index lives in the AppManager store (`AppleGuide.app`'s `data.pages`,
 * so the position in a topic survives a reload), the assistant renders the
 * stored page and reports arrow clicks back as `ClassicyAppAppleGuideSetPage`.
 * Showing a topic again restarts it at page 1; the close box dispatches
 * `ClassicyAppAppleGuideCloseTopic`. The topic is the variant offered under
 * the active package (`registerAppleGuideTopic`'s `packages`).
 *
 * Under a package whose layout says `help.topicWindow: "winhelp"` (Windows
 * 98; WIG Ch.12 "Task Topic Windows", pp.279-280, Figure 12.10) it is
 * WinHelp's task topic window, a primary window captioned with Apple
 * Guide's display name and icon: the user can size it (at least 320 × 200),
 * and a row of command buttons (`appleGuideButtonBar`) sits above the
 * topic: "Help Topics" (access key T) opens the Help Topics browser
 * (`APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT`), "Back" shows the previous page
 * (dimmed on the first), and "Options" (O) drops a menu of "Copy" (o), which
 * puts the page's text on the clipboard (`classicyAppleGuidePageText`).
 * Without the key it is fixed at 700 × 322 with no button row, as before.
 */
export const AppleGuideWindow: FunctionalComponent<AppleGuideWindowProps> = ({
	topicId,
	className,
	style,
}) => {
	const dispatch = useAppManagerDispatch();
	const rawData = useAppManager(
		(s) => s.System.Manager.Applications.apps[APPLE_GUIDE_APP_ID]?.data,
	);
	// The variant offered under the active package (`packages`), following
	// a package switch or a later registration.
	const topic = useAppleGuideTopic(topicId);
	// WinHelp's task topic window (WIG Ch.12 "Task Topic Windows",
	// pp.279-280, Figure 12.10): one the user can size, with its command
	// buttons above the topic.
	const winhelp = useClassicyAppearanceLayout().help?.topicWindow === "winhelp";
	// A primary window names its help file in its caption, beside its icon:
	// the help application's display name (Windows 98 shows Apple Guide as
	// Windows Help, Figure 12.10's caption).
	const guideIcon =
		useClassicyAsset("icons", "system.extensions.appleGuide") ?? "";
	const { name: guideName } = useClassicyAppIdentity(APPLE_GUIDE_APP_ID, {
		name: APPLE_GUIDE_APP_NAME,
		icon: guideIcon,
	});
	const accessKey = useClassicyBundledAccessKeys();
	const { showContextMenu } = useClassicyContextualMenu();
	const rootRef = useRef<HTMLDivElement>(null);

	const normalizedData = rawData ?? {};
	const data = isAppleGuideData(normalizedData) ? normalizedData : {};
	const page = data.pages?.[topicId] ?? 0;

	if (!topic) return null;

	const setPage = (next: number) =>
		dispatch({
			type: "ClassicyAppAppleGuideSetPage",
			app: { id: APPLE_GUIDE_APP_ID },
			topicId,
			page: next,
		});

	// Options ▸ Copy: the page's text on the clipboard (winhlp32.exe's
	// "C&opy"). A page cannot write the clipboard everywhere (an insecure
	// context has no `navigator.clipboard`); the refusal is logged.
	const copyPage = () => {
		const text = classicyAppleGuidePageText(
			topic.title,
			rootRef.current?.querySelector<HTMLElement>(
				".classicyAssistantBodyViewport",
			),
		);
		const clipboard =
			typeof navigator === "undefined" ? undefined : navigator.clipboard;
		if (!clipboard) {
			classicyLog("warn", "AppleGuide", "No clipboard to copy the topic to");
			return;
		}
		clipboard
			.writeText(text)
			.catch((error: unknown) =>
				classicyLog("warn", "AppleGuide", "Could not copy the topic", error),
			);
	};

	// WinHelp's Options menu holds Annotate…, Copy, Print Topic…, Font, Keep
	// Help on Top and Use System Colors; Classicy has no annotations,
	// printing or help-window font, so Copy alone.
	const optionsMenu: ClassicyMenuItem[] = [
		{
			id: `${appleGuideWindowId(topicId)}_copy`,
			title: "Copy",
			accessKey: accessKey("o"),
			onClickFunc: copyPage,
		},
	];

	const showOptions = (e: ReactMouseEvent<HTMLButtonElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		// The menu drops from the button's lower left, as TrackPopupMenu
		// places WinHelp's (the provider adds a pixel down and right).
		showContextMenu(optionsMenu, [rect.left - 1, rect.bottom - 1], {
			helpItem: false,
		});
	};

	const lastIndex = topic.pages.length - 1;
	// Apple Guide names the whole TOPIC, not each page: the header band reads
	// the same all the way through, unlike an assistant's per-step titles.
	// The end marker only closes out the final page.
	const assistantPages: ClassicyAssistantPage[] = topic.pages.map(
		(body, index) => ({
			title: topic.title,
			content: (
				<>
					{body}
					{index === lastIndex && <p className="appleGuideEnd">- End -</p>}
				</>
			),
		}),
	);

	return (
		<ClassicyWindow
			id={appleGuideWindowId(topicId)}
			appId={APPLE_GUIDE_APP_ID}
			// AppleGuide.scss sizes this window border-box by its own class
			// (no `:has(.appleGuideWindow)`, which Firefox 113-120 lacks).
			className={classNames("appleGuideWindowFrame", className)}
			style={style}
			title={winhelp ? guideName : undefined}
			icon={winhelp ? guideIcon : undefined}
			hideIcon={!winhelp}
			closable={true}
			zoomable={true}
			collapsable={true}
			resizable={winhelp}
			scrollable={false}
			initialSize={[700, 322]}
			// Small enough to size, large enough to keep the button row and the
			// assistant's footer usable.
			minimumSize={winhelp ? [320, 200] : undefined}
			initialPosition={["center", "center"]}
			onCloseFunc={() =>
				dispatch({
					type: "ClassicyAppAppleGuideCloseTopic",
					app: { id: APPLE_GUIDE_APP_ID },
					topicId,
				})
			}
		>
			<div
				ref={rootRef}
				className={classNames(
					"appleGuideWindow",
					winhelp && "appleGuideWindowWithButtonBar",
				)}
			>
				{winhelp && (
					// winhlp32.exe's buttons (Windows 98 SE): "Help &Topics",
					// "&Back" and "&Options". This Back pages back as the
					// footer's "< Back" does, which holds B, so it takes no key
					// (one key per window, WIG Ch.4 "Access Keys", p.27).
					<div className="appleGuideButtonBar">
						<ClassicyButton
							accessKey={accessKey("T")}
							onClickFunc={() =>
								dispatch({
									type: APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT,
									app: { id: APPLE_GUIDE_APP_ID },
								})
							}
						>
							Help Topics
						</ClassicyButton>
						<ClassicyButton
							accessKey={accessKey("")}
							disabled={page === 0}
							onClickFunc={() => setPage(page - 1)}
						>
							Back
						</ClassicyButton>
						<ClassicyButton
							accessKey={accessKey("O")}
							aria-haspopup="menu"
							onClickFunc={showOptions}
						>
							Options
						</ClassicyButton>
					</div>
				)}
				<ClassicyAssistant
					pages={assistantPages}
					page={page}
					onPageChange={setPage}
				/>
			</div>
		</ClassicyWindow>
	);
};
