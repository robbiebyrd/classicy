import "@/SystemFolder/ControlPanels/AppearanceManager/styles/fonts.scss";
import type { Preview } from "@storybook/react-vite";
import themesData from "@/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json";
import { withClassicy } from "./ClassicyDecorators";

const preview: Preview = {
	globalTypes: {
		theme: {
			name: "Theme",
			description: "Classicy appearance theme",
			toolbar: {
				icon: "paintbrush",
				items: themesData.map((t) => ({ value: t.id, title: t.name })),
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
