// System 7's windows under each of its two themes (plan 0018-dbd §3.2). Each
// story places its window where the matching System 7.5 reference capture
// has it (docs/system7-reference-screenshots.md; the captures are 640x480
// framebuffers at 1x), so a story's shot and its reference compare region
// for region. The pressed close and zoom boxes are `:active` states, which
// no story can hold: press one with the pointer to see it.
import {
	ClassicyButton,
	ClassicyWindow,
	ClassicyWindowFrame,
	useAppManagerDispatch,
} from "@classicy/classicy";
import { StoryApp } from "@sb/helpers";
import { system7Parameters } from "@sb/system7";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, type ReactNode, useEffect } from "react";

const meta = {
	title: "Appearance/System 7 Windows",
	parameters: system7Parameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Activates one of the package's themes once the desktop has mounted. */
function WithTheme({ id, children }: { id: string; children: ReactNode }) {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: id });
	}, [dispatch, id]);
	return children;
}

/** The color theme's story of a scene (the black-and-white one is the defaults'). */
const inColor = (scene: () => ReactNode): Story => ({
	render: () => <WithTheme id="system7-color">{scene()}</WithTheme>,
});

/** A window of the Storybook app. */
const Window = (
	props: Omit<ComponentProps<typeof ClassicyWindow>, "appId">,
) => <ClassicyWindow appId="storybook.app" {...props} />;

// A document window keeps its bars while this fits, with nothing to scroll
// (HIG p.160; the package's layout says `scrollBar.fitsBars: "shown"`).
const fits = (
	<div style={{ padding: "1em" }}>
		<p>Everything fits.</p>
	</div>
);

const tall = (
	<div style={{ width: 640, height: 640, padding: "1em" }}>
		<p>Larger than the window both ways: both scroll bars and the size box.</p>
	</div>
);

/**
 * An active document window: the frame and drop shadow, the racing stripes
 * broken around the close box, the zoom box and the title, and the size box.
 * Where `*-finder-window-fits-active.png` has the Macintosh HD window.
 */
const documentWindow = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Window
			id="hd"
			title="Macintosh HD"
			initialSize={[379, 215]}
			initialPosition={[47, 81]}
		>
			{fits}
		</Window>
	</StoryApp>
);

export const Document: Story = { render: documentWindow };
export const DocumentColor = inColor(documentWindow);

/**
 * An inactive window behind the active one: no stripes, boxes or size-box
 * glyph; in color a gray frame and title. Where
 * `*-two-inactive-windows-desktop-active.png` has the System Folder window.
 */
const inactive = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Window
			id="system-folder"
			title="System Folder"
			initialSize={[357, 262]}
			initialPosition={[7, 27]}
		>
			{fits}
		</Window>
		<Window
			id="untitled"
			title="Untitled"
			initialSize={[220, 120]}
			initialPosition={[400, 320]}
		>
			{fits}
		</Window>
	</StoryApp>
);

export const Inactive: Story = { render: inactive };
export const InactiveColor = inColor(inactive);

/**
 * A document window whose contents overflow both ways: both scroll bars and
 * the size box in their corner. The bars' own look is plan 0018-dbd §3.6's.
 */
const scrollBars = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Window
			id="hd"
			title="Macintosh HD"
			initialSize={[379, 215]}
			initialPosition={[47, 81]}
		>
			{tall}
		</Window>
	</StoryApp>
);

export const ScrollBars: Story = { render: scrollBars };
export const ScrollBarsColor = inColor(scrollBars);

/**
 * A Finder-style window with a header strip over contents that overflow both
 * ways: the white strip and its double rule, as the Finder draws them in
 * `*-finder-window-fits-active.png`, with the contents, bars and size box
 * inside the frame, under the header.
 */
const header = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Window
			id="hd"
			title="Macintosh HD"
			initialSize={[379, 215]}
			initialPosition={[47, 81]}
			header={
				<div style={{ display: "flex", gap: "2em", padding: "0 1em" }}>
					<span>3 items</span>
					<span>17.4 MB in disk</span>
				</div>
			}
		>
			{tall}
		</Window>
	</StoryApp>
);

export const Header: Story = { render: header };
export const HeaderColor = inColor(header);

/**
 * A utility (floating) window over the active document window: the dotted
 * drag bar and the small close box, drawn active whichever window has the
 * focus. Where `*-floating-appleguide.png` has Apple Guide's window.
 */
const utility = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Window
			id="guide"
			title="Macintosh Guide"
			windowType="utility"
			zoomable={false}
			resizable={false}
			initialSize={[453, 297]}
			initialPosition={[92, 93]}
		>
			{fits}
		</Window>
		<Window
			id="document"
			title="Untitled"
			initialSize={[300, 160]}
			initialPosition={[20, 40]}
		>
			{fits}
		</Window>
	</StoryApp>
);

export const Utility: Story = { render: utility };
export const UtilityColor = inColor(utility);

/**
 * The standalone frame (`ClassicyWindowFrame`, as a `preBootScreen` uses
 * it): a document window's chrome, always active, with no boxes.
 */
const frame = () => (
	<div style={{ position: "absolute", left: 47, top: 81 }}>
		<ClassicyWindowFrame title="Welcome" width={379}>
			<div style={{ padding: 13, display: "grid", gap: 13 }}>
				<p style={{ margin: 0 }}>Press the button below to power on.</p>
				<ClassicyButton
					isDefault
					onClickFunc={() => {}}
					style={{ justifySelf: "end" }}
				>
					Power On
				</ClassicyButton>
			</div>
		</ClassicyWindowFrame>
	</div>
);

export const Frame: Story = { render: frame };
export const FrameColor = inColor(frame);
