import {
	appearanceHooksParameters,
	ClassicyAppearanceProbe,
} from "@sb/ClassicyAppearanceProbe";
import { desktopParameters, mirroredParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef } from "react";
import { fn } from "storybook/test";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyPlacard } from "@/SystemFolder/SystemResources/Placard/ClassicyPlacard";
import { ClassicyWindow } from "./ClassicyWindow";

const meta = {
	title: "Desktop/Window",
	component: ClassicyWindow,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyWindow>;

export default meta;
// Every story here draws the component itself in `render` and ignores the
// args, so the stories are typed against the component (every arg optional),
// not `typeof meta`, which would demand its required props as story args.
type Story = StoryObj<typeof ClassicyWindow>;

/**
 * A standard document window: close box on the left, zoom and collapse boxes on
 * the right, a draggable frame and a grow box. Drag, resize, collapse and zoom
 * it to hear the window sounds; its geometry lives in the window manager store.
 */
export const Default: Story = {
	render: () => <DefaultWindowStory />,
};

/** The `Default` story's window, also rendered by `AppearanceHooks`. */
function DefaultWindowStory() {
	return (
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
	);
}

/**
 * The minimal modal dialog: `modal` portals the window above an input-blocking
 * scrim, traps Tab focus and drops the zoom box. Escape or Command-period
 * closes it because it is `closable`.
 */
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

/**
 * `resizable={false}` and `zoomable={false}` remove the grow box and zoom box,
 * for windows whose layout has one right size. A non-resizable window always
 * opens at `initialSize`, ignoring any persisted size.
 */
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
				initialSize={[120, 240]}
				initialPosition={[140, 90]}
			>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: 2,
						padding: 4,
					}}
				>
					{["▲", "●", "◆", "■", "✕", "＋", "▬", "A"].map((glyph) => (
						<div
							key={glyph}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								height: 44,
								fontSize: 22,
								border: "1px solid var(--color-system-05)",
								background: "var(--color-system-02)",
							}}
						>
							{glyph}
						</div>
					))}
				</div>
			</ClassicyWindow>
		</StoryApp>
	),
};

/**
 * A utility palette with `alwaysOnTop`. Unlike the plain Utility story, this
 * palette stays in the floating band (z-index 350) even when its owning app is
 * backgrounded, so it floats above other apps' windows — but still below error
 * modals.
 */
export const UtilityAlwaysOnTop: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="utility-always-on-top"
				appId="storybook.app"
				title="Tools"
				windowType="utility"
				alwaysOnTop
				zoomable={false}
				initialSize={[120, 240]}
				initialPosition={[140, 90]}
			>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: 2,
						padding: 4,
					}}
				>
					{["▲", "●", "◆", "■", "✕", "＋", "▬", "A"].map((glyph) => (
						<div
							key={glyph}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								height: 44,
								fontSize: 22,
								border: "1px solid var(--color-system-05)",
								background: "var(--color-system-02)",
							}}
						>
							{glyph}
						</div>
					))}
				</div>
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
 * user's pre-zoom rect is remembered and restored on un-zoom; click the zoom
 * box again to return to it.
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

/**
 * #196 — a window with a Platinum placard in the bottom-left status region, to
 * the left of the horizontal scroll bar. Here the placard is a magnification
 * pop-up (a `menuItems` placard) as commonly seen in Mac OS 8 document windows.
 */
export const WithPlacard: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="placard"
				appId="storybook.app"
				title="Untitled Document"
				initialSize={[440, 300]}
				initialPosition={[80, 60]}
				placard={
					<ClassicyPlacard
						menuItems={[
							{ id: "50", title: "50%" },
							{ id: "100", title: "100%" },
							{ id: "200", title: "200%" },
							{ id: "fit", title: "Fit in Window" },
						]}
						onSelect={(id) => console.log("magnification:", id)}
					>
						100%
					</ClassicyPlacard>
				}
			>
				<p style={{ padding: "1em" }}>
					A Platinum window with a magnification placard pinned to the
					bottom-left, left of the horizontal scroll bar.
				</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

/**
 * Content that fits: a scrollable window draws no scroll bars until something
 * overflows, and the grow box sits over the content's corner. Resize it
 * smaller than the text to watch both bars appear.
 */
export const ScrollFits: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="scrollfits"
				appId="storybook.app"
				title="Fits"
				initialSize={[320, 200]}
				initialPosition={[80, 60]}
			>
				<div style={{ padding: "1em" }}>
					Short content — no scroll bars until the window is made smaller than
					this text.
				</div>
			</ClassicyWindow>
		</StoryApp>
	),
};

/**
 * Vertical-only scroll in a resizable window: the vertical scroll bar runs the
 * full height and its bottom arrow sits next to the grow box. Used to verify the
 * Smart Scrolling end-arrow clears the resizer.
 */
export const ScrollVertical: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="scrollv"
				appId="storybook.app"
				title="Vertical Scroll"
				initialSize={[260, 220]}
				initialPosition={[80, 60]}
			>
				<div style={{ width: 180, height: 900, padding: "1em" }}>
					Tall content — vertical scroll bar only.
				</div>
			</ClassicyWindow>
		</StoryApp>
	),
};

/** Both-axes scroll in a resizable window (vertical + horizontal + corner). */
export const ScrollBoth: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="scrollb"
				appId="storybook.app"
				title="Both Scroll"
				initialSize={[320, 240]}
				initialPosition={[80, 60]}
			>
				<div style={{ width: 900, height: 900, padding: "1em" }}>
					Large content — both scroll bars and the grow-box corner.
				</div>
			</ClassicyWindow>
		</StoryApp>
	),
};

/**
 * #208 / HIGOS8 p.104 — a full zoom to the window's "standard state".
 * `idealSize` is a content-box size, like `initialSize`; the zoom box toggles
 * between it (clamped to the desktop) and the user's own size, rather than
 * maximizing to fill the screen.
 */
export const IdealSizeZoom: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="ideal-zoom"
				appId="storybook.app"
				title="Ideal Size"
				initialSize={[260, 160]}
				minimumSize={[200, 0]}
				idealSize={[520, 320]}
				initialPosition={[80, 60]}
			>
				<p style={{ padding: "1em" }}>
					Click the zoom box: the window zooms to its 520 × 320 ideal size, then
					back to this one.
				</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

/**
 * A window-level `contextMenu`. Right-clicking anywhere in the window focuses
 * it and opens this menu, with the HIG's Help item placed first. A
 * `ClassicyContextualMenuTarget` inside the window would win over it, and the
 * app's `contextMenu` is the fallback when a window has none.
 */
export const WithContextMenu: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="context-menu"
				appId="storybook.app"
				title="Right-Click Me"
				initialSize={[360, 200]}
				initialPosition={[80, 60]}
				contextMenu={[
					{ id: "get-info", title: "Get Info", onClickFunc: fn() },
					{ id: "spacer" },
					{ id: "close-window", title: "Close Window", onClickFunc: fn() },
				]}
			>
				<p style={{ padding: "1em" }}>
					Right-click inside this window for its contextual menu.
				</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

const CloseVetoWindow = () => {
	const allowCloseRef = useRef(false);
	return (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="close-veto"
				appId="storybook.app"
				title="Unsaved Changes"
				initialSize={[360, 160]}
				initialPosition={[80, 60]}
				onBeforeClose={() => allowCloseRef.current}
			>
				<div style={{ padding: "1em" }}>
					<ClassicyCheckbox
						id="allow-close"
						label="Allow this window to close"
						onClickFunc={(checked) => {
							allowCloseRef.current = checked;
						}}
					/>
				</div>
			</ClassicyWindow>
		</StoryApp>
	);
};

/**
 * #236 — `onBeforeClose` vetoes a close. The close box does nothing until the
 * checkbox is ticked, because the hook returns `false`; a vetoed close plays
 * no sound and dispatches nothing. Return a promise to ask the user first.
 */
export const CloseVeto: Story = {
	render: () => <CloseVetoWindow />,
};

/**
 * The Appearance Package hook surface, under the Storybook probe package:
 * every root `decorate()` reaches is outlined (green while pressed), and every
 * event the component emits is logged in the Actions panel.
 *
 * It renders a fixed tree and takes no args.
 */
export const AppearanceHooks: StoryObj<Record<string, never>> = {
	render: () => (
		<ClassicyAppearanceProbe>
			<DefaultWindowStory />
		</ClassicyAppearanceProbe>
	),
	parameters: appearanceHooksParameters("600px"),
};

/**
 * `Default` under the Storybook-only `mirrored` Appearance Package, which
 * rearranges the window by CSS `order` and its `layout` alone: the close box
 * at the right, zoom and collapse at the left, the title's stripes hidden and
 * the grow box (`window.growBoxCorner: "bottom-left"`) in the lower-left
 * corner, its edges drawn on its content side. Dragging the grip resizes from
 * that corner, keeping the top-right corner fixed. The grip art itself is
 * Platinum's, not mirrored.
 */
export const Mirrored: Story = {
	...Default,
	parameters: mirroredParameters,
};
