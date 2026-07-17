import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyWindow } from "./ClassicyWindow";

const meta = {
	title: "Desktop/Window",
	component: ClassicyWindow,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="default"
				appId="storybook.app"
				title="Untitled Document"
				initialSize={[440, 300]}
				initialPosition={[80, 60]}
			>
				<p style={{ padding: "1em" }}>
					A resizable, movable, collapsable Platinum window.
				</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

export const Modal: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="modal"
				appId="storybook.app"
				title="Alert"
				modal={true}
				closable={true}
				resizable={false}
				initialSize={[320, 140]}
				initialPosition={["center", "center"]}
			>
				<p style={{ padding: "1em" }}>This is a modal dialog window.</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

export const FixedSize: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="fixed"
				appId="storybook.app"
				title="Fixed Palette"
				resizable={false}
				zoomable={false}
				initialSize={[260, 180]}
				initialPosition={[120, 90]}
			>
				<p style={{ padding: "1em" }}>Not resizable, not zoomable.</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

/**
 * #205 — a utility / tool-palette window. `windowType="utility"` swaps the
 * pinstriped document title bar for a crosshatch tool-palette drag region.
 * The narrow frame on every side is now a drag handle too.
 */
export const Utility: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="utility"
				appId="storybook.app"
				title="Tools"
				windowType="utility"
				zoomable={false}
				initialSize={[180, 220]}
				initialPosition={[140, 90]}
			>
				<p style={{ padding: "1em" }}>Drag me by any edge of the frame.</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

/**
 * #183 — list-view header. `headerVariant="list"` removes the beveled bottom
 * separator so the header reads as a column-heading strip.
 */
export const ListHeader: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="list-header"
				appId="storybook.app"
				title="Documents"
				headerVariant="list"
				initialSize={[420, 260]}
				initialPosition={[90, 70]}
				header={
					<div style={{ display: "flex", gap: "2em", padding: "0 1em" }}>
						<span>Name</span>
						<span>Date Modified</span>
						<span>Size</span>
					</div>
				}
			>
				<p style={{ padding: "1em" }}>
					List-view column header (no bottom line).
				</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

/**
 * #203 / #202 — a modeless dialog. `contentFrame` draws a 2px active/inactive
 * frame around the window body. Modeless dialogs coexist with other windows,
 * so this is a plain (non-modal) window with the framed body.
 */
export const ModelessDialog: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="modeless"
				appId="storybook.app"
				title="Find"
				contentFrame={true}
				resizable={false}
				scrollable={false}
				initialSize={[320, 160]}
				initialPosition={[120, 90]}
			>
				<p style={{ padding: "1em" }}>
					A modeless dialog with a 2px content-region frame.
				</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

/**
 * #194 — a movable modal dialog. `modal` + not `type="error"` stays draggable
 * and (per HIG) shows no zoom box. It traps Tab focus, renders an input-blocking
 * scrim (clicking outside beeps), and dismisses on Escape / Command-period.
 */
export const MovableModal: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="movable-modal"
				appId="storybook.app"
				title="Save Changes"
				modal={true}
				closable={true}
				resizable={false}
				initialSize={[340, 150]}
				initialPosition={["center", "center"]}
			>
				<p style={{ padding: "1em" }}>
					Movable modal: drag the title bar, Escape to dismiss, outside-click
					beeps.
				</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

/**
 * #197 — a fixed (non-movable) modal alert. `modal` + `type="error"` cannot be
 * dragged and shows the red error frame; the scrim blocks and beeps on outside
 * clicks.
 */
export const FixedModal: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="fixed-modal"
				appId="storybook.app"
				title="Error"
				modal={true}
				type="error"
				closable={true}
				resizable={false}
				initialSize={[320, 140]}
				initialPosition={["center", "center"]}
			>
				<p style={{ padding: "1em" }}>A fixed, non-movable modal alert.</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

/**
 * #208 — zoom modes. `zoomMode` controls whether the zoom box grows both axes
 * (`full`), only the width (`horizontal`), or only the height (`vertical`). The
 * user's pre-zoom rect is remembered and restored on un-zoom.
 */
export const HorizontalZoom: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="hzoom"
				appId="storybook.app"
				title="Wide Zoom"
				zoomMode="horizontal"
				initialSize={[320, 220]}
				initialPosition={[100, 90]}
			>
				<p style={{ padding: "1em" }}>
					Click the zoom box: this window grows horizontally only.
				</p>
			</ClassicyWindow>
		</StoryApp>
	),
};
