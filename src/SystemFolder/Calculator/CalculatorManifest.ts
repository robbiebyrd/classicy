import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

export const CALCULATOR_APP_ID = "Calculator.app";

// Description-only manifest: the Calculator keeps its state in the component,
// so it has no reducer. The description is its balloon-help copy.
registerApp({
	id: CALCULATOR_APP_ID,
	description: "Add, subtract, multiply and divide.",
});
