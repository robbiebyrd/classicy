import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";
import {
	Classicy,
	registerClassicyIcons,
	registerClassicyStateAdapter,
} from "@classicy/classicy";
// The Appearance Packages: the core draws no desktop without one. Platinum
// registers first, so it stays the default; System 7 adds its two themes
// to the Appearance Manager (Themes tab).
import "@classicy/appearance-platinum";
import "@classicy/appearance-system7";
import { BlueBox } from "./Applications/BlueBox/BlueBox";
import { Browser } from "./Applications/Browser/Browser";
// Side-effect import: registers example HyperCard plugins (custom part, commands,
// effect handler) and a demo stack — demonstrates the HyperCard plugin API.
import "./Applications/HyperCardPlugins/HyperCardPluginsDemo";
import demoIcon from "./Applications/Demo/app.png";
import { Demo } from "./Applications/Demo/Demo";
import { DemoExtension } from "./Applications/DemoExtension/DemoExtension";
import { mockStateAdapter } from "./stateSync/mockStateAdapter";

// Register custom application icons before the React tree renders.
export const AppIcons = registerClassicyIcons({
	demo: {
		app: demoIcon,
	},
});

// `?stateSync=<account>`: sync the desktop state (theme, windows, icons,
// settings) through the dev server's mock backend, so another browser
// profile opened with the same account gets the same desktop.
const stateSyncAccount = new URLSearchParams(window.location.search).get(
	"stateSync",
);
if (stateSyncAccount) {
	registerClassicyStateAdapter(mockStateAdapter(stateSyncAccount), {
		snapshotDebounceMs: 1000,
	});
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
createRoot(rootElement).render(
	<StrictMode>
		{/* themeLinks: open the theme links its Appearance Manager's Copy
		    Theme Link makes (#classicy-theme=…), after asking. */}
		<Classicy themeLinks>
			<Browser />
			<BlueBox />
			<Demo />
			<DemoExtension />
		</Classicy>
	</StrictMode>,
);
