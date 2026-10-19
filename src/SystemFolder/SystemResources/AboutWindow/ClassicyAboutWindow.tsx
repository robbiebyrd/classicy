import "./ClassicyAboutWindow.scss";
import {
	type FC as FunctionalComponent,
	type MouseEventHandler,
	useEffect,
	useRef,
} from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { useKeyboardEquivalents } from "@/SystemFolder/SystemResources/Keyboard/useKeyboardEquivalents";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

export type ClassicyAboutWindowProps = {
	/** Id of the owning app. The box registers as window `${appId}_about`. */
	appId: string;
	/** App name, shown as the box's heading. */
	appName: string;
	/** App icon (URL or data URI), shown above the name. */
	appIcon: string;
	/** Called when OK is clicked, or Return / Escape pressed — unmount the box
	 *  here (e.g. clear the flag that renders it). */
	hideFunc: MouseEventHandler<HTMLButtonElement>;
	/** Menus to publish to the menu bar while the box is focused. */
	appMenu?: ClassicyMenuItem[];
};

/**
 * The standard About box (HIGOS8 Ch.6 "The About Box", p.126): a modal,
 * fixed-size window showing the app's icon, name and a credit line above a
 * default OK button. Use it instead of a hand-built `<dialog>` for an app's
 * About command.
 *
 * OK is the default button (HIGOS8 p.23): it carries the default ring, and
 * Return or Escape activates it, so every dismissal runs `hideFunc`. The box
 * has no close, zoom or collapse box and cannot be resized; it takes focus
 * when it mounts. Most apps get it from `useClassicyAboutMenu`, which returns
 * the About menu item and this window, wired together:
 *
 * ```tsx
 * const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(appId, appName, appIcon);
 * // put aboutMenuItem in the File menu; render {aboutWindow} inside ClassicyApp
 * ```
 */
export const ClassicyAboutWindow: FunctionalComponent<
	ClassicyAboutWindowProps
> = ({ appId, appName, appIcon, hideFunc, appMenu }) => {
	const { track } = useClassicyAnalytics();
	const desktopEventDispatch = useAppManagerDispatch();
	const contentRef = useRef<HTMLDivElement | null>(null);
	const okButtonRef = useRef<HTMLButtonElement | null>(null);

	// HIGOS8 Ch.3 (p.23/p.57): the About box's OK is the default button — it gets
	// the ring and Return activates it. Escape also dismisses (a single-OK info
	// box has no separate Cancel). Clicking the OK button (rather than calling
	// hideFunc with a synthetic event) routes through its real handler; the inner
	// listener fires before the window's modal-cancel so no beep. onDefault is
	// suppressed when OK itself is focused, so Return there activates it natively.
	useKeyboardEquivalents({
		onDefault: () => okButtonRef.current?.click(),
		onCancel: () => okButtonRef.current?.click(),
		targetRef: contentRef,
	});

	useEffect(() => {
		desktopEventDispatch({
			type: "ClassicyWindowFocus",
			app: { id: appId },
			window: { id: `${appId}_about` },
		});

		const analyticsArgs = {
			type: "ClassicyAboutWindow",
			appId,
			appName,
			appIcon,
		};
		track("open", analyticsArgs);
	}, [track, desktopEventDispatch, appId, appName, appIcon]);

	return (
		<ClassicyWindow
			id={`${appId}_about`}
			appId={appId}
			closable={false}
			resizable={false}
			zoomable={false}
			scrollable={false}
			collapsable={false}
			initialSize={[0, 0]}
			initialPosition={[50, 50]}
			modal={true}
			appMenu={appMenu}
		>
			<div ref={contentRef} className={"aboutWindow"}>
				<img src={appIcon} alt="About" />
				<h1>{appName}</h1>
				<h5>Not Copyright &copy; 1997 Apple Computer, Inc.</h5>
				<ClassicyButton
					ref={okButtonRef}
					isDefault={true}
					onClickFunc={hideFunc}
				>
					OK
				</ClassicyButton>
			</div>
		</ClassicyWindow>
	);
};
