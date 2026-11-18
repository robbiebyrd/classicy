// The Appearance Package, imported by name as a host imports it: the core
// registers none.
import "@classicy/appearance-platinum";
// Every bundled app's manifest and reducer, as a host's `import "@classicy/classicy"`
// registers them, so a story's app actions reach their reducers.
import "@/SystemFolder/ClassicyBundledApps.internal";
import type { Preview } from "@storybook/react-vite";
import { withClassicy } from "./ClassicyDecorators";
import {
	STORYBOOK_DEFAULT_PACKAGE_ID,
	STORYBOOK_PACKAGE_GLOBAL,
	storybookPackageToolbarItems,
	storybookThemeToolbarItems,
} from "./StorybookPackages";

const preview: Preview = {
	globalTypes: {
		// The shipped Appearance Packages (./StorybookPackages). A package
		// other than Platinum is imported the first time it is chosen. A story
		// that sets its own package (`parameters.classicy.appearancePackage`)
		// keeps it.
		[STORYBOOK_PACKAGE_GLOBAL]: {
			name: "Package",
			description: "Classicy Appearance Package",
			toolbar: {
				icon: "component",
				items: storybookPackageToolbarItems(),
				dynamicTitle: true,
			},
		},
		// Every switchable package's themes, each labeled with its package. A
		// theme of another package than the one drawn falls back to that
		// package's defaults.
		theme: {
			name: "Theme",
			description: "Classicy appearance theme",
			toolbar: {
				icon: "paintbrush",
				items: storybookThemeToolbarItems(),
				dynamicTitle: true,
			},
		},
	},
	initialGlobals: {
		[STORYBOOK_PACKAGE_GLOBAL]: STORYBOOK_DEFAULT_PACKAGE_ID,
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
