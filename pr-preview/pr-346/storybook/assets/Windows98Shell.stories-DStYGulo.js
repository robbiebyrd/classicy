import{j as e,J as se,C as R,b as Q,e as ae}from"./iframe-BIRwakrV.js";import{a as te,S as B}from"./helpers-sQM2Obdq.js";import{w as G,W as o,h as H,o as _,a as z,i as $,n as oe,u as q,b as Y,c as re,d as K,e as ie}from"./windows98-ps55yehI.js";import"./preload-helper-DhQH6ajB.js";import"./index-C2AjQXAC.js";const ge={title:"Appearance/Windows 98/Shell",parameters:G},t="storybook-notepad.app",P="storybook-paint.app",L="storybook-phone-dialer.app",ce=[{id:"notepad-file",title:"File",menuChildren:[{id:"notepad-new",title:"New"},{id:"notepad-open",title:"Open..."},{id:"notepad-save",title:"Save"},{id:"notepad-save-as",title:"Save As..."},{id:"notepad-file-divider"},{id:"notepad-exit",title:"Exit"}]},{id:"notepad-edit",title:"Edit",menuChildren:[{id:"notepad-undo",title:"Undo"},{id:"notepad-edit-divider"},{id:"notepad-cut",title:"Cut"},{id:"notepad-copy",title:"Copy"},{id:"notepad-paste",title:"Paste"},{id:"notepad-delete",title:"Delete"},{id:"notepad-edit-divider-2"},{id:"notepad-select-all",title:"Select All"},{id:"notepad-time-date",title:"Time/Date"}]},{id:"notepad-search",title:"Search",menuChildren:[{id:"notepad-find",title:"Find..."},{id:"notepad-find-next",title:"Find Next"}]}],de=[{id:"paint-file",title:"File",menuChildren:[{id:"paint-new",title:"New"},{id:"paint-exit",title:"Exit"}]},{id:"paint-image",title:"Image",menuChildren:[{id:"paint-flip",title:"Flip/Rotate..."},{id:"paint-stretch",title:"Stretch/Skew..."}]}];function c({position:n=[60,40]}){return e.jsx(B,{id:t,name:"Notepad",children:e.jsx(R,{id:"notepad",appId:t,title:"Untitled - Notepad",initialSize:[420,240],initialPosition:n,appMenu:ce,children:e.jsx("div",{style:{padding:"calc(var(--window-padding-size) * 2)"},children:e.jsx("p",{children:"A document window under the Windows 98 shell."})})})})}function J(){return e.jsx(B,{id:P,name:"Paint",children:e.jsx(R,{id:"paint",appId:P,title:"untitled - Paint",initialSize:[360,220],initialPosition:[300,120],appMenu:de,children:e.jsx("div",{style:{padding:"calc(var(--window-padding-size) * 2)"},children:e.jsx("p",{children:"Minimized: only its taskbar button shows it."})})})})}function V(){return e.jsx(B,{id:L,name:"Phone Dialer",children:e.jsx(R,{id:"dialer",appId:L,title:"Phone Dialer",initialSize:[220,160],initialPosition:[520,200],resizable:!1,zoomable:!1,children:e.jsxs("div",{style:{padding:"calc(var(--window-padding-size) * 2)"},children:[e.jsx(Q,{isDefault:!0,children:"Dial"}),e.jsx(Q,{children:"Hang Up"})]})})})}const F=[t,"notepad"],X=[P,"paint"],Z=[L,"dialer"];function s({children:n}){return e.jsxs(z,{windows:[F,X,Z],steps:[{appId:P,windowId:"paint",command:{type:"minimize"}},{appId:t,windowId:"notepad",command:{type:"activate"}}],children:[e.jsx(c,{}),e.jsx(J,{}),e.jsx(V,{}),n]})}const d={render:()=>e.jsx(s,{})},p={render:()=>e.jsx(s,{}),play:async({canvasElement:n})=>{await _(n.ownerDocument,["start-menu_programs"])}},l={render:()=>e.jsx(s,{}),play:async({canvasElement:n})=>{await K(n.ownerDocument,"Appearance",2)}},m={render:()=>e.jsx(s,{}),play:async({canvasElement:n})=>{await K(n.ownerDocument,"Sound",1)}},u={render:()=>e.jsx(c,{position:[120,60]}),play:async({canvasElement:n})=>{await ie(n.ownerDocument,t,"notepad","help-menu")}},h={render:()=>e.jsxs(z,{windows:[F,Z],steps:[{appId:t,windowId:"notepad",command:{type:"maximize"}}],children:[e.jsx(V,{}),e.jsx(c,{})]})},w={render:()=>e.jsx(z,{windows:[F],steps:[{appId:t,windowId:"notepad",command:{type:"systemMenu"}}],children:e.jsx(c,{position:[120,60]})}),play:async({canvasElement:n})=>{await q(n.ownerDocument,".classicyContextMenuWrapper")}};function U({alertType:n,label:a,message:ee,buttons:ne}){return e.jsx(B,{id:t,name:"Notepad",children:e.jsx(ae,{id:`message-box-${n}`,appId:t,title:"Notepad",alertType:n,label:a,message:ee,buttons:ne})})}const y={render:()=>e.jsx(U,{alertType:"note",label:"Finished searching the document."})},g={render:()=>e.jsx(U,{alertType:"caution",label:"The text in the Untitled file has changed.",message:"Do you want to save the changes?",buttons:[{id:"yes",label:"Yes",role:"default"},{id:"no",label:"No"},{id:"cancel",label:"Cancel",role:"cancel"}]})},D={render:()=>e.jsx(U,{alertType:"stop",label:"Cannot find the A:\\ drive.",message:"Make sure a disk is in the drive and the drive door is closed."})},r=$("windows95",()=>e.jsx(s,{})),i=$("windows98RainyDay",()=>e.jsx(s,{})),S={render:()=>e.jsx(s,{}),play:async({canvasElement:n})=>{await Y(n.ownerDocument)}},T={render:()=>e.jsxs(e.Fragment,{children:[e.jsx(se,{id:"storybook-browser.app",name:"Web Browser",icon:te,showInQuickLaunch:!0,showDesktopIcon:!1}),e.jsx(s,{})]}),play:async({canvasElement:n})=>{await H(n.ownerDocument,'.classicyTaskbarQuickLaunch button[aria-label="Web Browser"]')}},pe=48,W={render:()=>e.jsx(B,{id:t,name:"Notepad",children:Array.from({length:pe},(n,a)=>e.jsx(R,{id:`notepad-${a+1}`,appId:t,title:`Document ${a+1} - Notepad`,initialSize:[300,140],initialPosition:[40+a%12*20,30+a%12*20],children:e.jsx("div",{style:{padding:"calc(var(--window-padding-size) * 2)"},children:e.jsxs("p",{children:["Document ",a+1]})})},a))})},b={render:()=>e.jsx(o,{actions:[{type:"ClassicyDesktopShowSystemDialog",dialog:"shutDown"}],children:e.jsx(s,{})})},x={render:()=>e.jsx(o,{actions:[{type:"ClassicyDesktopTaskbarAddRunCommand",command:"Macintosh HD:Documents"},{type:"ClassicyDesktopTaskbarAddRunCommand",command:"Notepad"},{type:"ClassicyDesktopShowSystemDialog",dialog:"run"}],children:e.jsx(s,{})})},le=["Macintosh HD:Documents:Read Me.txt","Macintosh HD:Documents:The Oregon Trail.stack","Macintosh HD:Videos:BuckBunny.mov"],k={render:()=>e.jsx(s,{}),play:async({canvasElement:n})=>{oe(le),await _(n.ownerDocument,["start-menu_documents"])}},A={parameters:{classicy:{...G.classicy,userName:"Guest"}},render:()=>e.jsx(s,{}),play:async({canvasElement:n})=>{await _(n.ownerDocument)}},C={parameters:{classicy:{...G.classicy,userName:"Guest"}},render:()=>e.jsx(o,{actions:[{type:"ClassicyDesktopShowSystemDialog",dialog:"logOff"}],children:e.jsx(s,{})})},f={render:()=>e.jsxs(z,{windows:[F,X],steps:[{appId:t,windowId:"notepad",command:{type:"activate"}},{action:{type:"ClassicyAppRequestAttention",app:{id:P}}}],children:[e.jsx(J,{}),e.jsx(c,{})]})},v={render:()=>e.jsx(s,{}),play:async({canvasElement:n})=>{await H(n.ownerDocument,".classicyTaskbarStart")}},I={render:()=>e.jsx(c,{position:[120,60]}),play:async({canvasElement:n})=>{await H(n.ownerDocument,".classicyWindow.active .classicyWindowCloseBox")}},N={render:()=>e.jsx(s,{}),play:async({canvasElement:n})=>{const a=n.ownerDocument;await Y(a),await re(a,"taskbar-properties"),await q(a,".classicyTaskbarProperties")}},j={render:()=>e.jsx(o,{actions:[{type:"ClassicyDesktopTaskbarSetEdge",edge:"left"}],children:e.jsx(s,{})})},M={render:()=>e.jsx(o,{actions:[{type:"ClassicyDesktopTaskbarSetEdge",edge:"top"}],children:e.jsx(s,{})}),play:async({canvasElement:n})=>{await _(n.ownerDocument)}},E={render:()=>e.jsx(o,{actions:[{type:"ClassicyDesktopTaskbarSetOptions",options:{autoHide:!0}}],children:e.jsx(s,{})})},O={render:()=>e.jsx(o,{actions:[{type:"ClassicyDesktopTaskbarSetOptions",options:{smallStartMenuIcons:!0}}],children:e.jsx(s,{})}),play:async({canvasElement:n})=>{await _(n.ownerDocument)}};r.__docgenInfo={description:'The three-window taskbar under the "Windows 95" scheme.',methods:[],displayName:"Windows95Scheme"};i.__docgenInfo={description:'The three-window taskbar under the classic "Rainy Day" scheme.',methods:[],displayName:"RainyDayScheme"};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <ThreeWindows />
}`,...d.parameters?.docs?.source},description:{story:"The taskbar with three windows: one active, one minimized.",...d.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <ThreeWindows />,
  play: async ({
    canvasElement
  }) => {
    await openStartMenu(canvasElement.ownerDocument, ["start-menu_programs"]);
  }
}`,...p.parameters?.docs?.source},description:{story:"The Start menu open (WIG Ch.3, Figure 3.1), with Programs open.",...p.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <ThreeWindows />,
  play: async ({
    canvasElement
  }) => {
    await openTrayIcon(canvasElement.ownerDocument, "Appearance", 2);
  }
}`,...l.parameters?.docs?.source},description:{story:`A notification icon's menu: button 2 on the status area's Appearance icon
(WIG Ch.10 "Taskbar Integration", p.211).`,...l.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <ThreeWindows />,
  play: async ({
    canvasElement
  }) => {
    await openTrayIcon(canvasElement.ownerDocument, "Sound", 1);
  }
}`,...m.parameters?.docs?.source},description:{story:"The Sound icon's volume panel: button 1 on it (WIG Ch.10, p.212).",...m.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <Notepad position={[120, 60]} />,
  play: async ({
    canvasElement
  }) => {
    await openWindowMenu(canvasElement.ownerDocument, NOTEPAD, "notepad", "help-menu");
  }
}`,...u.parameters?.docs?.source},description:{story:`A window's own menu bar with Help open: under the shell every window bar
ends with Help, the system's items, then the app's (WIG Ch.7, p.110).`,...u.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <WhenWindowsOpen windows={[NOTEPAD_WINDOW, DIALER_WINDOW]} steps={[{
    appId: NOTEPAD,
    windowId: "notepad",
    command: {
      type: "maximize"
    }
  }]}>
            <PhoneDialer />
            <Notepad />
        </WhenWindowsOpen>
}`,...h.parameters?.docs?.source},description:{story:`A maximized window: its content takes the work area, the taskbar's band
left clear, and the Maximize box reads Restore (WIG Ch.6, p.80).`,...h.parameters?.docs?.description}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: () => <WhenWindowsOpen windows={[NOTEPAD_WINDOW]} steps={[{
    appId: NOTEPAD,
    windowId: "notepad",
    command: {
      type: "systemMenu"
    }
  }]}>
            <Notepad position={[120, 60]} />
        </WhenWindowsOpen>,
  play: async ({
    canvasElement
  }) => {
    await untilSelector(canvasElement.ownerDocument, ".classicyContextMenuWrapper");
  }
}`,...w.parameters?.docs?.source},description:{story:`The window pop-up (system) menu, dropped from the caption's icon as
ALT+SPACE drops it (WIG Ch.7, p.102).`,...w.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => <MessageBox alertType="note" label="Finished searching the document." />
}`,...y.parameters?.docs?.source},description:{story:`An informational message box (WIG Ch.8, Table 8.1 and Figure 8.17): the
results of a command, acknowledged with OK.`,...y.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <MessageBox alertType="caution" label="The text in the Untitled file has changed." message="Do you want to save the changes?" buttons={[{
    id: "yes",
    label: "Yes",
    role: "default"
  }, {
    id: "no",
    label: "No"
  }, {
    id: "cancel",
    label: "Cancel",
    role: "cancel"
  }]} />
}`,...g.parameters?.docs?.source},description:{story:`A warning message box (Figure 8.17): a decision before proceeding, here
phrased as a question, with Yes, No and Cancel.`,...g.parameters?.docs?.description}}};D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  render: () => <MessageBox alertType="stop" label="Cannot find the A:\\ drive." message="Make sure a disk is in the drive and the drive door is closed." />
}`,...D.parameters?.docs?.source},description:{story:`A critical message box (Figure 8.17): a serious problem that stops the
work until it is corrected.`,...D.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:'inScheme("windows95", () => <ThreeWindows />)',...r.parameters?.docs?.source},description:{story:'The three-window taskbar under the "Windows 95" scheme.',...r.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:'inScheme("windows98RainyDay", () => <ThreeWindows />)',...i.parameters?.docs?.source},description:{story:'The three-window taskbar under the classic "Rainy Day" scheme.',...i.parameters?.docs?.description}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: () => <ThreeWindows />,
  play: async ({
    canvasElement
  }) => {
    await openTaskbarMenu(canvasElement.ownerDocument);
  }
}`,...S.parameters?.docs?.source},description:{story:`The taskbar's own menu: button 2 on its band (Toolbars, Cascade, Tile,
Minimize All Windows, Properties; Windows 98 SE's explorer.exe menu 205).`,...S.parameters?.docs?.description}}};T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  render: () => <>
            <ClassicyApp id="storybook-browser.app" name="Web Browser" icon={SB_ICON} showInQuickLaunch showDesktopIcon={false} />
            <ThreeWindows />
        </>,
  play: async ({
    canvasElement
  }) => {
    await hoverForTooltip(canvasElement.ownerDocument, '.classicyTaskbarQuickLaunch button[aria-label="Web Browser"]');
  }
}`,...T.parameters?.docs?.source},description:{story:"Quick Launch, after the Start button: Show Desktop, the Finder, and an app\nthe host marks with `showInQuickLaunch`; each button names itself in a\ntooltip.",...T.parameters?.docs?.description}}};W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id={NOTEPAD} name="Notepad">
            {Array.from({
      length: PAGED_WINDOW_COUNT
    }, (_, i) => <ClassicyWindow
    // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of windows
    key={i} id={\`notepad-\${i + 1}\`} appId={NOTEPAD} title={\`Document \${i + 1} - Notepad\`} initialSize={[300, 140]} initialPosition={[40 + i % 12 * 20, 30 + i % 12 * 20]}>
                    <div style={{
        padding: "calc(var(--window-padding-size) * 2)"
      }}>
                        <p>Document {i + 1}</p>
                    </div>
                </ClassicyWindow>)}
        </StoryApp>
}`,...W.parameters?.docs?.source},description:{story:"Task-band paging: more windows than one row holds at the buttons' least\nwidth, paged a row at a time behind the up/down control, the active\nwindow's row shown (ReactOS's `CTaskSwitchWnd::UpdateButtonsSize`).",...W.parameters?.docs?.description}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <WithActions actions={[{
    type: "ClassicyDesktopShowSystemDialog",
    dialog: "shutDown"
  }]}>
            <ThreeWindows />
        </WithActions>
}`,...b.parameters?.docs?.source},description:{story:"Shut Down Windows over the dimmed screen (shell32.dll's dialog 1065).",...b.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: () => <WithActions actions={[{
    type: "ClassicyDesktopTaskbarAddRunCommand",
    command: "Macintosh HD:Documents"
  }, {
    type: "ClassicyDesktopTaskbarAddRunCommand",
    command: "Notepad"
  }, {
    type: "ClassicyDesktopShowSystemDialog",
    dialog: "run"
  }]}>
            <ThreeWindows />
        </WithActions>
}`,...x.parameters?.docs?.source},description:{story:"Run, at the work area's lower left, with a history (shell32.dll's 1003).",...x.parameters?.docs?.description}}};k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  render: () => <ThreeWindows />,
  play: async ({
    canvasElement
  }) => {
    noteRecentDocuments(RECENT_DOCUMENTS);
    await openStartMenu(canvasElement.ownerDocument, ["start-menu_documents"]);
  }
}`,...k.parameters?.docs?.source},description:{story:"Start \u25B8 Documents: the documents opened this session, by name.",...k.parameters?.docs?.description}}};A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  parameters: {
    classicy: {
      ...windows98Parameters.classicy,
      userName: "Guest"
    }
  },
  render: () => <ThreeWindows />,
  play: async ({
    canvasElement
  }) => {
    await openStartMenu(canvasElement.ownerDocument);
  }
}`,...A.parameters?.docs?.source},description:{story:"Start \u25B8 Log Off <name>\u2026, shown for a host that names its user\n(`ClassicyDesktop`'s `userName`, here `parameters.classicy.userName`).",...A.parameters?.docs?.description}}};C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  parameters: {
    classicy: {
      ...windows98Parameters.classicy,
      userName: "Guest"
    }
  },
  render: () => <WithActions actions={[{
    type: "ClassicyDesktopShowSystemDialog",
    dialog: "logOff"
  }]}>
            <ThreeWindows />
        </WithActions>
}`,...C.parameters?.docs?.source},description:{story:"Log Off Windows over the dimmed screen (shell32.dll's dialog 1071).",...C.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <WhenWindowsOpen windows={[NOTEPAD_WINDOW, PAINT_WINDOW]} steps={[{
    appId: NOTEPAD,
    windowId: "notepad",
    command: {
      type: "activate"
    }
  }, {
    action: {
      type: "ClassicyAppRequestAttention",
      app: {
        id: PAINT
      }
    }
  }]}>
            <Paint />
            <Notepad />
        </WhenWindowsOpen>
}`,...f.parameters?.docs?.source},description:{story:`A background application asking for the user (WIG Ch.10 "Message
Notification", p.212, Figure 10.3): its taskbar button flashes, then holds
the highlight, until the user activates it.`,...f.parameters?.docs?.description}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => <ThreeWindows />,
  play: async ({
    canvasElement
  }) => {
    await hoverForTooltip(canvasElement.ownerDocument, ".classicyTaskbarStart");
  }
}`,...v.parameters?.docs?.source},description:{story:`The Start button's tooltip, "Click here to begin." (explorer.exe).`,...v.parameters?.docs?.description}}};I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  render: () => <Notepad position={[120, 60]} />,
  play: async ({
    canvasElement
  }) => {
    await hoverForTooltip(canvasElement.ownerDocument, ".classicyWindow.active .classicyWindowCloseBox");
  }
}`,...I.parameters?.docs?.source},description:{story:"A caption button's tooltip: the active window's Close box.",...I.parameters?.docs?.description}}};N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  render: () => <ThreeWindows />,
  play: async ({
    canvasElement
  }) => {
    const doc = canvasElement.ownerDocument;
    await openTaskbarMenu(doc);
    await chooseMenuItem(doc, "taskbar-properties");
    await untilSelector(doc, ".classicyTaskbarProperties");
  }
}`,...N.parameters?.docs?.source},description:{story:`Taskbar Properties, from the taskbar menu's Properties: Always on top,
Auto hide, Show small icons in Start menu, Show Clock.`,...N.parameters?.docs?.description}}};j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  render: () => <WithActions actions={[{
    type: "ClassicyDesktopTaskbarSetEdge",
    edge: "left"
  }]}>
            <ThreeWindows />
        </WithActions>
}`,...j.parameters?.docs?.source},description:{story:"Docked to the left edge: the buttons stack, the work area follows.",...j.parameters?.docs?.description}}};M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  render: () => <WithActions actions={[{
    type: "ClassicyDesktopTaskbarSetEdge",
    edge: "top"
  }]}>
            <ThreeWindows />
        </WithActions>,
  play: async ({
    canvasElement
  }) => {
    await openStartMenu(canvasElement.ownerDocument);
  }
}`,...M.parameters?.docs?.source},description:{story:"Docked to the top edge, the Start menu opening below the Start button.",...M.parameters?.docs?.description}}};E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  render: () => <WithActions actions={[{
    type: "ClassicyDesktopTaskbarSetOptions",
    options: {
      autoHide: true
    }
  }]}>
            <ThreeWindows />
        </WithActions>
}`,...E.parameters?.docs?.source},description:{story:"Auto hide: the taskbar slides off its edge but for a 2 px strip.",...E.parameters?.docs?.description}}};O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: () => <WithActions actions={[{
    type: "ClassicyDesktopTaskbarSetOptions",
    options: {
      smallStartMenuIcons: true
    }
  }]}>
            <ThreeWindows />
        </WithActions>,
  play: async ({
    canvasElement
  }) => {
    await openStartMenu(canvasElement.ownerDocument);
  }
}`,...O.parameters?.docs?.source},description:{story:"Show small icons in Start menu: small icons, no banner.",...O.parameters?.docs?.description}}};const De=["Taskbar","StartMenu","TrayMenu","TraySoundPanel","WindowMenuBarHelp","MaximizedWindow","SystemMenu","MessageBoxInformation","MessageBoxWarning","MessageBoxCritical","Windows95Scheme","RainyDayScheme","TaskbarMenu","QuickLaunch","TaskBandPaging","ShutDown","Run","StartMenuDocuments","StartMenuLogOff","LogOff","FlashingTaskButton","StartButtonTooltip","CaptionButtonTooltip","TaskbarProperties","DockedLeft","DockedTop","AutoHide","SmallStartMenuIcons"];export{E as AutoHide,I as CaptionButtonTooltip,j as DockedLeft,M as DockedTop,f as FlashingTaskButton,C as LogOff,h as MaximizedWindow,D as MessageBoxCritical,y as MessageBoxInformation,g as MessageBoxWarning,T as QuickLaunch,i as RainyDayScheme,x as Run,b as ShutDown,O as SmallStartMenuIcons,v as StartButtonTooltip,p as StartMenu,k as StartMenuDocuments,A as StartMenuLogOff,w as SystemMenu,W as TaskBandPaging,d as Taskbar,S as TaskbarMenu,N as TaskbarProperties,l as TrayMenu,m as TraySoundPanel,u as WindowMenuBarHelp,r as Windows95Scheme,De as __namedExportsOrder,ge as default};
