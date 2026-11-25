import {
	type FC,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
	type ClassicyContextHelpPlacement,
	classicyContextHelpBounds,
	resolveClassicyContextHelpPlacement,
	useClassicyContextHelpPopup,
} from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyWhatsThis.internal";

// The hosts mounted, in mounting order: the first alone draws the pop-up, so
// a page with two desktops (two providers) shows it once.
const hosts: object[] = [];
const hostListeners = new Set<() => void>();
const subscribeHosts = (listener: () => void) => {
	hostListeners.add(listener);
	return () => {
		hostListeners.delete(listener);
	};
};
const hostsChanged = () => {
	for (const listener of hostListeners) listener();
};

// Where the pop-up is first laid out, to be measured: at the press, or under
// the element's left edge.
const unmeasured = (placement: ClassicyContextHelpPlacement) =>
	placement.kind === "point"
		? { left: placement.at[0], top: placement.at[1] }
		: { left: placement.rect.left, top: placement.rect.bottom };

/**
 * The context-sensitive Help pop-up (WIG Ch.12 "Context-Sensitive Help",
 * p.274, Figure 12.3) that What's This?, a contextual "What's This?" and F1
 * show (`ClassicyWhatsThis.internal.ts`): the help's title and text in a
 * `classicyBalloonHelp classicyBalloonHelpContext` box, in a fixed
 * `classicyBalloonHelpContainer` portaled into `#classicyDesktop` (else the
 * body), placed by `resolveClassicyContextHelpPlacement` before it is
 * painted. The package draws it (Windows 98: the ToolTip's box with Figure
 * 12.3's shadow). Renders nothing while no pop-up is shown, so under a
 * package without `layout.balloonHelp.contextHelp` it never renders; with
 * several mounted (two desktops on a page), the first mounted draws it.
 * Mounted by `ClassicyContextualMenuProvider`.
 * @internal
 */
export const ClassicyWhatsThisPopup: FC = () => {
	const [host] = useState(() => ({}));
	useEffect(() => {
		hosts.push(host);
		hostsChanged();
		return () => {
			hosts.splice(hosts.indexOf(host), 1);
			hostsChanged();
		};
	}, [host]);
	const drawing = useSyncExternalStore(
		subscribeHosts,
		() => hosts[0] === host,
		() => false,
	);
	const shown = useClassicyContextHelpPopup();
	const popup = drawing ? shown : null;
	const containerRef = useRef<HTMLDivElement>(null);
	const helpId = useId();
	const [placed, setPlaced] = useState<{
		id: number;
		left: number;
		top: number;
	} | null>(null);

	// Measured where it first lands and settled once, before paint.
	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!popup || !container) return;
		const { width, height } = container.getBoundingClientRect();
		const { left, top } = resolveClassicyContextHelpPlacement(
			popup.placement,
			{ width, height },
			classicyContextHelpBounds(),
		);
		setPlaced((current) =>
			current?.id === popup.id && current.left === left && current.top === top
				? current
				: { id: popup.id, left, top },
		);
	}, [popup]);

	if (!popup || typeof document === "undefined") return null;
	const position =
		placed?.id === popup.id ? placed : unmeasured(popup.placement);
	return createPortal(
		<div
			ref={containerRef}
			className="classicyBalloonHelpContainer"
			style={{ left: `${position.left}px`, top: `${position.top}px` }}
		>
			<div
				className="classicyBalloonHelp classicyBalloonHelpContext"
				id={helpId}
				role="tooltip"
			>
				{popup.help.title && (
					<p className="classicyBalloonHelpTitle">{popup.help.title}</p>
				)}
				<p className="classicyBalloonHelpContent">{popup.help.content}</p>
			</div>
		</div>,
		document.getElementById("classicyDesktop") ?? document.body,
	);
};
