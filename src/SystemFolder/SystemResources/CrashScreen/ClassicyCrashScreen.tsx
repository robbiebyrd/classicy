import "./ClassicyCrashScreen.scss";
import sadMac from "@img/ui/sad-mac.png";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ClassicyCrashScreenProps {
	children?: ReactNode;
}

interface ClassicyCrashScreenState {
	crashed: boolean;
}

/**
 * Error boundary that replaces the desktop with a full-screen Sad Mac when
 * any descendant throws during render. Click or press any key to reload.
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
	}

	componentDidUpdate(
		_prevProps: ClassicyCrashScreenProps,
		prevState: ClassicyCrashScreenState,
	): void {
		if (!prevState.crashed && this.state.crashed) {
			window.addEventListener("keydown", this.reload);
		}
	}

	componentWillUnmount(): void {
		window.removeEventListener("keydown", this.reload);
	}

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
						src={sadMac as string}
						alt="Sad Mac — the system has crashed. Click or press any key to restart."
					/>
				</button>
			);
		}
		return this.props.children;
	}
}
