// System 7's controls under each of its two themes (plan 0018-dbd §3.5):
// checkboxes, radio buttons, pop-up menus, sliders, little arrows,
// disclosure triangles, text fields and lists, each also dimmed; then the
// other controls a System 7 window can hold (group boxes, the combo box, the
// progress bar, links, meters, separators, placards, image wells, bevel
// buttons and the text editors). Controls are black on white in both themes
// (HIG p.259, figure 9-2); the reference captures they are compared with are
// listed in docs/system7-reference-screenshots.md ("Controls").
import {
	ClassicyBevelButton,
	ClassicyCheckbox,
	ClassicyComboBox,
	ClassicyControlGroup,
	ClassicyDisclosure,
	ClassicyImageWell,
	ClassicyInput,
	ClassicyLink,
	ClassicyListBox,
	ClassicyLittleArrows,
	ClassicyMeter,
	ClassicyPlacard,
	ClassicyPopUpMenu,
	ClassicyProgressBar,
	ClassicyRadioInput,
	ClassicySeparator,
	ClassicySlider,
	ClassicySpinner,
	ClassicyTextEditor,
	ClassicyTriangle,
	ClassicyWindow,
	useAppManagerDispatch,
} from "@classicy/classicy";
import { SB_ICON, StoryApp } from "@sb/helpers";
import { system7Parameters } from "@sb/system7";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, type ReactNode, useEffect } from "react";
import { fn } from "storybook/test";

const meta = {
	title: "Appearance/System 7 Controls",
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

/** A window of the Storybook app holding a scene's controls. */
const Panel = ({
	children,
	...props
}: Omit<ComponentProps<typeof ClassicyWindow>, "appId">) => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyWindow
			appId="storybook.app"
			resizable={false}
			zoomable={false}
			collapsable={false}
			scrollable={false}
			hideIcon
			minimumSize={[0, 0]}
			{...props}
		>
			<div style={grid}>{children}</div>
		</ClassicyWindow>
	</StoryApp>
);

// Whole-pixel columns and 16-pixel lines, so every control lands on the
// pixel grid, as the captures it is compared with do.
const grid = {
	display: "grid",
	gridTemplateColumns: "repeat(3, 180px)",
	alignItems: "start",
	gap: 16,
	padding: 13,
	lineHeight: "16px",
} as const;

const column = { display: "grid", gap: 8, alignContent: "start" } as const;
const row = { display: "flex", alignItems: "center", gap: 8 } as const;

const fonts = [
	{ value: "chicago", label: "Chicago" },
	{ value: "geneva", label: "Geneva" },
	{ value: "monaco", label: "Monaco" },
	{ value: "new-york", label: "New York" },
];

const sounds = [
	{ value: "droplet", label: "Droplet" },
	{ value: "indigo", label: "Indigo" },
	{ value: "quack", label: "Quack" },
	{ value: "simple-beep", label: "Simple Beep" },
	{ value: "sosumi", label: "Sosumi", disabled: true },
	{ value: "wild-eep", label: "Wild Eep" },
];

/**
 * The controls the HIG draws black on white (chapter 7): checkboxes and
 * radio buttons (the Views control panel), pop-up menus, the little arrows
 * beside a field (Date & Time), the vertical slider (Sound), disclosure
 * triangles (the Finder's list view), text fields and a scrolling list
 * (Standard File), at rest and dimmed.
 */
const controls = () => (
	<Panel
		id="controls"
		title="Controls"
		initialSize={[620, 440]}
		initialPosition={[40, 40]}
	>
		<div style={column}>
			<ClassicyCheckbox id="cb-on" checked label="Show size" />
			<ClassicyCheckbox id="cb-off" label="Show version" />
			<ClassicyCheckbox id="cb-mixed" mixed label="Mixed" />
			<ClassicyCheckbox id="cb-mixed-on" checked mixed label="Mixed, on" />
			<ClassicyCheckbox id="cb-dim-on" checked disabled label="Dimmed on" />
			<ClassicyCheckbox
				id="cb-dim-mixed-on"
				checked
				mixed
				disabled
				label="Dimmed mixed"
			/>
			<ClassicyCheckbox id="cb-dim-off" disabled label="Dimmed off" />
			<ClassicyRadioInput
				name="grid"
				align="columns"
				onClickFunc={fn()}
				inputs={[
					{ id: "straight", label: "Straight grid", checked: true },
					{ id: "staggered", label: "Staggered grid" },
					{ id: "dim", label: "Dimmed", disabled: true },
				]}
			/>
			<ClassicyRadioInput
				name="dimmed"
				align="columns"
				disabled
				onClickFunc={fn()}
				inputs={[
					{ id: "dim-on", label: "Dimmed on", checked: true },
					{ id: "dim-off", label: "Dimmed off" },
				]}
			/>
		</div>
		<div style={column}>
			<ClassicyPopUpMenu id="font" selected="geneva" options={fonts} />
			<ClassicyPopUpMenu
				id="font-dim"
				selected="chicago"
				options={fonts}
				disabled
			/>
			<div style={row}>
				<ClassicySpinner
					id="hour"
					prefillValue={11}
					minValue={1}
					maxValue={12}
				/>
				<ClassicyLittleArrows onStep={fn()} />
				<ClassicyLittleArrows onStep={fn()} disabled />
			</div>
			<ClassicyInput id="name" prefillValue="untitled 1" />
			<ClassicyInput id="name-dim" prefillValue="Dimmed" disabled />
			<div style={row}>
				<ClassicyTriangle interactive defaultOpen={false} onToggle={fn()} />
				<ClassicyTriangle interactive defaultOpen onToggle={fn()} />
				<ClassicyDisclosure label="Options">
					<p style={{ margin: 0 }}>Hidden</p>
				</ClassicyDisclosure>
			</div>
		</div>
		<div style={column}>
			{/* The channels stay 120 tall: the track group's height holds each
			    value readout (16) under its channel, 6 below it. */}
			<div style={{ ...row, alignItems: "stretch", height: 142 }}>
				<ClassicySlider
					id="volume"
					value={70}
					orientation="vertical"
					tickInterval={10}
					onChangeFunc={fn()}
				/>
				<ClassicySlider
					id="volume-dim"
					value={30}
					orientation="vertical"
					disabled
					onChangeFunc={fn()}
				/>
			</div>
			<div style={{ width: 160 }}>
				<ClassicySlider
					id="speed"
					value={40}
					tickInterval={25}
					onChangeFunc={fn()}
				/>
			</div>
			<div style={{ width: 160 }}>
				<ClassicyListBox
					id="sounds"
					options={sounds}
					selected={["simple-beep"]}
					onChangeFunc={fn()}
				/>
			</div>
		</div>
	</Panel>
);

export const Controls: Story = { render: controls };
export const ControlsColor = inColor(controls);

/**
 * The other controls a System 7 window can hold, drawn flat and black on
 * white: group boxes (dotted, as in the Views control panel), a combo box,
 * the progress bar (the Copy dialog), links, meters, separators, a placard,
 * an image well, bevel buttons and the text editor.
 */
const more = () => (
	<Panel
		id="more"
		title="More Controls"
		initialSize={[620, 440]}
		initialPosition={[40, 40]}
	>
		<div style={column}>
			<ClassicyControlGroup label="Icon Views">
				<ClassicyCheckbox id="snap" label="Always snap to grid" />
			</ClassicyControlGroup>
			<ClassicyControlGroup label="Secondary" variant="secondary">
				<ClassicyCheckbox id="snap2" label="Secondary group" />
			</ClassicyControlGroup>
			<ClassicyComboBox id="combo" options={fonts} />
			<ClassicyProgressBar value={20} max={100} />
			<ClassicyProgressBar indeterminate />
		</div>
		<div style={column}>
			<ClassicyLink href="#">A link</ClassicyLink>
			<ClassicyLink disabled>A dimmed link</ClassicyLink>
			<ClassicyMeter value={60} />
			<ClassicySeparator />
			<ClassicyPlacard>Placard</ClassicyPlacard>
			<ClassicyImageWell src={SB_ICON} />
		</div>
		<div style={column}>
			<ClassicyBevelButton>Bevel</ClassicyBevelButton>
			<ClassicyBevelButton disabled>Dimmed</ClassicyBevelButton>
			<div style={{ width: 160, height: 80 }}>
				<ClassicyTextEditor prefillValue="Some text" />
			</div>
		</div>
	</Panel>
);

export const MoreControls: Story = { render: more };
export const MoreControlsColor = inColor(more);
