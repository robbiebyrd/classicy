import {
	desktopParameters,
	dragClassicySelectionRectangle,
	dragClassicySelectionRectanglePastEdge,
	StoryApp,
} from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type {
	FinderIconViewOptions,
	FinderListViewOptions,
} from "@/SystemFolder/Finder/FinderContext";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyFileBrowser } from "./ClassicyFileBrowser";
import { useClassicyFileSystem } from "./ClassicyFileSystemContext";

const meta = {
	title: "Desktop/FileBrowser",
	component: ClassicyFileBrowser,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyFileBrowser>;

export default meta;
// Every story here draws the component itself in `render` and ignores the
// args, so the stories are typed against the component (every arg optional),
// not `typeof meta`, which would demand its required props as story args.
type Story = StoryObj<typeof ClassicyFileBrowser>;

const BrowserWindow = ({
	display,
	variant = display,
	listViewOptions,
	iconViewOptions,
}: {
	display: "icons" | "list";
	variant?: string;
	listViewOptions?: FinderListViewOptions;
	iconViewOptions?: FinderIconViewOptions;
}) => {
	const fs = useClassicyFileSystem(`storybookFS-${display}`);
	return (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id={`browser-${variant}`}
				appId="storybook.app"
				title="Macintosh HD"
				initialSize={[480, 320]}
				initialPosition={[80, 60]}
				scrollable={true}
			>
				<ClassicyFileBrowser
					fs={fs}
					path="Macintosh HD"
					appId="storybook.app"
					display={display}
					listViewOptions={listViewOptions}
					iconViewOptions={iconViewOptions}
					dirOnClickFunc={fn()}
					fileOnClickFunc={fn()}
				/>
			</ClassicyWindow>
		</StoryApp>
	);
};

/**
 * The icon view (the default `display`): draggable icons laid out on the
 * theme's grid. Double-clicking an icon calls `dirOnClickFunc` /
 * `fileOnClickFunc` with its path — the browser itself never navigates.
 */
export const IconView: Story = {
	render: () => <BrowserWindow display="icons" />,
};

/**
 * The list view: sortable Name / Size / Kind columns, disclosure triangles
 * that expand folders in place, Shift / Command-click multi-selection and
 * keyboard navigation (arrows, Home / End, Return to open, type-to-select).
 */
export const ListView: Story = {
	render: () => <BrowserWindow display="list" />,
};

/**
 * `listViewOptions` (Finder's View Options): extra Date Modified, Date
 * Created and Label columns, absolute dates and small icons.
 */
export const ListViewWithOptions: Story = {
	render: () => (
		<BrowserWindow
			display="list"
			variant="list-options"
			listViewOptions={{
				useRelativeDate: false,
				calculateFolderSizes: false,
				iconSize: "small",
				columns: {
					modified: true,
					created: true,
					size: true,
					kind: true,
					label: true,
					comments: false,
					version: false,
				},
			}}
		/>
	),
};

/**
 * `iconViewOptions` with `arrangement: "sorted"` ("Keep arranged by"): icons
 * are ordered by `keepArrangedBy` and locked in place, so they cannot be
 * dragged. `"grid"` would snap drops to the grid instead.
 */
export const IconViewKeptArranged: Story = {
	render: () => (
		<BrowserWindow
			display="icons"
			variant="icons-sorted"
			iconViewOptions={{
				arrangement: "sorted",
				keepArrangedBy: "kind",
				iconSize: "medium",
			}}
		/>
	),
};

/**
 * The selection rectangle (story 0228-e9l): a drag from the empty space
 * above the first icon to the middle of the second, the button still held.
 * Platinum draws Mac OS 8.1's: a two-pixel frame of the 50% checker in XOR,
 * black over the white window, inverted over the icons it crosses; both
 * icons it touches are selected.
 */
export const IconViewSelectionRectangle: Story = {
	render: () => <BrowserWindow display="icons" variant="icons-marquee" />,
	play: dragClassicySelectionRectangle,
};

/**
 * The selection rectangle held past the window's bottom edge (story
 * 0228-e9l): the window's contents clip it, so its sides run to the edge and
 * no line is drawn along it, as the Mac OS 8.1 Finder clipped its frame.
 */
export const IconViewSelectionRectanglePastEdge: Story = {
	render: () => <BrowserWindow display="icons" variant="icons-marquee-edge" />,
	play: dragClassicySelectionRectanglePastEdge,
};
