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
	/** The target URL. Routed through `ClassicyDesktopOpenUrl` (see §13). */
	href?: string;
	/**
	 * Where the target opens — same semantics as file-system shortcuts:
	 * `"classicy"` (default, in-desktop WebViewer window), `"browser"`
	 * (replaces the page), `"browser-new"` (new tab).
	 */
	disposition?: ClassicyShortcutDisposition;
	/**
	 * A menu-item-style internal action to dispatch instead of navigating.
	 * Mutually exclusive with `href` (when both are set, `event` wins).
	 */
	event?: string;
	eventData?: Record<string, unknown>;
	onClickFunc?: MouseEventHandler<HTMLAnchorElement>;
	disabled?: boolean;
}> &
	Omit<
		AnchorHTMLAttributes<HTMLAnchorElement>,
		"href" | "onClick" | "onKeyDown"
	>;

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

	// An event-only link has no href, so the anchor gets button semantics and
	// must activate from the keyboard itself.
	const handleKeyDown = (e: KeyboardEvent<HTMLAnchorElement>) => {
		if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
		e.preventDefault();
		if (disabled) return;
		track("click", { type: "ClassicyLink", event });
		if (event) dispatch({ type: event, ...(eventData ?? {}) });
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
