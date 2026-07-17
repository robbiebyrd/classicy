import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import {
	ClassicyTree,
	type ClassicyTreeNode,
} from "@/SystemFolder/SystemResources/Tree/ClassicyTree";

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
		expect(row?.querySelector(".classicyTreeNodeDisabled")).not.toBeNull();
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
		).toContain("classicyTreeNodeSelected");
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
