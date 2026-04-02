import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";
import "classicy/dist/classicy.css";
import { ClassicyAppManagerProvider, ClassicyDesktop } from "classicy";
import { Browser } from "./Applications/Browser/Browser";
import { Demo } from "./Applications/Demo/Demo";
import EPG from "./Applications/EPG/EPG";
import News from "./Applications/News/News";
import SimpleText from "./Applications/SimpleText/SimpleText";
import { TV } from "./Applications/TV/TV";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
createRoot(rootElement).render(
	<StrictMode>
		<ClassicyAppManagerProvider>
			<ClassicyDesktop>
				<Browser />
				<Demo />
				<EPG />
				<News />
				<SimpleText />
				<TV />
			</ClassicyDesktop>
		</ClassicyAppManagerProvider>
	</StrictMode>,
);
