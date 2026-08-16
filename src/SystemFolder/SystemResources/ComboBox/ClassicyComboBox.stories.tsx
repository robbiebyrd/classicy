import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyComboBox } from "./ClassicyComboBox";

const meta = {
	title: "Controls/ComboBox",
	component: ClassicyComboBox,
	decorators: [(Story) => <div style={{ width: 260 }}>{<Story />}</div>],
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

export const StartsWith: Story = {
	args: {
		id: "combo-starts",
		label: "City:",
		placeholder: "Type to search…",
		options: cities,
	},
};

export const Contains: Story = {
	args: {
		id: "combo-contains",
		label: "City (contains):",
		filter: "contains",
		options: cities,
	},
};

// The field may only hold an option label — junk snaps back on dismiss.
export const PickOnly: Story = {
	args: {
		id: "combo-pick",
		label: "City (no free text):",
		freeText: false,
		options: cities,
	},
};

// Grouped suggestions: groups filter with their members and vanish when empty.
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
