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
