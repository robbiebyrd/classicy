// System 7 on the desktop, under each of its two themes (plan 0018-dbd §2.2).
// The look is built element by element (Phase 3) and the art lands in Phase
// 4, so these stories show what the package draws so far: its themes'
// colors, fonts and metrics over Classicy's structure, with the default
// package's art where System 7 has none yet.
import {
	ClassicyButton,
	ClassicyCheckbox,
	ClassicyWindow,
} from "@classicy/classicy";
import { StoryApp } from "@sb/helpers";
import { system7Parameters, WithTheme } from "@sb/system7";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
	title: "Appearance/System 7",
	parameters: system7Parameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function System7Window() {
	return (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="system7"
				appId="storybook.app"
				title="Untitled"
				initialSize={[360, 220]}
				initialPosition={[80, 60]}
			>
				<div style={{ padding: "1em" }}>
					<p>A System 7 document window.</p>
					<ClassicyCheckbox id="system7-checkbox" label="Show Balloons" />
					<ClassicyButton isDefault>OK</ClassicyButton>
				</div>
			</ClassicyWindow>
		</StoryApp>
	);
}

/** The black-and-white "System 7" theme, the package's defaults. */
export const BlackAndWhite: Story = {
	render: () => <System7Window />,
};

/** The "System 7 Color" theme: the Standard lavender window colors. */
export const Color: Story = {
	render: () => (
		<WithTheme id="system7-color">
			<System7Window />
		</WithTheme>
	),
};
