import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicyForm, ClassicyFormButtonRow } from "./ClassicyForm";

const meta = {
	title: "Controls/Form",
	component: ClassicyForm,
} satisfies Meta<typeof ClassicyForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// A dialog-style settings form: HIG row spacing, right-aligned button row,
// Enter triggers the default (submit) button.
export const DialogForm: Story = {
	render: () => (
		<div style={{ width: 340 }}>
			<ClassicyForm layout="dialog" onSubmitFunc={() => window.alert("Saved!")}>
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
