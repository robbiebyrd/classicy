import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";
import "classicy/dist/classicy.css";
import {
	ClassicyAppManagerProvider,
	ClassicyDesktop,
	registerClassicyIcons,
} from "classicy";
import { BlueBox } from "./Applications/BlueBox/BlueBox";
import demoIcon from "./Applications/Demo/app.png";
import { Browser } from "./Applications/Browser/Browser";
import { Demo } from "./Applications/Demo/Demo";

// Register custom application icons before the React tree renders.
export const AppIcons = registerClassicyIcons({
	demo: {
		app: demoIcon,
	},
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
createRoot(rootElement).render(
	<StrictMode>
		<ClassicyAppManagerProvider>
			<ClassicyDesktop>
				<Browser />
				<BlueBox />
				<Demo />
			</ClassicyDesktop>
		</ClassicyAppManagerProvider>
	</StrictMode>,
);
