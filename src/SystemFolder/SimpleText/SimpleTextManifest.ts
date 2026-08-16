import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

export const SIMPLE_TEXT_APP_ID = "SimpleText.app";

// Description-only manifest: SimpleText has no custom reducer, but every bundled
// app registers a description — it is the balloon-help copy ClassicyApp falls
// back to for the app's desktop icon, and it feeds every other
// manifest-driven surface.
registerApp({
	id: SIMPLE_TEXT_APP_ID,
	description: "Read and edit plain-text and styled-text documents.",
});
