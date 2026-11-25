import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { ClassicyButton } from "../Button/ClassicyButton";
import {
	ClassicySplitView,
	type ClassicySplitViewCommands,
	type ClassicySplitViewPane,
} from "./ClassicySplitView";

const meta = {
	title: "Controls/SplitView",
	component: ClassicySplitView,
} satisfies Meta<typeof ClassicySplitView>;

export default meta;
type Story = StoryObj<typeof meta>;
// For the stories that draw the component themselves in `render` and ignore
// the args: typed against the component (every arg optional), not
// `typeof meta`, which would demand its required props as story args.
type RenderStory = StoryObj<typeof ClassicySplitView>;

const paneStyle = {
	padding: 8,
	fontFamily: "var(--body-font), sans-serif",
} as const;

/**
 * Two side-by-side panes split equally (no `defaultSizes`). Drag the divider,
 * or focus it with Tab and press ←/→ to nudge it 1% at a time; neither pane
 * shrinks below `minPaneSize` (48 px).
 */
export const TwoPanesHorizontal: Story = {
	args: {
		direction: "horizontal",
		children: [
			<div key="leading" style={paneStyle}>
				Leading pane. Drag the frame-edge divider to trade space with the other
				pane.
			</div>,
			<div key="trailing" style={paneStyle}>
				Trailing pane.
			</div>,
		],
	},
	decorators: [
		(Story) => (
			<div style={{ width: 480, height: 240 }}>
				<Story />
			</div>
		),
	],
};

/** `direction="vertical"` stacks the panes; ↑/↓ nudge the focused divider. */
export const TwoPanesVertical: Story = {
	args: {
		direction: "vertical",
		children: [
			<div key="top" style={paneStyle}>
				Top pane.
			</div>,
			<div key="bottom" style={paneStyle}>
				Bottom pane.
			</div>,
		],
	},
	decorators: [
		(Story) => (
			<div style={{ width: 480, height: 320 }}>
				<Story />
			</div>
		),
	],
};

/**
 * Three panes, the maximum per component, with `defaultSizes` as
 * percentages. Each divider only trades space between its two neighbors.
 */
export const ThreePanesWithDefaultSizes: Story = {
	args: {
		direction: "horizontal",
		defaultSizes: [25, 50, 25],
		children: [
			<div key="one" style={paneStyle}>
				25%
			</div>,
			<div key="two" style={paneStyle}>
				50%
			</div>,
			<div key="three" style={paneStyle}>
				25%
			</div>,
		],
	},
	decorators: [
		(Story) => (
			<div style={{ width: 640, height: 240 }}>
				<Story />
			</div>
		),
	],
};

/**
 * Combining directions is done by nesting a split view inside a pane, never
 * by a grid mode: here a sidebar beside a vertically split main area.
 */
export const NestedSplits: RenderStory = {
	render: () => (
		<div style={{ width: 640, height: 360 }}>
			<ClassicySplitView direction="horizontal" defaultSizes={[35, 65]}>
				<div style={paneStyle}>Sidebar</div>
				<ClassicySplitView direction="vertical" defaultSizes={[70, 30]}>
					<div style={paneStyle}>Main content</div>
					<div style={paneStyle}>Console</div>
				</ClassicySplitView>
			</ClassicySplitView>
		</div>
	),
};

const CommitDemo = () => {
	const [live, setLive] = useState<number[]>([40, 60]);
	const [committed, setCommitted] = useState<number[]>([40, 60]);
	const format = (sizes: number[]) =>
		sizes.map((s) => `${Math.round(s)}%`).join(" / ");
	return (
		<div style={{ width: 480, height: 240 }}>
			<ClassicySplitView
				defaultSizes={[40, 60]}
				onResize={setLive}
				onResizeCommit={setCommitted}
			>
				<div style={paneStyle}>Drag the divider, then release.</div>
				<div style={paneStyle}>
					<p>onResize (every step): {format(live)}</p>
					<p>onResizeCommit (once per gesture): {format(committed)}</p>
				</div>
			</ClassicySplitView>
		</div>
	);
};

/**
 * The persistence round trip: `onResize` fires on every drag step, while
 * `onResizeCommit` fires once per gesture (mouse release or arrow-key
 * release) with the final sizes — save those to app state and pass them back
 * as `defaultSizes` on the next mount to restore the user's split.
 */
export const CommitOnRelease: RenderStory = {
	render: () => <CommitDemo />,
};

// A long document, so each pane scrolls on its own.
const chapter = (title: string) => (
	<div style={paneStyle}>
		{Array.from({ length: 24 }, (_, i) => (
			// biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of filler lines
			<p key={i}>
				{title}, line {i + 1}.
			</p>
		))}
	</div>
);

const SplittableDemo = () => {
	const commandsRef = useRef<ClassicySplitViewCommands>(null);
	const [closed, setClosed] = useState<ClassicySplitViewPane | null>("leading");
	return (
		<div style={{ display: "grid", gap: 8, width: 480 }}>
			<div style={{ display: "flex", gap: 8 }}>
				{/* A window's View menu holds these commands. */}
				<ClassicyButton onClickFunc={() => commandsRef.current?.split()}>
					Split
				</ClassicyButton>
				<ClassicyButton
					disabled={closed !== null}
					onClickFunc={() => commandsRef.current?.removeSplit()}
				>
					Remove Split
				</ClassicyButton>
			</div>
			<div style={{ height: 320 }}>
				<ClassicySplitView
					direction="vertical"
					splittable
					defaultClosed="leading"
					onSplitChange={setClosed}
					commandsRef={commandsRef}
				>
					{chapter("Top pane")}
					{chapter("Bottom pane")}
				</ClassicySplitView>
			</div>
		</div>
	);
};

/**
 * A view the user splits (WIG Ch.6 "Splitting Windows", pp.92-95; HIG7
 * pp.170-172): it opens unsplit, the split box at the top of the scroll
 * bar. Drag the box down to split the view; drag the divider back to the
 * top or bottom (or double-click it) to close the split, which leaves a
 * split box where the closed pane was; double-click a split box to reopen
 * where the split last was. Split (a window's command, here a button)
 * splits in the middle and moves the split from the keyboard: the arrow
 * keys move it, Enter sets it, Escape puts it back.
 */
export const Splittable: RenderStory = {
	render: () => <SplittableDemo />,
};
