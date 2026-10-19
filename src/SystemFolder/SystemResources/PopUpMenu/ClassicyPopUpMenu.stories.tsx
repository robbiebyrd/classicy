import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyPopUpMenu } from "./ClassicyPopUpMenu";

const OPTIONS = [
	{ value: "geneva", label: "Geneva" },
	{ value: "chicago", label: "Chicago" },
	{ value: "monaco", label: "Monaco" },
	{ value: "charcoal", label: "Charcoal" },
];

const meta = {
	title: "Controls/PopUpMenu",
	component: ClassicyPopUpMenu,
	args: { options: OPTIONS, onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyPopUpMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A bare pop-up menu showing its current item; open it to see the checkmark. */
export const Default: Story = {
	args: { id: "popup-default", selected: "geneva" },
};

/** A label to the left of the button — the usual dialog-row layout. */
export const WithLabel: Story = {
	args: {
		id: "popup-label",
		label: "Font:",
		labelPosition: "left",
		selected: "chicago",
	},
};

/** The menu-only `"mini"` size, for dense palettes and toolbars. */
export const Mini: Story = {
	args: { id: "popup-mini", size: "mini", selected: "monaco" },
};

/**
 * With no `selected` value the button shows the placeholder and nothing is
 * checked; the menu grows down (or flips up) instead of aligning on an item.
 */
export const Placeholder: Story = {
	args: { id: "popup-placeholder", placeholder: "Select a font…" },
};

/** A disabled pop-up: the button is dimmed and does not open. */
export const Disabled: Story = {
	args: { id: "popup-disabled", selected: "charcoal", disabled: true },
};

const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

/**
 * Long enough to scroll: opening it puts the *selected* item right over the
 * button (Mac OS 8 aligned pop-up, HIGOS8 p.33) and scrolls the list so that
 * selection lands on the pointer, rather than always opening from the top.
 */
export const AlignedLongList: Story = {
	args: {
		id: "popup-aligned",
		label: "Month:",
		labelPosition: "left",
		selected: "september",
		options: MONTHS.map((month) => ({
			value: month.toLowerCase(),
			label: month,
		})),
	},
};

/**
 * The `<optgroup>` equivalent: `{ groupLabel, options }` entries render titled,
 * non-selectable groups, mixed freely with plain options.
 */
export const Grouped: Story = {
	args: {
		id: "popup-grouped",
		label: "Sound:",
		selected: "sosumi",
		options: [
			{ value: "none", label: "None" },
			{
				groupLabel: "Alert Sounds",
				options: [
					{ value: "sosumi", label: "Sosumi" },
					{ value: "quack", label: "Quack" },
					{ value: "wild-eep", label: "Wild Eep" },
				],
			},
			{
				groupLabel: "System Sounds",
				options: [
					{ value: "boot", label: "Boot Chime" },
					{ value: "beep", label: "Simple Beep" },
				],
			},
		],
	},
};

/** The `small`, `medium` and `large` sizes stacked for comparison (`mini` has its own story). */
export const Sizes: Story = {
	args: { id: "popup-sizes" },
	render: (args) => (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<ClassicyPopUpMenu
				{...args}
				id="popup-size-small"
				size="small"
				selected="geneva"
			/>
			<ClassicyPopUpMenu
				{...args}
				id="popup-size-medium"
				size="medium"
				selected="geneva"
			/>
			<ClassicyPopUpMenu
				{...args}
				id="popup-size-large"
				size="large"
				selected="geneva"
			/>
		</div>
	),
};
