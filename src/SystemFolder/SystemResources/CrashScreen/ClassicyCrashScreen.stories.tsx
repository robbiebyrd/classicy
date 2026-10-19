import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
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

/**
 * A child that throws on render, so the boundary shows the Sad Mac at once.
 * Clicking it or pressing any key reloads the iframe.
 *
 * In dev mode React logs the caught error to the console and Vite may flash
 * an overlay — dismiss it; the built static Storybook shows only the Sad Mac.
 */
export const Crashed: Story = {
	render: () => (
		<ClassicyCrashScreen>
			<Bomb />
		</ClassicyCrashScreen>
	),
};

/**
 * Nothing throws, so the boundary is invisible: its children render as-is and
 * key presses do not reload the page.
 */
export const Healthy: Story = {
	render: () => (
		<ClassicyCrashScreen>
			<p>Everything is fine. The crash screen only appears on an error.</p>
		</ClassicyCrashScreen>
	),
};

const CrashButton = () => {
	const [crashed, setCrashed] = useState(false);
	return (
		<>
			{crashed && <Bomb />}
			<ClassicyButton onClickFunc={() => setCrashed(true)}>
				Crash the System
			</ClassicyButton>
		</>
	);
};

/**
 * A crash triggered after mount: the button sets state that renders a
 * throwing child, and the boundary swaps the tree for the Sad Mac. (Throwing
 * directly inside the click handler would not be caught — error boundaries
 * only catch render and lifecycle errors.)
 */
export const CrashOnDemand: Story = {
	render: () => (
		<ClassicyCrashScreen>
			<CrashButton />
		</ClassicyCrashScreen>
	),
};
