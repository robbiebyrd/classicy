import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/__tests__/test-utils";
import type { ClassicyFileDialogVolume } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialogVolume";
import { ClassicyFileOpenDialog } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog";

// --- ClassicyWindow (and its descendants') dependencies -----------------
// renderWithProviders is a bare `render` with no context wrapping (see
// src/__tests__/test-utils.tsx), and ClassicyWindow needs the AppManager
// store, the Sound dispatch context, analytics, and cursor hooks. Mirroring
// the mocking pattern from ClassicyWindow.titlebar.test.tsx /
// ClassicyWindow.contextmenu.test.tsx rather than inventing a new harness:
// useAppManager here is a real zustand module-singleton store (not a React
// context), so leaving it un-mocked would let ClassicyWindowOpen/Close
// dispatches from one test's dialog mount/unmount leak into the next test
// (same id + appId across the whole file) — mocking it keeps each test's
// window state independent.
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

// --- scss side-effect imports, mocked like every other consumer's tests --
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
		list: vi.fn(async (path: string[]) => {
			if (path.length === 0) {
				return [
					{ id: "docs", name: "Documents", kind: "folder" as const },
					{
						id: "movie",
						name: "movie.mov",
						kind: "file" as const,
						fileType: "video",
					},
					{
						id: "song",
						name: "song.mp3",
						kind: "file" as const,
						fileType: "audio",
					},
				];
			}
			return [
				{
					id: "docs/inner",
					name: "inner.pdf",
					kind: "file" as const,
					fileType: "pdf",
				},
			];
		}),
		...overrides,
	};
}

const baseProps = {
	id: "test-dialog",
	appId: "Test.app",
	open: true,
	onOpenFunc: vi.fn(),
};

// ClassicyPopUpMenu no longer mirrors a native <select> (upstream "drop
// pop-up menu hidden <select>"): drive it like its own tests do — click the
// trigger button (queried by the control's associated label) to open the
// listbox, then click the target option by its visible label text.
//
// The control's label sits inside ClassicyControlLabel's own clickable
// wrapper, which is itself `role="button"` — so a plain name-based query
// matches both that wrapper and the real <button>. Filter to the <button>.
function getPopUpTrigger(name: string | RegExp): HTMLElement {
	const match = screen
		.getAllByRole("button", { name })
		.find((el) => el.tagName === "BUTTON");
	if (!match) throw new Error(`No <button> trigger found for name ${name}`);
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

describe("ClassicyFileOpenDialog", () => {
	it("lists the active volume root on open", async () => {
		renderWithProviders(
			<ClassicyFileOpenDialog {...baseProps} volumes={[makeVolume()]} />,
		);
		expect(await screen.findByText("movie.mov")).toBeInTheDocument();
		expect(screen.getByText("Documents")).toBeInTheDocument();
	});

	it("expands a folder lazily and shows its children", async () => {
		const user = userEvent.setup();
		const vol = makeVolume();
		renderWithProviders(
			<ClassicyFileOpenDialog {...baseProps} volumes={[vol]} />,
		);
		await user.click(await screen.findByText("Documents"));
		expect(await screen.findByText("inner.pdf")).toBeInTheDocument();
		expect(vol.list).toHaveBeenCalledWith(["Documents"]);
	});

	it("shows a retry row when list() rejects, and retries on Retry", async () => {
		const user = userEvent.setup();
		let fail = true;
		const vol = makeVolume({
			list: vi.fn(async (path: string[]) => {
				if (path.length === 0)
					return [{ id: "docs", name: "Documents", kind: "folder" as const }];
				if (fail) {
					fail = false;
					throw new Error("boom");
				}
				return [
					{
						id: "docs/late",
						name: "late.txt",
						kind: "file" as const,
						fileType: "text_file",
					},
				];
			}),
		});
		renderWithProviders(
			<ClassicyFileOpenDialog {...baseProps} volumes={[vol]} />,
		);
		await user.click(await screen.findByText("Documents"));
		expect(
			await screen.findByText("Couldn't open this folder"),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Retry" }));
		expect(await screen.findByText("late.txt")).toBeInTheDocument();
	});

	it("grays files not matching the active filter and drops them from selection on filter change", async () => {
		const user = userEvent.setup();
		renderWithProviders(
			<ClassicyFileOpenDialog
				{...baseProps}
				volumes={[makeVolume()]}
				selectionMode="multi"
				fileTypeFilters={[
					{ label: "All Items", types: null },
					{ label: "Movies", types: ["video"] },
				]}
			/>,
		);
		await user.click(await screen.findByText("song.mp3"));
		await choosePopUpOption(user, /show/i, "Movies");
		const songHolder = screen.getByText("song.mp3").closest("li");
		expect(
			songHolder?.querySelector(".classicyTreeNodeDisabled"),
		).not.toBeNull();
		await user.click(screen.getByRole("button", { name: "Open" }));
		expect(baseProps.onOpenFunc).not.toHaveBeenCalled(); // selection was pruned → Open disabled
	});

	it("returns the selection payload on Open (single mode replaces)", async () => {
		const user = userEvent.setup();
		const onOpenFunc = vi.fn();
		renderWithProviders(
			<ClassicyFileOpenDialog
				{...baseProps}
				onOpenFunc={onOpenFunc}
				volumes={[makeVolume()]}
			/>,
		);
		await user.click(await screen.findByText("movie.mov"));
		await user.click(screen.getByText("song.mp3"));
		await user.click(screen.getByRole("button", { name: "Open" }));
		expect(onOpenFunc).toHaveBeenCalledTimes(1);
		const selections = onOpenFunc.mock.calls[0][0];
		expect(selections).toHaveLength(1);
		expect(selections[0]).toMatchObject({
			volumeId: "vol-a",
			path: [],
			entry: { id: "song", name: "song.mp3" },
		});
	});

	it("opens immediately on double-click of an enabled file", async () => {
		const user = userEvent.setup();
		const onOpenFunc = vi.fn();
		renderWithProviders(
			<ClassicyFileOpenDialog
				{...baseProps}
				onOpenFunc={onOpenFunc}
				volumes={[makeVolume()]}
			/>,
		);
		await user.dblClick(await screen.findByText("movie.mov"));
		expect(onOpenFunc).toHaveBeenCalledTimes(1);
		expect(onOpenFunc.mock.calls[0][0][0].entry.id).toBe("movie");
	});

	it("switches volumes via the popup and resets the selection", async () => {
		const user = userEvent.setup();
		const volB = makeVolume({
			id: "vol-b",
			label: "Volume B",
			list: vi.fn(async () => [
				{
					id: "bfile",
					name: "b.txt",
					kind: "file" as const,
					fileType: "text_file",
				},
			]),
		});
		renderWithProviders(
			<ClassicyFileOpenDialog {...baseProps} volumes={[makeVolume(), volB]} />,
		);
		await user.click(await screen.findByText("movie.mov"));
		await choosePopUpOption(user, /volume/i, "Volume B");
		expect(await screen.findByText("b.txt")).toBeInTheDocument();
		const openButton = screen.getByRole("button", {
			name: "Open",
		}) as HTMLButtonElement;
		expect(openButton.disabled).toBe(true);
	});

	it("loads each volume root exactly once per session/switch", async () => {
		const user = userEvent.setup();
		const volA = makeVolume();
		const volB = makeVolume({
			id: "vol-b",
			label: "Volume B",
			list: vi.fn(async () => [
				{
					id: "bfile",
					name: "b.txt",
					kind: "file" as const,
					fileType: "text_file",
				},
			]),
		});
		renderWithProviders(
			<ClassicyFileOpenDialog {...baseProps} volumes={[volA, volB]} />,
		);
		expect(await screen.findByText("movie.mov")).toBeInTheDocument();
		expect(volA.list).toHaveBeenCalledTimes(1);
		expect(volA.list).toHaveBeenCalledWith([]);

		await choosePopUpOption(user, /volume/i, "Volume B");
		expect(await screen.findByText("b.txt")).toBeInTheDocument();
		expect(volB.list).toHaveBeenCalledTimes(1);
		expect(volB.list).toHaveBeenCalledWith([]);

		await choosePopUpOption(user, /volume/i, "Volume A");
		expect(await screen.findByText("movie.mov")).toBeInTheDocument();
		expect(volA.list).toHaveBeenCalledTimes(1);
	});

	it("cancels on Cancel and on Escape", async () => {
		const user = userEvent.setup();
		const onCancelFunc = vi.fn();
		renderWithProviders(
			<ClassicyFileOpenDialog
				{...baseProps}
				onCancelFunc={onCancelFunc}
				volumes={[makeVolume()]}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onCancelFunc).toHaveBeenCalledTimes(1);
		await user.keyboard("{Escape}");
		expect(onCancelFunc).toHaveBeenCalledTimes(2);
	});
});
