import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyCrashScreen } from "./ClassicyCrashScreen";

const meta = {
	title: "System/CrashScreen",
	component: ClassicyCrashScreen,
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ClassicyCrashScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const Bomb = (): never => {
	throw new Error("Storybook demo crash — this error is intentional.");
};

// NOTE: in dev mode React logs the caught error to the console and Vite may
// flash an overlay — dismiss it; the built static Storybook shows only the
// Sad Mac. Click or press a key on the crash screen reloads the iframe.
export const Crashed: Story = {
	render: () => (
		<ClassicyCrashScreen>
			<Bomb />
		</ClassicyCrashScreen>
	),
};
