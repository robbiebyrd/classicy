import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	type ClassicyAppIdentityOverrides,
	classicyAppIdentityFrom,
	useClassicyAppIdentityOverrides,
} from "@/Appearance/ClassicyAppIdentity";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	getAppWindow,
	listAppWindows,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { useClassicyBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import {
	CLASSICY_DROP_ACTIVATE_ATTRIBUTE,
	CLASSICY_DROP_ACTIVATE_EVENT,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import { useClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import {
	type ClassicyWindowCommand,
	type ClassicyWindowEntry,
	getClassicyWindowEntries,
	runClassicyWindowCommand,
	useClassicyWindowEntries,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";

/**
 * The taskbar's window buttons (plan 0020-w98 §2, "Task buttons"): one for
 * each open primary window, "a button is placed in the taskbar for that
 * window" (WIG Ch.3 "Window Buttons", p.15), and none for a modal dialog or a
 * palette, since "secondary windows do not appear on the taskbar" (Ch.8
 * "Appearance and Behavior", p.145).
 */

/**
 * How long the pointer rests on a button before its tooltip shows, in ms:
 * Windows' automatic tooltip delay, the double-click time (Wine
 * `tooltips.c`, `TTDT_AUTOMATIC` = `GetDoubleClickTime()`, 500 by default).
 */
export const CLASSICY_TASKBAR_TOOLTIP_DELAY_MS = 500;

/** One window button: its window and how it is drawn. */
export type ClassicyTaskbarTask = {
	/** The button's key: the window's app id and window id. */
	readonly key: string;
	/** The window, as it registered (`ClassicyWindowRegistry.internal.ts`). */
	readonly entry: ClassicyWindowEntry;
	/**
	 * The button's text: the window's title, or the app's display name
	 * (`classicyAppIdentityFrom`) when the title is empty.
	 */
	readonly label: string;
	/** The window's icon, which the button draws before its label. */
	readonly icon: string;
	/** The window's `zOrder` (its last focus), 0 when it has none. */
	readonly zOrder: number;
	/**
	 * The window is collapsed (the store's `collapsed`): minimized, under a
	 * layout that minimizes. The button carries `collapsed`.
	 */
	readonly minimized: boolean;
	/**
	 * The button is the active window's, drawn pushed in (`active`,
	 * `aria-pressed`): the window is focused, its app is, and it is not
	 * minimized; or a modal or palette of its app holds focus and this is
	 * the app's front (highest-`zOrder`) unminimized window, as Windows keeps
	 * an owner's button pressed under its dialog.
	 */
	readonly active: boolean;
	/**
	 * The window's app asks for the user's attention (the record's
	 * `attention`, `ClassicyAppRequestAttention`; WIG Ch.10 "Message
	 * Notification", p.212), so the button flashes: it carries
	 * `classicyTaskbarTaskAttention` until the app is activated. Never on
	 * the active button.
	 */
	readonly attention: boolean;
};

/** The key of a window's button. */
export const classicyTaskbarTaskKey = (
	appId: string,
	windowId: string,
): string => `${appId}\u0000${windowId}`;

const ownApp = (
	apps: Readonly<Record<string, ClassicyStoreSystemApp>>,
	appId: string,
): ClassicyStoreSystemApp | undefined =>
	Object.hasOwn(apps, appId) ? apps[appId] : undefined;

// A window with no button of its own: a modal dialog or a palette.
const isSecondary = (window: {
	modal?: boolean;
	windowType?: "document" | "utility";
}): boolean => window.modal === true || window.windowType === "utility";

/**
 * The key of the button drawn pushed in, if any (`ClassicyTaskbarTask`'s
 * `active`). None while the desktop holds focus, or while the focused
 * window is minimized.
 */
const activeTaskKey = (
	entries: readonly ClassicyWindowEntry[],
	apps: Readonly<Record<string, ClassicyStoreSystemApp>>,
	tasks: readonly Omit<ClassicyTaskbarTask, "active" | "attention">[],
): string | undefined => {
	const app = Object.values(apps).find((a) => a.open && a.focused);
	if (!app) return undefined;
	const focused = listAppWindows(app).find((w) => w.focused && !w.closed);
	if (!focused) return undefined;
	const own = tasks.filter((t) => t.entry.appId === app.id);
	const task = own.find((t) => t.entry.windowId === focused.id);
	if (task) return task.minimized ? undefined : task.key;
	// The registered entry knows the window's kind as its props say; the
	// record, as it was stored.
	const entry = entries.find(
		(e) => e.appId === app.id && e.windowId === focused.id,
	);
	if (!isSecondary(entry ?? focused)) return undefined;
	let front: Omit<ClassicyTaskbarTask, "active" | "attention"> | undefined;
	for (const t of own)
		if (!t.minimized && (front === undefined || t.zOrder > front.zOrder))
			front = t;
	return front?.key;
};

/**
 * The window buttons, in the window registry's order (the order the
 * windows first mounted): every registered window that is neither a modal
 * nor a palette, whose record is open and whose app is open (extension apps
 * included, as Windows gives its help windows buttons), with its label, icon
 * and states. Pure: the taskbar passes the registry, the store's apps and the
 * active package's app identity overrides.
 */
export function classicyTaskbarTasks(
	entries: readonly ClassicyWindowEntry[],
	apps: Readonly<Record<string, ClassicyStoreSystemApp>>,
	overrides: ClassicyAppIdentityOverrides,
): ClassicyTaskbarTask[] {
	const tasks: Omit<ClassicyTaskbarTask, "active" | "attention">[] = [];
	const attention = new Set<string>();
	for (const entry of entries) {
		if (isSecondary(entry)) continue;
		const app = ownApp(apps, entry.appId);
		if (!app?.open) continue;
		const record = getAppWindow(app, entry.windowId);
		if (!record || record.closed) continue;
		const label =
			entry.title.trim() !== ""
				? entry.title
				: classicyAppIdentityFrom(overrides, app.id, {
						name: app.name,
						icon: app.icon,
					}).name;
		const key = classicyTaskbarTaskKey(entry.appId, entry.windowId);
		if (record.attention === true) attention.add(key);
		tasks.push({
			key,
			entry,
			label,
			icon: entry.icon,
			zOrder: record.zOrder ?? 0,
			minimized: record.collapsed === true,
		});
	}
	const active = activeTaskKey(entries, apps, tasks);
	return tasks.map((t) => ({
		...t,
		active: t.key === active,
		attention: t.key !== active && attention.has(t.key),
	}));
}

/**
 * The buttons' left-to-right order (plan 0020-w98 §2, "Order"), Windows'
 * creation order: the buttons already shown keep their places, and a
 * window's button that is new (the window opened, or reopened after it
 * closed) goes at the end. Several new at once, as at mount, go by ascending
 * `zOrder`, ties in the order given. A button whose window closed drops out.
 * Minimizing and activating move nothing. Pure.
 */
export function classicyTaskbarOrder(
	previous: readonly string[],
	tasks: readonly { key: string; zOrder: number }[],
): string[] {
	const present = new Set(tasks.map((t) => t.key));
	const kept = previous.filter((key) => present.has(key));
	const shown = new Set(kept);
	const added = tasks
		.filter((t) => !shown.has(t.key))
		.sort((a, b) => a.zOrder - b.zOrder)
		.map((t) => t.key);
	return [...kept, ...added];
}

/**
 * What a click on a window's button does (ReactOS `taskswnd.cpp`,
 * `HandleTaskItemClick`): a minimized window is restored and activated; the
 * active window is minimized (the window refuses it when it has no
 * collapse box); any other window is activated.
 */
export const classicyTaskbarClickCommand = (
	task: Pick<ClassicyTaskbarTask, "minimized" | "active">,
): ClassicyWindowCommand["type"] =>
	task.minimized ? "restore" : task.active ? "minimize" : "activate";

/**
 * What a file drag resting on a window's button does (WIG Ch.3 "Window
 * Buttons", p.16: "When the user drags over a taskbar button, the system
 * activates the associated window, allowing the user to drop within that
 * window"; Ch.10 "Taskbar Window Buttons", p.211: "the system automatically
 * restores the window"): a minimized window is restored and activated, and
 * any other window is activated. Unlike a click, it never minimizes the
 * active window, which the drop is meant for.
 */
export const classicyTaskbarDropActivateCommand = (
	task: Pick<ClassicyTaskbarTask, "minimized">,
): ClassicyWindowCommand["type"] => (task.minimized ? "restore" : "activate");

// The button's task as the store stands now, not as the render saw it: a
// click decides on the live state.
const liveTask = (
	key: string,
	overrides: ClassicyAppIdentityOverrides,
): ClassicyTaskbarTask | undefined =>
	classicyTaskbarTasks(
		getClassicyWindowEntries(),
		useAppManager.getState().System.Manager.Applications.apps,
		overrides,
	).find((t) => t.key === key);

const ClassicyTaskbarTaskButton: FunctionalComponent<{
	task: ClassicyTaskbarTask;
	overrides: ClassicyAppIdentityOverrides;
}> = ({ task, overrides }) => {
	const { appId, windowId } = task.entry;
	const buttonRef = useRef<HTMLButtonElement>(null);
	const labelRef = useRef<HTMLSpanElement>(null);

	// A press held on the button: `over` while the pointer is over it, so it
	// draws pushed in only then, as a Windows push button does.
	const [press, setPress] = useState<{ over: boolean } | null>(null);
	const held = press !== null;
	const endPress = useCallback(() => setPress(null), []);
	useEffect(() => {
		if (!held) return;
		document.addEventListener("mouseup", endPress);
		return () => document.removeEventListener("mouseup", endPress);
	}, [held, endPress]);
	useClassicyPointerStreamLost(held, endPress);

	// WIG Ch.3 "Window Buttons" (p.15): "When the size of the button requires
	// that the window's title be abbreviated, the taskbar also automatically
	// supplies a tooltip for the button." Measured as the pointer arrives,
	// which starts the tooltip's timer only for a title cut short; a tooltip,
	// so shown whatever Balloon Help says.
	const { handlers, balloon } = useClassicyBalloonHelp(
		buttonRef,
		{ content: task.label, delay: CLASSICY_TASKBAR_TOOLTIP_DELAY_MS },
		{ force: true },
	);

	const run = (type: ClassicyWindowCommand["type"]) =>
		runClassicyWindowCommand(appId, windowId, {
			type,
		} as ClassicyWindowCommand);

	// A file drag that has rested on the button (`ClassicyFileDrag.ts`, which
	// finds the button by its `CLASSICY_DROP_ACTIVATE_ATTRIBUTE`) brings its
	// window up for the drop, decided on the live state as a click is.
	useEffect(() => {
		const button = buttonRef.current;
		if (!button) return;
		const onDropActivate = () => {
			const live = liveTask(task.key, overrides);
			if (live)
				runClassicyWindowCommand(appId, windowId, {
					type: classicyTaskbarDropActivateCommand(live),
				} as ClassicyWindowCommand);
		};
		button.addEventListener(CLASSICY_DROP_ACTIVATE_EVENT, onDropActivate);
		return () =>
			button.removeEventListener(CLASSICY_DROP_ACTIVATE_EVENT, onDropActivate);
	}, [task.key, overrides, appId, windowId]);

	const onMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
		if (e.button !== 0) return;
		// A pointer press leaves the focus where it is: Windows' taskbar takes
		// none from a click, which hands it to the window it activates.
		e.preventDefault();
		setPress({ over: true });
	};
	const onMouseEnter = () => {
		const label = labelRef.current;
		if (label && label.scrollWidth > label.clientWidth) handlers.onMouseEnter();
		if (press) setPress({ over: true });
	};
	const onMouseLeave = () => {
		handlers.onMouseLeave();
		if (press) setPress({ over: false });
	};
	// Space holds a focused button pushed in until it comes up, the click.
	const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (e.key === " " && !e.repeat) setPress({ over: true });
	};
	const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (e.key === " ") endPress();
	};
	const onClick = () => {
		const live = liveTask(task.key, overrides);
		if (live) run(classicyTaskbarClickCommand(live));
	};
	// Button 2 (ReactOS `HandleTaskItemRightClick`): the window is activated
	// unless it is minimized, then its pop-up menu opens at the pointer; a
	// minimized window's menu restores it from its Restore. The window
	// reports `false` while it has no pop-up menu, and nothing opens.
	const onContextMenu = (e: MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		const live = liveTask(task.key, overrides);
		if (!live) return;
		if (!live.minimized) run("activate");
		runClassicyWindowCommand(appId, windowId, {
			type: "systemMenu",
			at: [e.clientX, e.clientY],
		});
	};

	return (
		<>
			<button
				ref={buttonRef}
				type="button"
				className={classNames(
					"classicyTaskbarTask",
					{ classicyTaskbarTaskAttention: task.attention },
					classicyStateClasses({
						active: task.active,
						collapsed: task.minimized,
						pressed: press?.over === true,
					}),
				)}
				aria-pressed={task.active}
				aria-describedby={handlers["aria-describedby"]}
				{...{ [CLASSICY_DROP_ACTIVATE_ATTRIBUTE]: "" }}
				onMouseDown={onMouseDown}
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
				onKeyDown={onKeyDown}
				onKeyUp={onKeyUp}
				onBlur={endPress}
				onClick={onClick}
				onContextMenu={onContextMenu}
			>
				<ClassicyIconImage
					className="classicyTaskbarTaskIcon"
					src={task.icon}
					alt=""
					draggable={false}
				/>
				<span ref={labelRef} className="classicyTaskbarTaskLabel">
					{task.label}
				</span>
			</button>
			{balloon}
		</>
	);
};

/**
 * How many window buttons one row of the task band holds (plan 0020-w98 E1,
 * "Task-band paging"), as ReactOS's `CTaskSwitchWnd::UpdateButtonsSize`
 * fits them: every button fits while each can have its least width
 * (`minWidth`, SM_CXSIZE plus two edges, the package's `min-width` on the
 * list's items) and the gap after it (the list's `column-gap`); past that,
 * the buttons take their least width and a row holds as many as fit beside
 * the up/down control. `listWidth` is the list's width now and `pagerWidth`
 * the control's outer width beside it (0 while it is not drawn), so the room
 * without the control is their sum. A list with no least width (a package
 * that sets none) or not laid out (no width) holds every button. Returns
 * `count` when every button fits, else at least 1. Pure.
 */
export function classicyTaskbarTasksPerPage({
	count,
	listWidth,
	pagerWidth,
	minWidth,
	gap,
}: {
	count: number;
	listWidth: number;
	pagerWidth: number;
	minWidth: number;
	gap: number;
}): number {
	const room = listWidth + pagerWidth;
	if (count <= 0 || !(minWidth > 0) || !(room > 0)) return count;
	const slot = minWidth + Math.max(0, gap);
	if (count * slot <= room) return count;
	// Beside the control: the list's own width once it is drawn, else the
	// whole room for now (the next measure, with the control drawn, refines
	// it).
	const beside = pagerWidth > 0 ? listWidth : room;
	return Math.max(1, Math.min(count, Math.floor(beside / slot)));
}

// A length a computed style holds, in px; 0 when it holds none.
const computedPx = (value: string): number => {
	const px = Number.parseFloat(value);
	return Number.isFinite(px) ? px : 0;
};

/**
 * The taskbar's list of window buttons (`.classicyTaskbarTasks`,
 * `data-classicy-part="taskbar-tasks"`). Each button runs its window's own
 * commands through the window registry, so the window's sounds, analytics
 * and geometry stay in `ClassicyWindow`, and carries
 * `data-classicy-drop-activate`, so a file drag resting on it brings its
 * window up (`classicyTaskbarDropActivateCommand`).
 *
 * - **Its gripper** (`gripper`): while Quick Launch is shown the task band is
 *   one of two bands, and a `classicyTaskbarGripper` with
 *   `data-classicy-part="taskbar-tasks-gripper"` leads it, as comctl32's
 *   rebar gives every sizable band a gripper once there are two.
 * - **Paging** (plan 0020-w98 E1): when the buttons at their least width no
 *   longer fit one row (`classicyTaskbarTasksPerPage`, measured on mount, on
 *   a resize and as windows come and go), the list carries
 *   `classicyTaskbarTasksPaged`, shows one row of buttons at a time, and the
 *   up/down control (`.classicyTaskbarPager`,
 *   `data-classicy-part="taskbar-pager"`: `classicyTaskbarPagerUp`, dimmed on
 *   the first row, and `classicyTaskbarPagerDown`, dimmed on the last) moves
 *   between the rows, as Windows 95/98's task band scrolled its rows of
 *   buttons with an up-down control at its right. The row holding the active
 *   window's button is shown whenever that window changes. A package that
 *   gives the buttons no least width never pages.
 */
export const ClassicyTaskbarTasks: FunctionalComponent<{
	/** Lead the band with its gripper (Quick Launch is shown beside it). */
	gripper?: boolean;
	/**
	 * The taskbar stands at a side (plan 0020-w98 E4): the buttons are
	 * stacked, so a "row" is a column of them, measured down the band (its
	 * height, the items' `min-height`, the list's `row-gap` and the control's
	 * height below it), and the arrows walk the buttons up and down.
	 */
	vertical?: boolean;
}> = ({ gripper = false, vertical = false }) => {
	const entries = useClassicyWindowEntries();
	const apps = useAppManager((s) => s.System.Manager.Applications.apps);
	const overrides = useClassicyAppIdentityOverrides();
	const tasks = useMemo(
		() => classicyTaskbarTasks(entries, apps, overrides),
		[entries, apps, overrides],
	);
	// The order is the component's, for the session: each render places the
	// buttons against the order last committed.
	const committedOrder = useRef<readonly string[]>([]);
	const order = useMemo(
		() => classicyTaskbarOrder(committedOrder.current, tasks),
		[tasks],
	);
	useLayoutEffect(() => {
		committedOrder.current = order;
	}, [order]);
	const byKey = new Map(tasks.map((t) => [t.key, t]));

	// Paging: how many buttons a row holds, measured; the row shown.
	const listRef = useRef<HTMLUListElement>(null);
	const pagerRef = useRef<HTMLDivElement>(null);
	const count = order.length;
	// The buttons a row holds while they take more than one, else null
	// (every button fits, the start, and after any change until measured).
	const [rowCap, setRowCap] = useState<number | null>(null);
	const [page, setPage] = useState(0);
	const measureRef = useRef<() => void>(() => {});
	measureRef.current = () => {
		const list = listRef.current;
		if (!list || typeof getComputedStyle !== "function") return;
		const item = list.firstElementChild;
		const pager = pagerRef.current;
		let pagerWidth = 0;
		if (pager) {
			const style = getComputedStyle(pager);
			pagerWidth = vertical
				? pager.offsetHeight +
					computedPx(style.marginTop) +
					computedPx(style.marginBottom)
				: pager.offsetWidth +
					computedPx(style.marginLeft) +
					computedPx(style.marginRight);
		}
		const itemStyle = item ? getComputedStyle(item) : null;
		const listStyle = getComputedStyle(list);
		const next = classicyTaskbarTasksPerPage({
			count,
			listWidth: vertical ? list.clientHeight : list.clientWidth,
			pagerWidth,
			minWidth: itemStyle
				? computedPx(vertical ? itemStyle.minHeight : itemStyle.minWidth)
				: 0,
			gap: computedPx(vertical ? listStyle.rowGap : listStyle.columnGap),
		});
		const cap = next < count ? next : null;
		setRowCap((current) => (current === cap ? current : cap));
	};
	// biome-ignore lint/correctness/useExhaustiveDependencies: the dependencies are the triggers (the ref reads fresh state): the buttons coming and going, and the control appearing or going
	useLayoutEffect(() => {
		measureRef.current();
	}, [count, rowCap, vertical]);
	useEffect(() => {
		const list = listRef.current;
		if (!list || typeof ResizeObserver !== "function") return;
		const observer = new ResizeObserver(() => measureRef.current());
		observer.observe(list);
		const bar = list.parentElement;
		if (bar) observer.observe(bar);
		return () => observer.disconnect();
	}, []);
	const paged = rowCap !== null && rowCap < count;
	const rowLength = paged ? Math.max(1, rowCap) : Math.max(1, count);
	const pages = paged ? Math.ceil(count / rowLength) : 1;
	const shownPage = Math.min(page, pages - 1);
	// The active window's row comes into view when that window changes.
	const activeKey = tasks.find((t) => t.active)?.key;
	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the active window and the row length; the order is read as it stands
	useLayoutEffect(() => {
		if (!activeKey) return;
		const index = order.indexOf(activeKey);
		if (index >= 0) setPage(Math.floor(index / rowLength));
	}, [activeKey, rowLength]);
	const shown = paged
		? order.slice(shownPage * rowLength, (shownPage + 1) * rowLength)
		: order;
	const step = (direction: 1 | -1) =>
		setPage(Math.max(0, Math.min(pages - 1, shownPage + direction)));
	// The up/down control acts at the press, as an up-down control does, and
	// takes no focus from a press; Enter and Space reach it as a click with
	// no press count.
	const pagerHandlers = (direction: 1 | -1) => ({
		onMouseDown: (e: MouseEvent<HTMLButtonElement>) => {
			if (e.button !== 0) return;
			e.preventDefault();
			step(direction);
		},
		onClick: (e: MouseEvent<HTMLButtonElement>) => {
			if (e.detail === 0) step(direction);
		},
	});

	return (
		<>
			{gripper && (
				<span
					className="classicyTaskbarGripper"
					data-classicy-part="taskbar-tasks-gripper"
					aria-hidden="true"
				/>
			)}
			<ul
				ref={listRef}
				className={classNames("classicyTaskbarTasks", {
					classicyTaskbarTasksPaged: paged,
				})}
				data-classicy-part="taskbar-tasks"
				aria-label="Running windows"
			>
				{shown.map((key) => {
					const task = byKey.get(key);
					return task ? (
						<li key={key}>
							<ClassicyTaskbarTaskButton task={task} overrides={overrides} />
						</li>
					) : null;
				})}
			</ul>
			{paged && (
				<div
					ref={pagerRef}
					className="classicyTaskbarPager"
					data-classicy-part="taskbar-pager"
				>
					<button
						type="button"
						className="classicyTaskbarPagerUp"
						aria-label="Previous row of window buttons"
						disabled={shownPage === 0}
						{...pagerHandlers(-1)}
					/>
					<button
						type="button"
						className="classicyTaskbarPagerDown"
						aria-label="Next row of window buttons"
						disabled={shownPage >= pages - 1}
						{...pagerHandlers(1)}
					/>
				</div>
			)}
		</>
	);
};
