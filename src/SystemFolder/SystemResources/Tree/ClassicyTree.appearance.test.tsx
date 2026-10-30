import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import {
	ClassicyTree,
	type ClassicyTreeNode,
} from "@/SystemFolder/SystemResources/Tree/ClassicyTree";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events Tree emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "Tree");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const NODES: ClassicyTreeNode[] = [
	{
		id: "branch",
		label: "Branch",
		children: [{ id: "child", label: "Child" }],
	},
	{ id: "leaf", label: "Leaf" },
];

const root = (container: HTMLElement) =>
	container.querySelector(".classicyTree") as HTMLElement;

/** The focusable row holding a node's label. */
const row = (label: string) =>
	screen.getByText(label).closest('[role="button"]') as HTMLElement;

describe("ClassicyTree appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(<ClassicyTree nodes={NODES} />);
		const el = root(container);
		expect(el).toHaveClass("classicyTree", "probe-Tree");
		// The list had no state class; row states stay on the rows.
		expect(el.getAttribute("data-probe-state")).toBe("");
	});

	it("emits its events", () => {
		render(<ClassicyTree nodes={NODES} />);
		const branch = row("Branch");
		fireEvent.mouseDown(branch);
		fireEvent.click(branch);
		expect(emitted()).toEqual([
			{
				event: "expand",
				detail: { nodeId: "branch", open: true, input: "pointer" },
			},
		]);
		fireEvent.mouseDown(branch);
		fireEvent.click(branch);
		expect(emitted().slice(1)).toEqual([
			{
				event: "collapse",
				detail: { nodeId: "branch", open: false, input: "pointer" },
			},
		]);
	});

	it("emits select for a clicked leaf", () => {
		render(<ClassicyTree nodes={NODES} selectionMode="single" />);
		fireEvent.mouseDown(row("Leaf"));
		fireEvent.click(row("Leaf"));
		expect(emitted()).toEqual([
			{ event: "select", detail: { nodeId: "leaf", input: "pointer" } },
		]);
	});

	it("emits expand, collapse and select for the keyboard", () => {
		const { container } = render(
			<ClassicyTree nodes={NODES} selectionMode="single" />,
		);
		const list = root(container);
		const branch = row("Branch");
		fireEvent.focus(branch);
		fireEvent.keyDown(list, { key: "ArrowRight", ctrlKey: true });
		fireEvent.keyDown(list, { key: "ArrowLeft", metaKey: true });
		fireEvent.keyDown(list, { key: "Enter" });
		fireEvent.keyDown(list, { key: " " });
		fireEvent.focus(row("Leaf"));
		fireEvent.keyDown(list, { key: "Enter" });
		const open = { nodeId: "branch", open: true };
		const closed = { nodeId: "branch", open: false };
		expect(emitted()).toEqual([
			{ event: "expand", detail: { ...open, input: "keyboard" } },
			{ event: "collapse", detail: { ...closed, input: "keyboard" } },
			{ event: "expand", detail: { ...open, input: "keyboard" } },
			{ event: "collapse", detail: { ...closed, input: "keyboard" } },
			{ event: "select", detail: { nodeId: "leaf", input: "keyboard" } },
		]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(<ClassicyTree nodes={NODES} />);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe("classicyTree");
	});
});
