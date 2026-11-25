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
	tasks: readonly Omit<ClassicyTaskbarTask, "active">[],
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
	let front: Omit<ClassicyTaskbarTask, "active"> | undefined;
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
	const tasks: Omit<ClassicyTaskbarTask, "active">[] = [];
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
		tasks.push({
			key: classicyTaskbarTaskKey(entry.appId, entry.windowId),
			entry,
			label,
			icon: entry.icon,
			zOrder: record.zOrder ?? 0,
			minimized: record.collapsed === true,
		});
	}
	const active = activeTaskKey(entries, apps, tasks);
	return tasks.map((t) => ({ ...t, active: t.key === active }));
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
					classicyStateClasses({
						active: task.active,
						collapsed: task.minimized,
						pressed: press?.over === true,
					}),
				)}
				aria-pressed={task.active}
				aria-describedby={handlers["aria-describedby"]}
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
 * The taskbar's list of window buttons (`.classicyTaskbarTasks`,
 * `data-classicy-part="taskbar-tasks"`). Each button runs its window's own
 * commands through the window registry, so the window's sounds, analytics
 * and geometry stay in `ClassicyWindow`.
 */
export const ClassicyTaskbarTasks: FunctionalComponent = () => {
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

	return (
		<ul
			className="classicyTaskbarTasks"
			data-classicy-part="taskbar-tasks"
			aria-label="Running windows"
		>
			{order.map((key) => {
				const task = byKey.get(key);
				return task ? (
					<li key={key}>
						<ClassicyTaskbarTaskButton task={task} overrides={overrides} />
					</li>
				) : null;
			})}
		</ul>
	);
};
