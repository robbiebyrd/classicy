import "./ClassicyLink.scss";
import classNames from "classnames";
import type {
	AnchorHTMLAttributes,
	FC as FunctionalComponent,
	KeyboardEvent,
	MouseEvent,
	MouseEventHandler,
	PropsWithChildren,
} from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import type { ClassicyShortcutDisposition } from "@/SystemFolder/SystemResources/Shortcut/ClassicyShortcut";

type ClassicyLinkProps = PropsWithChildren<{
	/**
	 * The target URL. A plain click dispatches `ClassicyDesktopOpenUrl` with
	 * it; modifier and middle clicks use the browser's own link handling.
	 */
	href?: string;
	/**
	 * Where the target opens — same semantics as file-system shortcuts:
	 * `"classicy"` (in-desktop WebViewer window), `"browser"` (replaces the
	 * page) or `"browser-new"` (new tab). Defaults to `"classicy"`.
	 */
	disposition?: ClassicyShortcutDisposition;
	/**
	 * A menu-item-style internal action to dispatch instead of navigating.
	 * Mutually exclusive with `href` (when both are set, `event` wins).
	 */
	event?: string;
	/** Extra fields spread into the `event` action: `{ type: event, ...eventData }`. */
	eventData?: Record<string, unknown>;
	/**
	 * Called on click before the built-in behaviour; call `e.preventDefault()`
	 * in it to cancel that behaviour. Not called for keyboard activation of an
	 * `event`-only link.
	 */
	onClickFunc?: MouseEventHandler<HTMLAnchorElement>;
	/**
	 * Greys the link, removes it from the tab order and swallows clicks
	 * (`aria-disabled`). Defaults to `false`.
	 */
	disabled?: boolean;
}> &
	Omit<
		AnchorHTMLAttributes<HTMLAnchorElement>,
		"href" | "onClick" | "onKeyDown"
	>;

/**
 * A Platinum-styled hyperlink — use it instead of a raw `<a>`, which it
 * renders (other anchor attributes pass through). A plain click on an `href`
 * link dispatches `ClassicyDesktopOpenUrl`, so by default the page opens in
 * the desktop's own WebViewer window; `disposition` sends it to the browser
 * instead. Modifier and middle clicks keep the browser's native behaviour
 * (open in a new tab, …). Invalid or non-http URLs raise the desktop error
 * dialog.
 *
 * With `event` (and `eventData`) it instead dispatches an internal action,
 * like a menu item, and the anchor takes `role="button"` and activates on
 * Enter/Space. Opening a URL needs a mounted `ClassicyDesktop`: its WebViewer
 * and URL controller are what act on the dispatch.
 *
 * ```tsx
 * <ClassicyLink href="https://example.com">Example</ClassicyLink>
 * <ClassicyLink href="https://example.com" disposition="browser-new">New tab</ClassicyLink>
 * <ClassicyLink event="ClassicyAppScreenSaverActivate">Start the screen saver</ClassicyLink>
 * ```
 */
export const ClassicyLink: FunctionalComponent<ClassicyLinkProps> = ({
	href,
	disposition = "classicy",
	event,
	eventData,
	onClickFunc,
	disabled = false,
	className,
	children,
	...rest
}) => {
	const dispatch = useAppManagerDispatch();
	const { track } = useClassicyAnalytics();

	const activate = (e: MouseEvent<HTMLAnchorElement>) => {
		if (disabled) {
			e.preventDefault();
			return;
		}
		track("click", { type: "ClassicyLink", href, event });
		if (onClickFunc) {
			onClickFunc(e);
			// The consumer canceled the built-in behavior.
			if (e.defaultPrevented) return;
		}
		if (event) {
			e.preventDefault();
			dispatch({ type: event, ...(eventData ?? {}) });
			return;
		}
		if (!href) {
			e.preventDefault();
			return;
		}
		// Modifier- and middle-clicks keep the browser's own semantics
		// (open in tab/window, add to selection, …).
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) {
			return;
		}
		e.preventDefault();
		dispatch({ type: "ClassicyDesktopOpenUrl", url: href, disposition });
	};

	// A link without an href has button semantics and must activate from the
	// keyboard itself. It does so by clicking the anchor, so Enter and Space
	// take exactly the mouse path: `onClickFunc` runs (and may cancel with
	// preventDefault), then `event` dispatches.
	const handleKeyDown = (e: KeyboardEvent<HTMLAnchorElement>) => {
		if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
		e.preventDefault();
		if (disabled) return;
		e.currentTarget.click();
	};

	return (
		<a
			{...rest}
			href={href}
			role={href ? undefined : "button"}
			tabIndex={disabled ? -1 : href ? undefined : 0}
			aria-disabled={disabled || undefined}
			className={classNames(
				"classicyLink",
				disabled ? "classicyLinkDisabled" : "",
				className,
			)}
			onClick={activate}
			onKeyDown={href ? undefined : handleKeyDown}
		>
			{children}
		</a>
	);
};
