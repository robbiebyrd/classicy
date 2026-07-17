import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/__tests__/test-utils";
import type { ClassicyFileDialogVolume } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialogVolume";
import { ClassicyFileSaveDialog } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileSaveDialog";

// Same mocking strategy as ClassicyFileOpenDialog.test.tsx — ClassicyWindow and
// its descendants need the AppManager store, sound dispatch, analytics and
// cursor hooks, and the module-singleton store is mocked so window
// mount/unmount dispatches don't leak between tests.
const mockDispatch = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: { Manager: { Applications: { apps: {} } } },
			}),
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => vi.fn(),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock("@/SystemFolder/SystemResources/Cursor/useClassicyCursor", () => ({
	useClassicyCursor: () => vi.fn(),
}));

vi.mock("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons", () => ({
	ClassicyIcons: { system: { files: { file: "file.png" } } },
}));

vi.mock(
	"@/SystemFolder/SystemResources/FileDialog/ClassicyFileSaveDialog.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	() => ({}),
);
vi.mock("@/SystemFolder/SystemResources/Tree/ClassicyTree.scss", () => ({}));
vi.mock(
	"@/SystemFolder/SystemResources/Button/ClassicyButton.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/Triangle/ClassicyTriangle.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	() => ({}),
);
vi.mock("@/SystemFolder/SystemResources/Input/ClassicyInput.scss", () => ({}));

function makeVolume(
	overrides: Partial<ClassicyFileDialogVolume> = {},
): ClassicyFileDialogVolume {
	return {
		id: "vol-a",
		label: "Volume A",
		list: vi.fn(async (path: string[]) => {
			if (path.length === 0) {
				return [
					{ id: "docs", name: "Documents", kind: "folder" as const },
					{
						id: "readme",
						name: "readme.txt",
						kind: "file" as const,
						fileType: "text_file",
					},
				];
			}
			return [
				{
					id: "docs/notes",
					name: "notes.txt",
					kind: "file" as const,
					fileType: "text_file",
				},
			];
		}),
		...overrides,
	};
}

const baseProps = {
	id: "test-save-dialog",
	appId: "Test.app",
	open: true,
	onSaveFunc: vi.fn(),
};

describe("ClassicyFileSaveDialog", () => {
	it("lists the active volume root and shows files for context", async () => {
		renderWithProviders(
			<ClassicyFileSaveDialog {...baseProps} volumes={[makeVolume()]} />,
		);
		expect(await screen.findByText("Documents")).toBeInTheDocument();
		expect(screen.getByText("readme.txt")).toBeInTheDocument();
	});

	it("does not render when closed", () => {
		const { container } = renderWithProviders(
			<ClassicyFileSaveDialog
				{...baseProps}
				open={false}
				volumes={[makeVolume()]}
			/>,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it("commits the folder path and typed name on Save", async () => {
		const user = userEvent.setup();
		const onSaveFunc = vi.fn();
		renderWithProviders(
			<ClassicyFileSaveDialog
				{...baseProps}
				onSaveFunc={onSaveFunc}
				volumes={[makeVolume()]}
				defaultFileName={"untitled"}
			/>,
		);
		await screen.findByText("Documents");

		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(onSaveFunc).toHaveBeenCalledWith({
			volumeId: "vol-a",
			path: [],
			fileName: "untitled",
		});
	});

	it("descends into a folder on double-click and saves there", async () => {
		const user = userEvent.setup();
		const onSaveFunc = vi.fn();
		renderWithProviders(
			<ClassicyFileSaveDialog
				{...baseProps}
				onSaveFunc={onSaveFunc}
				volumes={[makeVolume()]}
				defaultFileName={"untitled"}
			/>,
		);
		await user.dblClick(await screen.findByText("Documents"));

		// The child listing confirms we navigated into the folder.
		expect(await screen.findByText("notes.txt")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(onSaveFunc).toHaveBeenCalledWith({
			volumeId: "vol-a",
			path: ["Documents"],
			fileName: "untitled",
		});
	});

	it("disables Save when the name is empty", async () => {
		renderWithProviders(
			<ClassicyFileSaveDialog
				{...baseProps}
				volumes={[makeVolume()]}
				defaultFileName={""}
			/>,
		);
		await screen.findByText("Documents");
		expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
	});

	it("invokes onCancelFunc from the Cancel button", async () => {
		const user = userEvent.setup();
		const onCancelFunc = vi.fn();
		renderWithProviders(
			<ClassicyFileSaveDialog
				{...baseProps}
				onCancelFunc={onCancelFunc}
				volumes={[makeVolume()]}
			/>,
		);
		await screen.findByText("Documents");
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onCancelFunc).toHaveBeenCalled();
	});
});
