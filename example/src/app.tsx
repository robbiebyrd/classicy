import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";
import "classicy/dist/classicy.css";
import {
	ClassicyAppManagerProvider,
	ClassicyDesktop,
	SimpleText,
} from "classicy";
import { BlueBox } from "./Applications/BlueBox/BlueBox";
import { Browser } from "./Applications/Browser/Browser";
import { Demo } from "./Applications/Demo/Demo";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
createRoot(rootElement).render(
	<StrictMode>
		<ClassicyAppManagerProvider>
				<ClassicyDesktop>
					<Browser />
					<BlueBox />
					<Demo />
					<SimpleText />
				</ClassicyDesktop>
		</ClassicyAppManagerProvider>
	</StrictMode>,
);
