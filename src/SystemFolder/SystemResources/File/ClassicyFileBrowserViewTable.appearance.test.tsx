import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { withElementsFromPoint } from "@/__tests__/withElementsFromPoint";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyFileBrowserViewTable } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// A list view row drags as a Finder item; the table's emitter reports it.

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The drag events Table emitted (and its unmount, with `andUnmount`). */
const drags = (andUnmount = false) =>
	probe.events
		.filter(
			(e) =>
				e.component === "Table" &&
				(e.event === "dragStart" ||
					e.event === "dragEnd" ||
					(andUnmount && e.event === "unmount")),
		)
		.map(({ event, detail }) => ({ event, detail }));

const renderList = () => {
	const fs = new ClassicyFileSystem("test-table-appearance-drag", {
		_type: "directory",
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Plan.txt": {
				_type: ClassicyFileSystemEntryFileType.File,
				_data: "plan",
			},
			Archive: { _type: ClassicyFileSystemEntryFileType.Directory },
		},
	});
	const onMoveItems = vi.fn();
	const { container, unmount } = render(
		<ClassicyFileBrowserViewTable
			fs={fs}
			path="Documents"
			appId="Finder.app"
			onMoveItems={onMoveItems}
		/>,
	);
	const row = container.querySelector(
		'[data-classicy-file-path="Documents:Plan.txt"]',
	) as HTMLElement;
	return { row, onMoveItems, unmount };
};

const folder = () => {
	const el = document.createElement("div");
	el.setAttribute("data-classicy-drop-folder", "Macintosh HD:Elsewhere");
	return el;
};

describe("ClassicyFileBrowserViewTable appearance drags", () => {
	it("emits one dragStart at the threshold and one dragEnd on a drop", () => {
		const { row, onMoveItems } = renderList();
		expect(row).not.toBeNull();
		withElementsFromPoint([folder()], () => {
			fireEvent.mouseDown(row, { button: 0, clientX: 10, clientY: 10 });
			fireEvent.mouseMove(document, { clientX: 12, clientY: 12 });
			expect(drags()).toEqual([]);
			fireEvent.mouseMove(document, { clientX: 40, clientY: 30 });
			fireEvent.mouseMove(document, { clientX: 60, clientY: 50 });
			fireEvent.mouseUp(document, { clientX: 60, clientY: 50 });
			fireEvent.mouseUp(document, { clientX: 60, clientY: 50 });
		});
		expect(onMoveItems).toHaveBeenCalledOnce();
		expect(drags()).toEqual([
			{ event: "dragStart", detail: { kind: "file" } },
			{
				event: "dragEnd",
				detail: { kind: "file", dropped: true, canceled: false },
			},
		]);
	});

	it("emits one dragEnd, not dropped, on a release over nothing", () => {
		const { row } = renderList();
		withElementsFromPoint([], () => {
			fireEvent.mouseDown(row, { button: 0, clientX: 10, clientY: 10 });
			fireEvent.mouseMove(document, { clientX: 40, clientY: 30 });
			fireEvent.mouseUp(document, { clientX: 40, clientY: 30 });
		});
		expect(drags()).toEqual([
			{ event: "dragStart", detail: { kind: "file" } },
			{
				event: "dragEnd",
				detail: { kind: "file", dropped: false, canceled: false },
			},
		]);
	});

	it("emits one dragEnd, canceled, on Escape", () => {
		const { row, onMoveItems } = renderList();
		withElementsFromPoint([folder()], () => {
			fireEvent.mouseDown(row, { button: 0, clientX: 10, clientY: 10 });
			fireEvent.mouseMove(document, { clientX: 40, clientY: 30 });
			fireEvent.keyDown(document, { key: "Escape" });
			fireEvent.mouseUp(document, { clientX: 40, clientY: 30 });
		});
		expect(onMoveItems).not.toHaveBeenCalled();
		expect(drags()).toEqual([
			{ event: "dragStart", detail: { kind: "file" } },
			{
				event: "dragEnd",
				detail: { kind: "file", dropped: false, canceled: true },
			},
		]);
	});

	it("emits no drag for a click", () => {
		const { row } = renderList();
		withElementsFromPoint([folder()], () => {
			fireEvent.mouseDown(row, { button: 0, clientX: 10, clientY: 10 });
			fireEvent.mouseUp(document, { clientX: 11, clientY: 10 });
		});
		expect(drags()).toEqual([]);
	});

	it("emits no drag for a right-press, however far it travels", () => {
		const { row, onMoveItems } = renderList();
		withElementsFromPoint([folder()], () => {
			fireEvent.mouseDown(row, { button: 2, clientX: 10, clientY: 10 });
			fireEvent.mouseMove(document, { clientX: 40, clientY: 30 });
			fireEvent.mouseUp(document, { clientX: 40, clientY: 30 });
		});
		expect(document.querySelector(".classicyFileDragGhost")).toBeNull();
		expect(onMoveItems).not.toHaveBeenCalled();
		expect(drags()).toEqual([]);
	});

	it("ends the drag, canceled, before unmount when the list unmounts mid-drag", () => {
		const { row, onMoveItems, unmount } = renderList();
		withElementsFromPoint([folder()], () => {
			fireEvent.mouseDown(row, { button: 0, clientX: 10, clientY: 10 });
			fireEvent.mouseMove(document, { clientX: 40, clientY: 30 });
			unmount();
			expect(document.querySelector(".classicyFileDragGhost")).toBeNull();
			fireEvent.mouseMove(document, { clientX: 50, clientY: 40 });
			fireEvent.mouseUp(document, { clientX: 50, clientY: 40 });
		});
		expect(onMoveItems).not.toHaveBeenCalled();
		expect(drags(true)).toEqual([
			{ event: "dragStart", detail: { kind: "file" } },
			{
				event: "dragEnd",
				detail: { kind: "file", dropped: false, canceled: true },
			},
			{ event: "unmount", detail: undefined },
		]);
	});
});
