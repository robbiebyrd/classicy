import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyTable, type ClassicyTableColumn } from "./ClassicyTable";

type Process = {
	id: string;
	name: string;
	kind: string;
	memoryKb: number;
};

const processes: Process[] = [
	{ id: "finder", name: "Finder", kind: "Application", memoryKb: 1024 },
	{ id: "simpletext", name: "SimpleText", kind: "Application", memoryKb: 512 },
	{ id: "system", name: "Mac OS", kind: "System Software", memoryKb: 8192 },
	{ id: "moviep", name: "Movie Player", kind: "Application", memoryKb: 2048 },
	{ id: "hypercard", name: "HyperCard", kind: "Application", memoryKb: 1536 },
];

const columns: ClassicyTableColumn<Process>[] = [
	{ id: "name", title: "Name", accessor: (p) => p.name, width: 180 },
	{ id: "kind", title: "Kind", accessor: (p) => p.kind },
	{
		id: "memory",
		title: "Memory",
		accessor: (p) => p.memoryKb,
		render: (p) => <span>{p.memoryKb.toLocaleString()} K</span>,
		align: "right",
		width: 90,
	},
];

const meta = {
	title: "Controls/Table",
	component: ClassicyTable,
	decorators: [
		(Story) => <div style={{ width: 420, height: 200 }}>{<Story />}</div>,
	],
} satisfies Meta<typeof ClassicyTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sortable, resizable columns; click a header to sort, click again to flip.
export const AboutThisComputer: Story = {
	args: {
		columns: columns as ClassicyTableColumn<unknown>[],
		rows: processes,
		getRowId: (p) => (p as Process).id,
		defaultSort: { columnId: "name" },
	},
};

export const MultiSelect: Story = {
	args: {
		columns: columns as ClassicyTableColumn<unknown>[],
		rows: processes,
		getRowId: (p) => (p as Process).id,
		selectionMode: "multi",
	},
};
