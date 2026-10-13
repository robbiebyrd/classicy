import{w as p,aj as Q,u as Z,j as e,a9 as ee}from"./iframe-Dlm3ZoT0.js";import"./preload-helper-PPVm8Dsz.js";const j=3,F=1,te={u:"resizeU",d:"resizeD",l:"resizeL",r:"resizeR"},O=(t,r,o,l)=>{const d=t[r],w=t[r+1],S=Math.min(Math.max(o,-Math.max(0,d-l)),Math.max(0,w-l)),c=[...t];return c[r]=d+S,c[r+1]=w-S,c},k=t=>Array.from({length:t},()=>100/t),ne=(t,r)=>{if(!t||t.length!==r)return k(r);const o=t.reduce((l,d)=>l+d,0);return o<=0?k(r):t.map(l=>l/o*100)},v=({direction:t="horizontal",defaultSizes:r,minPaneSize:o=48,onResize:l,onResizeCommit:d,className:w,children:S})=>{const c=p.Children.toArray(S),P=p.useRef(!1);c.length>j&&!P.current&&(P.current=!0,Q("warn","ClassicySplitView",`supports at most ${j} content areas; ignoring ${c.length-j} extra child(ren). Nest another ClassicySplitView inside a pane for more regions.`));const N=c.slice(0,j),A=N.length,E=p.useRef(null),L=Z(),[X,q]=p.useState(null),[K,Y]=p.useState(()=>ne(r,A)),m=K.length===A?K:k(A),a=t==="horizontal",M=()=>{const i=E.current;if(!i)return 0;const n=i.getBoundingClientRect();return a?n.width:n.height},_=i=>{Y(i),l?.(i)},$=i=>n=>{const u=M();if(u<=0)return;n.preventDefault();const y=a?n.clientX:n.clientY,f=m,R=o/u*100;let h=null,z=y,H=null;const U=W=>{const g=a?W.clientX:W.clientY;if(g!==z){const x=a?g>z?"r":"l":g>z?"d":"u";z=g,x!==H&&(H=x,q(x),L(te[x]))}const J=(g-y)/u*100;h=O(f,i,J,R),_(h)},B=()=>{document.removeEventListener("mousemove",U),document.removeEventListener("mouseup",B),q(null),L(),h&&d?.(h)};document.addEventListener("mousemove",U),document.addEventListener("mouseup",B)},G=i=>n=>{const u=a?"ArrowLeft":"ArrowUp",y=a?"ArrowRight":"ArrowDown";if(n.key!==u&&n.key!==y)return;const f=M();if(f<=0)return;n.preventDefault();const R=n.key===y?F:-F,h=o/f*100;_(O(m,i,R,h))},I=i=>{(a?["ArrowLeft","ArrowRight"]:["ArrowUp","ArrowDown"]).includes(i.key)&&d?.(m)};return e.jsx("div",{ref:E,"data-drag-direction":X??void 0,className:ee("classicySplitView",a?"classicySplitViewHorizontal":"classicySplitViewVertical",w),children:N.map((i,n)=>e.jsxs(p.Fragment,{children:[n>0&&e.jsx("div",{role:"separator",tabIndex:0,"aria-orientation":a?"vertical":"horizontal","aria-valuenow":Math.round(m[n-1]),"aria-valuemin":0,"aria-valuemax":100,className:"classicySplitViewDivider",onMouseDown:$(n-1),onKeyDown:G(n-1),onKeyUp:d?I:void 0}),e.jsx("div",{className:"classicySplitViewPane",style:{flexGrow:m[n],...a?{minWidth:o}:{minHeight:o}},children:i})]},n))})};v.__docgenInfo={description:`A resizable container splitting two or three content areas along a single
axis. The bordered divider between panes carries the Platinum window-frame
treatment (\`--color-window-frame\` fill with the \`platinumWindowBorder\`
bevel) and is dragged to trade space between the two panes it separates —
dragging toward the leading side grows the trailing pane and shrinks the
leading one, exactly like a window frame edge being pushed.`,methods:[],displayName:"ClassicySplitView",props:{direction:{required:!1,tsType:{name:"union",raw:'"horizontal" | "vertical"',elements:[{name:"literal",value:'"horizontal"'},{name:"literal",value:'"vertical"'}]},description:'Pane arrangement axis; `"horizontal"` (default) is side-by-side.',defaultValue:{value:'"horizontal"',computed:!1}},defaultSizes:{required:!1,tsType:{name:"Array",elements:[{name:"number"}],raw:"number[]"},description:`Initial pane sizes as percentages, one per child (normalized to 100).
Ignored, with an equal split used instead, when the length doesn't
match the pane count. Sizes are uncontrolled after mount; watch
\`onResize\` to observe changes.`},minPaneSize:{required:!1,tsType:{name:"number"},description:"Smallest a pane may get, in pixels, while dragging a divider.",defaultValue:{value:"48",computed:!1}},onResize:{required:!1,tsType:{name:"signature",type:"function",raw:"(sizes: number[]) => void",signature:{arguments:[{type:{name:"Array",elements:[{name:"number"}],raw:"number[]"},name:"sizes"}],return:{name:"void"}}},description:"Fired with the new percentage sizes on every divider drag step."},onResizeCommit:{required:!1,tsType:{name:"signature",type:"function",raw:"(sizes: number[]) => void",signature:{arguments:[{type:{name:"Array",elements:[{name:"number"}],raw:"number[]"},name:"sizes"}],return:{name:"void"}}},description:`Fired once per resize gesture — on mouse release after a drag, or on
arrow-key release — with the final percentage sizes. Use this to
persist the user's chosen split (e.g. dispatching into app state from
a wrapping ClassicyWindow/ClassicyApp) without a store write per
intermediate step; pass the saved sizes back as \`defaultSizes\` on the
next mount to restore them.`},className:{required:!1,tsType:{name:"string"},description:"Extra class names to merge onto the root element."},children:{required:!0,tsType:{name:"ReactNode"},description:"Two or three content areas; extras are dropped with a dev warning."}}};const re={title:"Controls/SplitView",component:v},s={padding:8,fontFamily:"var(--body-font), sans-serif"},b={args:{direction:"horizontal",children:[e.jsx("div",{style:s,children:"Leading pane. Drag the frame-edge divider to trade space with the other pane."},"leading"),e.jsx("div",{style:s,children:"Trailing pane."},"trailing")]},decorators:[t=>e.jsx("div",{style:{width:480,height:240},children:e.jsx(t,{})})]},C={args:{direction:"vertical",children:[e.jsx("div",{style:s,children:"Top pane."},"top"),e.jsx("div",{style:s,children:"Bottom pane."},"bottom")]},decorators:[t=>e.jsx("div",{style:{width:480,height:320},children:e.jsx(t,{})})]},T={args:{direction:"horizontal",defaultSizes:[25,50,25],children:[e.jsx("div",{style:s,children:"25%"},"one"),e.jsx("div",{style:s,children:"50%"},"two"),e.jsx("div",{style:s,children:"25%"},"three")]},decorators:[t=>e.jsx("div",{style:{width:640,height:240},children:e.jsx(t,{})})]},D={render:()=>e.jsx("div",{style:{width:640,height:360},children:e.jsxs(v,{direction:"horizontal",defaultSizes:[35,65],children:[e.jsx("div",{style:s,children:"Sidebar"}),e.jsxs(v,{direction:"vertical",defaultSizes:[70,30],children:[e.jsx("div",{style:s,children:"Main content"}),e.jsx("div",{style:s,children:"Console"})]})]})})},V={render:()=>e.jsx("div",{style:{width:480,height:240},children:e.jsxs(v,{defaultSizes:[40,60],onResizeCommit:t=>console.log("save these sizes to app state:",t),children:[e.jsx("div",{style:s,children:"Drag the divider, then release."}),e.jsx("div",{style:s,children:"The committed sizes are logged to the console once per gesture."})]})})};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
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
}`,...b.parameters?.docs?.source}}};C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
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
}`,...C.parameters?.docs?.source}}};T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
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
}`,...T.parameters?.docs?.source}}};D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
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
}`,...D.parameters?.docs?.source}}};V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: 480,
    height: 240
  }}>
            <ClassicySplitView defaultSizes={[40, 60]} onResizeCommit={sizes => console.log("save these sizes to app state:", sizes)}>
                <div style={paneStyle}>Drag the divider, then release.</div>
                <div style={paneStyle}>
                    The committed sizes are logged to the console once per gesture.
                </div>
            </ClassicySplitView>
        </div>
}`,...V.parameters?.docs?.source}}};const ae=["TwoPanesHorizontal","TwoPanesVertical","ThreePanesWithDefaultSizes","NestedSplits","CommitOnRelease"];export{V as CommitOnRelease,D as NestedSplits,T as ThreePanesWithDefaultSizes,b as TwoPanesHorizontal,C as TwoPanesVertical,ae as __namedExportsOrder,re as default};
