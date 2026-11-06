// Side effects only: registers every bundled app's manifest, and with it the
// reducer routed by the manifest's prefix, by importing the module whose
// top-level `registerApp` call does it. A host gets these registrations from
// `import "@classicy/classicy"`, whose barrel re-exports every one of these modules;
// Storybook's preview, whose graph does not reach them all, imports this list
// so a story dispatching an app's action reaches the same reducers. It stays
// out of the barrel (`.internal`) so the library's evaluation order is
// untouched. A new bundled app's registration module belongs here:
// `storybook/.storybook/PreviewAppManifests.test.ts` fails when the preview
// and the library entry register different apps.
import "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import "@/SystemFolder/ControlPanels/ControlStripManager/ClassicyControlStripManagerManifest";
import "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerManifest";
import "@/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetupManifest";
import "@/SystemFolder/ControlPanels/ScreenSaverManager/ClassicyScreenSaverManagerManifest";
import "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerManifest";
import "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import "@/SystemFolder/Finder/FinderContext";
// HyperCard.app spans two modules and its description is first-wins, so the
// player registers before the editor, as in the library entry's barrel.
import "@/SystemFolder/HyperCard/HyperCardContext";
import "@/SystemFolder/HyperCard/Editor/HyperCardEditorContext";
import "@/SystemFolder/PDFViewer/PDFViewerContext";
import "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import "@/SystemFolder/QuickTime/PictureViewer/PictureViewerContext";
import "@/SystemFolder/SimpleText/SimpleTextManifest";
import "@/SystemFolder/WebViewer/WebViewerContext";
