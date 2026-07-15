import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { useClassicyCursor } from "./useClassicyCursor";

const CursorDemo = () => {
	const setCursor = useClassicyCursor();
	return (
		<div style={{ display: "flex", gap: "1em" }}>
			<ClassicyButton onClickFunc={() => setCursor("watch")}>
				Watch
			</ClassicyButton>
			<ClassicyButton onClickFunc={() => setCursor("hand")}>
				Hand
			</ClassicyButton>
			<ClassicyButton onClickFunc={() => setCursor("eyedropper")}>
				Eyedropper
			</ClassicyButton>
			<ClassicyButton onClickFunc={() => setCursor()}>Reset</ClassicyButton>
		</div>
	);
};

const meta = {
	title: "System/Cursor",
	component: CursorDemo,
} satisfies Meta<typeof CursorDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
