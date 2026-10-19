import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicyForm, ClassicyFormButtonRow } from "./ClassicyForm";

const meta = {
	title: "Controls/Form",
	component: ClassicyForm,
	args: { onSubmitFunc: fn() },
} satisfies Meta<typeof ClassicyForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A dialog-style settings form: HIG row spacing and a right-aligned button
 * row. Enter in the name field (or clicking Save) triggers the default submit
 * button; the submit is logged in the Actions panel and the page never
 * navigates.
 */
export const DialogForm: Story = {
	render: (args) => (
		<div style={{ width: 340 }}>
			<ClassicyForm layout="dialog" onSubmitFunc={args.onSubmitFunc}>
				<ClassicyInput
					id="form-name"
					labelTitle="Name:"
					placeholder="Untitled"
				/>
				<ClassicyPopUpMenu
					id="form-format"
					label="Format:"
					labelPosition="left"
					selected="text"
					options={[
						{ value: "text", label: "Plain Text" },
						{ value: "md", label: "Markdown" },
					]}
				/>
				<ClassicyCheckbox id="form-backup" label="Keep a backup copy" />
				<ClassicyFormButtonRow>
					<ClassicyButton>Cancel</ClassicyButton>
					<ClassicyButton isDefault buttonType="submit">
						Save
					</ClassicyButton>
				</ClassicyFormButtonRow>
			</ClassicyForm>
		</div>
	),
};

/**
 * The `default` layout: rows stacked with the HIG item gap and no dialog edge
 * inset, for a form embedded in a larger window.
 */
export const DefaultLayout: Story = {
	render: (args) => (
		<div style={{ width: 340 }}>
			<ClassicyForm onSubmitFunc={args.onSubmitFunc}>
				<ClassicyInput
					id="form-search"
					labelTitle="Find:"
					labelPosition="left"
					placeholder="Search for…"
				/>
				<ClassicyFormButtonRow>
					<ClassicyButton isDefault buttonType="submit">
						Find
					</ClassicyButton>
				</ClassicyFormButtonRow>
			</ClassicyForm>
		</div>
	),
};
