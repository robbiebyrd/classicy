import "./ClassicyCrashScreen.scss";
import classNames from "classnames";
import {
	Component,
	type CSSProperties,
	type ErrorInfo,
	type ReactNode,
} from "react";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { emitClassicyCrash } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

interface ClassicyCrashScreenProps {
	/** The tree to guard — normally the whole desktop. Rendered unchanged until a descendant throws. */
	children?: ReactNode;
	/**
	 * Extra class names, merged onto the Sad Mac screen after its own. The
	 * boundary has no element of its own until a descendant throws.
	 */
	className?: string;
	/** Inline style for the Sad Mac screen. */
	style?: CSSProperties;
}

/**
 * Windows 98's fatal-exception screen, as `layout.crashScreen:
 * "fatalException"` draws it: VGA text mode's 80 columns, each line as
 * Windows wrote it. The title is shell.vxd's "Windows", the message
 * vwin32.vxd's `A fatal exception %12x has occurred at %24x:%38x in VXD %4s.
 * The current application will be terminated.` and its two bullets, filled
 * with the exception and address of the well-known Windows 98 capture
 * (exception 0E, a page fault, in VMM), and the prompt shell.vxd's "Press any
 * key to continue " with the text-mode cursor after it.
 */
export const CLASSICY_FATAL_EXCEPTION_SCREEN = Object.freeze({
	title: " Windows ",
	message: Object.freeze([
		"A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) +",
		"00010E36. The current application will be terminated.",
	]),
	bullets: Object.freeze([
		"*  Press any key to terminate the current application.",
		"*  Press CTRL+ALT+DEL again to restart your computer. You will",
		"   lose any unsaved information in all applications.",
	]),
	prompt: "Press any key to continue _",
});

const FATAL_EXCEPTION_LABEL =
	"Windows: a fatal exception has occurred and the system has crashed. Click or press any key to restart.";

interface ClassicyCrashScreenState {
	crashed: boolean;
}

/**
 * Error boundary that replaces the desktop with a full-screen Sad Mac — the
 * classic Macintosh startup-failure icon — when any descendant throws while
 * rendering (or in a lifecycle method). Under a package whose layout declares
 * `crashScreen: "fatalException"` (Windows 98) it is Windows' fatal-exception
 * screen instead, light gray text on blue (`CLASSICY_FATAL_EXCEPTION_SCREEN`).
 * Clicking it or pressing any key reloads the page. Like any React error boundary, it does not catch errors
 * thrown in event handlers or async code.
 *
 * `ClassicyDesktop` already wraps itself in one, so a typical app gets it for
 * free; wrap your own tree in it only when building a custom shell.
 *
 * On a crash it logs `Classicy crashed:` with the component stack to
 * `console.error` and calls `emitClassicyCrash`, which feeds the `onCrash`
 * hook of every sink registered with `registerClassicyLogSink` — the place to
 * forward crashes to telemetry:
 *
 * ```ts
 * registerClassicyLogSink({
 *   id: "telemetry",
 *   onCrash: (error, componentStack) => report(error, componentStack),
 * });
 * ```
 *
 * The fallback render is deliberately self-contained: no Classicy state,
 * theme, or sound managers — those providers may be the very thing that
 * crashed, and a fallback that depends on them would throw again and escape
 * the boundary entirely.
 */
export class ClassicyCrashScreen extends Component<
	ClassicyCrashScreenProps,
	ClassicyCrashScreenState
> {
	state: ClassicyCrashScreenState = { crashed: false };

	static getDerivedStateFromError(): Partial<ClassicyCrashScreenState> {
		return { crashed: true };
	}

	componentDidCatch(error: Error, info: ErrorInfo): void {
		console.error("Classicy crashed:", error, info.componentStack);
		emitClassicyCrash(error, info.componentStack ?? undefined);
	}

	componentDidMount(): void {
		// Attached unconditionally (not just on the crashed transition) because
		// a child that throws during the initial mount is caught by
		// getDerivedStateFromError before componentDidMount ever runs — the
		// boundary mounts already crashed, so there is no
		// componentDidUpdate transition to hook the listener onto.
		window.addEventListener("keydown", this.onKeyDown);
	}

	componentWillUnmount(): void {
		window.removeEventListener("keydown", this.onKeyDown);
	}

	private readonly onKeyDown = (): void => {
		if (this.state.crashed) {
			this.reload();
		}
	};

	private readonly reload = (): void => {
		window.location.reload();
	};

	render(): ReactNode {
		if (this.state.crashed) {
			// Store-free, like the asset read below: the active package's layout
			// from the same registry, so a crashed store cannot break it.
			if (getClassicyAppearanceLayout().crashScreen === "fatalException") {
				const screen = CLASSICY_FATAL_EXCEPTION_SCREEN;
				return (
					<button
						className={classNames(
							"classicyCrashScreen",
							"classicyCrashScreenFatalException",
							this.props.className,
						)}
						style={this.props.style}
						type="button"
						aria-label={FATAL_EXCEPTION_LABEL}
						onClick={this.reload}
						onKeyDown={this.reload}
					>
						<span className="classicyCrashScreenMessage" aria-hidden="true">
							<span className="classicyCrashScreenTitle">{screen.title}</span>
							<span className="classicyCrashScreenLine"> </span>
							{screen.message.map((line) => (
								<span className="classicyCrashScreenLine" key={line}>
									{line}
								</span>
							))}
							<span className="classicyCrashScreenLine"> </span>
							{screen.bullets.map((line) => (
								<span className="classicyCrashScreenLine" key={line}>
									{line}
								</span>
							))}
							<span className="classicyCrashScreenLine"> </span>
							<span className="classicyCrashScreenPrompt">{screen.prompt}</span>
						</span>
					</button>
				);
			}
			return (
				<button
					className={classNames("classicyCrashScreen", this.props.className)}
					style={this.props.style}
					type="button"
					onClick={this.reload}
					onKeyDown={this.reload}
				>
					<img
						src={resolveClassicyAsset("systemArt", "sadMac") ?? ""}
						alt="Sad Mac — the system has crashed. Click or press any key to restart."
					/>
				</button>
			);
		}
		return this.props.children;
	}
}
