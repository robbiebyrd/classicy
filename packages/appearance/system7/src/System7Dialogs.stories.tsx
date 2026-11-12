// System 7's dialogs, alerts and push buttons under each of its two themes
// (plan 0018-dbd §3.4): a modeless dialog, a movable modal dialog, a fixed
// modal dialog, the three alerts and the push buttons with the default ring.
// Where a System 7.5 reference capture shows the element
// (docs/system7-reference-screenshots.md, "Dialogs and alerts" and the button
// rows of "Controls"), the story places it where the capture has it; alerts
// are centered by the core, so they compare region for region from their own
// corners. A fixed modal that is not an alert (Standard File, Print, Page
// Setup) has no prop of its own: the fixed dialog here is an error-typed
// modal, the one fixed modal the core can draw.
import {
	ClassicyAboutWindow,
	ClassicyAlert,
	ClassicyButton,
	ClassicyProgressBar,
	ClassicyWindow,
	useAppManagerDispatch,
} from "@classicy/classicy";
import { SB_ICON, StoryApp } from "@sb/helpers";
import { system7Parameters } from "@sb/system7";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, type ReactNode, useEffect } from "react";
import { fn } from "storybook/test";

const meta = {
	title: "Appearance/System 7 Dialogs",
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

/**
 * Shows a modal dialog's controls at rest. The core focuses a modal's first
 * control (an alert's default button) as it opens, and with no pointer or
 * key pressed yet a browser marks that focus as a keyboard user's
 * (`:focus-visible`, styles/components/_Button.scss), which no capture
 * shows. So the focus a modal takes before the first key or pointer press
 * is let go on the next animation frame, whenever it arrives; after that
 * press the dialog keeps its focus, for trying the keyboard in the story.
 */
function AtRest() {
	useEffect(() => {
		let frame = 0;
		const release = (target: EventTarget | null) => {
			if (
				target instanceof HTMLElement &&
				target.closest(".classicyWindowModal")
			) {
				cancelAnimationFrame(frame);
				frame = requestAnimationFrame(() => target.blur());
			}
		};
		const onFocusIn = (e: FocusEvent) => release(e.target);
		const stop = () => {
			cancelAnimationFrame(frame);
			document.removeEventListener("focusin", onFocusIn);
			document.removeEventListener("keydown", stop, true);
			document.removeEventListener("pointerdown", stop, true);
		};
		document.addEventListener("focusin", onFocusIn);
		document.addEventListener("keydown", stop, true);
		document.addEventListener("pointerdown", stop, true);
		release(document.activeElement);
		return stop;
	}, []);
	return null;
}

/** A dialog window of the Storybook app: no size, zoom or collapse box. */
const Dialog = (
	props: Omit<ComponentProps<typeof ClassicyWindow>, "appId">,
) => (
	<ClassicyWindow
		appId="storybook.app"
		resizable={false}
		zoomable={false}
		collapsable={false}
		scrollable={false}
		hideIcon
		minimumSize={[0, 0]}
		{...props}
	/>
);

const row = { display: "flex", alignItems: "center", gap: 13 } as const;

/** Dialog text: Chicago 12, the system font (HIG p.176). */
const text = {
	margin: 0,
	fontFamily: "var(--ui-font)",
	fontSize: "var(--ui-font-size)",
} as const;

/**
 * A modeless dialog (HIG p.178): a window with a close box and no size or
 * zoom box, its default button ringed. Where
 * `*-dialog-modeless-findfile.png` has Find File.
 */
const modeless = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Dialog
			id="find-file"
			title="Find File"
			initialSize={[460, 132]}
			initialPosition={[88, 85]}
		>
			<div style={{ padding: 13, display: "grid", gap: 13 }}>
				<p style={text}>Find items on local disks whose name contains</p>
				<div style={{ ...row, justifyContent: "space-between" }}>
					<ClassicyButton margin="sm">More Choices</ClassicyButton>
					<ClassicyButton isDefault margin="sm">
						Find
					</ClassicyButton>
				</div>
			</div>
		</Dialog>
	</StoryApp>
);

export const Modeless: Story = { render: modeless };
export const ModelessColor = inColor(modeless);

/**
 * A movable modal dialog (HIG p.186): the striped title bar with no box,
 * over the modal double frame, and no drop shadow. Where
 * `*-dialog-movablemodal-copy-progress.png` has the Finder's Copy dialog.
 */
const movableModal = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Dialog
			id="copy"
			title="Copy"
			modal
			closable={false}
			initialSize={[294, 105]}
			initialPosition={[172, 73]}
		>
			<div style={{ display: "grid", gap: 2, lineHeight: "16px" }}>
				<p style={text}>Items remaining to be copied: 204</p>
				<p style={text}>Writing: Macintosh HD</p>
				<div style={row}>
					<ClassicyProgressBar value={4} max={100} style={{ flex: 1 }} />
					<ClassicyButton style={{ margin: 0 }}>Stop</ClassicyButton>
				</div>
			</div>
		</Dialog>
		<AtRest />
	</StoryApp>
);

export const MovableModal: Story = { render: movableModal };
export const MovableModalColor = inColor(movableModal);

/**
 * A fixed modal dialog (HIG p.190): the double frame alone, no title bar and
 * no drop shadow, with dimmed and default buttons. Standard File's button
 * column, where `*-dialog-standardfile-open.png` has the Open dialog (the
 * list, pop-up and checkbox are §3.5's controls and left out).
 */
const fixedModal = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Dialog
			id="open"
			title="Open"
			modal
			type="error"
			closable={false}
			initialSize={[461, 195]}
			initialPosition={[88, 105]}
		>
			<div
				style={{
					display: "grid",
					justifyItems: "end",
					gap: 12,
					paddingTop: 24,
				}}
			>
				<ClassicyButton disabled margin="sm">
					Eject
				</ClassicyButton>
				<ClassicyButton margin="sm">Desktop</ClassicyButton>
				<ClassicyButton margin="sm">Cancel</ClassicyButton>
				<ClassicyButton isDefault margin="sm">
					Open
				</ClassicyButton>
			</div>
		</Dialog>
		<AtRest />
	</StoryApp>
);

export const FixedModal: Story = { render: fixedModal };
export const FixedModalColor = inColor(fixedModal);

/**
 * A core modal whose contents lay out no margin of their own (the About
 * box): its items start the HIG's 13 white pixels inside the inner line
 * (p.196, `dialogFrame.inset`).
 */
const aboutBox = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyAboutWindow
			appId="storybook.app"
			appName="Storybook"
			appIcon={SB_ICON}
			hideFunc={fn()}
		/>
		<AtRest />
	</StoryApp>
);

export const AboutBox: Story = { render: aboutBox };
export const AboutBoxColor = inColor(aboutBox);

/**
 * A caution alert (HIG p.195, p.201): the caution icon, one style of text,
 * and Save as the default button with Cancel and Don't Save beside it, as
 * `*-alert-caution-savechanges.png` shows SimpleText's.
 */
const caution = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyAlert
			id="save-changes"
			appId="storybook.app"
			alertType="caution"
			label="Save changes to the document “untitled 1” before closing?"
			buttons={[
				{ id: "dont-save", label: "Don’t Save", onClick: fn() },
				{ id: "cancel", label: "Cancel", role: "cancel", onClick: fn() },
				{ id: "save", label: "Save", role: "default", onClick: fn() },
			]}
			onClose={fn()}
		/>
		<AtRest />
	</StoryApp>
);

export const AlertCaution: Story = { render: caution };
export const AlertCautionColor = inColor(caution);

/**
 * A stop alert (HIG p.196) with its one default button, as
 * `*-alert-stop-pagesetup.png` shows Page Setup's.
 */
const stop = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyAlert
			id="no-printer"
			appId="storybook.app"
			alertType="stop"
			label="The printer could not be opened."
			message="Use the Chooser to select a printer."
			onClose={fn()}
		/>
		<AtRest />
	</StoryApp>
);

export const AlertStop: Story = { render: stop };
export const AlertStopColor = inColor(stop);

/**
 * A note alert (HIG p.194, figure 6-18; no 7.5 capture): the note icon and
 * one OK button.
 */
const note = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyAlert
			id="note"
			appId="storybook.app"
			alertType="note"
			label="The document has been saved."
			onClose={fn()}
		/>
		<AtRest />
	</StoryApp>
);

export const AlertNote: Story = { render: note };
export const AlertNoteColor = inColor(note);

/**
 * A movable alert: System 7 has none (HIG p.193), so it is drawn as a
 * movable modal dialog, striped, with no red.
 */
const movableAlert = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyAlert
			id="movable"
			appId="storybook.app"
			alertType="caution"
			title="Untitled"
			movable
			label="Are you sure you want to empty the Trash?"
			buttons={[
				{ id: "cancel", label: "Cancel", role: "cancel", onClick: fn() },
				{ id: "ok", label: "OK", role: "default", onClick: fn() },
			]}
			onClose={fn()}
		/>
		<AtRest />
	</StoryApp>
);

export const AlertMovable: Story = { render: movableAlert };
export const AlertMovableColor = inColor(movableAlert);

/**
 * The push buttons (HIG pp.205-207): plain and default, each at rest,
 * pressed (held by `depressed`; a press with the pointer shows the same)
 * and dimmed. A dimmed default button keeps its ring, dimmed.
 */
const buttons = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Dialog
			id="buttons"
			title="Push Buttons"
			closable={false}
			initialSize={[300, 150]}
			initialPosition={[40, 60]}
		>
			<div style={{ display: "grid", gap: 8, padding: 13 }}>
				<div style={row}>
					<ClassicyButton margin="sm">Cancel</ClassicyButton>
					<ClassicyButton depressed margin="sm">
						Cancel
					</ClassicyButton>
					<ClassicyButton disabled margin="sm">
						Eject
					</ClassicyButton>
				</div>
				<div style={row}>
					<ClassicyButton isDefault margin="sm">
						Open
					</ClassicyButton>
					<ClassicyButton isDefault depressed margin="sm">
						Open
					</ClassicyButton>
					<ClassicyButton isDefault disabled margin="sm">
						OK
					</ClassicyButton>
				</div>
			</div>
		</Dialog>
	</StoryApp>
);

export const Buttons: Story = { render: buttons };
export const ButtonsColor = inColor(buttons);
