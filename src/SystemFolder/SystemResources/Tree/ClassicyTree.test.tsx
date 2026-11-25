// The Windows-layout package below needs a sound pack registered: Platinum's.
import "@classicy/appearance-platinum";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
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

	it("keeps a dimmed branch closed, and the chords and Alt as before", async () => {
		activePackage.id = "windows-trees";
		const user = userEvent.setup();
		const onToggleNode = vi.fn();
		render(<ClassicyTree nodes={deep} onToggleNode={onToggleNode} />);
		row("Dimmed").focus();
		await user.keyboard("{ArrowRight}");
		expect(screen.queryByText("Inside")).not.toBeInTheDocument();
		expect(onToggleNode).not.toHaveBeenCalled();
		// ⌘→ still opens, ⌘← still closes.
		row("Drive").focus();
		await user.keyboard("{Meta>}{ArrowRight}{/Meta}");
		expect(screen.getByText("Folder")).toBeInTheDocument();
		await user.keyboard("{Meta>}{ArrowLeft}{/Meta}");
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
