import {
	appearanceHooksParameters,
	ClassicyAppearanceProbe,
} from "@sb/ClassicyAppearanceProbe";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { fn } from "storybook/test";
import { ClassicyComboBox } from "./ClassicyComboBox";

const meta = {
	title: "Controls/ComboBox",
	component: ClassicyComboBox,
	decorators: [(Story) => <div style={{ width: 260 }}>{<Story />}</div>],
	args: { onChangeFunc: fn(), onSelectFunc: fn() },
} satisfies Meta<typeof ClassicyComboBox>;

export default meta;
type Story = StoryObj<typeof meta>;

const cities = [
	{ value: "cupertino", label: "Cupertino" },
	{ value: "cambridge", label: "Cambridge" },
	{ value: "chicago", label: "Chicago" },
	{ value: "monaco", label: "Monaco" },
	{ value: "new-york", label: "New York" },
];

/**
 * The default filter: typing "c" narrows the list to the labels that start with
 * it. The arrow button always shows the full list.
 */
export const StartsWith: Story = {
	args: {
		id: "combo-starts",
		label: "City:",
		placeholder: "Type to search…",
		options: cities,
	},
};

/** `filter="contains"` matches anywhere in a label, so typing "york" finds New York. */
export const Contains: Story = {
	args: {
		id: "combo-contains",
		label: "City (contains):",
		filter: "contains",
		options: cities,
	},
};

/**
 * `freeText={false}`: the field may only hold an option label. Text that
 * matches none snaps back to the last committed choice on dismiss.
 */
export const PickOnly: Story = {
	args: {
		id: "combo-pick",
		label: "City (no free text):",
		freeText: false,
		options: cities,
	},
};

/**
 * Grouped suggestions (`{ groupLabel, options }` entries): groups filter with
 * their members and vanish, header included, when none match.
 */
export const GroupedSuggestions: Story = {
	args: {
		id: "combo-grouped",
		label: "Font:",
		options: [
			{
				groupLabel: "Serif",
				options: [
					{ value: "new-york", label: "New York" },
					{ value: "palatino", label: "Palatino" },
				],
			},
			{
				groupLabel: "Sans Serif",
				options: [
					{ value: "chicago", label: "Chicago" },
					{ value: "charcoal", label: "Charcoal" },
					{ value: "geneva", label: "Geneva" },
				],
			},
		],
	},
};

/**
 * `filter={false}` never narrows the list, so it works as a "recent values"
 * menu beside a free-form field. Prefilled text seeds the field.
 */
export const NoFilter: Story = {
	args: {
		id: "combo-no-filter",
		label: "City:",
		filter: false,
		prefillValue: "Cupertino",
		options: cities,
	},
};

/** A disabled combo box: neither the field nor the arrow responds. */
export const Disabled: Story = {
	args: {
		id: "combo-disabled",
		label: "City:",
		prefillValue: "Monaco",
		disabled: true,
		options: cities,
	},
};

/**
 * The Appearance Package hook surface, under the Storybook probe package:
 * every root `decorate()` reaches is outlined (green while pressed), and every
 * event the component emits is logged in the Actions panel.
 */
export const AppearanceHooks: Story = {
	args: StartsWith.args,
	render: (args: ComponentProps<typeof ClassicyComboBox>) => (
		<ClassicyAppearanceProbe>
			<ClassicyComboBox {...args} />
		</ClassicyAppearanceProbe>
	),
	parameters: appearanceHooksParameters(),
};
