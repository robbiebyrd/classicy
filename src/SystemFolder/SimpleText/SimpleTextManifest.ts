import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

export const SIMPLE_TEXT_APP_ID = "SimpleText.app";

// Description-only manifest: SimpleText has no custom reducer, but every bundled
// app registers a description — it is the balloon-help copy ClassicyApp falls
// back to for the app's desktop icon, and it feeds every other
// manifest-driven surface.
registerApp({
	id: SIMPLE_TEXT_APP_ID,
	description: "Read and edit plain-text and styled-text documents.",
	// Explorer's File ▸ New ▸ Text Document (Windows 98's ShellNew entry for
	// .txt, WIG Ch.10 "Supporting Creation", pp.199-200), listed under
	// `layout.finder.commands` "windows" only.
	creates: [
		{ fileType: "text_file", typeName: "Text Document", extension: "txt" },
	],
});
