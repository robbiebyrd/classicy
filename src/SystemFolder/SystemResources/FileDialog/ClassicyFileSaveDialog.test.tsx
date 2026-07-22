import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/__tests__/test-utils";
import type { ClassicyFileDialogVolume } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialogVolume";
import { ClassicyFileSaveDialog } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileSaveDialog";

// Same harness as ClassicyFileOpenDialog.test.tsx: mock the AppManager store,
// sound dispatch, analytics, cursor, and every transitively imported scss.
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
	ClassicyIcons: {
		system: {
			files: { file: "file.png" },
			warn: "warn.png",
			error: "error.png",
			info: "info.png",
		},
	},
}));

vi.mock(
	"@/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog.scss",
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
vi.mock("@/SystemFolder/SystemResources/Alert/ClassicyAlert.scss", () => ({}));
vi.mock("@/SystemFolder/SystemResources/Input/ClassicyInput.scss", () => ({}));

function makeVolume(
	overrides: Partial<ClassicyFileDialogVolume> = {},
): ClassicyFileDialogVolume {
	return {
		id: "vol-a",
		label: "Volume A",
		list: vi.fn(async (path: string[]) =>
			path.length === 0
				? [
						{ id: "docs", name: "Documents", kind: "folder" as const },
						{
							id: "existing",
							name: "Existing.stack",
							kind: "file" as const,
							fileType: "stack",
						},
					]
				: [],
		),
		write: vi.fn(async () => {}),
		mkDir: vi.fn(async () => {}),
		...overrides,
	};
}

function makeFormats() {
	return [
		{
			label: "HyperCard Stack",
			extension: ".stack",
			fileType: "stack",
			data: vi.fn(async () => "STACK-DATA"),
		},
		{
			label: "Plain Text",
			extension: ".txt",
			fileType: "text_file",
			data: vi.fn(async () => "TEXT-DATA"),
		},
	];
}

function makeProps() {
	return {
		id: "test-save-dialog",
		appId: "Test.app",
		open: true,
		formats: makeFormats(),
		onSaveFunc: vi.fn(),
		onCancelFunc: vi.fn(),
	};
}

// ClassicyPopUpMenu is driven like its own tests: click the trigger
// (a `<button role="combobox">`, by associated label), then click the option
// by visible text.
function getPopUpTrigger(name: string | RegExp): HTMLElement {
	const match = screen
		.getAllByRole("combobox", { name })
		.find((el) => el.tagName === "BUTTON");
	if (!match) throw new Error(`No combobox trigger found for name ${name}`);
	return match;
}

async function choosePopUpOption(
	user: ReturnType<typeof userEvent.setup>,
	triggerName: string | RegExp,
	optionName: string,
) {
	await user.click(getPopUpTrigger(triggerName));
	await user.click(screen.getByRole("option", { name: optionName }));
}

describe("ClassicyFileSaveDialog", () => {
	it("shows the name field, default name, and the active format's extension", async () => {
		renderWithProviders(
			<ClassicyFileSaveDialog
				{...makeProps()}
				defaultFileName="My Stack"
				volumes={[makeVolume()]}
			/>,
		);
		expect(await screen.findByText("Documents")).toBeInTheDocument();
		expect(screen.getByLabelText("Save As:")).toHaveValue("My Stack");
		expect(screen.getByText(".stack")).toBeInTheDocument();
	});

	it("switching format swaps the non-editable extension suffix", async () => {
		const user = userEvent.setup();
		renderWithProviders(
			<ClassicyFileSaveDialog {...makeProps()} volumes={[makeVolume()]} />,
		);
		await screen.findByText("Documents");
		await choosePopUpOption(user, /format/i, "Plain Text");
		expect(screen.getByText(".txt")).toBeInTheDocument();
		expect(screen.queryByText(".stack")).not.toBeInTheDocument();
	});

	it("Save stays disabled until a valid name is typed", async () => {
		const user = userEvent.setup();
		renderWithProviders(
			<ClassicyFileSaveDialog {...makeProps()} volumes={[makeVolume()]} />,
		);
		await screen.findByText("Documents");
		const save = screen.getByRole("button", {
			name: "Save",
		}) as HTMLButtonElement;
		expect(save.disabled).toBe(true);
		await user.type(screen.getByLabelText("Save As:"), "My File");
		expect(save.disabled).toBe(false);
		await user.type(screen.getByLabelText("Save As:"), ":");
		expect(save.disabled).toBe(true);
	});

	it("Save stays disabled when there are no formats, even with a prefilled name", async () => {
		renderWithProviders(
			<ClassicyFileSaveDialog
				{...makeProps()}
				formats={[]}
				defaultFileName="My File"
				volumes={[makeVolume()]}
			/>,
		);
		await screen.findByText("Documents");
		expect(
			(screen.getByRole("button", { name: "Save" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});

	it("Save stays disabled when the typed name is only the extension", async () => {
		const user = userEvent.setup();
		renderWithProviders(
			<ClassicyFileSaveDialog {...makeProps()} volumes={[makeVolume()]} />,
		);
		await screen.findByText("Documents");
		await user.type(screen.getByLabelText("Save As:"), ".stack");
		expect(
			(screen.getByRole("button", { name: "Save" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});

	it("Save is disabled on a volume without write capability", async () => {
		const user = userEvent.setup();
		renderWithProviders(
			<ClassicyFileSaveDialog
				{...makeProps()}
				volumes={[makeVolume({ write: undefined })]}
			/>,
		);
		await screen.findByText("Documents");
		await user.type(screen.getByLabelText("Save As:"), "My File");
		expect(
			(screen.getByRole("button", { name: "Save" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});

	it("saves to the volume root with the composed file name", async () => {
		const user = userEvent.setup();
		const props = makeProps();
		const vol = makeVolume();
		renderWithProviders(<ClassicyFileSaveDialog {...props} volumes={[vol]} />);
		await screen.findByText("Documents");
		await user.type(screen.getByLabelText("Save As:"), "My File");
		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(props.formats[0].data).toHaveBeenCalledTimes(1);
		expect(vol.write).toHaveBeenCalledWith([], "My File.stack", {
			data: "STACK-DATA",
			fileType: "stack",
			icon: undefined,
		});
		expect(props.onSaveFunc).toHaveBeenCalledTimes(1);
		expect(props.onSaveFunc.mock.calls[0][0]).toMatchObject({
			volumeId: "vol-a",
			path: [],
			fileName: "My File.stack",
		});
	});

	it("strips a user-typed extension so it is never doubled", async () => {
		const user = userEvent.setup();
		const props = makeProps();
		const vol = makeVolume();
		renderWithProviders(<ClassicyFileSaveDialog {...props} volumes={[vol]} />);
		await screen.findByText("Documents");
		await user.type(screen.getByLabelText("Save As:"), "Deck.stack");
		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(vol.write).toHaveBeenCalledWith([], "Deck.stack", expect.anything());
	});

	it("saves into the selected folder", async () => {
		const user = userEvent.setup();
		const props = makeProps();
		const vol = makeVolume();
		renderWithProviders(<ClassicyFileSaveDialog {...props} volumes={[vol]} />);
		await user.click(await screen.findByText("Documents"));
		await user.type(screen.getByLabelText("Save As:"), "My File");
		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(vol.write).toHaveBeenCalledWith(
			["Documents"],
			"My File.stack",
			expect.anything(),
		);
	});

	it("dims files in save mode", async () => {
		renderWithProviders(
			<ClassicyFileSaveDialog {...makeProps()} volumes={[makeVolume()]} />,
		);
		const fileHolder = (await screen.findByText("Existing.stack")).closest(
			"li",
		);
		expect(
			fileHolder?.querySelector(".classicyTreeNodeDisabled"),
		).not.toBeNull();
	});

	it("prompts to replace on collision: Cancel aborts, Replace overwrites", async () => {
		const user = userEvent.setup();
		const props = makeProps();
		const vol = makeVolume();
		renderWithProviders(<ClassicyFileSaveDialog {...props} volumes={[vol]} />);
		await screen.findByText("Documents");
		await user.type(screen.getByLabelText("Save As:"), "Existing");
		await user.click(screen.getByRole("button", { name: "Save" }));
		// The alert's label ("Replace “Existing.stack”?") and its Replace button
		// both match a bare /Replace/, so pin the query to the fuller label text.
		expect(await screen.findByText(/Replace .*\?/)).toBeInTheDocument();
		expect(vol.write).not.toHaveBeenCalled();
		// Two Cancel buttons exist while the alert is up (dialog + alert); the
		// alert's is rendered last.
		const cancels = screen.getAllByRole("button", { name: "Cancel" });
		await user.click(cancels[cancels.length - 1]);
		expect(vol.write).not.toHaveBeenCalled();
		expect(props.onSaveFunc).not.toHaveBeenCalled();
		// Retry, and confirm this time.
		await user.click(screen.getByRole("button", { name: "Save" }));
		await user.click(await screen.findByRole("button", { name: "Replace" }));
		expect(vol.write).toHaveBeenCalledWith(
			[],
			"Existing.stack",
			expect.anything(),
		);
		expect(props.onSaveFunc).toHaveBeenCalledTimes(1);
	});

	it("refuses to save over a same-named folder and never writes", async () => {
		const user = userEvent.setup();
		const props = makeProps();
		const vol = makeVolume({
			list: vi.fn(async (path: string[]) =>
				path.length === 0
					? [
							{ id: "docs", name: "Documents", kind: "folder" as const },
							{
								id: "backup-folder",
								name: "Backup.stack",
								kind: "folder" as const,
							},
						]
					: [],
			),
		});
		renderWithProviders(<ClassicyFileSaveDialog {...props} volumes={[vol]} />);
		await screen.findByText("Documents");
		await user.type(screen.getByLabelText("Save As:"), "Backup");
		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(
			await screen.findByText(
				"A folder with this name already exists in this location.",
			),
		).toBeInTheDocument();
		expect(vol.write).not.toHaveBeenCalled();
		expect(props.onSaveFunc).not.toHaveBeenCalled();
	});

	it("a failing write shows the stop alert, keeps the dialog open, and reports the error", async () => {
		const user = userEvent.setup();
		const props = { ...makeProps(), onErrorFunc: vi.fn() };
		const vol = makeVolume({
			write: vi.fn(async () => {
				throw new Error("disk full");
			}),
		});
		renderWithProviders(<ClassicyFileSaveDialog {...props} volumes={[vol]} />);
		await screen.findByText("Documents");
		await user.type(screen.getByLabelText("Save As:"), "My File");
		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(
			await screen.findByText("The document could not be saved."),
		).toBeInTheDocument();
		expect(props.onErrorFunc).toHaveBeenCalledTimes(1);
		expect(props.onSaveFunc).not.toHaveBeenCalled();
		await user.click(screen.getByRole("button", { name: "OK" }));
		expect(screen.getByLabelText("Save As:")).toBeInTheDocument();
	});

	it("disables Save while a save is in flight", async () => {
		const user = userEvent.setup();
		let release: () => void = () => {};
		const vol = makeVolume({
			write: vi.fn(
				() =>
					new Promise<void>((resolve) => {
						release = resolve;
					}),
			),
		});
		renderWithProviders(
			<ClassicyFileSaveDialog {...makeProps()} volumes={[vol]} />,
		);
		await screen.findByText("Documents");
		await user.type(screen.getByLabelText("Save As:"), "My File");
		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(
			(screen.getByRole("button", { name: "Save" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
		release();
	});

	it("Enter in the name field commits the save", async () => {
		const user = userEvent.setup();
		const props = makeProps();
		const vol = makeVolume();
		renderWithProviders(<ClassicyFileSaveDialog {...props} volumes={[vol]} />);
		await screen.findByText("Documents");
		await user.type(screen.getByLabelText("Save As:"), "My File{Enter}");
		expect(vol.write).toHaveBeenCalledTimes(1);
	});

	it("New Folder is disabled when the volume lacks mkDir", async () => {
		renderWithProviders(
			<ClassicyFileSaveDialog
				{...makeProps()}
				volumes={[makeVolume({ mkDir: undefined })]}
			/>,
		);
		await screen.findByText("Documents");
		expect(
			(screen.getByRole("button", { name: "New Folder" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});

	it("creates a folder in the target directory, reloads it, and selects it", async () => {
		const user = userEvent.setup();
		const vol = makeVolume();
		renderWithProviders(
			<ClassicyFileSaveDialog {...makeProps()} volumes={[vol]} />,
		);
		await screen.findByText("Documents");
		await user.click(screen.getByRole("button", { name: "New Folder" }));
		await user.type(
			await screen.findByPlaceholderText("untitled folder"),
			"Projects",
		);
		await user.click(screen.getByRole("button", { name: "Create" }));
		expect(vol.mkDir).toHaveBeenCalledWith([], "Projects");
		// root listing reloaded after creation: initial load + reload
		expect(vol.list).toHaveBeenCalledTimes(2);
		// The new folder became the target: saving now writes into it, proving
		// the created folder was selected (not just created).
		await user.type(screen.getByLabelText("Save As:"), "My File");
		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(vol.write).toHaveBeenCalledWith(
			["Projects"],
			"My File.stack",
			expect.anything(),
		);
	});

	it("a failing mkDir shows the folder error alert", async () => {
		const user = userEvent.setup();
		const vol = makeVolume({
			mkDir: vi.fn(async () => {
				throw new Error("nope");
			}),
		});
		renderWithProviders(
			<ClassicyFileSaveDialog {...makeProps()} volumes={[vol]} />,
		);
		await screen.findByText("Documents");
		await user.click(screen.getByRole("button", { name: "New Folder" }));
		await user.type(
			await screen.findByPlaceholderText("untitled folder"),
			"Projects",
		);
		await user.click(screen.getByRole("button", { name: "Create" }));
		expect(
			await screen.findByText("The folder could not be created."),
		).toBeInTheDocument();
	});
});
