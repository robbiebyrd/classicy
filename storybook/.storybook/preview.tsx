// The Appearance Package, imported by path as a host imports it: the core
// registers none.
import "@/Appearance/Platinum";
// Every bundled app's manifest and reducer, as a host's `import "@classicy/classicy"`
// registers them, so a story's app actions reach their reducers.
import "@/SystemFolder/ClassicyBundledApps.internal";
import type { Preview } from "@storybook/react-vite";
import { listClassicyAppearancePackages } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { withClassicy } from "./ClassicyDecorators";

// The presets of every package registered as the preview loads, in
// registration order: Platinum's alone, since other packages register only
// in the story iframes that use them.
const themeToolbarItems = () =>
	listClassicyAppearancePackages()
		.flatMap((pkg) => pkg.presets ?? [])
		.map((theme) => ({ value: theme.id, title: theme.name }));

const preview: Preview = {
	globalTypes: {
		theme: {
			name: "Theme",
			description: "Classicy appearance theme",
			toolbar: {
				icon: "paintbrush",
				items: themeToolbarItems(),
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
