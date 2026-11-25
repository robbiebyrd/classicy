import{h as o,j as s,bl as T,as as x,bm as g}from"./iframe-D7yc999g.js";const B="button:not(:disabled)",k=({className:c,style:u,children:d})=>s.jsx("div",{className:g("classicyButtonToolbarGroup",c),style:u,children:d}),A={large:void 0,medium:"classicyButtonToolbarSizeMedium",small:"classicyButtonToolbarSizeSmall"},R=({className:c,style:u,size:d="large",children:f})=>{const v=o.Children.toArray(f),h=o.useRef(null),[l,m]=o.useState(0),a=o.useCallback(()=>{const e=h.current;return e?Array.from(e.querySelectorAll(B)):[]},[]),p=o.useRef(l);p.current=l;const b=o.useCallback(()=>{const e=a();if(e.length===0)return;const t=Math.min(p.current,e.length-1);e.forEach((n,i)=>{n.tabIndex=i===t?0:-1})},[a]);o.useLayoutEffect(()=>{b()}),o.useEffect(()=>{const e=h.current;if(!e)return;const t=new MutationObserver(b);return t.observe(e,{attributes:!0,attributeFilter:["disabled"],subtree:!0}),()=>t.disconnect()},[b]);const y=o.useCallback(e=>{const t=a();if(t.length===0)return;const n=Math.min(Math.max(e,0),t.length-1);m(n),t[n]?.focus()},[a]),w=o.useCallback(e=>{if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey)return;const t=a();if(t.length===0||!t.includes(e.target))return;const n=t.indexOf(document.activeElement),i=n>=0?n:l;let r;switch(e.key){case"ArrowRight":r=(i+1)%t.length;break;case"ArrowLeft":r=(i-1+t.length)%t.length;break;case"Home":r=0;break;case"End":r=t.length-1;break;default:return}e.preventDefault(),y(r)},[a,y,l]),C=o.useCallback(e=>{const n=a().indexOf(e.target);n>=0&&m(n)},[a]);return s.jsx(T.Provider,{value:!0,children:s.jsx("div",{ref:h,role:"toolbar","aria-orientation":"horizontal",className:g("classicyButtonToolbar",A[d],c),style:u,onKeyDown:w,onFocus:C,children:v.map((e,t)=>{const n=o.isValidElement(e)&&e.key!=null?e.key:`${t}`;return s.jsxs(o.Fragment,{children:[t>0&&s.jsx(x,{orientation:"vertical"}),e]},n)})})})};k.__docgenInfo={description:`A run of controls packed flush against each other, with no gaps.

Groups are the unit the toolbar counts when placing dividers; a group has no
behavior of its own. Keyboard navigation belongs to the enclosing
\`ClassicyButtonToolbar\` and crosses group boundaries.`,methods:[],displayName:"ClassicyButtonToolbarGroup",props:{className:{required:!1,tsType:{name:"string"},description:"Extra class names merged onto the group element."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the group element after the component's own."},children:{required:!0,tsType:{name:"ReactNode"},description:"The controls in this run, packed flush with no gaps between them."}}};R.__docgenInfo={description:`A Mac OS 8 control bar: buttons flush together, arranged into groups
separated by a vertical engraved divider. Use it for a window's row of
tool or command buttons \u2014 normally \`ClassicyBevelButton\`s \u2014 instead of a
hand-built flex row; there is no HTML element it replaces.

Dividers are drawn automatically **between** children \u2014 never leading,
never trailing, and not at all for a single group \u2014 so consumers never place
a \`ClassicySeparator\` by hand.

Children are normally \`ClassicyButtonToolbarGroup\`s, but any element works.
A control placed directly in the toolbar is treated as its own group, so it
gets dividers on both sides.

\`size\` scales every control in the toolbar as a unit (\`large\` default,
\`medium\`, \`small\`) \u2014 sizing is per-toolbar, not per-button, so a toolbar's
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
    Wrapping matches \`ClassicyTabs\` \u2014 the other horizontal
    roving-tabindex widget in this codebase \u2014 for consistency; the APG
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
\`\`\``,methods:[],displayName:"ClassicyButtonToolbar",props:{className:{required:!1,tsType:{name:"string"},description:"Extra class names merged onto the toolbar element."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the toolbar element after the component's own."},size:{required:!1,tsType:{name:"union",raw:'"large" | "medium" | "small"',elements:[{name:"literal",value:'"large"'},{name:"literal",value:'"medium"'},{name:"literal",value:'"small"'}]},description:"Sizing for every control in the toolbar, as a unit: `large` (the classic\ntoolbar look), `medium`, or `small` (matches `ClassicyButton`'s small\nmetrics). Defaults to `large`.",defaultValue:{value:'"large"',computed:!1}},children:{required:!0,tsType:{name:"ReactNode"},description:"The toolbar's groups \u2014 normally `ClassicyButtonToolbarGroup`s. Any other\nchild counts as a group of its own. Dividers are inserted between them."}}};export{R as C,k as a};
