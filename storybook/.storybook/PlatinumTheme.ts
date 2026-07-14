import { create } from "storybook/theming";

// Mac OS 8 Platinum palette: #DDDDDD light gray chrome, #CCCCCC bars,
// #333399 selection blue-violet accents.
export default create({
	base: "light",

	brandTitle: "Classicy",
	brandUrl: "https://github.com/robbiebyrd/classicy",
	brandImage: "/assets/img/icons/system/macos.png",
	brandTarget: "_blank",

	fontBase: '"Charcoal", "Geneva", "Helvetica Neue", sans-serif',
	fontCode: '"Monaco", monospace',

	colorPrimary: "#333399",
	colorSecondary: "#333399",

	appBg: "#dddddd",
	appContentBg: "#eeeeee",
	appPreviewBg: "#dddddd",
	appBorderColor: "#888888",
	appBorderRadius: 0,

	textColor: "#000000",
	textInverseColor: "#ffffff",

	barTextColor: "#333333",
	barSelectedColor: "#333399",
	barHoverColor: "#333399",
	barBg: "#cccccc",

	inputBg: "#ffffff",
	inputBorder: "#000000",
	inputTextColor: "#000000",
	inputBorderRadius: 0,
});
