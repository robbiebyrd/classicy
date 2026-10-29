import{i as c,aQ as Z,N as ee,j as e,aD as te}from"./iframe-BmEzrfuG.js";import"./preload-helper-shce2T3m.js";const R=3,F=1,ne={u:"resizeU",d:"resizeD",l:"resizeL",r:"resizeR"},I=(t,i,a,l)=>{const o=t[i],p=t[i+1],h=Math.min(Math.max(a,-Math.max(0,o-l)),Math.max(0,p-l)),u=[...t];return u[i]=o+h,u[i+1]=p-h,u},P=t=>Array.from({length:t},()=>100/t),se=(t,i)=>{if(!t||t.length!==i)return P(i);const a=t.reduce((l,o)=>l+o,0);return a<=0?P(i):t.map(l=>l/a*100)},C=({direction:t="horizontal",defaultSizes:i,minPaneSize:a=48,onResize:l,onResizeCommit:o,className:p,style:h,children:u})=>{const k=c.Children.toArray(u),E=c.useRef(!1);k.length>R&&!E.current&&(E.current=!0,Z("warn","ClassicySplitView",`supports at most ${R} content areas; ignoring ${k.length-R} extra child(ren). Nest another ClassicySplitView inside a pane for more regions.`));const N=k.slice(0,R),A=N.length,q=c.useRef(null),L=ee(),[X,M]=c.useState(null),[K,Y]=c.useState(()=>se(i,A)),y=K.length===A?K:P(A),d=t==="horizontal",H=()=>{const s=q.current;if(!s)return 0;const n=s.getBoundingClientRect();return d?n.width:n.height},_=s=>{Y(s),l?.(s)},$=s=>n=>{const g=H();if(g<=0)return;n.preventDefault();const v=d?n.clientX:n.clientY,j=y,V=a/g*100;let m=null,T=v,U=null;const B=W=>{const w=d?W.clientX:W.clientY;if(w!==T){const D=d?w>T?"r":"l":w>T?"d":"u";T=w,D!==U&&(U=D,M(D),L(ne[D]))}const J=(w-v)/g*100;m=I(j,s,J,V),_(m)},O=()=>{document.removeEventListener("mousemove",B),document.removeEventListener("mouseup",O),M(null),L(),m&&o?.(m)};document.addEventListener("mousemove",B),document.addEventListener("mouseup",O)},G=s=>n=>{const g=d?"ArrowLeft":"ArrowUp",v=d?"ArrowRight":"ArrowDown";if(n.key!==g&&n.key!==v)return;const j=H();if(j<=0)return;n.preventDefault();const V=n.key===v?F:-F,m=a/j*100;_(I(y,s,V,m))},Q=s=>{(d?["ArrowLeft","ArrowRight"]:["ArrowUp","ArrowDown"]).includes(s.key)&&o?.(y)};return e.jsx("div",{ref:q,"data-drag-direction":X??void 0,className:te("classicySplitView",d?"classicySplitViewHorizontal":"classicySplitViewVertical",p),style:h,children:N.map((s,n)=>e.jsxs(c.Fragment,{children:[n>0&&e.jsx("div",{role:"separator",tabIndex:0,"aria-orientation":d?"vertical":"horizontal","aria-valuenow":Math.round(y[n-1]),"aria-valuemin":0,"aria-valuemax":100,className:"classicySplitViewDivider",onMouseDown:$(n-1),onKeyDown:G(n-1),onKeyUp:o?Q:void 0}),e.jsx("div",{className:"classicySplitViewPane",style:{flexGrow:y[n],...d?{minWidth:a}:{minHeight:a}},children:s})]},n))})};C.__docgenInfo={description:`A resizable container splitting two or three content areas along a single
axis. The bordered divider between panes carries the Platinum window-frame
treatment (\`--color-window-frame\` fill with the \`platinumWindowBorder\`
bevel) and is dragged to trade space between the two panes it separates —
dragging toward the leading side grows the trailing pane and shrinks the
leading one, exactly like a window frame edge being pushed.

There is no HTML equivalent (the nearest ancestor is the obsolete
\`<frameset>\`). The root fills its parent, so give the parent a size; each
pane scrolls its own overflow. At most three panes per component — nest a split view
inside a pane to combine directions. Each divider follows the ARIA
window-splitter pattern (\`role="separator"\`, focusable, arrow keys along
the split axis nudge it by 1%), and a drag swaps the body cursor for the
Mac OS 8 directional resize cursor. Sizes are uncontrolled after mount:
persist them from \`onResizeCommit\` and feed them back as \`defaultSizes\`.
A window whose content is a split view should pass \`scrollable={false}\`,
since the panes scroll themselves.

\`\`\`tsx
<ClassicySplitView direction="horizontal" defaultSizes={[30, 70]} onResizeCommit={saveSizes}>
    <Sidebar />
    <Content />
</ClassicySplitView>
\`\`\``,methods:[],displayName:"ClassicySplitView",props:{direction:{required:!1,tsType:{name:"union",raw:'"horizontal" | "vertical"',elements:[{name:"literal",value:'"horizontal"'},{name:"literal",value:'"vertical"'}]},description:'Pane arrangement axis: `"horizontal"` is side-by-side, `"vertical"` is\nstacked. Defaults to `"horizontal"`.',defaultValue:{value:'"horizontal"',computed:!1}},defaultSizes:{required:!1,tsType:{name:"Array",elements:[{name:"number"}],raw:"number[]"},description:`Initial pane sizes as percentages, one per child (normalized to 100).
Ignored, with an equal split used instead, when the length doesn't
match the pane count. Sizes are uncontrolled after mount; watch
\`onResize\` to observe changes.`},minPaneSize:{required:!1,tsType:{name:"number"},description:"Smallest a pane may get, in pixels, while dragging or nudging a divider\n(also applied as each pane's CSS minimum). Defaults to `48`.",defaultValue:{value:"48",computed:!1}},onResize:{required:!1,tsType:{name:"signature",type:"function",raw:"(sizes: number[]) => void",signature:{arguments:[{type:{name:"Array",elements:[{name:"number"}],raw:"number[]"},name:"sizes"}],return:{name:"void"}}},description:"Fired with the new percentage sizes on every divider drag step."},onResizeCommit:{required:!1,tsType:{name:"signature",type:"function",raw:"(sizes: number[]) => void",signature:{arguments:[{type:{name:"Array",elements:[{name:"number"}],raw:"number[]"},name:"sizes"}],return:{name:"void"}}},description:`Fired once per resize gesture — on mouse release after a drag, or on
arrow-key release — with the final percentage sizes. Use this to
persist the user's chosen split (e.g. dispatching into app state from
a wrapping ClassicyWindow/ClassicyApp) without a store write per
intermediate step; pass the saved sizes back as \`defaultSizes\` on the
next mount to restore them.`},className:{required:!1,tsType:{name:"string"},description:"Extra class names to merge onto the root element."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the root element after the component's own."},children:{required:!0,tsType:{name:"ReactNode"},description:"Two or three content areas; extras are dropped with a dev warning."}}};const oe={title:"Controls/SplitView",component:C},r={padding:8,fontFamily:"var(--body-font), sans-serif"},f={args:{direction:"horizontal",children:[e.jsx("div",{style:r,children:"Leading pane. Drag the frame-edge divider to trade space with the other pane."},"leading"),e.jsx("div",{style:r,children:"Trailing pane."},"trailing")]},decorators:[t=>e.jsx("div",{style:{width:480,height:240},children:e.jsx(t,{})})]},S={args:{direction:"vertical",children:[e.jsx("div",{style:r,children:"Top pane."},"top"),e.jsx("div",{style:r,children:"Bottom pane."},"bottom")]},decorators:[t=>e.jsx("div",{style:{width:480,height:320},children:e.jsx(t,{})})]},z={args:{direction:"horizontal",defaultSizes:[25,50,25],children:[e.jsx("div",{style:r,children:"25%"},"one"),e.jsx("div",{style:r,children:"50%"},"two"),e.jsx("div",{style:r,children:"25%"},"three")]},decorators:[t=>e.jsx("div",{style:{width:640,height:240},children:e.jsx(t,{})})]},x={render:()=>e.jsx("div",{style:{width:640,height:360},children:e.jsxs(C,{direction:"horizontal",defaultSizes:[35,65],children:[e.jsx("div",{style:r,children:"Sidebar"}),e.jsxs(C,{direction:"vertical",defaultSizes:[70,30],children:[e.jsx("div",{style:r,children:"Main content"}),e.jsx("div",{style:r,children:"Console"})]})]})})},ie=()=>{const[t,i]=c.useState([40,60]),[a,l]=c.useState([40,60]),o=p=>p.map(h=>`${Math.round(h)}%`).join(" / ");return e.jsx("div",{style:{width:480,height:240},children:e.jsxs(C,{defaultSizes:[40,60],onResize:i,onResizeCommit:l,children:[e.jsx("div",{style:r,children:"Drag the divider, then release."}),e.jsxs("div",{style:r,children:[e.jsxs("p",{children:["onResize (every step): ",o(t)]}),e.jsxs("p",{children:["onResizeCommit (once per gesture): ",o(a)]})]})]})})},b={render:()=>e.jsx(ie,{})};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
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
}`,...f.parameters?.docs?.source},description:{story:"Two side-by-side panes split equally (no `defaultSizes`). Drag the divider,\nor focus it with Tab and press ←/→ to nudge it 1% at a time; neither pane\nshrinks below `minPaneSize` (48 px).",...f.parameters?.docs?.description}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
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
}`,...S.parameters?.docs?.source},description:{story:'`direction="vertical"` stacks the panes; ↑/↓ nudge the focused divider.',...S.parameters?.docs?.description}}};z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
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
}`,...z.parameters?.docs?.source},description:{story:"Three panes, the maximum per component, with `defaultSizes` as\npercentages. Each divider only trades space between its two neighbours.",...z.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
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
}`,...x.parameters?.docs?.source},description:{story:`Combining directions is done by nesting a split view inside a pane, never
by a grid mode: here a sidebar beside a vertically split main area.`,...x.parameters?.docs?.description}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <CommitDemo />
}`,...b.parameters?.docs?.source},description:{story:"The persistence round trip: `onResize` fires on every drag step, while\n`onResizeCommit` fires once per gesture (mouse release or arrow-key\nrelease) with the final sizes — save those to app state and pass them back\nas `defaultSizes` on the next mount to restore the user's split.",...b.parameters?.docs?.description}}};const le=["TwoPanesHorizontal","TwoPanesVertical","ThreePanesWithDefaultSizes","NestedSplits","CommitOnRelease"];export{b as CommitOnRelease,x as NestedSplits,z as ThreePanesWithDefaultSizes,f as TwoPanesHorizontal,S as TwoPanesVertical,le as __namedExportsOrder,oe as default};
