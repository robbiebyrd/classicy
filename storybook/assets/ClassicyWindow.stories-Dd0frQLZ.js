import{d as o,j as e}from"./iframe-DRsFS4-m.js";import{d as u,S as i}from"./helpers-C9OE7K32.js";import{C as S}from"./ClassicyPlacard-CR8Q9j9X.js";import"./preload-helper-PPVm8Dsz.js";const z={title:"Desktop/Window",component:o,parameters:u},b={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"default",appId:"storybook.app",title:"Untitled Document",initialSize:[440,300],initialPosition:[80,60],children:e.jsx("p",{style:{padding:"1em"},children:"A resizable, movable, collapsable Platinum window."})})})},h={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"modal",appId:"storybook.app",title:"Alert",modal:!0,closable:!0,resizable:!1,initialSize:[320,140],initialPosition:["center","center"],children:e.jsx("p",{style:{padding:"1em"},children:"This is a modal dialog window."})})})},g={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"fixed",appId:"storybook.app",title:"Fixed Palette",resizable:!1,zoomable:!1,initialSize:[260,180],initialPosition:[120,90],children:e.jsx("p",{style:{padding:"1em"},children:"Not resizable, not zoomable."})})})},a={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"utility",appId:"storybook.app",title:"Tools",windowType:"utility",zoomable:!1,initialSize:[120,240],initialPosition:[140,90],children:e.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,padding:4},children:["▲","●","◆","■","✕","＋","▬","A"].map(t=>e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:44,fontSize:22,border:"1px solid var(--color-system-05)",background:"var(--color-system-02)"},children:t},t))})})})},n={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"utility-always-on-top",appId:"storybook.app",title:"Tools",windowType:"utility",alwaysOnTop:!0,zoomable:!1,initialSize:[120,240],initialPosition:[140,90],children:e.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,padding:4},children:["▲","●","◆","■","✕","＋","▬","A"].map(t=>e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:44,fontSize:22,border:"1px solid var(--color-system-05)",background:"var(--color-system-02)"},children:t},t))})})})},r={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"list-header",appId:"storybook.app",title:"Documents",headerVariant:"list",initialSize:[420,260],initialPosition:[90,70],header:e.jsxs("div",{style:{display:"flex",gap:"2em",padding:"0 1em"},children:[e.jsx("span",{children:"Name"}),e.jsx("span",{children:"Date Modified"}),e.jsx("span",{children:"Size"})]}),children:e.jsx("p",{style:{padding:"1em"},children:"List-view column header (no bottom line)."})})})},s={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"modeless",appId:"storybook.app",title:"Find",contentFrame:!0,resizable:!1,scrollable:!1,initialSize:[320,160],initialPosition:[120,90],children:e.jsx("p",{style:{padding:"1em"},children:"A modeless dialog with a 2px content-region frame."})})})},l={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"movable-modal",appId:"storybook.app",title:"Save Changes",modal:!0,closable:!0,resizable:!1,initialSize:[340,150],initialPosition:["center","center"],children:e.jsx("p",{style:{padding:"1em"},children:"Movable modal: drag the title bar, Escape to dismiss, outside-click beeps."})})})},d={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"fixed-modal",appId:"storybook.app",title:"Error",modal:!0,type:"error",closable:!0,resizable:!1,initialSize:[320,140],initialPosition:["center","center"],children:e.jsx("p",{style:{padding:"1em"},children:"A fixed, non-movable modal alert."})})})},p={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"hzoom",appId:"storybook.app",title:"Wide Zoom",zoomMode:"horizontal",initialSize:[320,220],initialPosition:[100,90],children:e.jsx("p",{style:{padding:"1em"},children:"Click the zoom box: this window grows horizontally only."})})})},c={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"placard",appId:"storybook.app",title:"Untitled Document",initialSize:[440,300],initialPosition:[80,60],placard:e.jsx(S,{menuItems:[{id:"50",title:"50%"},{id:"100",title:"100%"},{id:"200",title:"200%"},{id:"fit",title:"Fit in Window"}],onSelect:t=>console.log("magnification:",t),children:"100%"}),children:e.jsx("p",{style:{padding:"1em"},children:"A Platinum window with a magnification placard pinned to the bottom-left, left of the horizontal scroll bar."})})})},m={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"scrollv",appId:"storybook.app",title:"Vertical Scroll",initialSize:[260,220],initialPosition:[80,60],children:e.jsx("div",{style:{width:180,height:900,padding:"1em"},children:"Tall content — vertical scroll bar only."})})})},y={render:()=>e.jsx(i,{id:"storybook.app",name:"Storybook",children:e.jsx(o,{id:"scrollb",appId:"storybook.app",title:"Both Scroll",initialSize:[320,240],initialPosition:[80,60],children:e.jsx("div",{style:{width:900,height:900,padding:"1em"},children:"Large content — both scroll bars and the grow-box corner."})})})};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="default" appId="storybook.app" title="Untitled Document" initialSize={[440, 300]} initialPosition={[80, 60]}>
                <p style={{
        padding: "1em"
      }}>
                    A resizable, movable, collapsable Platinum window.
                </p>
            </ClassicyWindow>
        </StoryApp>
}`,...b.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="modal" appId="storybook.app" title="Alert" modal={true} closable={true} resizable={false} initialSize={[320, 140]} initialPosition={["center", "center"]}>
                <p style={{
        padding: "1em"
      }}>This is a modal dialog window.</p>
            </ClassicyWindow>
        </StoryApp>
}`,...h.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="fixed" appId="storybook.app" title="Fixed Palette" resizable={false} zoomable={false} initialSize={[260, 180]} initialPosition={[120, 90]}>
                <p style={{
        padding: "1em"
      }}>Not resizable, not zoomable.</p>
            </ClassicyWindow>
        </StoryApp>
}`,...g.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
}`,...a.parameters?.docs?.source},description:{story:'#205 — a utility / tool-palette window. `windowType="utility"` swaps the\npinstriped document title bar for a crosshatch tool-palette drag region.\nThe narrow frame on every side is now a drag handle too.',...a.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:`A utility palette with \`alwaysOnTop\`. Unlike the plain Utility story, this
palette stays in the floating band (z-index 350) even when its owning app is
backgrounded, so it floats above other apps' windows — but still below error
modals.`,...n.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
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
}`,...r.parameters?.docs?.source},description:{story:'#183 — list-view header. `headerVariant="list"` removes the beveled bottom\nseparator so the header reads as a column-heading strip.',...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="modeless" appId="storybook.app" title="Find" contentFrame={true} resizable={false} scrollable={false} initialSize={[320, 160]} initialPosition={[120, 90]}>
                <p style={{
        padding: "1em"
      }}>
                    A modeless dialog with a 2px content-region frame.
                </p>
            </ClassicyWindow>
        </StoryApp>
}`,...s.parameters?.docs?.source},description:{story:"#203 / #202 — a modeless dialog. `contentFrame` draws a 2px active/inactive\nframe around the window body. Modeless dialogs coexist with other windows,\nso this is a plain (non-modal) window with the framed body.",...s.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
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
}`,...l.parameters?.docs?.source},description:{story:'#194 — a movable modal dialog. `modal` + not `type="error"` stays draggable\nand (per HIG) shows no zoom box. It traps Tab focus, renders an input-blocking\nscrim (clicking outside beeps), and dismisses on Escape / Command-period.',...l.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="fixed-modal" appId="storybook.app" title="Error" modal={true} type="error" closable={true} resizable={false} initialSize={[320, 140]} initialPosition={["center", "center"]}>
                <p style={{
        padding: "1em"
      }}>A fixed, non-movable modal alert.</p>
            </ClassicyWindow>
        </StoryApp>
}`,...d.parameters?.docs?.source},description:{story:'#197 — a fixed (non-movable) modal alert. `modal` + `type="error"` cannot be\ndragged and shows the red error frame; the scrim blocks and beeps on outside\nclicks.',...d.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="hzoom" appId="storybook.app" title="Wide Zoom" zoomMode="horizontal" initialSize={[320, 220]} initialPosition={[100, 90]}>
                <p style={{
        padding: "1em"
      }}>
                    Click the zoom box: this window grows horizontally only.
                </p>
            </ClassicyWindow>
        </StoryApp>
}`,...p.parameters?.docs?.source},description:{story:"#208 — zoom modes. `zoomMode` controls whether the zoom box grows both axes\n(`full`), only the width (`horizontal`), or only the height (`vertical`). The\nuser's pre-zoom rect is remembered and restored on un-zoom.",...p.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
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
}`,...c.parameters?.docs?.source},description:{story:"#196 — a window with a Platinum placard in the bottom-left status region, to\nthe left of the horizontal scroll bar. Here the placard is a magnification\npop-up (a `menuItems` placard) as commonly seen in Mac OS 8 document windows.",...c.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
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
}`,...m.parameters?.docs?.source},description:{story:`Vertical-only scroll in a resizable window: the vertical scroll bar runs the
full height and its bottom arrow sits next to the grow box. Used to verify the
Smart Scrolling end-arrow clears the resizer.`,...m.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
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
}`,...y.parameters?.docs?.source},description:{story:"Both-axes scroll in a resizable window (vertical + horizontal + corner).",...y.parameters?.docs?.description}}};const v=["Default","Modal","FixedSize","Utility","UtilityAlwaysOnTop","ListHeader","ModelessDialog","MovableModal","FixedModal","HorizontalZoom","WithPlacard","ScrollVertical","ScrollBoth"];export{b as Default,d as FixedModal,g as FixedSize,p as HorizontalZoom,r as ListHeader,h as Modal,s as ModelessDialog,l as MovableModal,y as ScrollBoth,m as ScrollVertical,a as Utility,n as UtilityAlwaysOnTop,c as WithPlacard,v as __namedExportsOrder,z as default};
