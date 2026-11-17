import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";

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
});
