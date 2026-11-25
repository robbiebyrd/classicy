import{j as e,h,b as y}from"./iframe-BxRT98ll.js";import{C as c}from"./ClassicySplitView-BcSbPB47.js";import"./preload-helper-DhQH6ajB.js";import"./useClassicyCursor-DAofrWh9.js";const C={title:"Controls/SplitView",component:c},i={padding:8,fontFamily:"var(--body-font), sans-serif"},r={args:{direction:"horizontal",children:[e.jsx("div",{style:i,children:"Leading pane. Drag the frame-edge divider to trade space with the other pane."},"leading"),e.jsx("div",{style:i,children:"Trailing pane."},"trailing")]},decorators:[t=>e.jsx("div",{style:{width:480,height:240},children:e.jsx(t,{})})]},n={args:{direction:"vertical",children:[e.jsx("div",{style:i,children:"Top pane."},"top"),e.jsx("div",{style:i,children:"Bottom pane."},"bottom")]},decorators:[t=>e.jsx("div",{style:{width:480,height:320},children:e.jsx(t,{})})]},o={args:{direction:"horizontal",defaultSizes:[25,50,25],children:[e.jsx("div",{style:i,children:"25%"},"one"),e.jsx("div",{style:i,children:"50%"},"two"),e.jsx("div",{style:i,children:"25%"},"three")]},decorators:[t=>e.jsx("div",{style:{width:640,height:240},children:e.jsx(t,{})})]},a={render:()=>e.jsx("div",{style:{width:640,height:360},children:e.jsxs(c,{direction:"horizontal",defaultSizes:[35,65],children:[e.jsx("div",{style:i,children:"Sidebar"}),e.jsxs(c,{direction:"vertical",defaultSizes:[70,30],children:[e.jsx("div",{style:i,children:"Main content"}),e.jsx("div",{style:i,children:"Console"})]})]})})},x=()=>{const[t,p]=h.useState([40,60]),[s,u]=h.useState([40,60]),m=S=>S.map(g=>`${Math.round(g)}%`).join(" / ");return e.jsx("div",{style:{width:480,height:240},children:e.jsxs(c,{defaultSizes:[40,60],onResize:p,onResizeCommit:u,children:[e.jsx("div",{style:i,children:"Drag the divider, then release."}),e.jsxs("div",{style:i,children:[e.jsxs("p",{children:["onResize (every step): ",m(t)]}),e.jsxs("p",{children:["onResizeCommit (once per gesture): ",m(s)]})]})]})})},d={render:()=>e.jsx(x,{})},v=t=>e.jsx("div",{style:i,children:Array.from({length:24},(p,s)=>e.jsxs("p",{children:[t,", line ",s+1,"."]},s))}),w=()=>{const t=h.useRef(null),[p,s]=h.useState("leading");return e.jsxs("div",{style:{display:"grid",gap:8,width:480},children:[e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx(y,{onClickFunc:()=>t.current?.split(),children:"Split"}),e.jsx(y,{disabled:p!==null,onClickFunc:()=>t.current?.removeSplit(),children:"Remove Split"})]}),e.jsx("div",{style:{height:320},children:e.jsxs(c,{direction:"vertical",splittable:!0,defaultClosed:"leading",onSplitChange:s,commandsRef:t,children:[v("Top pane"),v("Bottom pane")]})})]})},l={render:()=>e.jsx(w,{})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    direction: "horizontal",
    children: [<div key="leading" style={paneStyle}>
                Leading pane. Drag the frame-edge divider to trade space with the other
                pane.
            </div>, <div key="trailing" style={paneStyle}>
                Trailing pane.
            </div>]
  },
  decorators: [Story => <div style={{
    width: 480,
    height: 240
  }}>
                <Story />
            </div>]
}`,...r.parameters?.docs?.source},description:{story:"Two side-by-side panes split equally (no `defaultSizes`). Drag the divider,\nor focus it with Tab and press \u2190/\u2192 to nudge it 1% at a time; neither pane\nshrinks below `minPaneSize` (48 px).",...r.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    direction: "vertical",
    children: [<div key="top" style={paneStyle}>
                Top pane.
            </div>, <div key="bottom" style={paneStyle}>
                Bottom pane.
            </div>]
  },
  decorators: [Story => <div style={{
    width: 480,
    height: 320
  }}>
                <Story />
            </div>]
}`,...n.parameters?.docs?.source},description:{story:'`direction="vertical"` stacks the panes; \u2191/\u2193 nudge the focused divider.',...n.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    direction: "horizontal",
    defaultSizes: [25, 50, 25],
    children: [<div key="one" style={paneStyle}>
                25%
            </div>, <div key="two" style={paneStyle}>
                50%
            </div>, <div key="three" style={paneStyle}>
                25%
            </div>]
  },
  decorators: [Story => <div style={{
    width: 640,
    height: 240
  }}>
                <Story />
            </div>]
}`,...o.parameters?.docs?.source},description:{story:"Three panes, the maximum per component, with `defaultSizes` as\npercentages. Each divider only trades space between its two neighbors.",...o.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: 640,
    height: 360
  }}>
            <ClassicySplitView direction="horizontal" defaultSizes={[35, 65]}>
                <div style={paneStyle}>Sidebar</div>
                <ClassicySplitView direction="vertical" defaultSizes={[70, 30]}>
                    <div style={paneStyle}>Main content</div>
                    <div style={paneStyle}>Console</div>
                </ClassicySplitView>
            </ClassicySplitView>
        </div>
}`,...a.parameters?.docs?.source},description:{story:`Combining directions is done by nesting a split view inside a pane, never
by a grid mode: here a sidebar beside a vertically split main area.`,...a.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <CommitDemo />
}`,...d.parameters?.docs?.source},description:{story:"The persistence round trip: `onResize` fires on every drag step, while\n`onResizeCommit` fires once per gesture (mouse release or arrow-key\nrelease) with the final sizes \u2014 save those to app state and pass them back\nas `defaultSizes` on the next mount to restore the user's split.",...d.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <SplittableDemo />
}`,...l.parameters?.docs?.source},description:{story:`A view the user splits (WIG Ch.6 "Splitting Windows", pp.92-95; HIG7
pp.170-172): it opens unsplit, the split box at the top of the scroll
bar. Drag the box down to split the view; drag the divider back to the
top or bottom (or double-click it) to close the split, which leaves a
split box where the closed pane was; double-click a split box to reopen
where the split last was. Split (a window's command, here a button)
splits in the middle and moves the split from the keyboard: the arrow
keys move it, Enter sets it, Escape puts it back.`,...l.parameters?.docs?.description}}};const k=["TwoPanesHorizontal","TwoPanesVertical","ThreePanesWithDefaultSizes","NestedSplits","CommitOnRelease","Splittable"];export{d as CommitOnRelease,a as NestedSplits,l as Splittable,o as ThreePanesWithDefaultSizes,r as TwoPanesHorizontal,n as TwoPanesVertical,k as __namedExportsOrder,C as default};
