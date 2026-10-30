import { createRef, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@/__tests__/test-utils";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { DriveSetupList } from "@/SystemFolder/ControlPanels/DriveSetup/DriveSetupList";
import { registerAppleGuideTopic } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import { AppleGuideWindow } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideWindow";
import {
	ClassicyScreenSaverBouncingBall,
	ClassicyScreenSaverBouncingBallOptions,
} from "@/SystemFolder/Extensions/ScreenSaver/savers/BouncingBall/ClassicyScreenSaverBouncingBall";
import { ClassicyScreenSaverFadeOut } from "@/SystemFolder/Extensions/ScreenSaver/savers/FadeOut/ClassicyScreenSaverFadeOut";
import { ClassicyScreenSaverFish } from "@/SystemFolder/Extensions/ScreenSaver/savers/Fish/ClassicyScreenSaverFish";
import { ClassicyScreenSaverFlyingToasters } from "@/SystemFolder/Extensions/ScreenSaver/savers/FlyingToasters/ClassicyScreenSaverFlyingToasters";
import { ClassicyScreenSaverGlobe } from "@/SystemFolder/Extensions/ScreenSaver/savers/Globe/ClassicyScreenSaverGlobe";
import { ClassicyScreenSaverHardRain } from "@/SystemFolder/Extensions/ScreenSaver/savers/HardRain/ClassicyScreenSaverHardRain";
import {
	ClassicyScreenSaverLogo,
	ClassicyScreenSaverLogoOptions,
} from "@/SystemFolder/Extensions/ScreenSaver/savers/Logo/ClassicyScreenSaverLogo";
import { ClassicyScreenSaverMessages } from "@/SystemFolder/Extensions/ScreenSaver/savers/Messages/ClassicyScreenSaverMessages";
import { ClassicyScreenSaverMessages2 } from "@/SystemFolder/Extensions/ScreenSaver/savers/Messages2/ClassicyScreenSaverMessages2";
import { ClassicyScreenSaverRainstorm } from "@/SystemFolder/Extensions/ScreenSaver/savers/Rainstorm/ClassicyScreenSaverRainstorm";
import { ClassicyScreenSaverSpotlight } from "@/SystemFolder/Extensions/ScreenSaver/savers/Spotlight/ClassicyScreenSaverSpotlight";
import { ClassicyScreenSaverWarp } from "@/SystemFolder/Extensions/ScreenSaver/savers/Warp/ClassicyScreenSaverWarp";
import { FinderAboutThisComputer } from "@/SystemFolder/Finder/FinderAboutThisComputer";
import { FinderPreferences } from "@/SystemFolder/Finder/FinderPreferences";
import { HyperCardEditorCanvas } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorCanvas";
import { HyperCardEditorOverlay } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorOverlay";
import type { HCEditState } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import { HyperCardInspector } from "@/SystemFolder/HyperCard/Editor/HyperCardInspector";
import { HyperCardScriptBuilder } from "@/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder";
import { HyperCardScriptEditor } from "@/SystemFolder/HyperCard/Editor/HyperCardScriptEditor";
import { HyperCardScriptJson } from "@/SystemFolder/HyperCard/Editor/HyperCardScriptJson";
import { HyperCardToolsPalette } from "@/SystemFolder/HyperCard/Editor/HyperCardToolsPalette";
import { HyperCardCard } from "@/SystemFolder/HyperCard/HyperCardCard";
import { HyperCardDialog } from "@/SystemFolder/HyperCard/HyperCardDialog";
import { HyperCardTransition } from "@/SystemFolder/HyperCard/HyperCardTransition";
import {
	type HCOpenStack,
	makeInitialRuntime,
} from "@/SystemFolder/HyperCard/HyperCardUtils";
import { PDFViewerDocument } from "@/SystemFolder/PDFViewer/PDFViewerDocument";
import { ClassicyBevelButtonPopup } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopup";
import { ClassicyBootSequence } from "@/SystemFolder/SystemResources/Boot/ClassicyBootSequence";
import { ClassicyStartupScreen } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreen";
import { resetStartupScreenSession } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreenSession";
import { ClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu";
import { ClassicyCrashScreen } from "@/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen";
import { ClassicyEmptyTrashAlert } from "@/SystemFolder/SystemResources/Desktop/ClassicySpecialMenu";
import { ClassicyMenuBarExtension } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyMenuBarExtension";
import { ClassicyDesktopMenuWidgetSound } from "@/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Sound/ClassicyDesktopMenuWidgetSound";
import { ClassicyDesktopMenuWidgetTime } from "@/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime";
import { ClassicyFileBrowserViewIcons } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import { ClassicyFileBrowserViewTable } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { QuickTimeCaptionsOverlay } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeCaptionsOverlay";
import { QuickTimeFullscreenButton } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeFullscreenButton";
import { QuickTimeVideoEmbed } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed";
import { QuickTimePlayPauseButton } from "@/SystemFolder/SystemResources/QuickTime/QuickTimePlayPauseButton";
import { ClassicyWindowMenuBar } from "@/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar";
import { ClassicyWindowTitleBar } from "@/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar";

/**
 * The passthrough rows for the exported components outside
 * ClassicyPassthrough.test.tsx: boot screens, menu surfaces, file views,
 * app windows, HyperCard's player and editor pieces, the QuickTime and PDF
 * views and the built-in screen savers.
 */

// The document loads, but its page never renders: the rows only need the
// viewer's root element.
vi.mock("pdfjs-dist", () => ({
	getDocument: () => ({
		promise: Promise.resolve({
			numPages: 1,
			getPage: () => new Promise(() => {}),
		}),
		destroy: () => {},
	}),
	GlobalWorkerOptions: { workerSrc: "" },
	RenderingCancelledException: class extends Error {},
}));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
	default: "mock-worker-url",
}));
// No audio: the rows only need the components' DOM.
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => () => {},
		useSound: () => ({ disabled: [] }),
	}),
);

const HOST = "host";
const STYLE = { marginTop: 7 };
const noop = () => {};

const fs = () =>
	new ClassicyFileSystem("passthrough-more-fs", {
		_type: "directory",
		Documents: { _type: "directory" },
	});

const edit = (): HCEditState => ({
	draft: {
		name: "Demo",
		cards: [
			{
				id: "c1",
				parts: [
					{
						id: "b1",
						type: "button",
						rect: [10, 10, 100, 24],
						script: { onMouseUp: [{ do: "beep" }] },
					},
				],
			},
		],
	},
	currentCardId: "c1",
	layer: "card",
	tool: "pointer",
	selectedPartId: "b1",
	script: { target: { kind: "part", partId: "b1" } },
	undo: [],
	redo: [],
	dirty: false,
});

const openStack = (): HCOpenStack => ({
	stackSource: "demo",
	stack: { name: "Demo", cards: [{ id: "c1", parts: [] }] },
	currentCardId: "c1",
	history: [],
	variables: {},
	fieldValues: {},
	partVisibility: {},
	fieldRev: {},
	runtime: makeInitialRuntime(),
});

const Boom = (): ReactElement => {
	throw new Error("boom");
};

registerAppleGuideTopic({
	id: "passthrough-topic",
	title: "Passthrough",
	pages: [<p key="1">One</p>],
});

type Row = [name: string, render: () => ReactElement, rootSelector: string];

const cases: Row[] = [
	[
		"ClassicyStartupScreen",
		() => <ClassicyStartupScreen className={HOST} style={STYLE} />,
		".classicyStartupScreen",
	],
	[
		"ClassicyBootSequence (power-on overlay)",
		() => (
			<ClassicyBootSequence
				preBootScreen={() => <p>power</p>}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyPreBootScreen",
	],
	[
		"ClassicyBootSequence (startup screen)",
		() => <ClassicyBootSequence className={HOST} style={STYLE} />,
		".classicyStartupScreen",
	],
	[
		"ClassicyEmptyTrashAlert (forwards to its window)",
		() => (
			<ClassicyEmptyTrashAlert
				itemCount={2}
				onEmpty={noop}
				onClose={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyWindow",
	],
	[
		"ClassicyContextualMenu",
		() => (
			<ClassicyContextualMenu
				name="ctx"
				position={[0, 0]}
				menuItems={[{ id: "a", title: "A" }]}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyContextMenuWrapper",
	],
	[
		"ClassicyMenuBarExtension",
		() => (
			<>
				<ul id="classicyDesktopMenuExtensions" />
				<ClassicyMenuBarExtension
					id="ext"
					title="Ext"
					className={HOST}
					style={STYLE}
				/>
			</>
		),
		".classicyDesktopMenuExtension",
	],
	[
		"ClassicyWindowMenuBar",
		() => (
			<ClassicyWindowMenuBar
				appId="Passthrough.app"
				windowId="main"
				menuItems={[{ id: "file", title: "File" }]}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyWindowMenuBar",
	],
	[
		"ClassicyWindowTitleBar",
		() => (
			<ClassicyWindowTitleBar
				title="Passthrough"
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyWindowTitleBar",
	],
	[
		"ClassicyBevelButtonPopup",
		() => (
			<ClassicyBevelButtonPopup
				id="popup"
				anchor={{ left: 0, top: 0, right: 10, bottom: 10 }}
				side="below"
				content={<p>panel</p>}
				buttonRef={createRef()}
				onClose={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyBevelButtonPopup",
	],
	[
		"ClassicyDesktopMenuWidgetTime",
		() => <ClassicyDesktopMenuWidgetTime className={HOST} style={STYLE} />,
		".classicyDesktopMenuTime",
	],
	[
		"ClassicyFileBrowserViewIcons",
		() => (
			<ClassicyFileBrowserViewIcons
				fs={fs()}
				path="Documents"
				appId="Passthrough.app"
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyFileBrowserFill",
	],
	[
		"ClassicyFileBrowserViewTable",
		() => (
			<ClassicyFileBrowserViewTable
				fs={fs()}
				path="Documents"
				appId="Passthrough.app"
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyFileBrowserViewTableContainer",
	],
	[
		"DriveSetupList",
		() => (
			<DriveSetupList
				drives={[]}
				selected={null}
				onSelect={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyDriveSetupList",
	],
	[
		"AppleGuideWindow (forwards to its window)",
		() => (
			<AppleGuideWindow
				topicId="passthrough-topic"
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyWindow",
	],
	[
		"FinderAboutThisComputer (forwards to its window)",
		() => <FinderAboutThisComputer className={HOST} style={STYLE} />,
		".classicyWindow",
	],
	[
		"FinderPreferences (forwards to its window)",
		() => <FinderPreferences className={HOST} style={STYLE} />,
		".classicyWindow",
	],
	[
		"HyperCardDialog (forwards to its window)",
		() => (
			<HyperCardDialog
				dialog={{ kind: "answer", message: "Hello", token: "t1" }}
				stackId="demo"
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyWindow",
	],
	[
		"HyperCardCard",
		() => (
			<HyperCardCard
				open={openStack()}
				stackId="demo"
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyHyperCardCanvas",
	],
	[
		"HyperCardTransition",
		() => (
			<HyperCardTransition
				stackId="demo"
				cardKey="c1"
				className={HOST}
				style={STYLE}
			>
				<p>card</p>
			</HyperCardTransition>
		),
		".classicyHyperCardStageInner",
	],
	[
		"HyperCardEditorCanvas",
		() => (
			<HyperCardEditorCanvas
				stackId="demo"
				edit={edit()}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyHyperCardEditorCanvas",
	],
	[
		"HyperCardEditorOverlay",
		() => (
			<HyperCardEditorOverlay
				stackId="demo"
				edit={edit()}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyHyperCardEditorOverlay",
	],
	[
		"HyperCardInspector",
		() => (
			<HyperCardInspector
				stackId="demo"
				edit={edit()}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyHyperCardInspector",
	],
	[
		"HyperCardToolsPalette",
		() => (
			<HyperCardToolsPalette
				stackId="demo"
				edit={edit()}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyHyperCardPalette",
	],
	[
		"HyperCardScriptEditor",
		() => (
			<HyperCardScriptEditor
				stackId="demo"
				edit={edit()}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyHyperCardScriptEditor",
	],
	[
		"HyperCardScriptBuilder",
		() => (
			<HyperCardScriptBuilder
				stackId="demo"
				target={{ kind: "part", partId: "b1" }}
				handlers={{ onMouseUp: [{ do: "beep" }] }}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyHyperCardScriptBuilder",
	],
	[
		"HyperCardScriptJson",
		() => (
			<HyperCardScriptJson
				stackId="demo"
				target={{ kind: "part", partId: "b1" }}
				handlers={{ onMouseUp: [{ do: "beep" }] }}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyHyperCardScriptJson",
	],
	[
		"QuickTimeCaptionsOverlay",
		() => (
			<QuickTimeCaptionsOverlay text="Hello" className={HOST} style={STYLE} />
		),
		".quickTimePlayerCaptionsHolder",
	],
	[
		"QuickTimePlayPauseButton",
		() => (
			<QuickTimePlayPauseButton
				playing={false}
				onToggle={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		".quickTimePlayerVideoControlsButton",
	],
	[
		"QuickTimeFullscreenButton",
		() => (
			<QuickTimeFullscreenButton
				onToggle={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		".quickTimePlayerVideoControlsButton",
	],
	[
		"QuickTimeVideoEmbed",
		() => (
			<QuickTimeVideoEmbed
				appId="Passthrough.app"
				name="Clip"
				url="clip.mp4"
				type="video"
				className={HOST}
				style={STYLE}
			/>
		),
		".quickTimePlayerWrapper",
	],
	[
		"ClassicyScreenSaverBouncingBall",
		() => (
			<ClassicyScreenSaverBouncingBall
				config={{}}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicySaverBouncingBall",
	],
	[
		"ClassicyScreenSaverBouncingBallOptions (forwards to its spinner)",
		() => (
			<ClassicyScreenSaverBouncingBallOptions
				config={{}}
				onChange={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicySpinnerHolder",
	],
	[
		"ClassicyScreenSaverFadeOut",
		() => (
			<ClassicyScreenSaverFadeOut config={{}} className={HOST} style={STYLE} />
		),
		".classicySaverFadeOut",
	],
	[
		"ClassicyScreenSaverFish",
		() => (
			<ClassicyScreenSaverFish config={{}} className={HOST} style={STYLE} />
		),
		".classicySaverFish",
	],
	[
		"ClassicyScreenSaverFlyingToasters",
		() => (
			<ClassicyScreenSaverFlyingToasters
				config={{}}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicySaverFlyingToasters",
	],
	[
		"ClassicyScreenSaverGlobe",
		() => (
			<ClassicyScreenSaverGlobe config={{}} className={HOST} style={STYLE} />
		),
		".classicySaverGlobe",
	],
	[
		"ClassicyScreenSaverHardRain",
		() => (
			<ClassicyScreenSaverHardRain config={{}} className={HOST} style={STYLE} />
		),
		".classicySaverHardRain",
	],
	[
		"ClassicyScreenSaverLogo",
		() => (
			<ClassicyScreenSaverLogo config={{}} className={HOST} style={STYLE} />
		),
		".classicySaverLogo",
	],
	[
		"ClassicyScreenSaverLogoOptions (forwards to its pop-up menu)",
		() => (
			<ClassicyScreenSaverLogoOptions
				config={{}}
				onChange={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyPopUpMenu",
	],
	[
		"ClassicyScreenSaverMessages",
		() => (
			<ClassicyScreenSaverMessages config={{}} className={HOST} style={STYLE} />
		),
		".classicySaverMessages",
	],
	[
		"ClassicyScreenSaverMessages2",
		() => (
			<ClassicyScreenSaverMessages2
				config={{}}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicySaverMessages2",
	],
	[
		"ClassicyScreenSaverRainstorm",
		() => (
			<ClassicyScreenSaverRainstorm
				config={{}}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicySaverRainstorm",
	],
	[
		"ClassicyScreenSaverSpotlight",
		() => (
			<ClassicyScreenSaverSpotlight
				config={{}}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicySaverSpotlight",
	],
	[
		"ClassicyScreenSaverWarp",
		() => (
			<ClassicyScreenSaverWarp config={{}} className={HOST} style={STYLE} />
		),
		".classicySaverWarp",
	],
];

beforeEach(() => {
	// jsdom implements neither; stub them so the output stays free of its
	// "Not implemented" notices.
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
	vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
	vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(noop);
	resetStartupScreenSession();
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

const expectPassthrough = (el: Element | null) => {
	expect(el).toBeTruthy();
	const root = el as HTMLElement;
	expect((root.getAttribute("class") ?? "").split(" ")).toContain(HOST);
	expect(root.style.marginTop).toBe("7px");
};

describe("className and style passthrough (remaining exported components)", () => {
	it.each(
		cases,
	)("%s merges className and style onto its root", (_name, make, rootSelector) => {
		const { container } = render(make());
		expectPassthrough(
			container.querySelector(rootSelector) ??
				document.querySelector(rootSelector),
		);
	});

	it("PDFViewerDocument merges className and style onto its root while loading and once loaded", async () => {
		const { container, findByText } = render(
			<PDFViewerDocument url="/doc.pdf" className={HOST} style={STYLE} />,
		);
		expectPassthrough(container.querySelector(".pdfViewerDocumentLoading"));
		await findByText("Page 1 of 1");
		expectPassthrough(container.querySelector(".pdfViewerDocument"));
	});

	it("ClassicyCrashScreen merges className and style onto the Sad Mac screen", () => {
		vi.spyOn(console, "error").mockImplementation(noop);
		const { container } = render(
			<ClassicyCrashScreen className={HOST} style={STYLE}>
				<Boom />
			</ClassicyCrashScreen>,
		);
		expectPassthrough(container.querySelector(".classicyCrashScreen"));
	});

	it("ClassicyDesktopMenuWidgetSound merges className and style onto its item", () => {
		// The deprecated widget announces itself once through classicyLog.
		vi.spyOn(console, "warn").mockImplementation(noop);
		const { container } = render(
			<ClassicyDesktopMenuWidgetSound className={HOST} style={STYLE} />,
		);
		expectPassthrough(
			container.querySelector(".classicyDesktopMenuWidgetSound"),
		);
	});
});
