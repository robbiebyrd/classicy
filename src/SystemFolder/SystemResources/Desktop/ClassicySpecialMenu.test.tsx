import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import {
	ClassicyEmptyTrashAlert,
	classicyEmptyTrashConfirmation,
	classicySpecialMenuItems,
} from "@/SystemFolder/SystemResources/Desktop/ClassicySpecialMenu";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	ensureClassicyTrash,
	trashClassicyFileSystemItems,
} from "@/SystemFolder/SystemResources/File/ClassicyTrash";

// The file system the alert reads a lone item's name from.
const trashFs = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock(
	"@/SystemFolder/SystemResources/File/ClassicyFileSystemContext",
	async (importOriginal) => ({
		...(await importOriginal<Record<string, unknown>>()),
		useClassicyFileSystemAccessor: () => () => trashFs.current,
	}),
);

let fsCounter = 0;
/** A tree whose Trash holds `names` (files, or folders where marked). */
const fsWithTrash = (names: { name: string; folder?: boolean }[]) => {
	const documents: Record<string, unknown> = {
		_type: ClassicyFileSystemEntryFileType.Directory,
	};
	for (const { name, folder } of names)
		documents[name] = {
			_type: folder
				? ClassicyFileSystemEntryFileType.Directory
				: ClassicyFileSystemEntryFileType.TextFile,
		};
	const fs = new ClassicyFileSystem(`test-empty-trash-${++fsCounter}`, {
		_type: "directory",
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			Documents: documents,
		},
	} as never);
	ensureClassicyTrash(fs);
	trashClassicyFileSystemItems(
		fs,
		names.map(({ name }) => `Macintosh HD:Documents:${name}`),
	);
	trashFs.current = fs;
	return fs;
};

/** The Windows 98 package's names and commands, as far as the alert reads them. */
const RECYCLE_BIN = {
	desktopIcons: { trash: { name: "Recycle Bin" } },
} as const;

vi.mock("@/SystemFolder/SystemResources/Alert/ClassicyAlert", () => ({
	ClassicyAlert: ({
		title,
		label,
		message,
		buttons,
		onClose,
	}: {
		title?: string;
		label: string;
		message?: string;
		buttons: { id: string; label: string; onClick?: () => void }[];
		onClose: () => void;
	}) => (
		<div>
			{title ? <h1>{title}</h1> : null}
			<p>{label}</p>
			{message ? <p>{message}</p> : null}
			{buttons.map((b) => (
				<button
					key={b.id}
					type="button"
					onClick={() => {
						b.onClick?.();
						onClose();
					}}
				>
					{b.label}
				</button>
			))}
		</div>
	),
}));

describe("classicySpecialMenuItems", () => {
	// Each only asks first (`confirms`): the menu writes "Empty Trash…" and
	// "Reset PRAM…" under Mac OS, and no ellipsis under Windows 98
	// (`layout.menu.confirmEllipsis`; ClassicyMenu.test.tsx).
	it("offers Empty Trash then Reset PRAM, each confirming, each opening its alert", () => {
		const dispatch = vi.fn();
		const items = classicySpecialMenuItems(dispatch, "x");
		expect(items.map((i) => [i.title, i.confirms])).toEqual([
			["Empty Trash", true],
			[undefined, undefined],
			["Reset PRAM", true],
		]);
		items[0].onClickFunc?.();
		items[2].onClickFunc?.();
		expect(dispatch.mock.calls.map(([a]) => a)).toEqual([
			{ type: "ClassicyDesktopShowSystemDialog", dialog: "emptyTrash" },
			{ type: "ClassicyDesktopShowSystemDialog", dialog: "resetPram" },
		]);
	});
});

describe("ClassicyEmptyTrashAlert", () => {
	it("warns how many items will be removed for good, and empties on OK", () => {
		const onEmpty = vi.fn();
		const onClose = vi.fn();
		render(
			<ClassicyEmptyTrashAlert
				itemCount={3}
				onEmpty={onEmpty}
				onClose={onClose}
			/>,
		);
		expect(
			screen.getByText(
				"The Trash contains 3 items. Are you sure you want to permanently remove these items?",
			),
		).toBeInTheDocument();
		expect(screen.getByText("You can’t undo this action.")).toBeInTheDocument();
		fireEvent.click(screen.getByText("Cancel"));
		expect(onEmpty).not.toHaveBeenCalled();
		fireEvent.click(screen.getByText("OK"));
		expect(onEmpty).toHaveBeenCalledOnce();
		expect(onClose).toHaveBeenCalledTimes(2);
	});

	it("speaks of one item in the singular", () => {
		render(
			<ClassicyEmptyTrashAlert
				itemCount={1}
				onEmpty={vi.fn()}
				onClose={vi.fn()}
			/>,
		);
		expect(
			screen.getByText(
				"The Trash contains 1 item. Are you sure you want to permanently remove it?",
			),
		).toBeInTheDocument();
	});

	it("only notes an empty Trash", () => {
		const onEmpty = vi.fn();
		render(
			<ClassicyEmptyTrashAlert
				itemCount={0}
				onEmpty={onEmpty}
				onClose={vi.fn()}
			/>,
		);
		expect(screen.getByText("The Trash is empty.")).toBeInTheDocument();
		fireEvent.click(screen.getByText("OK"));
		expect(onEmpty).not.toHaveBeenCalled();
	});
});

// The audit's 1.15: the Trash is named as the package shows it
// (`desktopIcons.trash.name`), and under Explorer's commands the Empty
// alert is Windows 98 SE's own confirmation (shell32.dll's strings).
describe("the Trash's name and Windows 98's Empty confirmation", () => {
	let restore: (() => void) | undefined;
	afterEach(() => {
		restore?.();
		restore = undefined;
		trashFs.current = undefined;
	});

	it("names Empty after the package's Trash", () => {
		restore = activateTestWindowsKeysPackage({}, RECYCLE_BIN);
		expect(classicySpecialMenuItems(vi.fn(), "x")[0].title).toBe(
			"Empty Recycle Bin",
		);
		expect(classicySpecialMenuItems(vi.fn(), "x", "Bin")[0].title).toBe(
			"Empty Bin",
		);
	});

	it("keeps Empty Trash without a name of the package's", () => {
		restore = activateTestWindowsKeysPackage();
		expect(classicySpecialMenuItems(vi.fn(), "x")[0].title).toBe("Empty Trash");
	});

	it("asks to delete the items, Yes and No, under Explorer's commands", () => {
		restore = activateTestWindowsKeysPackage({}, RECYCLE_BIN);
		fsWithTrash([{ name: "a.txt" }, { name: "b.txt" }, { name: "c.txt" }]);
		const onEmpty = vi.fn();
		render(
			<ClassicyEmptyTrashAlert
				itemCount={3}
				onEmpty={onEmpty}
				onClose={vi.fn()}
			/>,
		);
		expect(
			screen.getByText("Confirm Multiple File Delete"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Are you sure you want to delete these 3 items?"),
		).toBeInTheDocument();
		fireEvent.click(screen.getByText("No"));
		expect(onEmpty).not.toHaveBeenCalled();
		fireEvent.click(screen.getByText("Yes"));
		expect(onEmpty).toHaveBeenCalledOnce();
	});

	it("names the one file it deletes, by its own name", () => {
		restore = activateTestWindowsKeysPackage({}, RECYCLE_BIN);
		fsWithTrash([{ name: "Plan.txt" }]);
		render(
			<ClassicyEmptyTrashAlert
				itemCount={1}
				onEmpty={vi.fn()}
				onClose={vi.fn()}
			/>,
		);
		expect(screen.getByText("Confirm File Delete")).toBeInTheDocument();
		expect(
			screen.getByText("Are you sure you want to delete 'Plan.txt'?"),
		).toBeInTheDocument();
	});

	it("words a lone folder as Confirm Folder Delete", () => {
		expect(
			classicyEmptyTrashConfirmation(1, { name: "Old", folder: true }),
		).toEqual({
			title: "Confirm Folder Delete",
			message:
				"Are you sure you want to remove the folder 'Old' and all its contents?",
		});
		expect(classicyEmptyTrashConfirmation(1)).toEqual({
			title: "Confirm Multiple File Delete",
			message: "Are you sure you want to delete these 1 items?",
		});
	});

	it("notes an empty Recycle Bin by its name", () => {
		restore = activateTestWindowsKeysPackage({}, RECYCLE_BIN);
		render(
			<ClassicyEmptyTrashAlert
				itemCount={0}
				onEmpty={vi.fn()}
				onClose={vi.fn()}
			/>,
		);
		expect(screen.getByText("The Recycle Bin is empty.")).toBeInTheDocument();
	});

	it("keeps Mac OS 8's wording, renamed, without Explorer's commands", () => {
		restore = activateTestWindowsKeysPackage(
			{ finder: undefined },
			RECYCLE_BIN,
		);
		render(
			<ClassicyEmptyTrashAlert
				itemCount={2}
				onEmpty={vi.fn()}
				onClose={vi.fn()}
			/>,
		);
		expect(
			screen.getByText(
				"The Recycle Bin contains 2 items. Are you sure you want to permanently remove these items?",
			),
		).toBeInTheDocument();
		expect(screen.queryByText("Yes")).not.toBeInTheDocument();
	});
});
