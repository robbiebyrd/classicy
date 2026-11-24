// Windows 98 on the desktop, under its schemes: a document window and the
// common controls, drawn by the package's stylesheet over Classicy's
// structure, with the default package's art where Windows 98 registers none.
import {
	ClassicyButton,
	ClassicyCheckbox,
	ClassicyInput,
	ClassicyPopUpMenu,
	ClassicyProgressBar,
	ClassicyRadioInput,
	ClassicyWindow,
} from "@classicy/classicy";
import { StoryApp } from "@sb/helpers";
import { inScheme, windows98Parameters } from "@sb/windows98";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
	title: "Appearance/Windows 98",
	parameters: windows98Parameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Windows98Window() {
	return (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="windows98"
				appId="storybook.app"
				title="Untitled - Notepad"
				initialSize={[380, 260]}
				initialPosition={[80, 60]}
			>
				<div style={{ padding: "1em" }}>
					<p>A Windows 98 document window.</p>
					<ClassicyInput id="windows98-input" placeholder="Edit field" />
					<ClassicyCheckbox id="windows98-checkbox" label="Word Wrap" />
					<ClassicyRadioInput
						name="windows98-radio"
						label="Orientation"
						inputs={[
							{ id: "windows98-portrait", label: "Portrait", checked: true },
							{ id: "windows98-landscape", label: "Landscape" },
						]}
					/>
					<ClassicyPopUpMenu
						id="windows98-popup"
						label="Font"
						options={[
							{ value: "sans", label: "MS Sans Serif" },
							{ value: "fixed", label: "Fixedsys" },
						]}
					/>
					<ClassicyProgressBar value={60} />
					<ClassicyButton isDefault>OK</ClassicyButton>
					<ClassicyButton>Cancel</ClassicyButton>
				</div>
			</ClassicyWindow>
		</StoryApp>
	);
}

/** The "Windows Standard" scheme, the package's defaults. */
export const WindowsStandard: Story = {
	render: () => <Windows98Window />,
};

/** The "Windows 95" scheme: flat navy title bars. */
export const Windows95: Story = inScheme("windows95", () => (
	<Windows98Window />
));

/** The "Brick" scheme. */
export const Brick: Story = inScheme("windows98Brick", () => (
	<Windows98Window />
));

/** The "Rainy Day" scheme. */
export const RainyDay: Story = inScheme("windows98RainyDay", () => (
	<Windows98Window />
));
