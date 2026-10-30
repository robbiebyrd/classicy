import{C as o,j as e,i as f,n as C}from"./iframe-BlH3vcfR.js";import{d as v,S as i}from"./helpers-06T0jdqu.js";import{C as j}from"./ClassicyPlacard-l66h9VNF.js";import"./preload-helper-PPVm8Dsz.js";const{fn:x}=__STORYBOOK_MODULE_TEST__,M={title:"Desktop/Window",component:o,parameters:v},n={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"default",appId:"storybook.app",title:"Untitled Document",initialSize:[440,300],initialPosition:[80,60],children:e.jsx("p",{style:{padding:"1em"},children:"A resizable, movable, collapsable Platinum window."})})})},a={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"modal",appId:"storybook.app",title:"Alert",modal:!0,closable:!0,resizable:!1,initialSize:[320,140],initialPosition:["center","center"],children:e.jsx("p",{style:{padding:"1em"},children:"This is a modal dialog window."})})})},s={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"fixed",appId:"storybook.app",title:"Fixed Palette",resizable:!1,zoomable:!1,initialSize:[260,180],initialPosition:[120,90],children:e.jsx("p",{style:{padding:"1em"},children:"Not resizable, not zoomable."})})})},r={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"utility",appId:"storybook.app",title:"Tools",windowType:"utility",zoomable:!1,initialSize:[120,240],initialPosition:[140,90],children:e.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,padding:4},children:["▲","●","◆","■","✕","＋","▬","A"].map(t=>e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:44,fontSize:22,border:"1px solid var(--color-system-05)",background:"var(--color-system-02)"},children:t},t))})})})},l={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"utility-always-on-top",appId:"storybook.app",title:"Tools",windowType:"utility",alwaysOnTop:!0,zoomable:!1,initialSize:[120,240],initialPosition:[140,90],children:e.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,padding:4},children:["▲","●","◆","■","✕","＋","▬","A"].map(t=>e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:44,fontSize:22,border:"1px solid var(--color-system-05)",background:"var(--color-system-02)"},children:t},t))})})})},d={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"list-header",appId:"storybook.app",title:"Documents",headerVariant:"list",initialSize:[420,260],initialPosition:[90,70],header:e.jsxs("div",{style:{display:"flex",gap:"2em",padding:"0 1em"},children:[e.jsx("span",{children:"Name"}),e.jsx("span",{children:"Date Modified"}),e.jsx("span",{children:"Size"})]}),children:e.jsx("p",{style:{padding:"1em"},children:"List-view column header (no bottom line)."})})})},p={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"modeless",appId:"storybook.app",title:"Find",contentFrame:!0,resizable:!1,scrollable:!1,initialSize:[320,160],initialPosition:[120,90],children:e.jsx("p",{style:{padding:"1em"},children:"A modeless dialog with a 2px content-region frame."})})})},c={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"movable-modal",appId:"storybook.app",title:"Save Changes",modal:!0,closable:!0,resizable:!1,initialSize:[340,150],initialPosition:["center","center"],children:e.jsx("p",{style:{padding:"1em"},children:"Movable modal: drag the title bar, Escape to dismiss, outside-click beeps."})})})},m={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"fixed-modal",appId:"storybook.app",title:"Error",modal:!0,type:"error",closable:!0,resizable:!1,initialSize:[320,140],initialPosition:["center","center"],children:e.jsx("p",{style:{padding:"1em"},children:"A fixed, non-movable modal alert."})})})},y={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"hzoom",appId:"storybook.app",title:"Wide Zoom",zoomMode:"horizontal",initialSize:[320,220],initialPosition:[100,90],children:e.jsx("p",{style:{padding:"1em"},children:"Click the zoom box: this window grows horizontally only."})})})},h={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"placard",appId:"storybook.app",title:"Untitled Document",initialSize:[440,300],initialPosition:[80,60],placard:e.jsx(j,{menuItems:[{id:"50",title:"50%"},{id:"100",title:"100%"},{id:"200",title:"200%"},{id:"fit",title:"Fit in Window"}],onSelect:t=>console.log("magnification:",t),children:"100%"}),children:e.jsx("p",{style:{padding:"1em"},children:"A Platinum window with a magnification placard pinned to the bottom-left, left of the horizontal scroll bar."})})})},b={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"scrollfits",appId:"storybook.app",title:"Fits",initialSize:[320,200],initialPosition:[80,60],children:e.jsx("div",{style:{padding:"1em"},children:"Short content — no scroll bars until the window is made smaller than this text."})})})},w={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"scrollv",appId:"storybook.app",title:"Vertical Scroll",initialSize:[260,220],initialPosition:[80,60],children:e.jsx("div",{style:{width:180,height:900,padding:"1em"},children:"Tall content — vertical scroll bar only."})})})},u={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"scrollb",appId:"storybook.app",title:"Both Scroll",initialSize:[320,240],initialPosition:[80,60],children:e.jsx("div",{style:{width:900,height:900,padding:"1em"},children:"Large content — both scroll bars and the grow-box corner."})})})},g={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"ideal-zoom",appId:"storybook.app",title:"Ideal Size",initialSize:[260,160],minimumSize:[200,0],idealSize:[520,320],initialPosition:[80,60],children:e.jsx("p",{style:{padding:"1em"},children:"Click the zoom box: the window zooms to its 520 × 320 ideal size, then back to this one."})})})},S={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"context-menu",appId:"storybook.app",title:"Right-Click Me",initialSize:[360,200],initialPosition:[80,60],contextMenu:[{id:"get-info",title:"Get Info",onClickFunc:x()},{id:"spacer"},{id:"close-window",title:"Close Window",onClickFunc:x()}],children:e.jsx("p",{style:{padding:"1em"},children:"Right-click inside this window for its contextual menu."})})})},A=()=>{const t=f.useRef(!1);return e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"close-veto",appId:"storybook.app",title:"Unsaved Changes",initialSize:[360,160],initialPosition:[80,60],onBeforeClose:()=>t.current,children:e.jsx("div",{style:{padding:"1em"},children:e.jsx(C,{id:"allow-close",label:"Allow this window to close",onClickFunc:z=>{t.current=z}})})})})},k={render:()=>e.jsx(A,{})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="default" appId="storybook.app" title="Untitled Document" initialSize={[440, 300]} initialPosition={[80, 60]}>
                <p style={{
        padding: "1em"
      }}>
                    A resizable, movable, collapsable Platinum window.
                </p>
            </ClassicyWindow>
        </StoryApp>
}`,...n.parameters?.docs?.source},description:{story:`A standard document window: close box on the left, zoom and collapse boxes on
the right, a draggable frame and a grow box. Drag, resize, collapse and zoom
it to hear the window sounds; its geometry lives in the window manager store.`,...n.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="modal" appId="storybook.app" title="Alert" modal={true} closable={true} resizable={false} initialSize={[320, 140]} initialPosition={["center", "center"]}>
                <p style={{
        padding: "1em"
      }}>This is a modal dialog window.</p>
            </ClassicyWindow>
        </StoryApp>
}`,...a.parameters?.docs?.source},description:{story:"The minimal modal dialog: `modal` portals the window above an input-blocking\nscrim, traps Tab focus and drops the zoom box. Escape or Command-period\ncloses it because it is `closable`.",...a.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="fixed" appId="storybook.app" title="Fixed Palette" resizable={false} zoomable={false} initialSize={[260, 180]} initialPosition={[120, 90]}>
                <p style={{
        padding: "1em"
      }}>Not resizable, not zoomable.</p>
            </ClassicyWindow>
        </StoryApp>
}`,...s.parameters?.docs?.source},description:{story:"`resizable={false}` and `zoomable={false}` remove the grow box and zoom box,\nfor windows whose layout has one right size. A non-resizable window always\nopens at `initialSize`, ignoring any persisted size.",...s.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="utility" appId="storybook.app" title="Tools" windowType="utility" zoomable={false} initialSize={[120, 240]} initialPosition={[140, 90]}>
                <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 2,
        padding: 4
      }}>
                    {["▲", "●", "◆", "■", "✕", "＋", "▬", "A"].map(glyph => <div key={glyph} style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 44,
          fontSize: 22,
          border: "1px solid var(--color-system-05)",
          background: "var(--color-system-02)"
        }}>
                            {glyph}
                        </div>)}
                </div>
            </ClassicyWindow>
        </StoryApp>
}`,...r.parameters?.docs?.source},description:{story:'#205 — a utility / tool-palette window. `windowType="utility"` swaps the\npinstriped document title bar for a crosshatch tool-palette drag region.\nThe narrow frame on every side is now a drag handle too.',...r.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="utility-always-on-top" appId="storybook.app" title="Tools" windowType="utility" alwaysOnTop zoomable={false} initialSize={[120, 240]} initialPosition={[140, 90]}>
                <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 2,
        padding: 4
      }}>
                    {["▲", "●", "◆", "■", "✕", "＋", "▬", "A"].map(glyph => <div key={glyph} style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 44,
          fontSize: 22,
          border: "1px solid var(--color-system-05)",
          background: "var(--color-system-02)"
        }}>
                            {glyph}
                        </div>)}
                </div>
            </ClassicyWindow>
        </StoryApp>
}`,...l.parameters?.docs?.source},description:{story:`A utility palette with \`alwaysOnTop\`. Unlike the plain Utility story, this
palette stays in the floating band (z-index 350) even when its owning app is
backgrounded, so it floats above other apps' windows — but still below error
modals.`,...l.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="list-header" appId="storybook.app" title="Documents" headerVariant="list" initialSize={[420, 260]} initialPosition={[90, 70]} header={<div style={{
      display: "flex",
      gap: "2em",
      padding: "0 1em"
    }}>
                        <span>Name</span>
                        <span>Date Modified</span>
                        <span>Size</span>
                    </div>}>
                <p style={{
        padding: "1em"
      }}>
                    List-view column header (no bottom line).
                </p>
            </ClassicyWindow>
        </StoryApp>
}`,...d.parameters?.docs?.source},description:{story:'#183 — list-view header. `headerVariant="list"` removes the beveled bottom\nseparator so the header reads as a column-heading strip.',...d.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="modeless" appId="storybook.app" title="Find" contentFrame={true} resizable={false} scrollable={false} initialSize={[320, 160]} initialPosition={[120, 90]}>
                <p style={{
        padding: "1em"
      }}>
                    A modeless dialog with a 2px content-region frame.
                </p>
            </ClassicyWindow>
        </StoryApp>
}`,...p.parameters?.docs?.source},description:{story:"#203 / #202 — a modeless dialog. `contentFrame` draws a 2px active/inactive\nframe around the window body. Modeless dialogs coexist with other windows,\nso this is a plain (non-modal) window with the framed body.",...p.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="movable-modal" appId="storybook.app" title="Save Changes" modal={true} closable={true} resizable={false} initialSize={[340, 150]} initialPosition={["center", "center"]}>
                <p style={{
        padding: "1em"
      }}>
                    Movable modal: drag the title bar, Escape to dismiss, outside-click
                    beeps.
                </p>
            </ClassicyWindow>
        </StoryApp>
}`,...c.parameters?.docs?.source},description:{story:'#194 — a movable modal dialog. `modal` + not `type="error"` stays draggable\nand (per HIG) shows no zoom box. It traps Tab focus, renders an input-blocking\nscrim (clicking outside beeps), and dismisses on Escape / Command-period.',...c.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="fixed-modal" appId="storybook.app" title="Error" modal={true} type="error" closable={true} resizable={false} initialSize={[320, 140]} initialPosition={["center", "center"]}>
                <p style={{
        padding: "1em"
      }}>A fixed, non-movable modal alert.</p>
            </ClassicyWindow>
        </StoryApp>
}`,...m.parameters?.docs?.source},description:{story:'#197 — a fixed (non-movable) modal alert. `modal` + `type="error"` cannot be\ndragged and shows the red error frame; the scrim blocks and beeps on outside\nclicks.',...m.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="hzoom" appId="storybook.app" title="Wide Zoom" zoomMode="horizontal" initialSize={[320, 220]} initialPosition={[100, 90]}>
                <p style={{
        padding: "1em"
      }}>
                    Click the zoom box: this window grows horizontally only.
                </p>
            </ClassicyWindow>
        </StoryApp>
}`,...y.parameters?.docs?.source},description:{story:"#208 — zoom modes. `zoomMode` controls whether the zoom box grows both axes\n(`full`), only the width (`horizontal`), or only the height (`vertical`). The\nuser's pre-zoom rect is remembered and restored on un-zoom; click the zoom\nbox again to return to it.",...y.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="placard" appId="storybook.app" title="Untitled Document" initialSize={[440, 300]} initialPosition={[80, 60]} placard={<ClassicyPlacard menuItems={[{
      id: "50",
      title: "50%"
    }, {
      id: "100",
      title: "100%"
    }, {
      id: "200",
      title: "200%"
    }, {
      id: "fit",
      title: "Fit in Window"
    }]} onSelect={id => console.log("magnification:", id)}>
                        100%
                    </ClassicyPlacard>}>
                <p style={{
        padding: "1em"
      }}>
                    A Platinum window with a magnification placard pinned to the
                    bottom-left, left of the horizontal scroll bar.
                </p>
            </ClassicyWindow>
        </StoryApp>
}`,...h.parameters?.docs?.source},description:{story:"#196 — a window with a Platinum placard in the bottom-left status region, to\nthe left of the horizontal scroll bar. Here the placard is a magnification\npop-up (a `menuItems` placard) as commonly seen in Mac OS 8 document windows.",...h.parameters?.docs?.description}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="scrollfits" appId="storybook.app" title="Fits" initialSize={[320, 200]} initialPosition={[80, 60]}>
                <div style={{
        padding: "1em"
      }}>
                    Short content — no scroll bars until the window is made smaller than
                    this text.
                </div>
            </ClassicyWindow>
        </StoryApp>
}`,...b.parameters?.docs?.source},description:{story:`Content that fits: a scrollable window draws no scroll bars until something
overflows, and the grow box sits over the content's corner. Resize it
smaller than the text to watch both bars appear.`,...b.parameters?.docs?.description}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="scrollv" appId="storybook.app" title="Vertical Scroll" initialSize={[260, 220]} initialPosition={[80, 60]}>
                <div style={{
        width: 180,
        height: 900,
        padding: "1em"
      }}>
                    Tall content — vertical scroll bar only.
                </div>
            </ClassicyWindow>
        </StoryApp>
}`,...w.parameters?.docs?.source},description:{story:`Vertical-only scroll in a resizable window: the vertical scroll bar runs the
full height and its bottom arrow sits next to the grow box. Used to verify the
Smart Scrolling end-arrow clears the resizer.`,...w.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="scrollb" appId="storybook.app" title="Both Scroll" initialSize={[320, 240]} initialPosition={[80, 60]}>
                <div style={{
        width: 900,
        height: 900,
        padding: "1em"
      }}>
                    Large content — both scroll bars and the grow-box corner.
                </div>
            </ClassicyWindow>
        </StoryApp>
}`,...u.parameters?.docs?.source},description:{story:"Both-axes scroll in a resizable window (vertical + horizontal + corner).",...u.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="ideal-zoom" appId="storybook.app" title="Ideal Size" initialSize={[260, 160]} minimumSize={[200, 0]} idealSize={[520, 320]} initialPosition={[80, 60]}>
                <p style={{
        padding: "1em"
      }}>
                    Click the zoom box: the window zooms to its 520 × 320 ideal size, then
                    back to this one.
                </p>
            </ClassicyWindow>
        </StoryApp>
}`,...g.parameters?.docs?.source},description:{story:`#208 / HIGOS8 p.104 — a full zoom to the window's "standard state".
\`idealSize\` is a content-box size, like \`initialSize\`; the zoom box toggles
between it (clamped to the desktop) and the user's own size, rather than
maximizing to fill the screen.`,...g.parameters?.docs?.description}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="context-menu" appId="storybook.app" title="Right-Click Me" initialSize={[360, 200]} initialPosition={[80, 60]} contextMenu={[{
      id: "get-info",
      title: "Get Info",
      onClickFunc: fn()
    }, {
      id: "spacer"
    }, {
      id: "close-window",
      title: "Close Window",
      onClickFunc: fn()
    }]}>
                <p style={{
        padding: "1em"
      }}>
                    Right-click inside this window for its contextual menu.
                </p>
            </ClassicyWindow>
        </StoryApp>
}`,...S.parameters?.docs?.source},description:{story:"A window-level `contextMenu`. Right-clicking anywhere in the window focuses\nit and opens this menu, with the HIG's Help item placed first. A\n`ClassicyContextualMenuTarget` inside the window would win over it, and the\napp's `contextMenu` is the fallback when a window has none.",...S.parameters?.docs?.description}}};k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  render: () => <CloseVetoWindow />
}`,...k.parameters?.docs?.source},description:{story:"#236 — `onBeforeClose` vetoes a close. The close box does nothing until the\ncheckbox is ticked, because the hook returns `false`; a vetoed close plays\nno sound and dispatches nothing. Return a promise to ask the user first.",...k.parameters?.docs?.description}}};const F=["Default","Modal","FixedSize","Utility","UtilityAlwaysOnTop","ListHeader","ModelessDialog","MovableModal","FixedModal","HorizontalZoom","WithPlacard","ScrollFits","ScrollVertical","ScrollBoth","IdealSizeZoom","WithContextMenu","CloseVeto"];export{k as CloseVeto,n as Default,m as FixedModal,s as FixedSize,y as HorizontalZoom,g as IdealSizeZoom,d as ListHeader,a as Modal,p as ModelessDialog,c as MovableModal,u as ScrollBoth,b as ScrollFits,w as ScrollVertical,r as Utility,l as UtilityAlwaysOnTop,S as WithContextMenu,h as WithPlacard,F as __namedExportsOrder,M as default};
