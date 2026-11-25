import classNames from "classnames";
import {
	type ReactElement,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import {
	CLASSICY_PART_ATTRIBUTE,
	classicyStateClasses,
} from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";

/**
 * The Application menu title's grip, Mac OS 8.5's (TN1142, Menu Manager: "It
 * is now possible to remove the current application's name from the
 * application menu"; observed on Infinite Mac, integration review G round 6,
 * B4). The grip is the title's left edge, a part of its own in the bar
 * (`data-classicy-part="switcher-grip"`, beside the title, not in it, so a
 * press on it never opens the menu or tears it off). Dragged, the title
 * follows the pointer live, as narrow as its icon alone and as wide as its
 * whole name, the name cut with an ellipsis between (the clock and the bar
 * items left of it follow); let go, it shows the icon alone when the grip
 * was dragged right and the name when dragged left, a setting kept for every
 * application (`System.Manager.Desktop.appMenuShowsName`,
 * `ClassicyDesktopSetAppMenuName`). Escape cancels; a lost pointer stream
 * ends the drag where it is, as a release there would, as a split view's
 * divider ends.
 *
 * It is a window splitter (ARIA `separator`, as `ClassicySplitView`'s
 * divider), focused, as the bar's titles are, only by assistive technology or
 * script (`tabIndex` -1: 8.5 offers no key for it, and no title of the bar is
 * a Tab stop, so the page's Tab order is unchanged): there Left Arrow or Home
 * shows the name, Right Arrow or End the icon alone, Enter toggles. A press
 * moves no focus (the keyboard stays with the front application, as 8.5's
 * menu bar keeps it).
 *
 * The core draws no look for it; a package draws it (Platinum: 8.5's raised
 * grip of dots) or hides it (System 7, whose title is its icon alone).
 */

/**
 * The custom property, on the menu bar's `<nav>`, that holds the title's
 * width (its border box, in px) while the grip is dragged; the base sheet
 * sizes the title by it.
 */
export const CLASSICY_APP_MENU_TITLE_WIDTH_VAR =
	"--classicy-app-menu-title-width";

/** The id `ClassicyDesktopMenuBar` gives the Application menu's title. */
const APP_MENU_TITLE_ID = "app-switcher";

/**
 * The title's width while its grip is dragged `travel` pixels (right is
 * positive, narrowing it) from where it was pressed at `startWidth`: never
 * narrower than its icon alone, never wider than its whole name, as 8.5's.
 */
export const classicyAppMenuTitleDragWidth = (
	startWidth: number,
	travel: number,
	iconOnlyWidth: number,
	fullWidth: number,
): number =>
	Math.min(
		Math.max(fullWidth, iconOnlyWidth),
		Math.max(iconOnlyWidth, startWidth - travel),
	);

/**
 * Whether the title shows the name after a drag of `travel` pixels: icon
 * alone for any drag right, the name for any drag left (8.5: 19 px right
 * gave the icon alone, 11 px left the name), unchanged when the grip was let
 * go where it was pressed.
 */
export const classicyAppMenuShowsNameAfterDrag = (
	showsName: boolean,
	travel: number,
): boolean => (travel > 0 ? false : travel < 0 ? true : showsName);

/** Reads the setting: undefined (never set) is shown. */
export const useClassicyAppMenuShowsName = (): boolean =>
	useAppManager((s) => s.System.Manager.Desktop.appMenuShowsName !== false);

/**
 * The grip, whether it is being dragged (the menu bar draws the title with
 * its name while it is, whatever the setting, so the drag can cut it) and
 * the setting.
 */
export const useClassicyAppMenuTitleGrip = (
	navRef: RefObject<HTMLElement | null>,
): { grip: ReactElement; resizing: boolean; showsName: boolean } => {
	const showsName = useClassicyAppMenuShowsName();
	const dispatch = useAppManagerDispatch();
	const { closeAll } = useContext(ClassicyMenuContext);
	const [resizing, setResizing] = useState(false);
	// The gesture's listeners, removed when it ends or the bar unmounts.
	const detachRef = useRef<(() => void) | null>(null);
	useEffect(() => () => detachRef.current?.(), []);
	// The live width is let go only once the title is drawn in its new state,
	// so no frame shows the title at its old state's natural width.
	useLayoutEffect(() => {
		if (!resizing)
			navRef.current?.style.removeProperty(CLASSICY_APP_MENU_TITLE_WIDTH_VAR);
	}, [resizing, navRef]);

	const showsNameRef = useRef(showsName);
	showsNameRef.current = showsName;
	const setShowsName = useCallback(
		(showName: boolean) => {
			if (showName !== showsNameRef.current)
				dispatch({ type: "ClassicyDesktopSetAppMenuName", showName });
		},
		[dispatch],
	);

	const onMouseDown = (e: ReactMouseEvent<HTMLElement>) => {
		if (e.button !== 0) return;
		// No focus moves to the grip, and no text is selected.
		e.preventDefault();
		const nav = navRef.current;
		const title = nav?.querySelector<HTMLElement>(
			`[${CLASSICY_PART_ATTRIBUTE.part}="switcher"]`,
		);
		if (!nav || !title) return;
		// A press outside an open menu closes it (HIGOS8 p.92).
		closeAll();
		detachRef.current?.();
		// The title's widths with its icon alone and with its whole name,
		// measured by drawing each state in turn before anything paints.
		const width = () => title.getBoundingClientRect().width;
		const collapsed = title.classList.contains("collapsed");
		const startWidth = width();
		title.classList.remove("collapsed");
		const fullWidth = width();
		title.classList.add("collapsed");
		const iconOnlyWidth = width();
		if (!collapsed) title.classList.remove("collapsed");
		// The name written out, as the theme-variable coverage test finds a
		// property a script sets (CLASSICY_APP_MENU_TITLE_WIDTH_VAR).
		const setWidth = (px: number) =>
			nav.style.setProperty("--classicy-app-menu-title-width", `${px}px`);
		setWidth(startWidth);
		setResizing(true);

		const pressX = e.clientX;
		let lastX = pressX;
		const onMove = (ev: MouseEvent) => {
			lastX = ev.clientX;
			setWidth(
				classicyAppMenuTitleDragWidth(
					startWidth,
					lastX - pressX,
					iconOnlyWidth,
					fullWidth,
				),
			);
		};
		const end = (commit: boolean) => {
			detach();
			setResizing(false);
			if (commit)
				setShowsName(
					classicyAppMenuShowsNameAfterDrag(
						showsNameRef.current,
						lastX - pressX,
					),
				);
		};
		const onUp = () => end(true);
		const onKey = (ev: KeyboardEvent) => {
			if (ev.key !== "Escape") return;
			ev.preventDefault();
			ev.stopPropagation();
			end(false);
		};
		const stopWatchingPointerStream = onClassicyPointerStreamLost(() =>
			end(true),
		);
		const detach = () => {
			stopWatchingPointerStream();
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
			document.removeEventListener("keydown", onKey, true);
			detachRef.current = null;
		};
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
		document.addEventListener("keydown", onKey, true);
		detachRef.current = detach;
	};

	const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
		const next =
			e.key === "ArrowLeft" || e.key === "Home"
				? true
				: e.key === "ArrowRight" || e.key === "End"
					? false
					: e.key === "Enter"
						? !showsNameRef.current
						: undefined;
		if (next === undefined) return;
		e.preventDefault();
		setShowsName(next);
	};

	// An item of the bar's list, as every child of the bar's `<ul>` must be
	// (HTML's content model, and ARIA's list owns listitems): an `<li>`
	// keeping its separator role, which ARIA in HTML allows on `li`.
	const grip = (
		// biome-ignore lint/a11y/useSemanticElements: a focusable, draggable window splitter is the ARIA separator-widget pattern; <hr> is the static separator, and no <hr> may be a child of the bar's <ul>
		<li
			key="app-menu-title-grip"
			// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: ARIA in HTML allows the separator role on li, the one element the bar's <ul> may hold
			role="separator"
			tabIndex={-1}
			aria-label="Application menu name"
			aria-controls={APP_MENU_TITLE_ID}
			aria-orientation="vertical"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={showsName ? 100 : 0}
			aria-valuetext={showsName ? "Name shown" : "Icon only"}
			className={classNames(
				"classicyDesktopMenuAppSwitcherGrip",
				classicyStateClasses({ pressed: resizing }),
			)}
			{...{ [CLASSICY_PART_ATTRIBUTE.part]: "switcher-grip" }}
			onMouseDown={onMouseDown}
			onKeyDown={onKeyDown}
		/>
	);
	return { grip, resizing, showsName };
};
