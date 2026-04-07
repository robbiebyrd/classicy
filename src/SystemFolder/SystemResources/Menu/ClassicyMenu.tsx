import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import classNames from "classnames";
import he from "he";
import {
	type FC as FunctionalComponent,
	memo,
	type ReactNode,
	type MouseEvent,
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
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";

export interface ClassicyMenuItem {
	id: string;
	title?: string;
	image?: string;
	disabled?: boolean;
	icon?: string;
	keyboardShortcut?: string;
	link?: string;
	event?: string;
	eventData?: Record<string, unknown>;
	onClickFunc?: () => void;
	menuChildren?: ClassicyMenuItem[];
	className?: string;
}

interface ClassicyMenuProps {
	name: string;
	menuItems: ClassicyMenuItem[];
	navClass?: string;
	subNavClass?: string;
	children?: ReactNode;
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
				{menuItems.map((item: ClassicyMenuItem) => (
					<ClassicyMenuItemComponent
						key={item?.id}
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
	const { closeAll, menuBarActive, activateMenuBar } =
		useContext(ClassicyMenuContext);
	const [isFlashing, setIsFlashing] = useState(false);

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

	return menuItem && menuItem.id === "spacer" ? (
		<hr></hr>
	) : (
		<li
			// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: <li> items in a menu require role="menuitem" per ARIA menu pattern
			role="menuitem"
			tabIndex={-1}
			id={menuItem.id}
			key={menuItem.id}
			onClick={handleClick}
			onKeyDown={(e: React.KeyboardEvent) => {
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
				{menuItem.image && <img src={menuItem.image} alt={menuItem.title} />}
				{!menuItem.image && menuItem.icon && (
					<img src={menuItem.icon} alt={menuItem.title} />
				)}
				{menuItem.title && he.decode(menuItem.title)}
			</p>
			{menuItem.keyboardShortcut && (
				<p className={"classicyMenuItemKeyboardShortcut"}>
					{he.decode(menuItem.keyboardShortcut)}
				</p>
			)}

			{hasChildren && (
				<ClassicyMenu
					name={`${menuItem.id}_subitem`}
					menuItems={menuItem.menuChildren ?? []}
					subNavClass={subNavClass}
					navClass={subNavClass}
				></ClassicyMenu>
			)}
		</li>
	);
});

ClassicyMenuItemComponent.displayName = "ClassicyMenuItemComponent";
