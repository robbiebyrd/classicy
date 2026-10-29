import{i as r,j as e,aI as R,ak as z,aD as k,q as t,aJ as E}from"./iframe-BfPOltp0.js";import"./preload-helper-shce2T3m.js";const O="button:not(:disabled)",i=({className:c,style:p,children:b})=>e.jsx("div",{className:k("classicyButtonToolbarGroup",c),style:p,children:b}),q={large:void 0,medium:"classicyButtonToolbarSizeMedium",small:"classicyButtonToolbarSizeSmall"},u=({className:c,style:p,size:b="large",children:d})=>{const G=r.Children.toArray(d),x=r.useRef(null),[f,w]=r.useState(0),l=r.useCallback(()=>{const o=x.current;return o?Array.from(o.querySelectorAll(O)):[]},[]),A=r.useRef(f);A.current=f;const T=r.useCallback(()=>{const o=l();if(o.length===0)return;const n=Math.min(A.current,o.length-1);o.forEach((a,v)=>{a.tabIndex=v===n?0:-1})},[l]);r.useLayoutEffect(()=>{T()}),r.useEffect(()=>{const o=x.current;if(!o)return;const n=new MutationObserver(T);return n.observe(o,{attributes:!0,attributeFilter:["disabled"],subtree:!0}),()=>n.disconnect()},[T]);const j=r.useCallback(o=>{const n=l();if(n.length===0)return;const a=Math.min(Math.max(o,0),n.length-1);w(a),n[a]?.focus()},[l]),S=r.useCallback(o=>{if(o.defaultPrevented||o.altKey||o.ctrlKey||o.metaKey)return;const n=l();if(n.length===0||!n.includes(o.target))return;const a=n.indexOf(document.activeElement),v=a>=0?a:f;let m;switch(o.key){case"ArrowRight":m=(v+1)%n.length;break;case"ArrowLeft":m=(v-1+n.length)%n.length;break;case"Home":m=0;break;case"End":m=n.length-1;break;default:return}o.preventDefault(),j(m)},[l,j,f]),I=r.useCallback(o=>{const a=l().indexOf(o.target);a>=0&&w(a)},[l]);return e.jsx(R.Provider,{value:!0,children:e.jsx("div",{ref:x,role:"toolbar","aria-orientation":"horizontal",className:k("classicyButtonToolbar",q[b],c),style:p,onKeyDown:S,onFocus:I,children:G.map((o,n)=>{const a=r.isValidElement(o)&&o.key!=null?o.key:`${n}`;return e.jsxs(r.Fragment,{children:[n>0&&e.jsx(z,{orientation:"vertical"}),o]},a)})})})};i.__docgenInfo={description:`A run of controls packed flush against each other, with no gaps.

Groups are the unit the toolbar counts when placing dividers; a group has no
behavior of its own. Keyboard navigation belongs to the enclosing
\`ClassicyButtonToolbar\` and crosses group boundaries.`,methods:[],displayName:"ClassicyButtonToolbarGroup",props:{className:{required:!1,tsType:{name:"string"},description:"Extra class names merged onto the group element."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the group element after the component's own."},children:{required:!0,tsType:{name:"ReactNode"},description:"The controls in this run, packed flush with no gaps between them."}}};u.__docgenInfo={description:`A Mac OS 8 control bar: buttons flush together, arranged into groups
separated by a vertical engraved divider. Use it for a window's row of
tool or command buttons — normally \`ClassicyBevelButton\`s — instead of a
hand-built flex row; there is no HTML element it replaces.

Dividers are drawn automatically **between** children — never leading,
never trailing, and not at all for a single group — so consumers never place
a \`ClassicySeparator\` by hand.

Children are normally \`ClassicyButtonToolbarGroup\`s, but any element works.
A control placed directly in the toolbar is treated as its own group, so it
gets dividers on both sides.

\`size\` scales every control in the toolbar as a unit (\`large\` default,
\`medium\`, \`small\`) — sizing is per-toolbar, not per-button, so a toolbar's
controls always match. It's applied in CSS off theme tokens, so arbitrary
children are scaled without the toolbar touching them.

Inside a toolbar, an icon-only \`ClassicyBevelButton\` defaults to a square
box; a button with text keeps its rectangular shape. Passing \`square\`
explicitly always wins. The default is delivered through
\`ClassicyButtonToolbarContext\`, which follows the React tree, so it also
reaches a bevel button portalled out of the toolbar.

The root element carries \`role="toolbar"\`. The \`<hr role="separator">\`
dividers between groups stay in the accessibility tree on purpose: inside
a \`toolbar\`, a \`separator\` is a meaningful child (it tells assistive tech
where one control group ends and the next begins), unlike a decorative
\`<hr>\` in a document.

**Keyboard: roving tabindex**, per the ARIA APG toolbar pattern. Exactly one
control is in the page's Tab sequence (\`tabIndex=0\`) at a time; every other
control is \`tabIndex=-1\`. Tab therefore moves focus into and out of the
toolbar as a single stop, not through every button. Once focus is inside:
  - **ArrowRight/ArrowLeft** move focus between controls and **wrap** at the
    ends (Right from the last control goes to the first, and vice versa).
    Wrapping matches \`ClassicyTabs\` — the other horizontal
    roving-tabindex widget in this codebase — for consistency; the APG
    permits either choice and this toolbar picks the one already
    established here.
  - **Home/End** jump to the first/last control.
  - The control that last had focus becomes (and remains) the tab stop, so
    tabbing back into the toolbar later returns to where the user left off.
  - A disabled control is never a stop and is skipped by arrow navigation,
    even when its \`disabled\` attribute is toggled outside React.

Controls are discovered by querying the rendered DOM (\`button:not(:disabled)\`
under the toolbar root) rather than by inspecting or cloning React children,
so arbitrary children keep working unchanged and \`tabIndex\` is set
directly on the DOM nodes the toolbar doesn't own.

\`\`\`tsx
<ClassicyButtonToolbar>
    <ClassicyButtonToolbarGroup>
        <ClassicyBevelButton icon={back} iconAlt="Back" />
        <ClassicyBevelButton icon={fwd} iconAlt="Forward" />
    </ClassicyButtonToolbarGroup>
    <ClassicyButtonToolbarGroup>
        <ClassicyBevelButton icon={zoom} iconAlt="Zoom" />
    </ClassicyButtonToolbarGroup>
</ClassicyButtonToolbar>
\`\`\``,methods:[],displayName:"ClassicyButtonToolbar",props:{className:{required:!1,tsType:{name:"string"},description:"Extra class names merged onto the toolbar element."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the toolbar element after the component's own."},size:{required:!1,tsType:{name:"union",raw:'"large" | "medium" | "small"',elements:[{name:"literal",value:'"large"'},{name:"literal",value:'"medium"'},{name:"literal",value:'"small"'}]},description:"Sizing for every control in the toolbar, as a unit: `large` (the classic\ntoolbar look), `medium`, or `small` (matches `ClassicyButton`'s small\nmetrics). Defaults to `large`.",defaultValue:{value:'"large"',computed:!1}},children:{required:!0,tsType:{name:"ReactNode"},description:"The toolbar's groups — normally `ClassicyButtonToolbarGroup`s. Any other\nchild counts as a group of its own. Dividers are inserted between them."}}};const D={title:"Controls/ButtonToolbar",component:u},s=()=>E("icons","system.info")??"",h={render:()=>e.jsx(u,{children:e.jsxs(i,{children:[e.jsx(t,{icon:s(),iconAlt:"Back"}),e.jsx(t,{icon:s(),iconAlt:"Forward"}),e.jsx(t,{icon:s(),iconAlt:"Stop"})]})})},y={render:()=>e.jsxs(u,{children:[e.jsxs(i,{children:[e.jsx(t,{icon:s(),iconAlt:"Back"}),e.jsx(t,{icon:s(),iconAlt:"Forward"})]}),e.jsxs(i,{children:[e.jsx(t,{icon:s(),iconAlt:"Zoom in"}),e.jsx(t,{icon:s(),iconAlt:"Zoom out"})]}),e.jsx(i,{children:e.jsx(t,{icon:s(),iconAlt:"Settings"})})]})},g={render:()=>e.jsxs(u,{children:[e.jsxs(i,{children:[e.jsx(t,{icon:s(),iconAlt:"New"}),e.jsx(t,{icon:s(),iconAlt:"Open"})]}),e.jsxs(i,{children:[e.jsx(t,{children:"Subscribe"}),e.jsx(t,{children:"Unsubscribe"})]})]})},F=["Left","Center","Right"],B={render:function(){const[p,b]=r.useState("Left");return e.jsxs(u,{children:[e.jsxs(i,{children:[e.jsx(t,{mode:"toggle",icon:s(),iconAlt:"Bold"}),e.jsx(t,{mode:"toggle",icon:s(),iconAlt:"Italic"})]}),e.jsx(i,{children:F.map(d=>e.jsx(t,{mode:"radio",icon:s(),iconAlt:d,on:p===d,onChangeFunc:()=>b(d)},d))})]})}},C={render:()=>e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:["large","medium","small"].map(c=>e.jsxs(u,{size:c,children:[e.jsxs(i,{children:[e.jsx(t,{icon:s(),iconAlt:"Back"}),e.jsx(t,{icon:s(),iconAlt:"Forward"})]}),e.jsx(i,{children:e.jsx(t,{children:"Subscribe"})})]},c))})};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyButtonToolbar>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton icon={icon()} iconAlt="Back" />
                <ClassicyBevelButton icon={icon()} iconAlt="Forward" />
                <ClassicyBevelButton icon={icon()} iconAlt="Stop" />
            </ClassicyButtonToolbarGroup>
        </ClassicyButtonToolbar>
}`,...h.parameters?.docs?.source},description:{story:`One group of icon-only bevel buttons: squared by the toolbar, packed flush,
and no divider, since dividers only go between groups.`,...h.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyButtonToolbar>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton icon={icon()} iconAlt="Back" />
                <ClassicyBevelButton icon={icon()} iconAlt="Forward" />
            </ClassicyButtonToolbarGroup>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton icon={icon()} iconAlt="Zoom in" />
                <ClassicyBevelButton icon={icon()} iconAlt="Zoom out" />
            </ClassicyButtonToolbarGroup>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton icon={icon()} iconAlt="Settings" />
            </ClassicyButtonToolbarGroup>
        </ClassicyButtonToolbar>
}`,...y.parameters?.docs?.source},description:{story:`Three groups with dividers drawn automatically between them. Tab into the
toolbar once, then use the arrow keys (wrapping) and Home/End to move
between buttons across groups.`,...y.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyButtonToolbar>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton icon={icon()} iconAlt="New" />
                <ClassicyBevelButton icon={icon()} iconAlt="Open" />
            </ClassicyButtonToolbarGroup>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton>Subscribe</ClassicyBevelButton>
                <ClassicyBevelButton>Unsubscribe</ClassicyBevelButton>
            </ClassicyButtonToolbarGroup>
        </ClassicyButtonToolbar>
}`,...g.parameters?.docs?.source},description:{story:`Icon-only buttons go square inside a toolbar; buttons with a text label keep
their rectangular shape.`,...g.parameters?.docs?.description}}};B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  render: function Render() {
    const [alignment, setAlignment] = useState<(typeof alignments)[number]>("Left");
    return <ClassicyButtonToolbar>
                <ClassicyButtonToolbarGroup>
                    <ClassicyBevelButton mode="toggle" icon={icon()} iconAlt="Bold" />
                    <ClassicyBevelButton mode="toggle" icon={icon()} iconAlt="Italic" />
                </ClassicyButtonToolbarGroup>
                <ClassicyButtonToolbarGroup>
                    {alignments.map(label => <ClassicyBevelButton key={label} mode="radio" icon={icon()} iconAlt={label} on={alignment === label} onChangeFunc={() => setAlignment(label)} />)}
                </ClassicyButtonToolbarGroup>
            </ClassicyButtonToolbar>;
  }
}`,...B.parameters?.docs?.source},description:{story:'A toggle group (Bold/Italic) beside a radio group (alignment). A\n`mode="radio"` bevel button only ever turns itself on — it knows nothing of\nits siblings — so the group is driven by one shared state value wired to\neach button\'s `on`/`onChangeFunc`, just as an HTML radio group needs a\nshared `name`.',...B.parameters?.docs?.description}}};C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  }}>
            {(["large", "medium", "small"] as const).map(size => <ClassicyButtonToolbar key={size} size={size}>
                    <ClassicyButtonToolbarGroup>
                        <ClassicyBevelButton icon={icon()} iconAlt="Back" />
                        <ClassicyBevelButton icon={icon()} iconAlt="Forward" />
                    </ClassicyButtonToolbarGroup>
                    <ClassicyButtonToolbarGroup>
                        <ClassicyBevelButton>Subscribe</ClassicyBevelButton>
                    </ClassicyButtonToolbarGroup>
                </ClassicyButtonToolbar>)}
        </div>
}`,...C.parameters?.docs?.source},description:{story:"All three `size`s stacked for comparison. `large` is the default; `medium`\nand `small` scale every control in the toolbar as a unit.",...C.parameters?.docs?.description}}};const L=["SingleGroup","MultipleGroups","MixedIconAndText","ToggleAndRadioGroups","Sizes"];export{g as MixedIconAndText,y as MultipleGroups,h as SingleGroup,C as Sizes,B as ToggleAndRadioGroups,L as __namedExportsOrder,D as default};
