import{j as e}from"./iframe-BUuhtV6v.js";import{u as t,M as r}from"./blocks-u5wO7ftW.js";import"./preload-helper-PPVm8Dsz.js";function i(n){const s={a:"a",code:"code",em:"em",h1:"h1",h2:"h2",h3:"h3",li:"li",p:"p",pre:"pre",strong:"strong",ul:"ul",...t(),...n.components};return e.jsxs(e.Fragment,{children:[e.jsx(r,{title:"Welcome"}),`
`,e.jsx(s.h1,{id:"classicy",children:"Classicy"}),`
`,e.jsxs(s.p,{children:["A React/TypeScript UI framework that replicates the Mac OS 8 ",e.jsx(s.strong,{children:"Platinum"}),`
interface, from single controls up to a complete desktop with windows, menus,
a Finder and control panels. Classicy follows Apple's `,e.jsx(s.em,{children:`Mac OS 8 Human Interface
Guidelines`}),` (HIGOS8) closely, and its components cite the page or figure they
reproduce.`]}),`
`,e.jsxs(s.p,{children:[e.jsx(s.a,{href:"https://classicy.ing",rel:"nofollow",children:"Website"}),` ·
`,e.jsx(s.a,{href:"https://robbiebyrd.github.io/classicy/",rel:"nofollow",children:"Live demo"}),` ·
`,e.jsx(s.a,{href:"https://github.com/robbiebyrd/classicy",rel:"nofollow",children:"GitHub"}),` ·
`,e.jsx(s.a,{href:"https://www.npmjs.com/package/classicy",rel:"nofollow",children:"npm"})]}),`
`,e.jsx(s.h2,{id:"using-this-storybook",children:"Using this Storybook"}),`
`,e.jsxs(s.p,{children:["Each component has a ",e.jsx(s.strong,{children:"Docs"}),` page with a description, every story, and a
props table you can edit through `,e.jsx(s.strong,{children:"Controls"}),". The sidebar groups them:"]}),`
`,e.jsxs(s.ul,{children:[`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Controls"}),`: standalone widgets, such as buttons, inputs, pop-up menus,
sliders, pickers, tabs, tables, trees and editors.`]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Dialogs"}),`: alerts, input dialogs, the Assistant (a paged wizard), and the
Open and Save file dialogs.`]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Desktop"}),`: the desktop, windows, the menu bar, menus, desktop icons, the
Control Strip, and apps.`]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"System"}),": startup and crash screens, cursors, and pixel art."]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Extensions"}),": Apple Guide and the screen savers."]}),`
`]}),`
`,e.jsx(s.p,{children:"While you browse:"}),`
`,e.jsxs(s.ul,{children:[`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Themes."})," The ",e.jsx(s.strong,{children:"Theme"}),` menu in the toolbar (the paintbrush) switches every
story between Classicy's 21 appearance themes, from `,e.jsx(s.em,{children:"Default"}),` (Platinum) and
`,e.jsx(s.em,{children:"Bondi"})," to ",e.jsx(s.em,{children:"Sunny"}),"."]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Desktop stories."})," Stories under ",e.jsx(s.strong,{children:"Desktop"}),` render inside a real
`,e.jsx(s.code,{children:"ClassicyDesktop"}),`, with its store, sounds and menu bar. On their Docs pages
they show in a framed preview.`]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"State persists."}),` Like a real Classicy desktop, the store saves to
`,e.jsx(s.code,{children:"localStorage"})," (key ",e.jsx(s.code,{children:"classicyDesktopState"}),`). If a story looks stuck in an
odd state, clear that key and reload.`]}),`
`]}),`
`,e.jsx(s.h2,{id:"install",children:"Install"}),`
`,e.jsx(s.pre,{children:e.jsx(s.code,{className:"language-sh",children:`npm install classicy
# peer dependencies
npm install react react-dom zustand immer @tanstack/react-table react-player
`})}),`
`,e.jsxs(s.p,{children:["Importing ",e.jsx(s.code,{children:"classicy"}),` brings its styles with it: the bundle adds its stylesheet
to the page's `,e.jsx(s.code,{children:"<head>"}),` the first time it loads, so there is no CSS file to
import or loader to configure. The bundled fonts (ChicagoFLF, Charcoal,
Geneva, Monaco and more, base64-embedded) are a separate, optional import
that works the same way. Skip it if you supply your own fonts.`]}),`
`,e.jsx(s.pre,{children:e.jsx(s.code,{className:"language-ts",children:`import "classicy/fonts"; // optional: the bundled fonts
`})}),`
`,e.jsx(s.h2,{id:"quick-start",children:"Quick start"}),`
`,e.jsxs(s.p,{children:["A desktop lives inside ",e.jsx(s.code,{children:"ClassicyAppManagerProvider"}),`. Apps are children of
`,e.jsx(s.code,{children:"ClassicyDesktop"}),", and each app is a ",e.jsx(s.code,{children:"ClassicyApp"})," holding ",e.jsx(s.code,{children:"ClassicyWindow"}),"s."]}),`
`,e.jsx(s.pre,{children:e.jsx(s.code,{className:"language-tsx",children:`import {
  ClassicyApp,
  ClassicyAppManagerProvider,
  ClassicyButton,
  ClassicyDesktop,
  ClassicyWindow,
} from "classicy";
import appIcon from "./my-app.png";

export const MyApp = () => (
  <ClassicyApp id="MyApp.app" name="MyApp" icon={appIcon} defaultWindow="myapp_main">
    <ClassicyWindow
      id="myapp_main"
      appId="MyApp.app"
      title="My App"
      icon={appIcon}
      initialSize={[400, 300]}
      initialPosition={["center", "center"]}
    >
      <ClassicyButton onClickFunc={() => alert("Hi")}>Click me</ClassicyButton>
    </ClassicyWindow>
  </ClassicyApp>
);

export const Root = () => (
  <ClassicyAppManagerProvider>
    <ClassicyDesktop>
      <MyApp />
    </ClassicyDesktop>
  </ClassicyAppManagerProvider>
);
`})}),`
`,e.jsxs(s.p,{children:[`That app already has a desktop icon, an entry in the Applications folder and
the Apple menu, and a draggable, resizable window with close, zoom and collapse
boxes. It also has window sounds, theming, and a window position that survives
a reload. Mount `,e.jsx(s.code,{children:"ClassicyDesktop"}),` eagerly, not lazily: it seeds the store that
every later dispatch relies on.`]}),`
`,e.jsx(s.h2,{id:"core-concepts",children:"Core concepts"}),`
`,e.jsx(s.h3,{id:"apps-windows-and-state",children:"Apps, windows and state"}),`
`,e.jsxs(s.ul,{children:[`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"One store."}),` App and desktop state lives in a single Zustand store. Read it
with `,e.jsx(s.code,{children:"useAppManager(selector)"}),`, always through a selector, and change it by
dispatching actions from `,e.jsx(s.code,{children:"useAppManagerDispatch()"}),"."]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Apps."}),` Each app's slice is
`,e.jsx(s.code,{children:"state.System.Manager.Applications.apps[id]"}),`. Its windows form a record keyed
by window id, read and written through `,e.jsx(s.code,{children:"getAppWindow"}),", ",e.jsx(s.code,{children:"listAppWindows"}),`,
`,e.jsx(s.code,{children:"setAppWindow"}),", ",e.jsx(s.code,{children:"updateAppWindow"})," and their siblings. The free-form ",e.jsx(s.code,{children:"data"}),` bag
holds the app's own state.`]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Actions route by prefix."})," ",e.jsx(s.code,{children:"ClassicyWindow*"}),` actions go to windows,
`,e.jsx(s.code,{children:"ClassicyDesktop*"})," to the desktop, ",e.jsx(s.code,{children:"ClassicyApp*"}),` to app lifecycle. An app
claims its own prefix through its manifest.`]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Manifests."})," ",e.jsx(s.code,{children:"registerApp({ … })"}),` declares an app's description, its reducer,
its actions (as zod schemas), and the shape of its `,e.jsx(s.code,{children:"data"}),`. The description
doubles as the app icon's balloon help. Actions marked `,e.jsx(s.code,{children:"scriptable"}),` are
available to HyperCard stack scripts.`]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Persistence."})," State saves to ",e.jsx(s.code,{children:"localStorage"}),` on every change. Saved state
from older versions is migrated automatically when it loads.`]}),`
`]}),`
`,e.jsx(s.pre,{children:e.jsx(s.code,{className:"language-tsx",children:`const appState = useAppManager((s) => s.System.Manager.Applications.apps["MyApp.app"]);
const dispatch = useAppManagerDispatch();
dispatch({ type: "ClassicyAppOpen", app: { id: "MyApp.app", name: "MyApp", icon } });
`})}),`
`,e.jsx(s.h3,{id:"the-desktop",children:"The desktop"}),`
`,e.jsxs(s.ul,{children:[`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Menus."})," The menu bar shows the focused window's ",e.jsx(s.code,{children:"appMenu"}),`, with the Apple
menu, the Help menu and the app switcher. Right-click menus resolve innermost
first: a `,e.jsx(s.code,{children:"ClassicyContextualMenuTarget"}),", then the window's ",e.jsx(s.code,{children:"contextMenu"}),`, then
the app's, then the desktop's. Every menu draws the Platinum menu frame,
matched to the open menu in HIGOS8 Figure 6-15.`]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Balloon Help."})," Wrap any element in ",e.jsx(s.code,{children:"ClassicyBalloonHelp"}),`, or use the
`,e.jsx(s.code,{children:"useClassicyBalloonHelp"}),` hook on an element you already own. The user can
turn balloons off globally.`]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Control Strip."}),` The floating strip at the lower left holds small module
buttons: Sound and Screen Saver are built in, and apps add more with
`,e.jsx(s.code,{children:"registerClassicyControlStripModule"}),`. Users show, hide and reorder modules in
its control panel.`]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Screen savers."}),` Twelve After Dark-style savers start after an idle timeout.
Register your own with `,e.jsx(s.code,{children:"registerClassicyScreenSaver"}),"."]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Files."})," ",e.jsx(s.code,{children:"ClassicyFileSystem"}),` is a browser-local file tree behind Finder,
the Open and Save dialogs, and `,e.jsx(s.code,{children:"ClassicyFileBrowser"}),`. A registered adapter
can mirror it to a backend.`]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Sound."}),` Interface sounds play from audio sprites by event name, with a
system volume and a separate alert volume.`]}),`
`]}),`
`,e.jsx(s.h3,{id:"theming",children:"Theming"}),`
`,e.jsxs(s.p,{children:[`Themes are JSON and set typography, the system palette, accent colours and the
desktop pattern or picture. The `,e.jsx(s.strong,{children:"Appearance"}),` control panel switches themes
and edits colours, fonts and the desktop. The first edit to a built-in theme
forks it into a `,e.jsx(s.em,{children:"Custom"}),` theme, so built-ins never change. Themes save to and
load from `,e.jsx(s.code,{children:".json"})," theme files."]}),`
`,e.jsx(s.h3,{id:"diagnostics-and-safety",children:"Diagnostics and safety"}),`
`,e.jsxs(s.ul,{children:[`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Logging."})," Internal diagnostics go through ",e.jsx(s.code,{children:"classicyLog"}),`. Host apps receive
logs, errors and crash reports, in production too, with
`,e.jsx(s.code,{children:"registerClassicyLogSink"}),"."]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Analytics."})," Pass ",e.jsx(s.code,{children:"gaMeasurementIds"})," or ",e.jsx(s.code,{children:"gtmContainerId"}),` to
`,e.jsx(s.code,{children:"ClassicyAppManagerProvider"}),`. Windows then send a pageview when they open or
gain focus, and `,e.jsx(s.code,{children:"useClassicyAnalytics()"}),` sends your own events. With neither
set, nothing is sent.`]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.strong,{children:"Untrusted actions."}),` Actions from untrusted sources, such as HyperCard stack
scripts, must clear a fixed guard and a deny-by-default allowlist in the
store itself. A script can open apps, but it can never reach desktop or
window internals.`]}),`
`]}),`
`,e.jsx(s.h2,{id:"developing-classicy",children:"Developing Classicy"}),`
`,e.jsxs(s.p,{children:["The repository is a pnpm workspace: the library at its root, plus an ",e.jsx(s.code,{children:"example/"}),`
app that consumes it.`]}),`
`,e.jsx(s.pre,{children:e.jsx(s.code,{className:"language-sh",children:`pnpm install           # library + example workspace
pnpm build:source      # build the library (fastest)
pnpm preview           # build, then run the example desktop
pnpm storybook         # this component showcase
pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test   # what CI runs
`})}),`
`,e.jsx(s.h2,{id:"further-reading",children:"Further reading"}),`
`,e.jsxs(s.ul,{children:[`
`,e.jsxs(s.li,{children:[e.jsx(s.a,{href:"https://github.com/robbiebyrd/classicy/blob/main/docs/BUILDING-APPS.md",rel:"nofollow",children:"Building a Classicy App"}),`:
the step-by-step guide to apps, windows, manifests, reducers, menus, files,
dialogs, sound, persistence and testing, with the traps that cost the most
time. It also ships in the package at
`,e.jsx(s.code,{children:"node_modules/classicy/docs/BUILDING-APPS.md"}),"."]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.a,{href:"https://github.com/robbiebyrd/classicy/blob/main/docs/AGENT-REFERENCE.md",rel:"nofollow",children:"Agent Reference"}),`:
every public component, prop, action and registry in one flat, searchable
reference, written for AI coding agents and handy for people too.`]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.a,{href:"https://github.com/robbiebyrd/classicy#readme",rel:"nofollow",children:"README"}),`: the feature list,
the full component table, and acknowledgements.`]}),`
`]})]})}function c(n={}){const{wrapper:s}={...t(),...n.components};return s?e.jsx(s,{...n,children:e.jsx(i,{...n})}):i(n)}export{c as default};
