import {
	act,
	cleanup,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	ClassicyFileBrowser,
	type ClassicyFileBrowserCommands,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import {
	clearClassicyFileClipboard,
	setClassicyFileClipboard,
} from "@/SystemFolder/SystemResources/File/ClassicyFileClipboard";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// The remaining chapters' audit's 5.28 (WIG Ch.5 "Shortcut Keys for
// Transfer Operations", pp.67-68; "Command Method Transfers", p.66): a
// folder view's Ctrl+X, Ctrl+C and Ctrl+V (`onClipboardCommand`) and the
// cut items' look (`classicyFileCut`, until a Paste, another Cut or Copy,
// or Escape).

beforeEach(() => {
	localStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
		new DOMRect(0, 0, 400, 400),
	);
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	clearClassicyFileClipboard();
});

let counter = 0;
const makeFs = () =>
	new ClassicyFileSystem(`test-browser-clipboard-${++counter}`, {
		_type: "directory",
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"a.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
			"b.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
			Projects: { _type: ClassicyFileSystemEntryFileType.Directory },
		},
	});

const iconAt = (container: HTMLElement, path: string) =>
	container.querySelector<HTMLElement>(
		`.classicyIcon[data-classicy-file-path="${CSS.escape(path)}"]`,
	);
const rowContainerAt = (container: HTMLElement, path: string) =>
	container.querySelector<HTMLElement>(
		`.classicyFileBrowserViewTableRowContainer[data-classicy-file-path="${CSS.escape(path)}"]`,
	);

const renderBrowser = (
	display: "icons" | "list",
	{
		fs = makeFs(),
		onClipboardCommand,
		commandsRef,
	}: {
		fs?: ClassicyFileSystem;
		onClipboardCommand?: (
			command: "cut" | "copy" | "paste",
			paths: string[],
		) => void;
		commandsRef?: React.RefObject<ClassicyFileBrowserCommands | null>;
	} = {},
) =>
	render(
		<ClassicyFileBrowser
			fs={fs}
			path="Documents"
			appId="Finder.app"
			display={display}
			onClipboardCommand={onClipboardCommand}
			commandsRef={commandsRef}
			onRenameItem={() => undefined}
		/>,
	);

const ctrl = (target: Element, key: string, init: KeyboardEventInit = {}) => {
	const event = new KeyboardEvent("keydown", {
		key,
		ctrlKey: true,
		bubbles: true,
		cancelable: true,
		...init,
	});
	act(() => {
		target.dispatchEvent(event);
	});
	return event;
};

describe("Ctrl+X, Ctrl+C and Ctrl+V in a folder view (onClipboardCommand)", () => {
	it("hands the icon view's selection to Cut and Copy, and asks for a Paste", async () => {
		const onClipboard = vi.fn();
		const { container } = renderBrowser("icons", {
			onClipboardCommand: onClipboard,
		});
		const icon = await waitFor(() => {
			const el = iconAt(container, "Documents:a.txt");
			expect(el).not.toBeNull();
			return el as HTMLElement;
		});
		fireEvent.click(icon);
		expect(ctrl(icon, "x").defaultPrevented).toBe(true);
		expect(onClipboard).toHaveBeenLastCalledWith("cut", ["Documents:a.txt"]);
		ctrl(icon, "c");
		expect(onClipboard).toHaveBeenLastCalledWith("copy", ["Documents:a.txt"]);
		ctrl(icon, "v");
		expect(onClipboard).toHaveBeenLastCalledWith("paste", ["Documents:a.txt"]);
		// Another chord is not the browser's.
		expect(ctrl(icon, "x", { shiftKey: true }).defaultPrevented).toBe(false);
		expect(onClipboard).toHaveBeenCalledTimes(3);
	});

	it("hands the list view's selection over too, none when nothing is selected", async () => {
		const onClipboard = vi.fn();
		const { container } = renderBrowser("list", {
			onClipboardCommand: onClipboard,
		});
		await waitFor(() =>
			expect(rowContainerAt(container, "Documents:a.txt")).not.toBeNull(),
		);
		const root = container.querySelector(
			".classicyFileBrowserFill",
		) as HTMLElement;
		ctrl(root, "v");
		expect(onClipboard).toHaveBeenLastCalledWith("paste", []);
	});

	it("leaves the keys to a name being edited", async () => {
		const onClipboard = vi.fn();
		const commandsRef = createRef<ClassicyFileBrowserCommands>();
		const { container } = renderBrowser("icons", {
			onClipboardCommand: onClipboard,
			commandsRef,
		});
		await waitFor(() =>
			expect(iconAt(container, "Documents:a.txt")).not.toBeNull(),
		);
		act(() => commandsRef.current?.rename("Documents:a.txt"));
		const field = await waitFor(() => {
			const el = container.querySelector("input");
			expect(el).not.toBeNull();
			return el as HTMLInputElement;
		});
		expect(ctrl(field, "c").defaultPrevented).toBe(false);
		expect(onClipboard).not.toHaveBeenCalled();
	});

	it("takes no key without it", async () => {
		const { container } = renderBrowser("icons");
		const icon = await waitFor(() => {
			const el = iconAt(container, "Documents:a.txt");
			expect(el).not.toBeNull();
			return el as HTMLElement;
		});
		expect(ctrl(icon, "c").defaultPrevented).toBe(false);
	});
});

describe("the cut items' look (classicyFileCut)", () => {
	it("marks a cut icon in the icon view until the clipboard lets it go", async () => {
		const fs = makeFs();
		const { container } = renderBrowser("icons", { fs });
		await waitFor(() =>
			expect(iconAt(container, "Documents:a.txt")).not.toBeNull(),
		);
		expect(container.querySelector(".classicyFileCut")).toBeNull();
		act(() =>
			setClassicyFileClipboard("cut", ["Documents:a.txt"], fs.storageKey),
		);
		expect(iconAt(container, "Documents:a.txt")?.classList).toContain(
			"classicyFileCut",
		);
		expect(iconAt(container, "Documents:b.txt")?.classList).not.toContain(
			"classicyFileCut",
		);
		// A Copy draws nothing (WIG p.66: "The Copy command requires no
		// special feedback"), and another tree's Cut is not this one's.
		act(() =>
			setClassicyFileClipboard("copy", ["Documents:a.txt"], fs.storageKey),
		);
		expect(container.querySelector(".classicyFileCut")).toBeNull();
		act(() => setClassicyFileClipboard("cut", ["Documents:a.txt"], "other"));
		expect(container.querySelector(".classicyFileCut")).toBeNull();
	});

	it("marks a cut row's container in the list view", async () => {
		const fs = makeFs();
		const { container } = renderBrowser("list", { fs });
		await waitFor(() =>
			expect(rowContainerAt(container, "Documents:b.txt")).not.toBeNull(),
		);
		act(() =>
			setClassicyFileClipboard("cut", ["Documents:b.txt"], fs.storageKey),
		);
		expect(rowContainerAt(container, "Documents:b.txt")?.classList).toContain(
			"classicyFileCut",
		);
		act(() => clearClassicyFileClipboard());
		expect(container.querySelector(".classicyFileCut")).toBeNull();
	});

	it("goes on Escape in the view", async () => {
		const fs = makeFs();
		const { container } = renderBrowser("icons", { fs });
		const icon = await waitFor(() => {
			const el = iconAt(container, "Documents:a.txt");
			expect(el).not.toBeNull();
			return el as HTMLElement;
		});
		act(() =>
			setClassicyFileClipboard("cut", ["Documents:a.txt"], fs.storageKey),
		);
		act(() => {
			icon.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
			);
		});
		expect(container.querySelector(".classicyFileCut")).toBeNull();
	});
});

describe("several new items placed at once (commandsRef's place)", () => {
	it("gives each a cell of its own", async () => {
		const fs = makeFs();
		const commandsRef = createRef<ClassicyFileBrowserCommands>();
		const { container, rerender } = renderBrowser("icons", { fs, commandsRef });
		await waitFor(() =>
			expect(iconAt(container, "Documents:a.txt")).not.toBeNull(),
		);
		act(() => {
			commandsRef.current?.place("Documents:c.txt");
			commandsRef.current?.place("Documents:d.txt");
			fs.writeFile("Documents:c.txt", "c");
			fs.writeFile("Documents:d.txt", "d");
		});
		// A fresh `fs` on the shared tree, as `useClassicyFileSystem` hands
		// out after a change.
		rerender(
			<ClassicyFileBrowser
				fs={new ClassicyFileSystem(fs.storageKey)}
				path="Documents"
				appId="Finder.app"
				display="icons"
				commandsRef={commandsRef}
				onRenameItem={() => undefined}
			/>,
		);
		const place = (path: string) => {
			const el = iconAt(container, path);
			return el ? [el.style.left, el.style.top].join(",") : undefined;
		};
		await waitFor(() => {
			expect(place("Documents:c.txt")).toBeDefined();
			expect(place("Documents:d.txt")).toBeDefined();
		});
		const taken = ["a.txt", "b.txt", "Projects"].map((name) =>
			place(`Documents:${name}`),
		);
		expect(place("Documents:c.txt")).not.toBe(place("Documents:d.txt"));
		expect(taken).not.toContain(place("Documents:c.txt"));
		expect(taken).not.toContain(place("Documents:d.txt"));
	});
});
