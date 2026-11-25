// The Windows 98 stories import their parameters and helpers from here, and
// only they do: importing this module registers the Windows 98 Appearance
// Package (`@classicy/appearance-windows98`), so it is registered only in a
// story iframe that has loaded one of those story files (Storybook loads
// CSF files lazily) or where it was chosen in the Package toolbar
// (./StorybookPackages.ts), never in every iframe through preview.tsx, as
// with System 7 (./system7.ts) and the `mirrored` package (./mirrored.ts).
import "@classicy/appearance-windows98";
import {
	createElement,
	type ReactElement,
	type ReactNode,
	useEffect,
	useRef,
} from "react";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { noteClassicyRecentDocument } from "@/SystemFolder/SystemResources/File/ClassicyRecentDocuments.internal";
import { CLASSICY_START_MENU_ID } from "@/SystemFolder/SystemResources/Taskbar/ClassicyStartMenu.internal";
import {
	type ClassicyWindowCommand,
	getClassicyWindowEntry,
	runClassicyWindowCommand,
	subscribeClassicyWindowEntries,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";
import { desktopParameters } from "./helpers";

/**
 * `desktopParameters` under the Windows 98 Appearance Package, which
 * activates its defaults, the "Windows Standard" theme. Spread into a
 * Windows 98 story's `parameters`; importing it registers the package.
 */
export const windows98Parameters = {
	...desktopParameters,
	classicy: { ...desktopParameters.classicy, appearancePackage: "windows98" },
};

/**
 * Activates one of the package's themes (`ClassicyDesktopChangeTheme`) once
 * the desktop has mounted, and renders its children.
 */
export function WithTheme({
	id,
	children,
}: {
	id: string;
	children?: ReactNode;
}) {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: id });
	}, [dispatch, id]);
	return children;
}

/**
 * A scene's story under one of the package's other schemes ("Windows 95",
 * "Brick", …); the "Windows Standard" one is the defaults', a story whose
 * `render` is the scene itself.
 */
export const inScheme = (
	id: string,
	scene: () => ReactNode,
): { render: () => ReactElement } => ({
	render: () => createElement(WithTheme, { id }, scene()),
});

/**
 * Dispatches each action, in order, once the desktop has mounted (a shell
 * dialog opened, the taskbar docked, a Run history seeded), and renders its
 * children. Runs once per mount.
 */
export function WithActions({
	actions,
	children,
}: {
	actions: readonly ActionMessage[];
	children?: ReactNode;
}) {
	const dispatch = useAppManagerDispatch();
	const latest = useRef(actions);
	latest.current = actions;
	const ran = useRef(false);
	useEffect(() => {
		if (ran.current) return;
		ran.current = true;
		for (const action of latest.current) dispatch(action);
	}, [dispatch]);
	return children;
}

/** One step of a scene: a window registry command, or a store action. */
export type Windows98StoryStep =
	| {
			appId: string;
			windowId: string;
			command: ClassicyWindowCommand;
	  }
	| { action: ActionMessage };

/** An app's window, as `[appId, windowId]`. */
export type Windows98StoryWindow = readonly [appId: string, windowId: string];

/**
 * Whether every window named is mounted (in the window registry) and open in
 * the store, so a registry command reaches it and its record.
 */
export const windows98StoryWindowsOpen = (
	windows: readonly Windows98StoryWindow[],
): boolean => {
	const apps = useAppManager.getState().System.Manager.Applications.apps;
	return windows.every(([appId, windowId]) => {
		const app = apps[appId];
		const record = app ? getAppWindow(app, windowId) : undefined;
		return (
			getClassicyWindowEntry(appId, windowId) !== undefined &&
			Boolean(app?.open) &&
			record !== undefined &&
			!record.closed
		);
	});
};

/** Runs the steps, in order: each command through the window's own path. */
export const runWindows98StorySteps = (
	steps: readonly Windows98StoryStep[],
): void => {
	for (const step of steps) {
		if ("action" in step) dispatch(step.action);
		else runClassicyWindowCommand(step.appId, step.windowId, step.command);
	}
};

/**
 * Runs `steps` once, `delayMs` after every window in `windows` is mounted and
 * open (`windows98StoryWindowsOpen`), and renders its children: how a scene
 * minimizes, maximizes or activates its windows, or opens one's system menu,
 * as the taskbar and the caption do (`runClassicyWindowCommand`), after the
 * windows have laid out. Runs once per mount, whatever re-renders.
 */
export function WhenWindowsOpen({
	windows,
	steps,
	delayMs = 50,
	children,
}: {
	windows: readonly Windows98StoryWindow[];
	steps: readonly Windows98StoryStep[];
	delayMs?: number;
	children?: ReactNode;
}) {
	const latest = useRef({ windows, steps });
	latest.current = { windows, steps };
	const ran = useRef(false);
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const check = () => {
			if (ran.current || timer !== undefined) return;
			if (!windows98StoryWindowsOpen(latest.current.windows)) return;
			timer = setTimeout(() => {
				timer = undefined;
				if (ran.current) return;
				ran.current = true;
				runWindows98StorySteps(latest.current.steps);
			}, delayMs);
		};
		const offRegistry = subscribeClassicyWindowEntries(check);
		const offStore = useAppManager.subscribe(check);
		check();
		return () => {
			offRegistry();
			offStore();
			if (timer !== undefined) clearTimeout(timer);
		};
	}, [delayMs]);
	return children;
}

/**
 * Notes each path as a document opened this session, as Finder's open does,
 * for Start ▸ Documents (which lists those that still exist).
 */
export const noteRecentDocuments = (paths: readonly string[]): void => {
	for (const path of paths) noteClassicyRecentDocument(path);
};

// Play-function helpers. Each acts as the user would, with the events the
// shell listens for, on the story's document (menus and pop-ups portal into
// `#classicyDesktop`, outside the canvas element's own subtree in a docs page).

/**
 * Resolves with what `find` returns once it returns an element, polling every
 * 20 ms; rejects after `timeoutMs`, naming `what`.
 */
export async function untilElement(
	find: () => Element | null | undefined,
	what: string,
	timeoutMs = 5000,
): Promise<HTMLElement> {
	const started = Date.now();
	for (;;) {
		const found = find();
		if (found instanceof HTMLElement) return found;
		if (Date.now() - started > timeoutMs)
			throw new Error(`[Windows 98 stories] no ${what} within ${timeoutMs} ms`);
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
}

/** Waits for the first element `selector` matches in `doc`. */
export const untilSelector = (
	doc: Document,
	selector: string,
	timeoutMs?: number,
): Promise<HTMLElement> =>
	untilElement(() => doc.querySelector(selector), selector, timeoutMs);

const centerOf = (el: Element) => {
	const box = el.getBoundingClientRect();
	return {
		clientX: Math.round(box.left + box.width / 2),
		clientY: Math.round(box.top + box.height / 2),
	};
};

const mouse = (el: Element, type: string, init: MouseEventInit = {}) =>
	el.dispatchEvent(
		new MouseEvent(type, {
			bubbles: true,
			cancelable: true,
			...centerOf(el),
			...init,
		}),
	);

/** A button-1 press on `el`: its mousedown. */
export const pressElement = (el: Element): void => {
	mouse(el, "mousedown", { button: 0, buttons: 1, detail: 1 });
};

/** A button-1 click on `el`: press, release, then the click. */
export const clickElement = (el: Element): void => {
	pressElement(el);
	mouse(el, "mouseup", { button: 0, detail: 1 });
	mouse(el, "click", { button: 0, detail: 1 });
};

/** A button-2 click on `el`, at its center: the `contextmenu` it raises. */
export const contextClickElement = (el: Element): void => {
	mouse(el, "contextmenu", { button: 2, buttons: 2 });
};

/** The pointer coming to rest on `el` (a tooltip's wait starts). */
export const hoverElement = (el: Element): void => {
	mouse(el, "mouseover", { relatedTarget: null });
	mouse(el, "mousemove");
};

/**
 * Opens the Start menu by pressing the Start button (it opens on the press,
 * as Windows' does), then each submenu of `path` in turn by its item id
 * (`start-menu_programs`, `start-menu_documents`, …), and resolves once the
 * last is open.
 */
export async function openStartMenu(
	doc: Document,
	path: readonly string[] = [],
): Promise<void> {
	const start = await untilSelector(doc, ".classicyTaskbarStart");
	if (!doc.getElementById(CLASSICY_START_MENU_ID)) pressElement(start);
	await untilElement(
		() => doc.getElementById(CLASSICY_START_MENU_ID),
		"Start menu",
	);
	for (const id of path) {
		const item = await untilElement(() => doc.getElementById(id), id);
		if (!item.classList.contains("open")) clickElement(item);
		await untilElement(
			() => (item.classList.contains("open") ? item : null),
			`${id} open`,
		);
	}
}

/**
 * The status area's icon named `label` ("Sound", "Screen Saver",
 * "Appearance"): button 1 opens its panel or menu, button 2 its menu at the
 * pointer. Resolves with the surface opened.
 */
export async function openTrayIcon(
	doc: Document,
	label: string,
	button: 1 | 2 = 1,
): Promise<HTMLElement> {
	const icon = await untilElement(
		() =>
			Array.from(
				doc.querySelectorAll<HTMLElement>(".classicyTaskbarTrayIcon"),
			).find((el) => el.getAttribute("aria-label") === label),
		`${label} tray icon`,
	);
	if (button === 2) {
		contextClickElement(icon);
		return untilSelector(doc, ".classicyContextMenuWrapper");
	}
	clickElement(icon);
	return untilSelector(doc, ".classicyTaskbarTrayPopup");
}

/**
 * Opens the taskbar's own menu by button 2 on its window buttons' band, and
 * resolves with the menu.
 */
export async function openTaskbarMenu(doc: Document): Promise<HTMLElement> {
	const band = await untilSelector(doc, ".classicyTaskbarTasks");
	contextClickElement(band);
	return untilSelector(doc, ".classicyContextMenuWrapper");
}

/**
 * Chooses the item `id` of an open menu with a click (the menu flashes it,
 * then runs it).
 */
export async function chooseMenuItem(doc: Document, id: string): Promise<void> {
	const item = await untilElement(() => doc.getElementById(id), id);
	clickElement(item);
}

/**
 * Opens the menu `menuId` of a window's own menu bar (under the shell, every
 * window with an `appMenu` has one, ending with Help: `help-menu`), and
 * resolves once it is open.
 */
export async function openWindowMenu(
	doc: Document,
	appId: string,
	windowId: string,
	menuId: string,
): Promise<HTMLElement> {
	const id = `${appId}_${windowId}_${menuId}`;
	const title = await untilElement(() => doc.getElementById(id), id);
	if (!title.classList.contains("open")) clickElement(title);
	return untilElement(
		() => (title.classList.contains("open") ? title : null),
		`${id} open`,
	);
}

/**
 * Rests the pointer on the first element `selector` matches (the Start
 * button, a caption box) and resolves once its tooltip shows.
 */
export async function hoverForTooltip(
	doc: Document,
	selector: string,
): Promise<HTMLElement> {
	hoverElement(await untilSelector(doc, selector));
	return untilSelector(doc, ".classicyBalloonHelpContent");
}
