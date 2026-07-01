import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

describe("ClassicyDesktop default apps", () => {
	beforeEach(() => {
		localStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("mounts all four default apps' desktop icons when no disableX props are set", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(screen.getByAltText("SimpleText")).toBeInTheDocument();
		expect(screen.getByAltText("PDFViewer")).toBeInTheDocument();
		expect(screen.getByAltText("Movie Player")).toBeInTheDocument();
		expect(screen.getByAltText("Picture Viewer")).toBeInTheDocument();
	});

	it("omits an app's desktop icon when its disableX prop is set, leaving the others", () => {
		render(
			<ClassicyAppManagerProvider disableMoviePlayer disablePictureViewer>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(screen.getByAltText("SimpleText")).toBeInTheDocument();
		expect(screen.getByAltText("PDFViewer")).toBeInTheDocument();
		expect(screen.queryByAltText("Movie Player")).not.toBeInTheDocument();
		expect(screen.queryByAltText("Picture Viewer")).not.toBeInTheDocument();
	});
});
