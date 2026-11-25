// The Windows-layout package below needs a sound pack registered: Platinum's.
import "@classicy/appearance-platinum";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	act,
	fireEvent,
	render,
	screen,
	userEvent,
} from "@/__tests__/test-utils";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { ClassicyScrollArea } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea";
import {
	ClassicyTree,
	type ClassicyTreeNode,
} from "@/SystemFolder/SystemResources/Tree/ClassicyTree";
import { ClassicyWindowActiveContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowActiveContext";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => vi.fn(),
	}),
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

// Platinum (registered above) is the default layout, which declares no tree
// keys; `windows-trees` carries the Windows 98 package's layout
// (`tree.keys` "windows"). The store is not mounted: stand in for its
// connection of the active package id.
const activePackage = { id: "platinum" };
connectClassicyAssetPackageSource({
	getId: () => activePackage.id,
	subscribe: () => () => {},
});
registerClassicyAppearancePackage({
	id: "windows-trees",
	name: "Windows trees",
	css: "",
	defaults: {
		...CLASSICY_CORE_DEFAULT_THEME,
		id: "windows-trees-default",
		package: "windows-trees",
	},
	layout: windows98.layout as never,
});

afterEach(() => {
	activePackage.id = "platinum";
});

const nodes: ClassicyTreeNode[] = [
	{
		id: "branch",
		label: "Branch Node",
		leftIcon: "left.png",
		rightIcon: "right.png",
		children: [
			{
				id: "leaf",
				label: "Leaf Node",
				button: { label: "Open", onClickFunc: vi.fn() },
			},
		],
	},
	{
		id: "topLeaf",
		label: "Top Leaf",
	},
];

describe("ClassicyTree", () => {
	it("renders the tree with top-level nodes", () => {
		const { container } = render(<ClassicyTree nodes={nodes} />);
		expect(container.querySelector(".classicyTree")).not.toBeNull();
		expect(screen.getByText("Branch Node")).toBeInTheDocument();
		expect(screen.getByText("Top Leaf")).toBeInTheDocument();
	});

	it("keeps branch children hidden until expanded", () => {
		render(<ClassicyTree nodes={nodes} />);
		expect(screen.queryByText("Leaf Node")).not.toBeInTheDocument();
	});

	it("expands a branch node on click and marks aria-expanded", async () => {
		const user = userEvent.setup();
		render(<ClassicyTree nodes={nodes} />);
		const branch = screen.getByText("Branch Node");
		await user.click(branch);
		expect(screen.getByText("Leaf Node")).toBeInTheDocument();
		const holder = screen.getByText("Branch Node").closest('[role="button"]');
		expect(holder).toHaveAttribute("aria-expanded", "true");
	});

	it("collapses an expanded branch node on a second click", async () => {
		const user = userEvent.setup();
		render(<ClassicyTree nodes={nodes} />);
		const branch = screen.getByText("Branch Node");
		await user.click(branch);
		await user.click(branch);
		expect(screen.queryByText("Leaf Node")).not.toBeInTheDocument();
	});

	it("respects defaultOpen", () => {
		render(<ClassicyTree nodes={[{ ...nodes[0], defaultOpen: true }]} />);
		expect(screen.getByText("Leaf Node")).toBeInTheDocument();
	});

	it("expands a branch node with the keyboard", async () => {
		const user = userEvent.setup();
		render(<ClassicyTree nodes={nodes} />);
		const holder = screen
			.getByText("Branch Node")
			.closest('[role="button"]') as HTMLElement;
		holder.focus();
		await user.keyboard("{Enter}");
		expect(screen.getByText("Leaf Node")).toBeInTheDocument();
	});

	it("fires onToggleNode with the node id and open state", async () => {
		const user = userEvent.setup();
		const onToggleNode = vi.fn();
		render(<ClassicyTree nodes={nodes} onToggleNode={onToggleNode} />);
		await user.click(screen.getByText("Branch Node"));
		expect(onToggleNode).toHaveBeenCalledWith("branch", true);
	});

	it("renders a small ClassicyButton for a leaf and fires its callback", async () => {
		const user = userEvent.setup();
		const onClickFunc = vi.fn();
		render(
			<ClassicyTree
				nodes={[
					{
						...nodes[0],
						defaultOpen: true,
						children: [
							{
								id: "leaf",
								label: "Leaf Node",
								button: { label: "Open", onClickFunc },
							},
						],
					},
				]}
			/>,
		);
		const button = screen.getByRole("button", { name: "Open" });
		expect(button).toHaveClass("classicyButtonSmall");
		await user.click(button);
		expect(onClickFunc).toHaveBeenCalledTimes(1);
	});

	it("does not toggle the branch when its leaf button is clicked", async () => {
		const user = userEvent.setup();
		const onToggleNode = vi.fn();
		render(
			<ClassicyTree
				nodes={[
					{
						id: "branch",
						label: "Branch Node",
						defaultOpen: true,
						children: [
							{
								id: "leaf",
								label: "Leaf Node",
								button: { label: "Open", onClickFunc: vi.fn() },
							},
						],
					},
				]}
				onToggleNode={onToggleNode}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "Open" }));
		expect(onToggleNode).not.toHaveBeenCalled();
	});

	it("opens a branch with Command-Right and closes with Command-Left", async () => {
		const user = userEvent.setup();
		render(<ClassicyTree nodes={nodes} />);
		const holder = screen
			.getByText("Branch Node")
			.closest('[role="button"]') as HTMLElement;
		holder.focus();
		await user.keyboard("{Meta>}{ArrowRight}{/Meta}");
		expect(screen.getByText("Leaf Node")).toBeInTheDocument();
		await user.keyboard("{Meta>}{ArrowLeft}{/Meta}");
		expect(screen.queryByText("Leaf Node")).not.toBeInTheDocument();
	});

	it("moves the selection down with the arrow keys", async () => {
		const user = userEvent.setup();
		render(<ClassicyTree nodes={nodes} />);
		const holder = screen
			.getByText("Branch Node")
			.closest('[role="button"]') as HTMLElement;
		holder.focus();
		await user.keyboard("{ArrowDown}");
		const topLeafRow = screen
			.getByText("Top Leaf")
			.closest(".classicyTreeNodeLabelHolder") as HTMLElement;
		expect(topLeafRow).toHaveFocus();
	});

	it("selects a node by typing its leading characters", async () => {
		const user = userEvent.setup();
		render(<ClassicyTree nodes={nodes} />);
		const holder = screen
			.getByText("Branch Node")
			.closest('[role="button"]') as HTMLElement;
		holder.focus();
		await user.keyboard("t");
		const topLeafRow = screen
			.getByText("Top Leaf")
			.closest(".classicyTreeNodeLabelHolder") as HTMLElement;
		expect(topLeafRow).toHaveFocus();
	});

	it("renders left and right icons on a node row", () => {
		render(<ClassicyTree nodes={nodes} />);
		const row = screen
			.getByText("Branch Node")
			.closest(".classicyTreeNodeRow") as HTMLElement;
		expect(row.querySelector(".classicyTreeNodeIcon")).not.toBeNull();
		expect(row.querySelector(".classicyTreeNodeIconRight")).not.toBeNull();
	});
});

describe("ClassicyTree selection & disabled", () => {
	const leaf = (
		id: string,
		extra: Partial<ClassicyTreeNode> = {},
	): ClassicyTreeNode => ({
		id,
		label: id,
		...extra,
	});
	const nodes: ClassicyTreeNode[] = [
		{
			id: "folder",
			label: "folder",
			defaultOpen: true,
			children: [leaf("a"), leaf("b", { disabled: true }), leaf("c")],
		},
	];

	it("fires onSelectNode for an enabled leaf when selectionMode is single", async () => {
		const user = userEvent.setup();
		const onSelectNode = vi.fn();
		render(
			<ClassicyTree
				nodes={nodes}
				selectionMode="single"
				selectedIds={[]}
				onSelectNode={onSelectNode}
			/>,
		);
		await user.click(screen.getByText("a"));
		expect(onSelectNode).toHaveBeenCalledTimes(1);
		expect(onSelectNode.mock.calls[0][0]).toBe("a");
	});

	it("does not fire onSelectNode for a disabled leaf, and marks it disabled", async () => {
		const user = userEvent.setup();
		const onSelectNode = vi.fn();
		render(
			<ClassicyTree
				nodes={nodes}
				selectionMode="single"
				selectedIds={[]}
				onSelectNode={onSelectNode}
			/>,
		);
		const row = screen.getByText("b").closest("li");
		expect(
			row?.querySelector(".classicyTreeNodeLabelHolder.disabled"),
		).not.toBeNull();
		await user.click(screen.getByText("b"));
		expect(onSelectNode).not.toHaveBeenCalled();
	});

	it("renders the selected style for ids in selectedIds", () => {
		render(
			<ClassicyTree
				nodes={nodes}
				selectionMode="multi"
				selectedIds={["c"]}
				onSelectNode={() => {}}
			/>,
		);
		expect(
			screen.getByText("c").closest(".classicyTreeNodeLabelHolder")?.className,
		).toContain("selected");
	});

	it("fires onActivateNode on leaf double-click", async () => {
		const user = userEvent.setup();
		const onActivateNode = vi.fn();
		render(
			<ClassicyTree
				nodes={nodes}
				selectionMode="single"
				selectedIds={[]}
				onActivateNode={onActivateNode}
			/>,
		);
		await user.dblClick(screen.getByText("a"));
		expect(onActivateNode).toHaveBeenCalledWith(
			"a",
			expect.objectContaining({ id: "a" }),
		);
	});

	it("selects an enabled leaf with the keyboard (Enter)", async () => {
		const user = userEvent.setup();
		const onSelectNode = vi.fn();
		render(
			<ClassicyTree
				nodes={nodes}
				selectionMode="single"
				selectedIds={[]}
				onSelectNode={onSelectNode}
			/>,
		);
		screen
			.getByText("a")
			.closest('[role="button"]')
			?.dispatchEvent(new FocusEvent("focus"));
		await user.type(
			screen.getByText("a").closest('[role="button"]') as HTMLElement,
			"{Enter}",
		);
		expect(onSelectNode).toHaveBeenCalled();
	});

	it("keeps leaves inert when selectionMode is none (default)", async () => {
		const user = userEvent.setup();
		const onSelectNode = vi.fn();
		render(<ClassicyTree nodes={nodes} onSelectNode={onSelectNode} />);
		expect(screen.getByText("a").closest('[role="button"]')).toBeNull();
		await user.click(screen.getByText("a"));
		expect(onSelectNode).not.toHaveBeenCalled();
	});

	it("renders multiple leaf buttons from `buttons` and clicks don't select", async () => {
		const user = userEvent.setup();
		const onSelectNode = vi.fn();
		const onEdit = vi.fn();
		const withButtons: ClassicyTreeNode[] = [
			{
				id: "f",
				label: "f",
				defaultOpen: true,
				children: [
					leaf("x", {
						buttons: [
							{ label: "Edit", onClickFunc: onEdit },
							{ label: "Remove" },
						],
					}),
				],
			},
		];
		render(
			<ClassicyTree
				nodes={withButtons}
				selectionMode="single"
				selectedIds={[]}
				onSelectNode={onSelectNode}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "Edit" }));
		expect(onEdit).toHaveBeenCalledTimes(1);
		expect(onSelectNode).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
	});
});

// WIG Ch.7 "Tree View Controls" (pp.123-124): "LEFT ARROW and RIGHT ARROW to
// move along a particular branch of the outline. Pressing RIGHT ARROW can
// also expand the outline at a branch"; comctl32's TREEVIEW_KeyDown (the
// audit's 7.21), under the package's `tree.keys` "windows" alone.
describe("ClassicyTree — the bare arrows along a branch (layout.tree.keys)", () => {
	const deep: ClassicyTreeNode[] = [
		{
			id: "drive",
			label: "Drive",
			children: [
				{
					id: "folder",
					label: "Folder",
					children: [{ id: "file", label: "File" }],
				},
				{ id: "note", label: "Note" },
			],
		},
		{
			id: "dimmed",
			label: "Dimmed",
			disabled: true,
			children: [{ id: "inside", label: "Inside" }],
		},
		{ id: "loose", label: "Loose" },
	];
	const row = (label: string) =>
		screen
			.getByText(label)
			.closest(".classicyTreeNodeLabelHolder") as HTMLElement;
	const keydown = (target: HTMLElement, init: KeyboardEventInit) => {
		const event = new KeyboardEvent("keydown", {
			bubbles: true,
			cancelable: true,
			...init,
		});
		target.dispatchEvent(event);
		return event;
	};

	it("leaves a bare Right or Left Arrow alone under the Mac layout", async () => {
		const user = userEvent.setup();
		const onToggleNode = vi.fn();
		render(<ClassicyTree nodes={deep} onToggleNode={onToggleNode} />);
		row("Drive").focus();
		await user.keyboard("{ArrowRight}");
		expect(screen.queryByText("Folder")).not.toBeInTheDocument();
		expect(row("Drive")).toHaveFocus();
		await user.keyboard("{ArrowLeft}");
		expect(row("Drive")).toHaveFocus();
		expect(onToggleNode).not.toHaveBeenCalled();
		// Nor its default (a scroller may still scroll sideways).
		expect(keydown(row("Drive"), { key: "ArrowRight" }).defaultPrevented).toBe(
			false,
		);
	});

	it("expands a closed branch with Right, then moves to its first child", async () => {
		activePackage.id = "windows-trees";
		const user = userEvent.setup();
		const onToggleNode = vi.fn();
		render(<ClassicyTree nodes={deep} onToggleNode={onToggleNode} />);
		row("Drive").focus();
		await user.keyboard("{ArrowRight}");
		expect(onToggleNode).toHaveBeenCalledWith("drive", true);
		expect(screen.getByText("Folder")).toBeInTheDocument();
		expect(row("Drive")).toHaveFocus();
		await user.keyboard("{ArrowRight}");
		expect(row("Folder")).toHaveFocus();
		await user.keyboard("{ArrowRight}{ArrowRight}");
		expect(row("File")).toHaveFocus();
		// A leaf goes nowhere.
		await user.keyboard("{ArrowRight}");
		expect(row("File")).toHaveFocus();
	});

	it("moves to the parent with Left, then collapses the open branch", async () => {
		activePackage.id = "windows-trees";
		const user = userEvent.setup();
		const onToggleNode = vi.fn();
		render(
			<ClassicyTree
				nodes={[{ ...deep[0], defaultOpen: true }, ...deep.slice(1)]}
				onToggleNode={onToggleNode}
			/>,
		);
		row("Note").focus();
		await user.keyboard("{ArrowLeft}");
		expect(row("Drive")).toHaveFocus();
		expect(onToggleNode).not.toHaveBeenCalled();
		await user.keyboard("{ArrowLeft}");
		expect(onToggleNode).toHaveBeenCalledWith("drive", false);
		expect(screen.queryByText("Note")).not.toBeInTheDocument();
		// Closed at the root, a Left goes nowhere.
		await user.keyboard("{ArrowLeft}");
		expect(row("Drive")).toHaveFocus();
		expect(onToggleNode).toHaveBeenCalledTimes(1);
	});

	it("keeps a dimmed branch closed, the chords to the scroll, and Alt as before", async () => {
		activePackage.id = "windows-trees";
		const user = userEvent.setup();
		const onToggleNode = vi.fn();
		render(<ClassicyTree nodes={deep} onToggleNode={onToggleNode} />);
		row("Dimmed").focus();
		await user.keyboard("{ArrowRight}");
		expect(screen.queryByText("Inside")).not.toBeInTheDocument();
		expect(onToggleNode).not.toHaveBeenCalled();
		// ⌘→ and ⌘← give way to the bare arrows: they scroll sideways
		// (TREEVIEW_ScrollKeyDown), opening and closing nothing.
		row("Drive").focus();
		await user.keyboard("{Meta>}{ArrowRight}{/Meta}");
		expect(screen.queryByText("Folder")).not.toBeInTheDocument();
		await user.keyboard("{ArrowRight}");
		expect(screen.getByText("Folder")).toBeInTheDocument();
		await user.keyboard("{Control>}{ArrowLeft}{/Control}");
		expect(screen.getByText("Folder")).toBeInTheDocument();
		expect(row("Drive")).toHaveFocus();
		await user.keyboard("{ArrowLeft}");
		expect(screen.queryByText("Folder")).not.toBeInTheDocument();
		// The tree takes a bare arrow's default (no sideways scroll); Alt and
		// an arrow stay the browser's.
		expect(keydown(row("Loose"), { key: "ArrowRight" }).defaultPrevented).toBe(
			true,
		);
		expect(
			keydown(row("Loose"), { key: "ArrowLeft", altKey: true })
				.defaultPrevented,
		).toBe(false);
	});
});

// WIG Ch.6 "Activating and Deactivating Windows" (p.81); Ch.13 "Highlighting"
// (p.318): the tree says whether its window is the active one (the audit's
// 6.4 / 13.8), as ClassicyScrollArea does.
describe("ClassicyTree — inactive", () => {
	const tree = () => document.querySelector(".classicyTree") as HTMLElement;

	it("carries inactive in a window that is not the active one", () => {
		render(
			<ClassicyWindowActiveContext.Provider value={false}>
				<ClassicyTree nodes={nodes} />
			</ClassicyWindowActiveContext.Provider>,
		);
		expect(tree()).toHaveClass("inactive");
	});

	it("does not in the active window, or outside any window", () => {
		const { unmount } = render(
			<ClassicyWindowActiveContext.Provider value={true}>
				<ClassicyTree nodes={nodes} />
			</ClassicyWindowActiveContext.Provider>,
		);
		expect(tree()).not.toHaveClass("inactive");
		unmount();
		render(<ClassicyTree nodes={nodes} />);
		expect(tree().className).toBe("classicyTree");
	});
});

// Under the Windows 98 layout a selectable row is chosen at its button-1
// press (`selection.selectOn` "press", the audit's 5.5 / A.2; WIG Ch.5
// "Selection with the Mouse", pp.37-38; comctl32's tree view selects on
// WM_LBUTTONDOWN), the click that ends it choosing nothing more; Platinum's
// default layout chooses at the click (the tests above).
describe("ClassicyTree — chosen at the press (layout.selection.selectOn)", () => {
	const holder = (label: string) =>
		screen
			.getByText(label)
			.closest(".classicyTreeNodeLabelHolder") as HTMLElement;
	const tree: ClassicyTreeNode[] = [
		{
			id: "pick",
			label: "Pick",
			branchSelectable: true,
			children: [{ id: "inner", label: "Inner" }],
		},
		{
			id: "plain",
			label: "Plain",
			children: [{ id: "under", label: "Under" }],
		},
		{ id: "leaf", label: "Leaf" },
		{ id: "fixed", label: "Fixed", selectable: false },
	];
	const renderTree = () => {
		const onSelectNode = vi.fn();
		const onActivateNode = vi.fn();
		const onToggleNode = vi.fn();
		render(
			<ClassicyTree
				nodes={tree}
				selectionMode="single"
				selectedIds={[]}
				onSelectNode={onSelectNode}
				onActivateNode={onActivateNode}
				onToggleNode={onToggleNode}
			/>,
		);
		return { onSelectNode, onActivateNode, onToggleNode };
	};

	it("chooses a leaf at the press, its click choosing nothing more", () => {
		activePackage.id = "windows-trees";
		const { onSelectNode } = renderTree();
		fireEvent.mouseDown(holder("Leaf"), { button: 0, detail: 1 });
		expect(onSelectNode).toHaveBeenCalledTimes(1);
		expect(onSelectNode.mock.calls[0][0]).toBe("leaf");
		expect(onSelectNode.mock.calls[0][2].type).toBe("mousedown");
		fireEvent.click(holder("Leaf"), { detail: 1 });
		expect(onSelectNode).toHaveBeenCalledTimes(1);
	});

	it("chooses a selectable branch at the press, neither its click nor its press toggling it", () => {
		activePackage.id = "windows-trees";
		const { onSelectNode, onToggleNode } = renderTree();
		fireEvent.mouseDown(holder("Pick"), { button: 0, detail: 1 });
		fireEvent.click(holder("Pick"), { detail: 1 });
		expect(onSelectNode).toHaveBeenCalledTimes(1);
		expect(onSelectNode.mock.calls[0][0]).toBe("pick");
		expect(onToggleNode).not.toHaveBeenCalled();
		// Its double-click still expands it.
		fireEvent.doubleClick(holder("Pick"));
		expect(onToggleNode).toHaveBeenCalledWith("pick", true);
	});

	it("leaves a plain branch to its click, which toggles it, and an unselectable leaf alone", () => {
		activePackage.id = "windows-trees";
		const { onSelectNode, onToggleNode } = renderTree();
		fireEvent.mouseDown(holder("Plain"), { button: 0, detail: 1 });
		expect(onToggleNode).not.toHaveBeenCalled();
		fireEvent.click(holder("Plain"), { detail: 1 });
		expect(onToggleNode).toHaveBeenCalledWith("plain", true);
		fireEvent.mouseDown(holder("Fixed"), { button: 0, detail: 1 });
		fireEvent.click(holder("Fixed"), { detail: 1 });
		expect(onSelectNode).not.toHaveBeenCalled();
	});

	it("chooses nothing at a button-2 press, or at a double-click's second press", () => {
		activePackage.id = "windows-trees";
		const { onSelectNode, onActivateNode } = renderTree();
		fireEvent.mouseDown(holder("Leaf"), { button: 2, detail: 1 });
		expect(onSelectNode).not.toHaveBeenCalled();
		fireEvent.mouseDown(holder("Leaf"), { button: 0, detail: 1 });
		fireEvent.click(holder("Leaf"), { detail: 1 });
		fireEvent.mouseDown(holder("Leaf"), { button: 0, detail: 2 });
		fireEvent.click(holder("Leaf"), { detail: 2 });
		fireEvent.doubleClick(holder("Leaf"));
		expect(onSelectNode).toHaveBeenCalledTimes(1);
		expect(onActivateNode).toHaveBeenCalledWith("leaf", tree[2]);
	});

	it("chooses at the click alone without the key", () => {
		const { onSelectNode } = renderTree();
		fireEvent.mouseDown(holder("Leaf"), { button: 0, detail: 1 });
		fireEvent.mouseDown(holder("Pick"), { button: 0, detail: 1 });
		expect(onSelectNode).not.toHaveBeenCalled();
		fireEvent.click(holder("Leaf"), { detail: 1 });
		fireEvent.click(holder("Pick"), { detail: 1 });
		expect(onSelectNode.mock.calls.map((c) => c[0])).toEqual(["leaf", "pick"]);
		expect(onSelectNode.mock.calls[0][2].type).toBe("click");
	});
});

// Under the Windows 98 layout Page Up and Page Down move the keyboard row a
// screen (`selection.pageKeys` "move", the audit's 5.2 / B.3; WIG Ch.5
// Table 5.1, pp.35-36), and Control (or ⌘) with a navigation key scrolls
// the tree without moving the keyboard row or the selection (`tree.keys`
// "windows", B.3; App. B Table B.1, p.357; comctl32's
// TREEVIEW_ScrollKeyDown). Platinum's default layout leaves the page keys
// to the browser and takes the chords as moves.
describe("ClassicyTree — the page keys and the scroll chords", () => {
	const twelve: ClassicyTreeNode[] = Array.from({ length: 12 }, (_, i) => ({
		id: `n${i}`,
		label: `${String.fromCharCode(65 + i)} node`,
	}));
	const holders = () =>
		Array.from(
			document.querySelectorAll<HTMLElement>(".classicyTreeNodeLabelHolder"),
		);
	const rect = (top: number, height: number, left = 0) =>
		({
			top,
			bottom: top + height,
			left,
			right: left + 200,
			width: 200,
			height,
			x: left,
			y: top,
			toJSON: () => ({}),
		}) as DOMRect;
	// The tree in a scroll area: its rows 20 px tall from y 100, scrolled
	// `by` rows, in an 80-px viewport 300 px of content tall.
	const renderInArea = (props: Partial<Parameters<typeof ClassicyTree>[0]>) => {
		const onSelectNode = vi.fn();
		const onToggleNode = vi.fn();
		const view = render(
			<ClassicyScrollArea>
				<ClassicyTree
					nodes={twelve}
					selectionMode="single"
					selectedIds={["n1"]}
					onSelectNode={onSelectNode}
					onToggleNode={onToggleNode}
					{...props}
				/>
			</ClassicyScrollArea>,
		);
		const viewport = view.container.querySelector(
			".classicyScrollAreaViewport",
		) as HTMLElement;
		viewport.getBoundingClientRect = () => rect(100, 80);
		for (const [name, value] of [
			["clientHeight", 80],
			["clientWidth", 200],
			["scrollHeight", 300],
		] as const)
			Object.defineProperty(viewport, name, { value, configurable: true });
		const place = (by: number) =>
			holders().forEach((h, i) => {
				h.getBoundingClientRect = () => rect(100 + (i - by) * 20, 20);
				const line = h.closest(".classicyTreeNodeRow") as HTMLElement;
				line.getBoundingClientRect = () => rect(100 + (i - by) * 20, 20);
			});
		place(0);
		return { ...view, viewport, place, onSelectNode, onToggleNode };
	};
	const focusRow = (i: number) => act(() => holders()[i].focus());
	const press = (key: string, init: KeyboardEventInit = {}) =>
		!fireEvent.keyDown(document.activeElement as HTMLElement, {
			key,
			...init,
		});

	it("moves the keyboard row to the page's edge, then a page further, under pageKeys", () => {
		activePackage.id = "windows-trees";
		const { place, onSelectNode } = renderInArea({});
		focusRow(1);
		expect(press("PageDown")).toBe(true);
		expect(holders()[3]).toHaveFocus();
		press("PageDown");
		expect(holders()[6]).toHaveFocus();
		place(3);
		press("PageUp");
		expect(holders()[3]).toHaveFocus();
		press("PageUp");
		expect(holders()[0]).toHaveFocus();
		// The keyboard row moves alone, as the tree's arrows do.
		expect(onSelectNode).not.toHaveBeenCalled();
	});

	it("leaves the page keys to the browser under the Mac layout", () => {
		renderInArea({});
		focusRow(1);
		expect(press("PageDown")).toBe(false);
		expect(press("PageUp")).toBe(false);
		expect(holders()[1]).toHaveFocus();
	});

	it("scrolls on Control or ⌘ with a navigation key, keeping the keyboard row and the selection", () => {
		activePackage.id = "windows-trees";
		const { viewport, onSelectNode, onToggleNode } = renderInArea({
			nodes: [
				{
					id: "folder",
					label: "Folder",
					children: [{ id: "inner", label: "Inner" }],
				},
				...twelve,
			],
		});
		focusRow(1);
		expect(press("ArrowDown", { ctrlKey: true })).toBe(true);
		expect(viewport.scrollTop).toBe(20);
		press("ArrowDown", { metaKey: true });
		expect(viewport.scrollTop).toBe(40);
		press("ArrowUp", { ctrlKey: true });
		expect(viewport.scrollTop).toBe(20);
		// A page: the viewport's four whole rows.
		press("PageDown", { ctrlKey: true });
		expect(viewport.scrollTop).toBe(100);
		press("Home", { ctrlKey: true });
		expect(viewport.scrollTop).toBe(0);
		press("End", { ctrlKey: true });
		expect(viewport.scrollTop).toBe(220);
		press("PageUp", { ctrlKey: true });
		expect(viewport.scrollTop).toBe(140);
		expect(holders()[1]).toHaveFocus();
		// Left and Right a row's height sideways, opening nothing.
		focusRow(0);
		press("ArrowRight", { ctrlKey: true });
		expect(viewport.scrollLeft).toBe(20);
		press("ArrowLeft", { metaKey: true });
		expect(viewport.scrollLeft).toBe(0);
		expect(screen.queryByText("Inner")).not.toBeInTheDocument();
		expect(onToggleNode).not.toHaveBeenCalled();
		expect(onSelectNode).not.toHaveBeenCalled();
		expect(holders()[0]).toHaveFocus();
	});

	it("scrolls an ancestor that is no scroll area's", () => {
		activePackage.id = "windows-trees";
		render(
			<div data-testid="scroller" style={{ overflowY: "auto" }}>
				<ClassicyTree nodes={twelve} />
			</div>,
		);
		const scroller = screen.getByTestId("scroller");
		const line = document.querySelector(".classicyTreeNodeRow") as HTMLElement;
		line.getBoundingClientRect = () => rect(0, 18);
		focusRow(2);
		press("ArrowDown", { ctrlKey: true });
		expect(scroller.scrollTop).toBe(18);
		expect(holders()[2]).toHaveFocus();
	});

	it("moves the keyboard row on Control and an arrow under the Mac layout", () => {
		const { viewport } = renderInArea({});
		focusRow(1);
		press("ArrowDown", { ctrlKey: true });
		expect(holders()[2]).toHaveFocus();
		expect(viewport.scrollTop).toBe(0);
		press("Home", { ctrlKey: true });
		expect(holders()[0]).toHaveFocus();
	});
});
