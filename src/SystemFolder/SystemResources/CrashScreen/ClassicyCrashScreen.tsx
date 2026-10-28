import "./ClassicyCrashScreen.scss";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { emitClassicyCrash } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

interface ClassicyCrashScreenProps {
	/** The tree to guard — normally the whole desktop. Rendered unchanged until a descendant throws. */
	children?: ReactNode;
}

interface ClassicyCrashScreenState {
	crashed: boolean;
}

/**
 * Error boundary that replaces the desktop with a full-screen Sad Mac — the
 * classic Macintosh startup-failure icon — when any descendant throws while
 * rendering (or in a lifecycle method). Clicking it or pressing any key
 * reloads the page. Like any React error boundary, it does not catch errors
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
			return (
				<button
					className="classicyCrashScreen"
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
