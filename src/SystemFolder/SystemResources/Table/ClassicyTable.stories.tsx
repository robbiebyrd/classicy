import {
	appearanceHooksParameters,
	ClassicyAppearanceProbe,
} from "@sb/ClassicyAppearanceProbe";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { useState } from "react";
import { ClassicyTriangle } from "@/SystemFolder/SystemResources/Triangle/ClassicyTriangle";
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
// For the stories that draw the component themselves in `render` and ignore
// the args: typed against the component (every arg optional), not
// `typeof meta`, which would demand its required props as story args.
type RenderStory = StoryObj<typeof ClassicyTable>;

/**
 * Sortable, resizable columns, sorted by Name on mount: click a header to
 * sort by it, click again to flip the direction, drag a header's right edge
 * to resize. The Memory column uses a custom `render` and right alignment.
 * Focus the list and type a name's first letters to jump to it.
 */
export const AboutThisComputer: Story = {
	args: {
		columns: columns as ClassicyTableColumn<unknown>[],
		rows: processes,
		getRowId: (p) => (p as Process).id,
		defaultSort: { columnId: "name" },
	},
};

/**
 * `selectionMode="multi"` follows the Mac conventions: a plain click
 * replaces the selection, ⌘/Ctrl-click toggles a row, Shift-click and
 * Shift-arrows extend a range over the current sorted order, and ⌘A selects
 * every row.
 */
export const MultiSelect: Story = {
	args: {
		columns: columns as ClassicyTableColumn<unknown>[],
		rows: processes,
		getRowId: (p) => (p as Process).id,
		selectionMode: "multi",
	},
};

type Folder = { id: string; name: string; size: string; children?: Folder[] };

const folders: Folder[] = [
	{
		id: "system",
		name: "System Folder",
		size: "—",
		children: [
			{ id: "system/fonts", name: "Fonts", size: "2.1 MB" },
			{
				id: "system/extensions",
				name: "Extensions",
				size: "—",
				children: [
					{ id: "system/extensions/qt", name: "QuickTime", size: "1.4 MB" },
				],
			},
		],
	},
	{ id: "readme", name: "Read Me", size: "8 K" },
];

const FolderTable = () => {
	const [selected, setSelected] = useState<string[]>([]);
	const folderColumns: ClassicyTableColumn<Folder>[] = [
		{
			id: "name",
			title: "Name",
			accessor: (f) => f.name,
			width: 240,
			render: (f, expansion) => (
				<span
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 4,
						paddingLeft: `calc(var(--window-control-size) * ${expansion.depth})`,
					}}
				>
					{/* A fixed gutter keeps leaves aligned with branches at the same
					    depth; the wrapper stops the toggle click from also selecting. */}
					{/* biome-ignore lint/a11y/noStaticElementInteractions: swallows the click so toggling never doubles as a row selection */}
					{/* biome-ignore lint/a11y/useKeyWithClickEvents: the triangle owns keyboard toggling; this wrapper only stops mouse bubbling */}
					<span
						style={{ display: "inline-block", width: 12 }}
						onClick={(e) => e.stopPropagation()}
					>
						{expansion.canExpand && (
							<ClassicyTriangle
								direction="right"
								open={expansion.isExpanded}
								onToggle={expansion.toggle}
							/>
						)}
					</span>
					{f.name}
				</span>
			),
		},
		{ id: "size", title: "Size", accessor: (f) => f.size, align: "right" },
	];
	return (
		<ClassicyTable
			columns={folderColumns}
			rows={folders}
			getRowId={(f) => f.id}
			getSubRows={(f) => f.children}
			selected={selected}
			onSelectionChange={setSelected}
		/>
	);
};

/**
 * Tree rows, the way the Finder list view is built: `getSubRows` nests rows,
 * and the first column's `render` draws its own indent and disclosure
 * triangle from the `{ depth, canExpand, isExpanded, toggle }` cell context.
 * Focus a branch row and press ⌘→ / ⌘← to expand or collapse it. Selection
 * here is controlled (`selected` + `onSelectionChange`).
 */
export const TreeRows: RenderStory = {
	render: () => <FolderTable />,
};

/**
 * The Appearance Package hook surface, under the Storybook probe package:
 * every root `decorate()` reaches is outlined (green while pressed), and every
 * event the component emits is logged in the Actions panel.
 */
export const AppearanceHooks: Story = {
	args: AboutThisComputer.args,
	render: (args: ComponentProps<typeof ClassicyTable>) => (
		<ClassicyAppearanceProbe>
			<ClassicyTable {...args} />
		</ClassicyAppearanceProbe>
	),
	parameters: appearanceHooksParameters(),
};
