import{h as a,bw as ue,bx as We,j as D,bm as H,a0 as pe,ar as Le,by as Ne,bz as je,bA as Fe}from"./iframe-BIRwakrV.js";import{u as Be}from"./useClassicyCursor-CPRrzCj_.js";const W=3,me=1,Ge={u:"resizeU",d:"resizeD",l:"resizeL",r:"resizeR"},he=(n,l,s,c)=>{const i=n[l],k=n[l+1],x=Math.min(Math.max(s,-Math.max(0,i-c)),Math.max(0,k-c)),p=[...n];return p[l]=i+x,p[l+1]=k-x,p},L=n=>Array.from({length:n},()=>100/n),Ie=(n,l,s)=>n<s?"leading":n>=l-s?"trailing":null,Ke=(n,l)=>{const[s,c]=n,i=Math.min(l,(s+c)/2);return s<i?[i,s+c-i]:c<i?[s+c-i,i]:n},He=(n,l)=>{if(!n||n.length!==l)return L(l);const s=n.reduce((c,i)=>c+i,0);return s<=0?L(l):n.map(c=>c/s*100)},Ue=({direction:n="horizontal",defaultSizes:l,minPaneSize:s=48,onResize:c,onResizeCommit:i,splittable:k=!1,defaultClosed:x,onSplitChange:p,commandsRef:we,className:ge,style:fe,children:ve})=>{const N=a.Children.toArray(ve),U=a.useRef(!1);N.length>W&&!U.current&&(U.current=!0,ue("warn","ClassicySplitView",`supports at most ${W} content areas; ignoring ${N.length-W} extra child(ren). Nest another ClassicySplitView inside a pane for more regions.`));const _=N.slice(0,W),f=_.length,E=k&&f===2,O=a.useRef(!1);k&&!E&&!O.current&&(O.current=!0,ue("warn","ClassicySplitView",`splittable needs exactly two content areas, not ${f}; the split stays open.`));const j=a.useRef(null),X=a.useRef(null),T=Be(),Y=We(),[ye,F]=a.useState(null),[be,B]=a.useState(null),[$,Se]=a.useState(()=>He(l,f)),[Ce,v]=a.useState(()=>x??null),d=E?Ce:null,m=$.length===f?$:L(f),r=n==="horizontal",J=()=>{const t=j.current;if(!t)return 0;const e=t.getBoundingClientRect();return r?e.width:e.height},G=a.useRef(null);a.useEffect(()=>()=>G.current?.(),[]);const y=t=>{Se(t),c?.(t)},ze=t=>{v(t),p?.(t)},b=a.useRef(null),[V,Q]=a.useState(!1);a.useEffect(()=>{V&&X.current?.focus()},[V]);const ke=()=>{if(f<2||b.current)return;const t=typeof document>"u"?null:document.activeElement;b.current={sizes:m,closed:d,returnFocus:t instanceof HTMLElement?t:null},d&&(v(null),y(L(f))),Q(!0)},Z=(t,e)=>{const o=b.current;o&&(b.current=null,Q(!1),t?(i?.(m,{lost:!1}),o.closed!==null&&p?.(null)):(y(o.sizes),v(o.closed)),e&&o.returnFocus?.isConnected&&o.returnFocus.focus({preventScroll:!0}))},ee=()=>{!E||d||ze(m[0]<=m[1]?"leading":"trailing")};a.useImperativeHandle(we,()=>({split:ke,removeSplit:ee,isSplit:()=>d===null}));const te=(t,e=null)=>o=>{if(!Ne(o,Y))return;const w=j.current,u=J();if(!w||u<=0)return;o.preventDefault();const S=r?o.clientX:o.clientY,P=w.getBoundingClientRect(),De=r?P.left:P.top,se=o.currentTarget.getBoundingClientRect(),ie=r?se.width:se.height,I=m,xe=e==="leading"?[0,100]:e==="trailing"?[100,0]:I,R=d,ae=s/u*100,Te=g=>{if(!E)return null;const h=Ie(g-De,u,ie);return h||!e?h:(e==="leading"?g-S:S-g)<ie?e:null};let C=null,z=R;B(t);let M=S,re=null;const oe=g=>{const h=r?g.clientX:g.clientY;if(h!==M){const q=r?h>M?"r":"l":h>M?"d":"u";M=h,q!==re&&(re=q,F(q),T(Ge[q]))}const A=Te(h);if(A!==z&&(z=A,v(A)),A)return;const qe=(h-S)/u*100,de=he(xe,t,qe,ae);C=e?Ke(de,ae):de,y(C)},K=()=>{Pe(),Me(),document.removeEventListener("mousemove",oe),document.removeEventListener("mouseup",ce),G.current=null},le=g=>{if(K(),F(null),B(null),T(),z!==null){C&&y(I),z!==R&&p?.(z);return}R!==null&&p?.(null),C&&i?.(C,{lost:g})},ce=()=>le(!1),Ve=()=>{K(),F(null),B(null),T(),C&&y(I),z!==R&&v(R)};document.addEventListener("mousemove",oe),document.addEventListener("mouseup",ce);const Pe=je(()=>le(!0)),Me=Fe(Ve,Y);G.current=()=>{K(),T()}},Ee=t=>e=>{if(b.current&&(e.key==="Enter"||e.key==="Escape")){e.preventDefault(),e.stopPropagation(),Z(e.key==="Enter",!0);return}const o=r?"ArrowLeft":"ArrowUp",w=r?"ArrowRight":"ArrowDown";if(e.key!==o&&e.key!==w)return;const u=J();if(u<=0)return;e.preventDefault();const S=e.key===w?me:-me,P=s/u*100;y(he(m,t,S,P))},Re=t=>{b.current||!(r?["ArrowLeft","ArrowRight"]:["ArrowUp","ArrowDown"]).includes(t.key)||i?.(m,{lost:!1})},ne=d&&D.jsx("div",{className:"classicySplitViewSplitBox",onMouseDown:te(0,d),onDoubleClick:()=>{v(null),p?.(null)}}),Ae=r?"horizontal":"vertical";return D.jsx("div",{ref:j,"data-drag-direction":ye??void 0,className:H("classicySplitView",r?"classicySplitViewHorizontal":"classicySplitViewVertical",ge),style:fe,children:_.map((t,e)=>{const w=d===(e===0?"leading":"trailing"),u=d!==null&&!w;return D.jsxs(a.Fragment,{children:[e>0&&d===null&&D.jsx("div",{ref:e===1?X:void 0,role:"separator",tabIndex:0,"aria-orientation":r?"vertical":"horizontal","aria-valuenow":Math.round(m[e-1]),"aria-valuemin":0,"aria-valuemax":100,className:H("classicySplitViewDivider",pe({dragging:be===e-1||V&&e===1})),onMouseDown:te(e-1),onDoubleClick:E?ee:void 0,onKeyDown:Ee(e-1),onKeyUp:i?Re:void 0,onBlur:V&&e===1?()=>Z(!0,!1):void 0}),D.jsx(Le,{className:H("classicySplitViewPane",pe({collapsed:w})),style:{flexGrow:m[e],...r?{minWidth:s}:{minHeight:s}},vertical:u&&!r?"always":void 0,horizontal:u&&r?"always":void 0,barAccessories:u?{[Ae]:d==="leading"?{start:ne}:{end:ne}}:void 0,children:t})]},e)})})};Ue.__docgenInfo={description:`A resizable container splitting two or three content areas along a single
axis. The bordered divider between panes carries the Platinum window-frame
treatment (\`--color-window-frame\` fill with the \`platinum-window-border\` bevel
from Platinum's \`_mixins.scss\`) and is dragged to trade space between the two
panes it separates \u2014 dragging toward the leading side grows the trailing pane
and shrinks the leading one, exactly like a window frame edge being pushed.

There is no HTML equivalent (the nearest ancestor is the obsolete
\`<frameset>\`). The root fills its parent, so give the parent a size; each
pane scrolls its own overflow. At most three panes per component \u2014 nest a split view
inside a pane to combine directions. Each divider follows the ARIA
window-splitter pattern (\`role="separator"\`, focusable, arrow keys along
the split axis nudge it by 1%), and a drag swaps the body cursor for the
Mac OS 8 directional resize cursor; the moving divider carries the
\`dragging\` state, from the press to the release (and through the Split
command's keyboard mode). Sizes are uncontrolled after mount:
persist them from \`onResizeCommit\` and feed them back as \`defaultSizes\`.
Under a package whose layout says \`mouse: "windows"\` (Windows 98) only
button 1 drags a divider or a split box, and under \`input.escapeCancels\`
Escape mid-drag puts the split back as the press found it (closed again
if it was), committing nothing.
A window whose content is a split view should pass \`scrollable={false}\`,
since the panes scroll themselves. A \`splittable\` view can be closed to
one pane and reopened from its split box, and \`commandsRef\` gives a
window's menu the Split command (WIG Ch.6 "Splitting Windows").

\`\`\`tsx
<ClassicySplitView direction="horizontal" defaultSizes={[30, 70]} onResizeCommit={saveSizes}>
    <Sidebar />
    <Content />
</ClassicySplitView>
\`\`\``,methods:[{name:"split",docblock:null,modifiers:[],params:[],returns:null},{name:"removeSplit",docblock:null,modifiers:[],params:[],returns:null},{name:"isSplit",docblock:null,modifiers:[],params:[],returns:null}],displayName:"ClassicySplitView",props:{direction:{required:!1,tsType:{name:"union",raw:'"horizontal" | "vertical"',elements:[{name:"literal",value:'"horizontal"'},{name:"literal",value:'"vertical"'}]},description:'Pane arrangement axis: `"horizontal"` is side-by-side, `"vertical"` is\nstacked. Defaults to `"horizontal"`.',defaultValue:{value:'"horizontal"',computed:!1}},defaultSizes:{required:!1,tsType:{name:"Array",elements:[{name:"number"}],raw:"number[]"},description:`Initial pane sizes as percentages, one per child (normalized to 100).
Ignored, with an equal split used instead, when the length doesn't
match the pane count. Sizes are uncontrolled after mount; watch
\`onResize\` to observe changes.`},minPaneSize:{required:!1,tsType:{name:"number"},description:"Smallest a pane may get, in pixels, while dragging or nudging a divider\n(also applied as each pane's CSS minimum). Defaults to `48`.",defaultValue:{value:"48",computed:!1}},onResize:{required:!1,tsType:{name:"signature",type:"function",raw:"(sizes: number[]) => void",signature:{arguments:[{type:{name:"Array",elements:[{name:"number"}],raw:"number[]"},name:"sizes"}],return:{name:"void"}}},description:"Fired with the new percentage sizes on every divider drag step."},onResizeCommit:{required:!1,tsType:{name:"signature",type:"function",raw:"(sizes: number[], info: ClassicyGestureEnd) => void",signature:{arguments:[{type:{name:"Array",elements:[{name:"number"}],raw:"number[]"},name:"sizes"},{type:{name:"ClassicyGestureEnd"},name:"info"}],return:{name:"void"}}},description:`Fired once per resize gesture \u2014 on mouse release after a drag (or when
the drag's pointer stream is lost: the window blurs, a pointercancel,
the page is hidden; the divider stays where it was dragged), or on
arrow-key release \u2014 with the final percentage sizes, then
\`{ lost }\`: true when the drag ended by its pointer stream being lost,
false for a release or a key release. Use this to persist the user's
chosen split (e.g. dispatching into app state from a wrapping
ClassicyWindow/ClassicyApp) without a store write per intermediate
step; pass the saved sizes back as \`defaultSizes\` on the next mount to
restore them.`},splittable:{required:!1,tsType:{name:"boolean"},description:`Lets the user close and reopen the split of a two-pane view (WIG Ch.6
"Splitting Windows", pp.92-95; HIG7 pp.170-172): dragging the divider
to either end of the view (past \`minPaneSize\`, to within the divider's
own thickness of the edge) closes the pane it is dragged over, as does
a double-click on the divider (the smaller pane). While closed, the
other pane fills the view and keeps its scroll bar along the split
drawn, with a split box (\`classicySplitViewSplitBox\`) at its end on the
closed pane's side: dragging it out reopens the split there, and a
double-click reopens it where it last was. A closed pane stays mounted
(\`collapsed\`, not drawn). Ignored, with a dev warning, for three
panes. Defaults to \`false\`.`,defaultValue:{value:"false",computed:!1}},defaultClosed:{required:!1,tsType:{name:"union",raw:'"leading" | "trailing"',elements:[{name:"literal",value:'"leading"'},{name:"literal",value:'"trailing"'}]},description:"With `splittable`: start with this pane closed (the view unsplit)."},onSplitChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(closed: ClassicySplitViewPane | null) => void",signature:{arguments:[{type:{name:"union",raw:"ClassicySplitViewPane | null",elements:[{name:"union",raw:'"leading" | "trailing"',elements:[{name:"literal",value:'"leading"'},{name:"literal",value:'"trailing"'}]},{name:"null"}]},name:"closed"}],return:{name:"void"}}},description:"With `splittable`: called with the closed pane, or `null` when the\nsplit reopens, each time the user closes or reopens it (on release, a\ndouble-click, or the Split command's Enter). Persist it and pass it\nback as `defaultClosed`; a window's menu can name its command from it\n(Split or Remove Split)."},commandsRef:{required:!1,tsType:{name:"RefObject",elements:[{name:"union",raw:"ClassicySplitViewCommands | null",elements:[{name:"signature",type:"object",raw:`{
	/**
	 * The Split command (WIG Ch.6 "Splitting Windows", p.95): splits a
	 * closed \`splittable\` view in the middle, or takes the split where it
	 * is, and moves it from the keyboard: the focused divider's arrow keys
	 * move it, Enter sets it there (\`onResizeCommit\`, and \`onSplitChange\`
	 * when it opened), and Escape puts it back as it was, closed again if
	 * it was. Focus leaving the divider sets it too. Focus returns to where
	 * it was on Enter or Escape.
	 */
	split(): void;
	/**
	 * Closes a \`splittable\` view's split, the smaller pane closing (the
	 * leading one on a tie), as a double-click on its divider does.
	 */
	removeSplit(): void;
	/** Whether the view is split: always, unless \`splittable\` and closed. */
	isSplit(): boolean;
}`,signature:{properties:[{key:"split",value:{name:"void",required:!0},description:`The Split command (WIG Ch.6 "Splitting Windows", p.95): splits a
closed \`splittable\` view in the middle, or takes the split where it
is, and moves it from the keyboard: the focused divider's arrow keys
move it, Enter sets it there (\`onResizeCommit\`, and \`onSplitChange\`
when it opened), and Escape puts it back as it was, closed again if
it was. Focus leaving the divider sets it too. Focus returns to where
it was on Enter or Escape.`},{key:"removeSplit",value:{name:"void",required:!0},description:"Closes a `splittable` view's split, the smaller pane closing (the\nleading one on a tie), as a double-click on its divider does."},{key:"isSplit",value:{name:"boolean",required:!0},description:"Whether the view is split: always, unless `splittable` and closed."}]}},{name:"null"}]}],raw:"RefObject<ClassicySplitViewCommands | null>"},description:"Receives `{ split(), removeSplit(), isSplit() }`, for a Split command."},className:{required:!1,tsType:{name:"string"},description:"Extra class names to merge onto the root element."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the root element after the component's own."},children:{required:!0,tsType:{name:"ReactNode"},description:"Two or three content areas; extras are dropped with a dev warning."}}};export{Ue as C};
