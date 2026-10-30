import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyTable } from "@/SystemFolder/SystemResources/Table/ClassicyTable";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events Table emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "Table");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

type Row = { id: string; name: string };
const COLUMNS = [
	{ id: "name", title: "Name", accessor: (r: Row) => r.name },
	{ id: "id", title: "Id", accessor: (r: Row) => r.id, sortable: false },
];
const ROWS: Row[] = [
	{ id: "1", name: "Beta" },
	{ id: "2", name: "Alpha" },
];

const root = (container: HTMLElement) =>
	container.querySelector(".classicyTableContainer") as HTMLElement;

const renderTable = (
	props: Partial<Parameters<typeof ClassicyTable<Row>>[0]> = {},
) =>
	render(
		<ClassicyTable
			columns={COLUMNS}
			rows={ROWS}
			getRowId={(r) => r.id}
			{...props}
		/>,
	);

describe("ClassicyTable appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = renderTable();
		const el = root(container);
		expect(el).toHaveClass("classicyTableContainer", "probe-Table");
		// The container had no state class; `selected` stays on rows/headers.
		expect(el.getAttribute("data-probe-state")).toBe("");
	});

	it("emits its events", () => {
		renderTable();
		const header = screen.getByRole("columnheader", { name: "Name" });
		fireEvent.click(header);
		// Headers are pointer-only (not focusable): no input.
		expect(emitted()).toEqual([
			{ event: "change", detail: { columnId: "name", desc: false } },
		]);
		fireEvent.click(header);
		expect(emitted().slice(1)).toEqual([
			{ event: "change", detail: { columnId: "name", desc: true } },
		]);
		// An unsortable column emits nothing.
		fireEvent.click(screen.getByRole("columnheader", { name: "Id" }));
		expect(emitted()).toHaveLength(2);
	});

	it("emits select for a clicked row", () => {
		renderTable();
		fireEvent.mouseDown(screen.getByText("Alpha"));
		fireEvent.click(screen.getByText("Alpha"));
		expect(emitted()).toEqual([
			{
				event: "select",
				detail: { rowId: "2", selected: true, input: "pointer" },
			},
		]);
	});

	it("emits select for keyboard selection", () => {
		const { container } = renderTable();
		fireEvent.keyDown(root(container), { key: "ArrowDown" });
		fireEvent.keyDown(root(container), { key: "ArrowDown" });
		expect(emitted()).toEqual([
			{
				event: "select",
				detail: { rowId: "1", selected: true, input: "keyboard" },
			},
			{
				event: "select",
				detail: { rowId: "2", selected: true, input: "keyboard" },
			},
		]);
	});

	it("reports a Ctrl-click deselect as selected: false", () => {
		renderTable({ selectionMode: "multi", selected: ["1", "2"] });
		const alpha = screen.getByText("Alpha");
		// The modifier goes down before the pointer: still a pointer click.
		fireEvent.keyDown(alpha, { key: "Control", ctrlKey: true });
		fireEvent.mouseDown(alpha, { ctrlKey: true });
		fireEvent.click(alpha, { ctrlKey: true });
		expect(emitted()).toEqual([
			{
				event: "select",
				detail: { rowId: "2", selected: false, input: "pointer" },
			},
		]);
	});

	it("emits no select when selection is off", () => {
		renderTable({ selectionMode: "none" });
		fireEvent.click(screen.getByText("Alpha"));
		expect(emitted()).toEqual([]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = renderTable();
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe("classicyTableContainer");
	});
});
