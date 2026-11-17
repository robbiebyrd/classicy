import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

// Story 0214-c61: a hidden app (the Application menu's Hide commands, HIG7
// p.127) keeps its windows mounted, out of sight, until it is shown.
describe("ClassicyApp, hidden", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("hides its contents while the app is hidden, and shows them again", () => {
		render(
			<ClassicyApp id="Notes.app" name="Notes" icon="/icons/notes.png">
				<div data-testid="notes-window" />
			</ClassicyApp>,
		);
		act(() => {
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: "Notes.app", name: "Notes", icon: "/icons/notes.png" },
			});
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: "Finder.app", name: "Finder", icon: "" },
			});
			dispatch({ type: "ClassicyAppFocus", app: { id: "Notes.app" } });
		});
		const root = () =>
			screen.getByTestId("notes-window").closest('[role="application"]');
		expect(root()).not.toHaveAttribute("hidden");
		act(() => {
			dispatch({ type: "ClassicyAppHide", app: { id: "Notes.app" } });
		});
		expect(root()).toHaveAttribute("hidden");
		act(() => {
			dispatch({ type: "ClassicyAppShowAll" });
		});
		expect(root()).not.toHaveAttribute("hidden");
	});

	// Review r0 Important 2: a modal window and its scrim are portaled to the
	// desktop root, outside the app's container, so they hide themselves.
	it("hides its portaled modal window and scrim too", () => {
		render(
			<ClassicyApp id="Notes.app" name="Notes" icon="/icons/notes.png">
				<ClassicyWindow
					id="notes-alert"
					appId="Notes.app"
					modal
					initialSize={[200, 100]}
					initialPosition={[10, 10]}
				>
					<p>Save changes?</p>
				</ClassicyWindow>
			</ClassicyApp>,
		);
		act(() => {
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: "Notes.app", name: "Notes", icon: "/icons/notes.png" },
			});
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: "Finder.app", name: "Finder", icon: "" },
			});
		});
		const scrim = () =>
			document.querySelector<HTMLElement>(".classicyWindowModalScrim");
		const modal = () =>
			screen.getByText("Save changes?").closest<HTMLElement>(".classicyWindow");
		expect(scrim()).not.toBeNull();
		expect(scrim()?.style.display).not.toBe("none");
		act(() => {
			dispatch({ type: "ClassicyAppHide", app: { id: "Notes.app" } });
		});
		expect(scrim()?.style.display).toBe("none");
		expect(modal()?.style.display).toBe("none");
		act(() => {
			dispatch({ type: "ClassicyAppShowAll" });
		});
		expect(scrim()?.style.display).not.toBe("none");
		expect(modal()?.style.display).not.toBe("none");
	});
});
