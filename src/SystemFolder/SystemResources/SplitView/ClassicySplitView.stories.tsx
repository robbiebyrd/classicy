import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ClassicySplitView } from "./ClassicySplitView";

const meta = {
	title: "Controls/SplitView",
	component: ClassicySplitView,
} satisfies Meta<typeof ClassicySplitView>;

export default meta;
type Story = StoryObj<typeof meta>;

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
 * percentages. Each divider only trades space between its two neighbours.
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
export const NestedSplits: Story = {
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
export const CommitOnRelease: Story = {
	render: () => <CommitDemo />,
};
