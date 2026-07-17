import "./ClassicyPlacard.scss";
import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type MouseEvent,
	type MouseEventHandler,
	type PropsWithChildren,
	useEffect,
	useRef,
	useState,
} from "react";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";

export type ClassicyPlacardMenuItem = {
	id: string;
	title: string;
	disabled?: boolean;
};

type ClassicyPlacardProps = PropsWithChildren<{
	/** Disabled placards dim and ignore interaction. */
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
}>;

export const ClassicyPlacard: FunctionalComponent<ClassicyPlacardProps> = ({
	disabled = false,
	menuItems,
	onClick,
	onSelect,
	children,
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

	const state = disabled ? "disabled" : pressed || open ? "pressed" : "normal";

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
		"data-state": state,
		className: classNames("classicyPlacard", {
			classicyPlacardInteractive: interactive,
			classicyPlacardHasMenu: hasMenu,
			classicyPlacardDisabled: disabled,
		}),
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
		<div className="classicyPlacardHolder" ref={rootRef}>
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
