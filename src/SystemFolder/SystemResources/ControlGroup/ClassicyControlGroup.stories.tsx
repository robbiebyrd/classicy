import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicySpinner } from "@/SystemFolder/SystemResources/Spinner/ClassicySpinner";
import {
	ClassicyControlGroup,
	ClassicyControlGroupFormRow,
	ClassicyControlGroupStack,
} from "./ClassicyControlGroup";

const meta = {
	title: "Controls/ControlGroup",
	component: ClassicyControlGroup,
} satisfies Meta<typeof ClassicyControlGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A titled primary group box holding a text field and a checkbox. */
export const Default: Story = {
	args: {
		label: "Connection",
		children: (
			<>
				<ClassicyInput id="cg-host" labelTitle="Host" />
				<ClassicyCheckbox id="cg-remember" checked={true} label="Remember me" />
			</>
		),
	},
};

/** `variant="primary"`: the 2px etched frame — the default look. */
export const Primary: Story = {
	args: {
		label: "File Sharing",
		variant: "primary",
		children: (
			<ClassicyCheckbox
				id="cg-primary"
				checked={true}
				label="Share this item"
			/>
		),
	},
};

/** `variant="secondary"`: a single 1px line, for lighter or nested grouping. */
export const Secondary: Story = {
	args: {
		label: "Access Privileges",
		variant: "secondary",
		children: (
			<ClassicyCheckbox id="cg-secondary" checked={true} label="Allow guests" />
		),
	},
};

/** An untitled group box: with no title prop set, no `<legend>` is rendered. */
export const Untitled: Story = {
	args: {
		children: (
			<ClassicyCheckbox id="cg-untitled" checked={true} label="Enabled" />
		),
	},
};

/**
 * `checkboxTitle`: the title is a `ClassicyCheckbox` (props passed through).
 * By HIG convention it governs the group's controls; wiring that enablement
 * is up to the caller.
 */
export const CheckboxTitle: Story = {
	args: {
		checkboxTitle: {
			id: "cg-cb-title",
			checked: true,
			label: "Use custom settings",
		},
		children: (
			<>
				<ClassicyInput id="cg-cb-detail" labelTitle="Server" />
				<ClassicyCheckbox id="cg-cb-secure" checked={true} label="Use SSL" />
			</>
		),
	},
};

/**
 * `popUpMenuTitle`: the title is a `ClassicyPopUpMenu` (props passed through)
 * whose choice decides what the group shows; swapping the content is up to the
 * caller.
 */
export const PopUpMenuTitle: Story = {
	args: {
		popUpMenuTitle: {
			id: "cg-popup-title",
			options: [
				{ value: "startup", label: "Startup Disk" },
				{ value: "network", label: "Network" },
			],
			selected: "startup",
		},
		children: (
			<ClassicyCheckbox
				id="cg-popup-detail"
				checked={true}
				label="Show in Finder"
			/>
		),
	},
};

/**
 * `columns` lets a group grow to fill its flex row, so groups placed side by
 * side share the width as columns.
 */
export const Columns: Story = {
	args: {
		label: "Options",
		columns: true,
		children: (
			<>
				<ClassicyCheckbox id="cg-a" checked={true} label="Sound" />
				<ClassicyCheckbox id="cg-b" label="Speech" />
				<ClassicyCheckbox id="cg-c" label="Alerts" />
			</>
		),
	},
	render: (args) => (
		<div style={{ display: "flex", width: 420 }}>
			<ClassicyControlGroup {...args} />
			<ClassicyControlGroup label="Feedback" columns={true}>
				<ClassicyCheckbox id="cg-d" checked={true} label="Flash menu bar" />
				<ClassicyCheckbox id="cg-e" label="Speak alerts" />
			</ClassicyControlGroup>
		</div>
	),
};

/**
 * `backgroundColor` must match the surface the group sits on, because the
 * title paints it to mask the frame line — here a white surface.
 */
export const CustomBackground: Story = {
	args: {
		label: "On a White Surface",
		backgroundColor: "#ffffff",
		children: (
			<ClassicyCheckbox id="cg-custom" checked={true} label="Enabled" />
		),
	},
	decorators: [
		(Story) => (
			<div style={{ background: "#ffffff", padding: "16px" }}>
				<Story />
			</div>
		),
	],
};

/**
 * `layout="form"` turns the content into a two-column grid: each
 * `ClassicyInput`'s label and field become one row, so the fields line up.
 */
export const FormLayout: Story = {
	args: {
		label: "Server",
		layout: "form",
		children: (
			<>
				<ClassicyInput
					id="cg-form-host"
					labelTitle="Host"
					labelPosition="left"
				/>
				<ClassicyInput
					id="cg-form-user"
					labelTitle="User name"
					labelPosition="left"
				/>
			</>
		),
	},
};

/**
 * Rows that are not a label/control pair — a checkbox, a push button — go in a
 * `ClassicyControlGroupFormRow`, which spans both columns; `justify="end"`
 * puts a button at the group's lower right (HIGOS8 p.72). Mixed controls
 * (pop-up, spinner, text field) share one control column.
 */
export const FormLayoutWithRows: Story = {
	args: {
		label: "Screen Saver",
		layout: "form",
		children: (
			<>
				<ClassicyControlGroupFormRow>
					<ClassicyCheckbox
						id="cg-rows-enabled"
						checked={true}
						label="Start screen saver when idle"
					/>
				</ClassicyControlGroupFormRow>
				<ClassicyPopUpMenu
					id="cg-rows-saver"
					label="Screen saver"
					labelPosition="left"
					options={[
						{ value: "toasters", label: "Flying Toasters" },
						{ value: "fish", label: "Fish" },
					]}
					selected="toasters"
				/>
				<ClassicySpinner
					id="cg-rows-minutes"
					labelTitle="Minutes of inactivity"
					labelPosition="left"
					minValue={1}
					maxValue={240}
					prefillValue={5}
				/>
				<ClassicyControlGroupFormRow justify="end">
					<ClassicyButton>Test</ClassicyButton>
				</ClassicyControlGroupFormRow>
			</>
		),
	},
};

/**
 * `ClassicyControlGroupStack` stacks group boxes 12px frame to frame (HIGOS8
 * Figure 3-29); a lower group's title overhangs into that gap instead of
 * widening it.
 */
export const Stacked: Story = {
	args: {
		label: "General",
		children: null,
	},
	render: () => (
		<ClassicyControlGroupStack>
			<ClassicyControlGroup label="General" layout="form">
				<ClassicyInput
					id="cg-stack-name"
					labelTitle="Name"
					labelPosition="left"
				/>
			</ClassicyControlGroup>
			<ClassicyControlGroup label="Options" layout="form">
				<ClassicyControlGroupFormRow>
					<ClassicyCheckbox
						id="cg-stack-verify"
						checked={true}
						label="Verify on startup"
					/>
				</ClassicyControlGroupFormRow>
			</ClassicyControlGroup>
		</ClassicyControlGroupStack>
	),
};

/** `title` takes any node — here a bold run — when plain text is not enough. */
export const RichTitle: Story = {
	args: {
		title: <strong>Startup Disk</strong>,
		children: (
			<ClassicyCheckbox id="cg-rich" checked={true} label="Verify on startup" />
		),
	},
};
