import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

const SIMPLE_TEXT = { id: "SimpleText.app", name: "SimpleText", icon: "" };

const renderDesktop = () =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop />
		</ClassicyAppManagerProvider>,
	);

const openSimpleText = () =>
	act(() => {
		dispatch({ type: "ClassicyAppOpen", app: SIMPLE_TEXT });
	});

const openFileInSimpleText = (path: string) =>
	act(() => {
		dispatch({
			type: "ClassicyAppSimpleTextOpenFile",
			app: { id: SIMPLE_TEXT.id },
			path,
		});
	});

describe("SimpleText", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	// Regression test for a dispatch loop (7687143): the default window passes an
	// inline appMenu literal and SimpleText selects its whole app slice, so a
	// menuBar-write re-render used to re-fire the focused-menu effect forever.
	it("opens its default Untitled window without an infinite menuBar dispatch loop", async () => {
		renderDesktop();
		openSimpleText();
		await waitFor(() => {
			expect(screen.getByText("Untitled")).toBeInTheDocument();
		});
	});

	it("opens a plain-text document from the file system showing its content", async () => {
		renderDesktop();
		openFileInSimpleText("Macintosh HD:Documents:Read Me.txt");

		// Window title is the file name…
		await waitFor(() => {
			expect(screen.getByText("Read Me.txt")).toBeInTheDocument();
		});
		// …and the editor is seeded with the file's complete contents.
		const textbox = screen.getByRole("textbox") as HTMLTextAreaElement;
		expect(textbox.value).toBe(
			"Welcome to Classicy!\n\nThis is a plain text file opened in SimpleText.",
		);
	});

	it("keeps a reopened document's edited content as a working copy", async () => {
		const user = userEvent.setup();
		renderDesktop();
		openFileInSimpleText("Macintosh HD:Documents:Read Me.txt");
		await waitFor(() => {
			expect(screen.getByText("Read Me.txt")).toBeInTheDocument();
		});

		const textbox = screen.getByRole("textbox") as HTMLTextAreaElement;
		await user.clear(textbox);
		await user.type(textbox, "edited body");
		expect(textbox.value).toBe("edited body");
	});
});
