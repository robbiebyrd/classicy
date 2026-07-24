import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import classNames from "classnames";
import he from "he";
import {
	type FC as FunctionalComponent,
	type MouseEvent,
	memo,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import {
	ClassicyBalloonHelp,
	type ClassicyBalloonPosition,
} from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp";
import { formatKeyboardShortcut } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";
import { ClassicySeparator } from "@/SystemFolder/SystemResources/Separator/ClassicySeparator";

export interface ClassicyMenuItem {
	id: string;
	title?: string;
	image?: string;
	disabled?: boolean;
	/**
	 * When defined, this item is a checkable menu item: it renders a Mac OS 8
	 * checkmark (✓) in the left icon gutter when true, and an empty (but
	 * reserved) gutter when false — keeping checked/unchecked siblings aligned.
	 * A checkable item never also shows an icon/image (the checkmark wins).
	 */
	checked?: boolean;
	icon?: string;
	keyboardShortcut?: string;
	/**
	 * When true, the `keyboardShortcut` is handled natively by the browser (e.g.
	 * the Edit menu's ⌘Z/⌘X/⌘C/⌘V/⌘A in a focused text field). The glyph still
	 * renders in the menu, but the app-wide dispatcher does NOT intercept the
	 * keystroke — so native editing keeps working and we don't preventDefault it.
	 */
	nativeShortcut?: boolean;
	link?: string;
	event?: string;
	eventData?: Record<string, unknown>;
	onClickFunc?: () => void;
	menuChildren?: ClassicyMenuItem[];
	className?: string;
	balloon?: {
		title?: string;
		content: string;
		position?: ClassicyBalloonPosition;
	};
}

interface ClassicyMenuProps {
	name: string;
	menuItems: ClassicyMenuItem[];
	navClass?: string;
	subNavClass?: string;
	children?: ReactNode;
	/**
	 * Internal: set on the nested menus rendered for `menuChildren`. Consumers
	 * mark nested submenus so they can be styled/identified distinctly from the
	 * root menu (menu bar / contextual menu).
	 */
	isSubmenu?: boolean;
}

export const ClassicyMenu: FunctionalComponent<ClassicyMenuProps> = ({
	name,
	menuItems,
	navClass,
	subNavClass,
	children,
}) => {
	const { closeSignal } = useContext(ClassicyMenuContext);
	const [openChildId, setOpenChildId] = useState<string | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: closeSignal is intentionally used as a trigger; the effect resets menu state when the signal changes
	useEffect(() => {
		setOpenChildId(null);
	}, [closeSignal]);

	const handleOpen = useCallback((id: string) => setOpenChildId(id), []);
	const handleClose = useCallback(() => setOpenChildId(null), []);

	return menuItems && menuItems.length > 0 ? (
		<div className={"classicyMenuWrapper"}>
			<ul className={classNames(navClass)} key={`${name}_menu`}>
				{menuItems.map((item: ClassicyMenuItem, index: number) => (
					<ClassicyMenuItemComponent
						// Separators all share the id "spacer" (it's how they're
						// detected), so fold the index in to keep React keys unique
						// when a menu has more than one separator.
						key={item?.id === "spacer" ? `spacer_${index}` : item?.id}
						menuItem={item}
						subNavClass={subNavClass || ""}
						isOpen={openChildId === item.id}
						onOpen={handleOpen}
						onClose={handleClose}
					/>
				))}
				{children}
			</ul>
		</div>
	) : null;
};

const ClassicyMenuItemComponent: FunctionalComponent<{
	menuItem: ClassicyMenuItem;
	subNavClass: string;
	isOpen: boolean;
	onOpen: (id: string) => void;
	onClose: () => void;
}> = memo(({ menuItem, subNavClass, isOpen, onOpen, onClose: _onClose }) => {
	const player = useSoundDispatch();
	const desktopDispatch = useAppManagerDispatch();
	const { closeAll, menuBarActive, activateMenuBar, pokeActivity } =
		useContext(ClassicyMenuContext);
	const [isFlashing, setIsFlashing] = useState(false);
	const [submenuFlipped, setSubmenuFlipped] = useState(false);
	const itemRef = useRef<HTMLLIElement>(null);

	// Once open, measure the child menu against the viewport; if it would
	// overflow the right edge, flip it to open leftward instead. Measured only
	// on open (not after flipping) so the menu can't oscillate between sides.
	useEffect(() => {
		if (!isOpen) {
			setSubmenuFlipped(false);
			return;
		}
		const submenu = itemRef.current?.querySelector(
			":scope > .classicyMenuWrapper > ul",
		);
		if (!submenu) return;
		setSubmenuFlipped(
			submenu.getBoundingClientRect().right > window.innerWidth,
		);
	}, [isOpen]);

	const { track } = useClassicyAnalytics();
	const analyticsArgs = useMemo(
		() => ({
			id: menuItem.id,
			title: menuItem.title,
			image: menuItem.image,
			disabled: menuItem.disabled,
			icon: menuItem.icon,
			link: menuItem.link,
			event: menuItem.event,
			eventData: menuItem.eventData,
			childrenCount: menuItem.menuChildren?.length,
		}),
		[menuItem],
	);

	const hasChildren = menuItem.menuChildren && menuItem.menuChildren.length > 0;

	const executeAction = () => {
		if (menuItem.onClickFunc) {
			menuItem.onClickFunc();
		} else if (menuItem.event && menuItem.eventData) {
			track("selected", { type: "ClassicyMenuItem", ...analyticsArgs });
			desktopDispatch({
				type: menuItem.event,
				...menuItem.eventData,
			});
		}
	};

	// Ref ensures rAF callback always reads the latest executeAction
	const executeActionRef = useRef(executeAction);
	executeActionRef.current = executeAction;

	const handleClick = (e: MouseEvent) => {
		e.stopPropagation();
		if (menuItem.disabled) return;

		if (hasChildren) {
			if (isOpen) {
				closeAll();
			} else {
				onOpen(menuItem.id);
				activateMenuBar();
				player({ type: "ClassicySoundPlay", sound: "ClassicyMenuOpen" });
			}
		} else {
			setIsFlashing(true);
			player({ type: "ClassicySoundPlay", sound: "ClassicyMenuItemClick" });
		}
	};

	const handleMouseEnter = () => {
		pokeActivity();
		if (hasChildren && menuBarActive) {
			onOpen(menuItem.id);
		}
	};

	const handleAnimationEnd = (e: React.AnimationEvent) => {
		if (e.animationName !== "classicyMenuItemFlashKeyframes") return;
		setIsFlashing(false);
		closeAll();
		// Defer action execution so the close state propagates before
		// the action triggers re-renders that could remount the menu tree
		requestAnimationFrame(() => {
			executeActionRef.current();
		});
	};

	const li =
		menuItem && menuItem.id === "spacer" ? (
			<ClassicySeparator />
		) : (
			<li
				// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: <li> items in a menu require role="menuitem" per ARIA menu pattern
				role="menuitem"
				tabIndex={-1}
				ref={itemRef}
				id={menuItem.id}
				key={menuItem.id}
				onClick={handleClick}
				onKeyDown={(e: React.KeyboardEvent) => {
					pokeActivity();
					if (e.key === "Enter") {
						e.preventDefault();
						handleClick(e as unknown as MouseEvent);
					}
				}}
				onMouseEnter={handleMouseEnter}
				onFocus={() => {
					track("hover", { type: "ClassicyMenuItem", ...analyticsArgs });
					player({ type: "ClassicySoundPlay", sound: "ClassicyMenuItemHover" });
				}}
				onAnimationEnd={handleAnimationEnd}
				onMouseOver={() => {
					track("hover", { type: "ClassicyMenuItem", ...analyticsArgs });
					player({ type: "ClassicySoundPlay", sound: "ClassicyMenuItemHover" });
				}}
				onBlur={() => {
					player({ type: "ClassicySoundPlay", sound: "ClassicyMenuItemBlur" });
				}}
				onMouseOut={() => {
					player({ type: "ClassicySoundPlay", sound: "ClassicyMenuItemBlur" });
				}}
				className={classNames(
					"classicyMenuItem",
					menuItem.icon ? "" : "classicyMenuItemNoImage",
					menuItem.className,
					menuItem.disabled ? "classicyMenuItemDisabled" : "",
					hasChildren ? "classicyMenuItemChildMenuIndicator" : "",
					isOpen ? "classicyMenuItemOpen" : "",
					isFlashing ? "classicyMenuItemFlash" : "",
				)}
			>
				<p>
					{menuItem.checked !== undefined ? (
						<span className={"classicyMenuItemCheck"} aria-hidden={"true"}>
							{menuItem.checked ? "✓" : ""}
						</span>
					) : menuItem.image ? (
						<img src={menuItem.image} alt={menuItem.title} />
					) : menuItem.icon ? (
						<img src={menuItem.icon} alt={menuItem.title} />
					) : null}
					{menuItem.title && he.decode(menuItem.title)}
				</p>
				{menuItem.keyboardShortcut && (
					<p className={"classicyMenuItemKeyboardShortcut"}>
						{formatKeyboardShortcut(menuItem.keyboardShortcut)}
					</p>
				)}

				{hasChildren && (
					<ClassicyMenu
						name={`${menuItem.id}_subitem`}
						menuItems={menuItem.menuChildren ?? []}
						subNavClass={subNavClass}
						isSubmenu={true}
						navClass={classNames(
							subNavClass,
							submenuFlipped && "classicySubMenuFlipLeft",
						)}
					></ClassicyMenu>
				)}
			</li>
		);

	return menuItem.balloon ? (
		<ClassicyBalloonHelp
			title={menuItem.balloon.title}
			content={menuItem.balloon.content}
			position={menuItem.balloon.position ?? "top-left"}
			className="classicyMenuItemBalloonAnchor"
		>
			{li}
		</ClassicyBalloonHelp>
	) : (
		li
	);
});

ClassicyMenuItemComponent.displayName = "ClassicyMenuItemComponent";
