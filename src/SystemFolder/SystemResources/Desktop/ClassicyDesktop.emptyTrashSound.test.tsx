// Special ▸ Empty Trash plays `ClassicyTrashEmpty` (Windows 98's Empty
// Recycle Bin event) once something is removed, interrupting the alert's own
// sound, as Windows' PlaySound did. The sprite is optional: the reducer plays
// it only from a pack that defines it (ClassicySoundStateEventReducer.test.ts,
// "optional sprites"), so under Platinum and System 7 the dispatch is silent.
import "@/__tests__/withPlatinum";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	emptyClassicyTrash,
	ensureClassicyTrash,
	listClassicyTrashItems,
	trashClassicyFileSystemItems,
} from "@/SystemFolder/SystemResources/File/ClassicyTrash";

const mockPlayer = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	async (importOriginal) => ({
		...(await importOriginal<
			typeof import("@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext")
		>()),
		useSoundDispatch: () => mockPlayer,
	}),
);

const trashSounds = () =>
	mockPlayer.mock.calls
		.map(([action]) => action as { type: string; sound?: string })
		.filter((action) => action.sound === "ClassicyTrashEmpty");

const renderDesktop = () =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop startupScreen={false} />
		</ClassicyAppManagerProvider>,
	);

const openEmptyTrash = () =>
	act(() => {
		dispatch({ type: "ClassicyDesktopShowSystemDialog", dialog: "emptyTrash" });
	});

beforeEach(() => {
	localStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
	mockPlayer.mockClear();
});

afterEach(cleanup);

describe("Special ▸ Empty Trash's sound", () => {
	it("plays ClassicyTrashEmpty, interrupting, once the Trash's items are gone", () => {
		renderDesktop();
		act(() => {
			const fs = new ClassicyFileSystem();
			fs.writeFile("Macintosh HD:Old Note.txt", "");
			trashClassicyFileSystemItems(fs, ["Macintosh HD:Old Note.txt"]);
		});
		openEmptyTrash();
		expect(trashSounds()).toEqual([]);
		act(() => {
			fireEvent.click(screen.getByText("OK"));
		});
		expect(listClassicyTrashItems(new ClassicyFileSystem())).toEqual([]);
		expect(trashSounds()).toEqual([
			{ type: "ClassicySoundPlayInterrupt", sound: "ClassicyTrashEmpty" },
		]);
	});

	it("plays nothing when the user cancels", () => {
		renderDesktop();
		act(() => {
			const fs = new ClassicyFileSystem();
			fs.writeFile("Macintosh HD:Kept.txt", "");
			trashClassicyFileSystemItems(fs, ["Macintosh HD:Kept.txt"]);
		});
		openEmptyTrash();
		act(() => {
			fireEvent.click(screen.getByText("Cancel"));
		});
		expect(listClassicyTrashItems(new ClassicyFileSystem())).toHaveLength(1);
		expect(trashSounds()).toEqual([]);
	});

	it("plays nothing for an empty Trash, which only notes it", () => {
		renderDesktop();
		act(() => {
			const fs = new ClassicyFileSystem();
			ensureClassicyTrash(fs);
			emptyClassicyTrash(fs);
		});
		openEmptyTrash();
		expect(screen.getByText("The Trash is empty.")).toBeInTheDocument();
		act(() => {
			fireEvent.click(screen.getByText("OK"));
		});
		expect(trashSounds()).toEqual([]);
	});
});
