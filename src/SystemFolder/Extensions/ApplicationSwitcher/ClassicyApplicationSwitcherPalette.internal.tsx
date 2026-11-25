import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import { useClassicyAppIdentityOverrides } from "@/Appearance/ClassicyAppIdentity";
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { useFrontAppId } from "@/SystemFolder/ControlPanels/AppManager/ClassicyFrontApp";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import {
	appSwitcherAppsFrom,
	appSwitcherEntryDescription,
} from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import {
	APPLICATION_SWITCHER_APP_ID,
	APPLICATION_SWITCHER_CLOSE,
	APPLICATION_SWITCHER_PALETTE_ID,
	APPLICATION_SWITCHER_PALETTE_TITLE,
	APPLICATION_SWITCHER_SET_PALETTE,
	APPLICATION_SWITCHER_SWITCH,
	type classicyApplicationSwitcherSettings,
	classicyModalWindowOpen,
} from "./ClassicyApplicationSwitcherContext";
import {
	isInClassicyAppSwitcherPalette as inPalette,
	CLASSICY_APP_SWITCHER_PALETTE_CLASS as PALETTE_CLASS,
	releaseClassicyAppSwitcherKeyboardTo,
} from "./ClassicyApplicationSwitcherKeyboard.internal";

type Settings = ReturnType<typeof classicyApplicationSwitcherSettings>;

/**
 * Keeps the keyboard off the palette under the mouse, as Mac OS 8.5's
 * palette never took it from the application in front: a press anywhere in
 * the palette (a button, the drag bar, a box, the space between) moves no
 * focus, so keys go on to the front application, Enter and Space included
 * (a focused palette control would take those: the front application leaves
 * them to a control of another window,
 * `isActivationKeyAimedAtOtherWindowControl`). The press's default is prevented in
 * the capture phase, before anything inside sees it; nothing in the window
 * reads `defaultPrevented` on a press, a pressed bevel button and a held box
 * still draw pressed (`.pressed`, `:active`), and the click still comes. The
 * buttons stay reachable with Tab.
 */
const useClassicyPaletteKeepsKeyboardOff = () => {
	useEffect(() => {
		if (typeof document === "undefined") return;
		const onDown = (e: MouseEvent) => {
			if (e.button === 0 && inPalette(e.target)) e.preventDefault();
		};
		document.addEventListener("mousedown", onDown, true);
		return () => document.removeEventListener("mousedown", onDown, true);
	}, []);
};

/**
 * The extent of the palette's buttons laid in lines of `n` (columns, or rows
 * when horizontal), along a line: the wrapped list is a grid whose track `t`
 * holds the buttons `t`, `t + n`, `t + 2n`…, as large as the largest of them,
 * and `gap` lies between tracks. With `n` as many as the buttons it is the
 * one unwrapped line, their sum.
 */
const classicyAppSwitcherLineExtent = (
	sizes: readonly number[],
	n: number,
	gap: number,
): number => {
	const tracks = Math.min(n, sizes.length);
	let extent = gap * Math.max(0, tracks - 1);
	for (let track = 0; track < tracks; track++) {
		let largest = 0;
		for (let i = track; i < sizes.length; i += n)
			largest = Math.max(largest, sizes[i]);
		extent += largest;
	}
	return extent;
};

/**
 * How many buttons a line (a column, or a row when the palette is
 * horizontal) holds on the desktop: the most whose line fits the room the
 * desktop has for a window along it (`space`), less the palette's own frame
 * along the line (`chrome`: what lies before the first button and after the
 * last, together), given each button's natural size along the line (`sizes`,
 * in order) and the list's `gap` between tracks; never under one. A line
 * that fits by the sum of its buttons is not wrapped, however large the
 * largest (re-review IG-C1), and buttons not laid out (no size at all) are
 * never wrapped. Where the palette sits never enters it.
 */
export const classicyAppSwitcherPaletteLines = (
	space: number,
	chrome: number,
	sizes: readonly number[],
	gap = 0,
): number => {
	if (!sizes.some((size) => size > 0)) return sizes.length;
	for (let n = sizes.length; n > 1; n--)
		if (chrome + classicyAppSwitcherLineExtent(sizes, n, gap) <= space)
			return n;
	return 1;
};

/**
 * A computed CSS length in pixels, a percentage being of `whole`: a pixel
 * length, a percentage, or `calc()`, `min()`, `max()` and `clamp()` of them,
 * which is how a browser serializes a computed `max-height` that holds a
 * percentage (`calc(100% - 54px)`; `Number.parseFloat` of that is `NaN`).
 * `undefined` for `none`, a sizing keyword, or anything else it cannot read.
 */
export const classicyCssLengthPx = (
	value: string,
	whole: number,
): number | undefined => {
	const tokens =
		value
			.toLowerCase()
			.match(
				/[a-z][a-z-]*\(|[(),]|[-+*/]|(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?(?:px|%)?/g,
			) ?? [];
	// Every character but the spaces is part of a token it reads.
	if (tokens.join("").length !== value.replace(/\s+/g, "").length)
		return undefined;
	let at = 0;
	const unit = (): number => {
		const token = tokens[at++];
		if (token === undefined) return Number.NaN;
		if (token === "-") return -unit();
		if (token === "+") return unit();
		if (token.endsWith("(")) {
			const args = [sum()];
			while (tokens[at] === ",") {
				at++;
				args.push(sum());
			}
			if (tokens[at++] !== ")") return Number.NaN;
			if (token === "min(") return Math.min(...args);
			if (token === "max(") return Math.max(...args);
			if (token === "clamp(" && args.length === 3)
				return Math.max(args[0], Math.min(args[1], args[2]));
			return (token === "(" || token === "calc(") && args.length === 1
				? args[0]
				: Number.NaN;
		}
		const number = Number.parseFloat(token);
		return token.endsWith("%") ? (number / 100) * whole : number;
	};
	const product = (): number => {
		let total = unit();
		while (tokens[at] === "*" || tokens[at] === "/")
			total = tokens[at++] === "*" ? total * unit() : total / unit();
		return total;
	};
	const sum = (): number => {
		let total = product();
		while (tokens[at] === "+" || tokens[at] === "-")
			total = tokens[at++] === "+" ? total + product() : total - product();
		return total;
	};
	const length = sum();
	return at === tokens.length && Number.isFinite(length) ? length : undefined;
};

/**
 * The tallest the palette's window may be, border box: its computed
 * `max-height` (a window's is its container's height less the theme's
 * reserve, `ClassicyWindow.scss`, which a browser reports as
 * `calc(100% - 54px)`) resolved against `containerHeight`, with the
 * window's own padding and border when the limit is on its content box.
 * `Infinity` when nothing limits it.
 */
const classicyAppSwitcherMaxHeight = (
	palette: HTMLElement,
	containerHeight: number,
): number => {
	const cs = getComputedStyle(palette);
	const limit = classicyCssLengthPx(cs.maxHeight, containerHeight);
	if (limit === undefined) return Number.POSITIVE_INFINITY;
	if (cs.boxSizing === "border-box") return limit;
	const px = (property: string) =>
		Number.parseFloat(cs.getPropertyValue(property)) || 0;
	return (
		limit +
		px("padding-top") +
		px("padding-bottom") +
		px("border-top-width") +
		px("border-bottom-width")
	);
};

/** The list's own buttons, in order. */
const classicyAppSwitcherButtonsOf = (list: HTMLElement): HTMLElement[] =>
	Array.from(
		list.querySelectorAll<HTMLElement>(
			":scope > .classicyApplicationSwitcherButton",
		),
	);

/**
 * A hidden copy of the palette's list for reading its buttons' natural
 * sizes, placed beside the list (so the package's rules for the list and
 * its buttons reach it) and out of its flow; the caller removes it. The
 * copy is one unwrapped line as large as its content (`max-content`),
 * holding a copy of every button, laid out together: each copy's size
 * along the line (its height in a column, its width in a row) is what that
 * button takes neither stretched to a wrapped track's largest nor squeezed
 * to fit, so no wrap of the palette and no place it sits changes it. Across
 * the line the copies stretch to the largest, as the list's buttons do, so
 * that size is no button's own. The copies keep their images' sources: a
 * package may size an icon by its image.
 */
const classicyAppSwitcherSizer = (list: HTMLElement): HTMLElement => {
	const sizer = list.cloneNode(false) as HTMLElement;
	sizer.classList.remove("classicyApplicationSwitcherWrapped");
	sizer.removeAttribute("style");
	sizer.setAttribute("aria-hidden", "true");
	sizer.inert = true;
	Object.assign(sizer.style, {
		position: "absolute",
		left: "0",
		top: "0",
		width: "max-content",
		height: "auto",
		visibility: "hidden",
		pointerEvents: "none",
	});
	for (const button of classicyAppSwitcherButtonsOf(list)) {
		const copy = button.cloneNode(true) as HTMLElement;
		copy.removeAttribute("id");
		for (const named of copy.querySelectorAll("[id]"))
			named.removeAttribute("id");
		sizer.append(copy);
	}
	list.after(sizer);
	return sizer;
};

/**
 * The line length the palette's buttons wrap at, from how much the desktop
 * can hold, not from where the palette sits: the desktop's height from the
 * menu bar's underside to its bottom, and no more than a window's maximum
 * height (`classicyAppSwitcherMaxHeight`), or its width when horizontal,
 * filled by the buttons' natural sizes along the line
 * (`classicyAppSwitcherSizer`), which the palette's own wrap never changes,
 * so a count always gives what it gave before for the same buttons, desktop
 * and theme.
 *
 * It counts once `list`, the buttons' list, is mounted: the window draws
 * nothing while its record is closed or before the desktop's floating layer
 * has committed, which on a reload is after the record exists, so the list's
 * element is what the count waits for (review F1). It counts again:
 *
 * - when the desktop resizes, from the natural sizes it holds: a desktop's
 *   size changes none, so no copy is built;
 * - when a button resizes and its natural size with it (a metric edit such
 *   as the buttons' padding or an icon size, a theme switch, a font that
 *   loads late). The copy is built only when a button's box differs from
 *   what it was when the natural sizes were last read, so the observer's
 *   first notification reads nothing, and a resize the wrap alone caused
 *   builds one copy and counts nothing;
 * - when the theme changes (the frame around the buttons and the menu bar
 *   with it), and when the buttons (each keyed by its application's id, so
 *   another application of the same name is another button), the options
 *   or the collapse state change (`deps`).
 *
 * Never on a move, so a palette dragged partly past an edge keeps its shape
 * and clips like any window. Each count reads the document once (while the
 * copy is in it, when one is built). `undefined` while every button fits in
 * one line. Mac OS 8.5's palette with more applications than the screen
 * holds was not observed (the emulator hung while they were launched):
 * Classicy wraps only a line the desktop cannot hold at all.
 */
const useClassicyPaletteLines = (
	list: HTMLElement | null,
	count: number,
	horizontal: boolean,
	deps: readonly unknown[],
): number | undefined => {
	const [lines, setLines] = useState<number | undefined>(undefined);
	useLayoutEffect(() => {
		const palette = list?.closest<HTMLElement>(`.${PALETTE_CLASS}`);
		const contents = list?.closest<HTMLElement>(".classicyWindowContents");
		const layer = palette?.parentElement;
		if (!list || !palette || !contents || !layer) return;
		const buttons = classicyAppSwitcherButtonsOf(list);
		const first = buttons[0];
		if (!first) return;
		// What the last count was made from: the buttons' natural sizes along
		// the line, their boxes when those were read, and the desktop's box.
		let sizes: number[] = [];
		let boxes = "";
		let room = "";
		const boxesNow = () =>
			buttons
				.map((button) => {
					const box = button.getBoundingClientRect();
					return `${box.width}x${box.height}`;
				})
				.join(",");
		const roomOf = (desktop: DOMRect) => `${desktop.width}x${desktop.height}`;
		const measure = (
			from: "effect" | "desktop" | "buttons",
			desktopNow?: DOMRect,
		) => {
			let sizer: HTMLElement | undefined;
			let fit: number;
			try {
				// The copy goes in first and comes out last, so every read below
				// is of the one layout the copy forces; the layout its removal
				// needs is left to the browser's next frame.
				if (from !== "desktop") {
					sizer = classicyAppSwitcherSizer(list);
					const natural = Array.from(sizer.children, (copy) => {
						const box = copy.getBoundingClientRect();
						return horizontal ? box.width : box.height;
					});
					boxes = boxesNow();
					// A resize the palette's own wrap caused changes no natural size.
					if (from === "buttons" && natural.join(",") === sizes.join(","))
						return;
					sizes = natural;
				}
				const desktop = desktopNow ?? layer.getBoundingClientRect();
				room = roomOf(desktop);
				const outer = palette.getBoundingClientRect();
				const start = first.getBoundingClientRect();
				// The frame after the last line, from the styles (the box itself
				// may be cut off at the window's maximum height).
				const after = (side: "bottom" | "right") =>
					[palette, contents, list].reduce((sum, el) => {
						const cs = getComputedStyle(el);
						return (
							sum +
							(Number.parseFloat(cs.getPropertyValue(`border-${side}-width`)) ||
								0) +
							(Number.parseFloat(cs.getPropertyValue(`padding-${side}`)) || 0) +
							(el === palette
								? 0
								: Number.parseFloat(cs.getPropertyValue(`margin-${side}`)) || 0)
						);
					}, 0);
				const gap =
					Number.parseFloat(
						getComputedStyle(list).getPropertyValue(
							horizontal ? "column-gap" : "row-gap",
						),
					) || 0;
				fit = horizontal
					? classicyAppSwitcherPaletteLines(
							desktop.width,
							start.left - outer.left + after("right"),
							sizes,
							gap,
						)
					: classicyAppSwitcherPaletteLines(
							// A window keeps below the menu bar, and is never taller
							// than its maximum height.
							Math.min(
								desktop.height -
									readClassicyThemeVar("--menu-bar-height", undefined, layer),
								classicyAppSwitcherMaxHeight(palette, desktop.height),
							),
							start.top - outer.top + after("bottom"),
							sizes,
							gap,
						);
			} finally {
				sizer?.remove();
			}
			setLines(fit < count ? fit : undefined);
		};
		measure("effect");
		if (typeof ResizeObserver === "undefined") return;
		// An observer's first notification finds what the effect counted.
		const desktopObserver = new ResizeObserver(() => {
			const desktop = layer.getBoundingClientRect();
			if (roomOf(desktop) !== room) measure("desktop", desktop);
		});
		desktopObserver.observe(layer);
		// A button resizes with nothing else here changing when a metric or
		// theme edit, or the names' font arriving after the first count,
		// changes its natural size; it also resizes when the palette's own
		// wrap lays it out anew.
		const buttonObserver = new ResizeObserver(() => {
			if (boxesNow() !== boxes) measure("buttons");
		});
		for (const button of buttons) buttonObserver.observe(button);
		return () => {
			desktopObserver.disconnect();
			buttonObserver.disconnect();
		};
	}, [list, count, horizontal, ...deps]);
	return lines;
};

/**
 * The Application Switcher palette (Mac OS 8.5): a floating utility window
 * titled "Applications" with a button for each application the Application
 * menu lists, in its order, the front application's held down and a hidden
 * application's icon dimmed as the menu dims it (the package's
 * `iconDimming`). It draws no ◆ for an application a notification marks:
 * 8.5's palette shows none while its menu does
 * (`platinum-85-switcher-notification.png`). A click switches to the
 * application through the same path as the menu (a hidden one is shown);
 * an Option-click also hides the application that was in front. While a
 * modal window is open its buttons are dimmed, as 8.5's are under a dialog;
 * it stays under the dialog (modal dialogs come above utility windows, HIG7
 * p.145), where 8.5 draws it above.
 *
 * The zoom box sets the palette's options, as in 8.5: a click shows or hides
 * the names, an Option-click switches small and large icons, an
 * Option-Shift-click switches vertical and horizontal (the drag bar then
 * runs down the left side). An extension's menuless window, it floats in
 * the desktop's floating layer above every application's windows and never
 * takes the menu bar from the front application. Its record keeps its
 * position, and `paletteOpen` its open state, across reloads.
 */
export const ClassicyApplicationSwitcherPalette: FunctionalComponent<{
	settings: Settings;
}> = ({ settings }) => {
	const { showNames, iconSize, orientation, paletteAt } = settings;
	const dispatch = useAppManagerDispatch();
	const apps = useAppManager((s) => s.System.Manager.Applications.apps);
	const frontAppId = useFrontAppId();
	// While a modal window is open the buttons are dimmed and do nothing, as
	// 8.5 dims them under a dialog (`platinum-85-switcher-modal.png`).
	const modalOpen = useAppManager(classicyModalWindowOpen);
	const overrides = useClassicyAppIdentityOverrides();
	const entries = useMemo(
		() => appSwitcherAppsFrom(apps, overrides, { frontAppId }),
		[apps, overrides, frontAppId],
	);
	const horizontal = orientation === "horizontal";
	const large = iconSize === "large";
	// Across a column of small icons without names the drag bar has room for
	// neither a title nor a collapse box (8.5:
	// `platinum-85-switcher-no-names.png`); down the side it has no title
	// (`…-horizontal.png`); with names across the top it has both.
	const narrow = !horizontal && !showNames && !large;
	useClassicyPaletteKeepsKeyboardOff();
	// The buttons' list, once the window has drawn it: the count waits for
	// the element, since the window's record exists before it on a reload.
	const [list, setList] = useState<HTMLElement | null>(null);
	const collapsed = useAppManager(
		(s) =>
			getAppWindow(
				s.System.Manager.Applications.apps[APPLICATION_SWITCHER_APP_ID],
				APPLICATION_SWITCHER_PALETTE_ID,
			)?.collapsed === true,
	);
	// The theme sets the frame around the buttons and the menu bar's height,
	// both part of the room a line has.
	const theme = useAppManager((s) => s.System.Manager.Appearance.activeTheme);
	// More applications than the desktop can hold in a line wrap into
	// another column (another row, horizontal), so every button can be
	// brought onto it; a move never reshapes the palette.
	const lines = useClassicyPaletteLines(list, entries.length, horizontal, [
		collapsed,
		large,
		showNames,
		entries.map((e) => e.name).join("\n"),
		// A button is keyed by its application's id: another application of
		// the same name replaces it (review G round 3, F9).
		entries.map((e) => e.id).join("\n"),
		theme,
	]);

	return (
		<ClassicyWindow
			id={APPLICATION_SWITCHER_PALETTE_ID}
			appId={APPLICATION_SWITCHER_APP_ID}
			title={APPLICATION_SWITCHER_PALETTE_TITLE}
			hideIcon
			windowType="utility"
			utilityTitle={!horizontal && showNames}
			resizable={false}
			scrollable={false}
			collapsable={!narrow}
			initialSize={[0, 0]}
			minimumSize={[0, 0]}
			initialPosition={paletteAt ?? ["right", "top"]}
			onZoomBox={({ option, shift }) => {
				if (option && shift) {
					dispatch({
						type: APPLICATION_SWITCHER_SET_PALETTE,
						orientation: horizontal ? "vertical" : "horizontal",
					});
					return !horizontal;
				}
				if (option) {
					dispatch({
						type: APPLICATION_SWITCHER_SET_PALETTE,
						iconSize: large ? "small" : "large",
					});
					return !large;
				}
				dispatch({
					type: APPLICATION_SWITCHER_SET_PALETTE,
					showNames: !showNames,
				});
				return !showNames;
			}}
			onCloseFunc={() => dispatch({ type: APPLICATION_SWITCHER_CLOSE })}
			className={classNames(
				PALETTE_CLASS,
				horizontal && "classicyApplicationSwitcherHorizontal",
				large && "classicyApplicationSwitcherLargeIcons",
				!showNames && "classicyApplicationSwitcherNoNames",
			)}
		>
			{/* The window carries the name ("Applications", its aria-label). */}
			<div
				ref={setList}
				className={classNames(
					"classicyApplicationSwitcherButtons",
					lines !== undefined && "classicyApplicationSwitcherWrapped",
				)}
				style={
					lines !== undefined
						? ({ "--application-switcher-lines": lines } as CSSProperties)
						: undefined
				}
			>
				{entries.map((app) => (
					<ClassicyBevelButton
						key={app.id}
						mode="push"
						bevelWidth="small"
						on={app.focused === true}
						disabled={modalOpen}
						aria-label={app.name}
						aria-description={appSwitcherEntryDescription(app)}
						className={classNames(
							"classicyApplicationSwitcherButton",
							app.hidden && "classicyApplicationSwitcherHidden",
						)}
						onClickFunc={(e) => {
							dispatch({
								type: APPLICATION_SWITCHER_SWITCH,
								app: { id: app.id },
								hideFront: e.altKey,
							});
							releaseClassicyAppSwitcherKeyboardTo(app.id);
						}}
					>
						<ClassicyIconImage
							className="classicyApplicationSwitcherIcon"
							src={app.icon}
							drawnAt={large ? Number.POSITIVE_INFINITY : true}
							dimmed={app.hidden ? "hiddenApp" : false}
							alt=""
							draggable={false}
						/>
						{showNames && (
							<span className="classicyApplicationSwitcherName">
								{app.name}
							</span>
						)}
					</ClassicyBevelButton>
				))}
			</div>
		</ClassicyWindow>
	);
};
