import{aD as d,j as e,d as c}from"./iframe-BUsjYt92.js";import"./preload-helper-CiDKIbga.js";const x={title:"Controls/SplitView",component:d},t={padding:8,fontFamily:"var(--body-font), sans-serif"},s={args:{direction:"horizontal",children:[e.jsx("div",{style:t,children:"Leading pane. Drag the frame-edge divider to trade space with the other pane."},"leading"),e.jsx("div",{style:t,children:"Trailing pane."},"trailing")]},decorators:[i=>e.jsx("div",{style:{width:480,height:240},children:e.jsx(i,{})})]},n={args:{direction:"vertical",children:[e.jsx("div",{style:t,children:"Top pane."},"top"),e.jsx("div",{style:t,children:"Bottom pane."},"bottom")]},decorators:[i=>e.jsx("div",{style:{width:480,height:320},children:e.jsx(i,{})})]},r={args:{direction:"horizontal",defaultSizes:[25,50,25],children:[e.jsx("div",{style:t,children:"25%"},"one"),e.jsx("div",{style:t,children:"50%"},"two"),e.jsx("div",{style:t,children:"25%"},"three")]},decorators:[i=>e.jsx("div",{style:{width:640,height:240},children:e.jsx(i,{})})]},a={render:()=>e.jsx("div",{style:{width:640,height:360},children:e.jsxs(d,{direction:"horizontal",defaultSizes:[35,65],children:[e.jsx("div",{style:t,children:"Sidebar"}),e.jsxs(d,{direction:"vertical",defaultSizes:[70,30],children:[e.jsx("div",{style:t,children:"Main content"}),e.jsx("div",{style:t,children:"Console"})]})]})})},u=()=>{const[i,p]=c.useState([40,60]),[h,y]=c.useState([40,60]),l=m=>m.map(v=>`${Math.round(v)}%`).join(" / ");return e.jsx("div",{style:{width:480,height:240},children:e.jsxs(d,{defaultSizes:[40,60],onResize:p,onResizeCommit:y,children:[e.jsx("div",{style:t,children:"Drag the divider, then release."}),e.jsxs("div",{style:t,children:[e.jsxs("p",{children:["onResize (every step): ",l(i)]}),e.jsxs("p",{children:["onResizeCommit (once per gesture): ",l(h)]})]})]})})},o={render:()=>e.jsx(u,{})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
}`,...s.parameters?.docs?.source},description:{story:"Two side-by-side panes split equally (no `defaultSizes`). Drag the divider,\nor focus it with Tab and press \u2190/\u2192 to nudge it 1% at a time; neither pane\nshrinks below `minPaneSize` (48 px).",...s.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:'`direction="vertical"` stacks the panes; \u2191/\u2193 nudge the focused divider.',...n.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
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
}`,...r.parameters?.docs?.source},description:{story:"Three panes, the maximum per component, with `defaultSizes` as\npercentages. Each divider only trades space between its two neighbors.",...r.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
by a grid mode: here a sidebar beside a vertically split main area.`,...a.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <CommitDemo />
}`,...o.parameters?.docs?.source},description:{story:"The persistence round trip: `onResize` fires on every drag step, while\n`onResizeCommit` fires once per gesture (mouse release or arrow-key\nrelease) with the final sizes \u2014 save those to app state and pass them back\nas `defaultSizes` on the next mount to restore the user's split.",...o.parameters?.docs?.description}}};const w=["TwoPanesHorizontal","TwoPanesVertical","ThreePanesWithDefaultSizes","NestedSplits","CommitOnRelease"];export{o as CommitOnRelease,a as NestedSplits,r as ThreePanesWithDefaultSizes,s as TwoPanesHorizontal,n as TwoPanesVertical,w as __namedExportsOrder,x as default};
