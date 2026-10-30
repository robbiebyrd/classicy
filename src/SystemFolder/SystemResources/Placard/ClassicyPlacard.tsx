import "./ClassicyPlacard.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type MouseEventHandler,
	type PropsWithChildren,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from "react";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";

export type ClassicyPlacardMenuItem = {
	/** Value passed to `onSelect` when the item is chosen. */
	id: string;
	/** Item label. */
	title: string;
	/** Dimmed and not choosable. */
	disabled?: boolean;
};

type ClassicyPlacardProps = PropsWithChildren<{
	/** Disabled placards dim and ignore interaction. Defaults to `false`. */
	disabled?: boolean;
	/**
	 * When provided the placard behaves as a pop-up affordance: it shows a
	 * down-arrow and opens a small menu of these items on click.
	 */
	menuItems?: ClassicyPlacardMenuItem[];
	/** Fired when the placard itself is clicked (interactive placards). */
	onClick?: MouseEventHandler<HTMLElement>;
	/** Fired with the id of a chosen pop-up menu item. */
	onSelect?: (id: string) => void;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}>;

/**
 * A Platinum placard (HIGOS8 Ch.2 "Placards", p.46): a small beveled
 * information panel, normally pinned to a document window's bottom-left
 * corner beside the horizontal scroll bar — pass it as `ClassicyWindow`'s
 * `placard` prop to put it there. Its children are the displayed text, such
 * as an item count or the current magnification.
 *
 * It has three looks: normal, pressed and disabled. A plain placard is
 * static information (a `<div>`). Given `onClick` or `menuItems` it becomes
 * a `<button>` that plays the button click sounds (the appearance package's
 * press/release hooks); with `menuItems` it shows a down-arrow and opens a
 * small menu (closed by an outside click) whose choice is reported through
 * `onSelect`.
 *
 * ```tsx
 * <ClassicyWindow
 *     id="doc" appId={appId}
 *     placard={
 *         <ClassicyPlacard menuItems={zoomItems} onSelect={setZoom}>100%</ClassicyPlacard>
 *     }
 * />
 * ```
 */
export const ClassicyPlacard: FunctionalComponent<ClassicyPlacardProps> = ({
	disabled = false,
	menuItems,
	onClick,
	onSelect,
	children,
	className,
	style,
}) => {
	const hasMenu = Array.isArray(menuItems) && menuItems.length > 0;
	const interactive = !disabled && (hasMenu || Boolean(onClick));

	const [pressed, setPressed] = useState(false);
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	// The element carrying `.classicyPlacard`: a <button> when interactive,
	// otherwise a <div>.
	const placardRef = useRef<HTMLElement>(null);
	const appearance = useClassicyAppearance(
		"Placard",
		{
			disabled,
			// A disabled placard never reads as pressed.
			pressed: !disabled && (pressed || open),
		},
		placardRef,
	);
	const emitAppearance = appearance.emit;
	// `close` follows the menu going away, whichever path dismissed it (a
	// pick, a second click, an outside press).
	const wasOpenRef = useRef(open);
	useEffect(() => {
		if (wasOpenRef.current === open) return;
		wasOpenRef.current = open;
		if (!open) emitAppearance("close", withClassicyAppearanceInput());
	}, [open, emitAppearance]);

	// Close the pop-up menu on any outside click.
	useEffect(() => {
		if (!open) return;
		const onDocClick = (e: globalThis.MouseEvent) => {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", onDocClick);
		return () => document.removeEventListener("mousedown", onDocClick);
	}, [open]);

	const handleClick = (e: MouseEvent<HTMLElement>) => {
		if (disabled) return;
		appearance.emit("click", withClassicyAppearanceInput({ menu: hasMenu }));
		if (hasMenu) {
			setOpen((o) => !o);
			if (!open) appearance.emit("open", withClassicyAppearanceInput());
		}
		if (onClick) onClick(e);
	};

	// Return and Space press and release the placard like the mouse does (the
	// browser turns them into the click).
	const isActivationKey = (key: string) => key === "Enter" || key === " ";
	const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
		if (!e.repeat && isActivationKey(e.key))
			appearance.emit("press", withClassicyAppearanceInput());
	};
	const handleKeyUp = (e: KeyboardEvent<HTMLElement>) => {
		if (isActivationKey(e.key))
			appearance.emit("release", withClassicyAppearanceInput());
	};

	const handleSelect = (item: ClassicyPlacardMenuItem) => {
		if (item.disabled) return;
		setOpen(false);
		if (onSelect) onSelect(item.id);
	};

	const commonProps = {
		className: classNames("classicyPlacard", appearance.className, {
			classicyPlacardInteractive: interactive,
			classicyPlacardHasMenu: hasMenu,
		}),
		style: appearance.style,
	};

	const body = (
		<>
			<span className="classicyPlacardContent">{children}</span>
			{hasMenu && (
				<span className="classicyPlacardArrow" aria-hidden={true}>
					▾
				</span>
			)}
		</>
	);

	return (
		<div
			className={classNames("classicyPlacardHolder", className)}
			style={style}
			ref={rootRef}
		>
			{interactive ? (
				<button
					{...appearance.attrs}
					ref={placardRef as RefObject<HTMLButtonElement | null>}
					type="button"
					tabIndex={0}
					disabled={disabled}
					aria-haspopup={hasMenu ? "menu" : undefined}
					aria-expanded={hasMenu ? open : undefined}
					{...commonProps}
					onClick={handleClick}
					onKeyDown={handleKeyDown}
					onKeyUp={handleKeyUp}
					onMouseDown={() => {
						setPressed(true);
						appearance.emit("press", withClassicyAppearanceInput());
					}}
					onMouseUp={() => {
						setPressed(false);
						appearance.emit("release", withClassicyAppearanceInput());
					}}
					onMouseLeave={() => setPressed(false)}
				>
					{body}
				</button>
			) : (
				<div
					{...appearance.attrs}
					ref={placardRef as RefObject<HTMLDivElement | null>}
					{...commonProps}
				>
					{body}
				</div>
			)}
			{hasMenu && open && (
				// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: <ul> hosting menuitems requires role="menu" per the ARIA menu pattern
				<ul className="classicyPlacardMenu" role="menu">
					{menuItems?.map((item) => (
						<li key={item.id} role="none">
							<button
								type="button"
								role="menuitem"
								className="classicyPlacardMenuItem"
								disabled={item.disabled}
								onClick={() => handleSelect(item)}
							>
								{item.title}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
