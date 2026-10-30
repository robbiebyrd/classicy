import "./ClassicyPlacard.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type MouseEvent,
	type MouseEventHandler,
	type PropsWithChildren,
	useEffect,
	useRef,
	useState,
} from "react";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";

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
 * a `<button>` that plays the button click sounds; with `menuItems` it shows
 * a down-arrow and opens a small menu (closed by an outside click) whose
 * choice is reported through `onSelect`.
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
	const player = useSoundDispatch();
	const hasMenu = Array.isArray(menuItems) && menuItems.length > 0;
	const interactive = !disabled && (hasMenu || Boolean(onClick));

	const [pressed, setPressed] = useState(false);
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

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
		if (hasMenu) setOpen((o) => !o);
		if (onClick) onClick(e);
	};

	const handleSelect = (item: ClassicyPlacardMenuItem) => {
		if (item.disabled) return;
		setOpen(false);
		if (onSelect) onSelect(item.id);
	};

	const commonProps = {
		className: classNames(
			"classicyPlacard",
			classicyStateClasses({
				disabled,
				// A disabled placard never reads as pressed.
				pressed: !disabled && (pressed || open),
			}),
			{
				classicyPlacardInteractive: interactive,
				classicyPlacardHasMenu: hasMenu,
			},
		),
	};

	const body = (
		<>
			<span className="classicyPlacardContent">{children}</span>
			{hasMenu && <span className="classicyPlacardArrow" aria-hidden={true} />}
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
					type="button"
					tabIndex={0}
					disabled={disabled}
					aria-haspopup={hasMenu ? "menu" : undefined}
					aria-expanded={hasMenu ? open : undefined}
					{...commonProps}
					onClick={handleClick}
					onMouseDown={() => {
						setPressed(true);
						player({
							type: "ClassicySoundPlay",
							sound: "ClassicyButtonClickDown",
						});
					}}
					onMouseUp={() => {
						setPressed(false);
						player({
							type: "ClassicySoundPlay",
							sound: "ClassicyButtonClickUp",
						});
					}}
					onMouseLeave={() => setPressed(false)}
				>
					{body}
				</button>
			) : (
				<div {...commonProps}>{body}</div>
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
