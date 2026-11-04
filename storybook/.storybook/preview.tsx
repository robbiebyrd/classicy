import "@/Appearance/Platinum";
// Every bundled app's manifest and reducer, as a host's `import "classicy"`
// registers them, so a story's app actions reach their reducers.
import "@/SystemFolder/ClassicyBundledApps.internal";
import type { Preview } from "@storybook/react-vite";
import platinumJson from "@/Appearance/Platinum/platinum.json";
import { withClassicy } from "./ClassicyDecorators";

const preview: Preview = {
	globalTypes: {
		theme: {
			name: "Theme",
			description: "Classicy appearance theme",
			toolbar: {
				icon: "paintbrush",
				items: platinumJson.presets.map((t) => ({
					value: t.id,
					title: t.name,
				})),
				dynamicTitle: true,
			},
		},
	},
	initialGlobals: {
		theme: "default",
	},
	decorators: [withClassicy],
	tags: ["autodocs"],
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
};

export default preview;
