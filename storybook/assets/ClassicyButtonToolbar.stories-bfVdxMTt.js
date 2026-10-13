import{w as r,j as e,P as R,a9 as S,f as E}from"./iframe-Dlm3ZoT0.js";import{a as I,C as t}from"./ClassicyBevelButton-lEeqIoYW.js";import"./preload-helper-PPVm8Dsz.js";const z="button:not(:disabled)",l=({className:i,children:m})=>e.jsx("div",{className:S("classicyButtonToolbarGroup",i),children:m}),F={large:void 0,medium:"classicyButtonToolbarSizeMedium",small:"classicyButtonToolbarSizeSmall"},u=({className:i,size:m="large",children:f})=>{const d=r.Children.toArray(f),T=r.useRef(null),[B,A]=r.useState(0),c=r.useCallback(()=>{const o=T.current;return o?Array.from(o.querySelectorAll(z)):[]},[]),j=r.useRef(B);j.current=B;const v=r.useCallback(()=>{const o=c();if(o.length===0)return;const n=Math.min(j.current,o.length-1);o.forEach((a,y)=>{a.tabIndex=y===n?0:-1})},[c]);r.useLayoutEffect(()=>{v()}),r.useEffect(()=>{const o=T.current;if(!o)return;const n=new MutationObserver(v);return n.observe(o,{attributes:!0,attributeFilter:["disabled"],subtree:!0}),()=>n.disconnect()},[v]);const G=r.useCallback(o=>{const n=c();if(n.length===0)return;const a=Math.min(Math.max(o,0),n.length-1);A(a),n[a]?.focus()},[c]),k=r.useCallback(o=>{if(o.defaultPrevented||o.altKey||o.ctrlKey||o.metaKey)return;const n=c();if(n.length===0||!n.includes(o.target))return;const a=n.indexOf(document.activeElement),y=a>=0?a:B;let p;switch(o.key){case"ArrowRight":p=(y+1)%n.length;break;case"ArrowLeft":p=(y-1+n.length)%n.length;break;case"Home":p=0;break;case"End":p=n.length-1;break;default:return}o.preventDefault(),G(p)},[c,G,B]),w=r.useCallback(o=>{const a=c().indexOf(o.target);a>=0&&A(a)},[c]);return e.jsx(I.Provider,{value:!0,children:e.jsx("div",{ref:T,role:"toolbar","aria-orientation":"horizontal",className:S("classicyButtonToolbar",F[m],i),onKeyDown:k,onFocus:w,children:d.map((o,n)=>{const a=r.isValidElement(o)&&o.key!=null?o.key:`${n}`;return e.jsxs(r.Fragment,{children:[n>0&&e.jsx(R,{orientation:"vertical"}),o]},a)})})})};l.__docgenInfo={description:`A run of controls packed flush against each other, with no gaps.

Groups are the unit the toolbar counts when placing dividers; a group has no
behavior of its own.`,methods:[],displayName:"ClassicyButtonToolbarGroup",props:{className:{required:!1,tsType:{name:"string"},description:"Extra class names merged onto the group element."},children:{required:!0,tsType:{name:"ReactNode"},description:""}}};u.__docgenInfo={description:"",methods:[],displayName:"ClassicyButtonToolbar",props:{className:{required:!1,tsType:{name:"string"},description:"Extra class names merged onto the toolbar element."},size:{required:!1,tsType:{name:"union",raw:'"large" | "medium" | "small"',elements:[{name:"literal",value:'"large"'},{name:"literal",value:'"medium"'},{name:"literal",value:'"small"'}]},description:"Button sizing; see {@link ClassicyButtonToolbarSize}. Default `large`.",defaultValue:{value:'"large"',computed:!1}},children:{required:!0,tsType:{name:"ReactNode"},description:""}}};const _={title:"Controls/ButtonToolbar",component:u},s=E.system.info,b={render:()=>e.jsx(u,{children:e.jsxs(l,{children:[e.jsx(t,{icon:s,iconAlt:"Back"}),e.jsx(t,{icon:s,iconAlt:"Forward"}),e.jsx(t,{icon:s,iconAlt:"Stop"})]})})},C={render:()=>e.jsxs(u,{children:[e.jsxs(l,{children:[e.jsx(t,{icon:s,iconAlt:"Back"}),e.jsx(t,{icon:s,iconAlt:"Forward"})]}),e.jsxs(l,{children:[e.jsx(t,{icon:s,iconAlt:"Zoom in"}),e.jsx(t,{icon:s,iconAlt:"Zoom out"})]}),e.jsx(l,{children:e.jsx(t,{icon:s,iconAlt:"Settings"})})]})},g={render:()=>e.jsxs(u,{children:[e.jsxs(l,{children:[e.jsx(t,{icon:s,iconAlt:"New"}),e.jsx(t,{icon:s,iconAlt:"Open"})]}),e.jsxs(l,{children:[e.jsx(t,{children:"Subscribe"}),e.jsx(t,{children:"Unsubscribe"})]})]})},N=["Left","Center","Right"],x={render:function(){const[m,f]=r.useState("Left");return e.jsxs(u,{children:[e.jsxs(l,{children:[e.jsx(t,{mode:"toggle",icon:s,iconAlt:"Bold"}),e.jsx(t,{mode:"toggle",icon:s,iconAlt:"Italic"})]}),e.jsx(l,{children:N.map(d=>e.jsx(t,{mode:"radio",icon:s,iconAlt:d,on:m===d,onChangeFunc:()=>f(d)},d))})]})}},h={render:()=>e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:["large","medium","small"].map(i=>e.jsxs(u,{size:i,children:[e.jsxs(l,{children:[e.jsx(t,{icon:s,iconAlt:"Back"}),e.jsx(t,{icon:s,iconAlt:"Forward"})]}),e.jsx(l,{children:e.jsx(t,{children:"Subscribe"})})]},i))})};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyButtonToolbar>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton icon={icon} iconAlt="Back" />
                <ClassicyBevelButton icon={icon} iconAlt="Forward" />
                <ClassicyBevelButton icon={icon} iconAlt="Stop" />
            </ClassicyButtonToolbarGroup>
        </ClassicyButtonToolbar>
}`,...b.parameters?.docs?.source}}};C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyButtonToolbar>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton icon={icon} iconAlt="Back" />
                <ClassicyBevelButton icon={icon} iconAlt="Forward" />
            </ClassicyButtonToolbarGroup>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton icon={icon} iconAlt="Zoom in" />
                <ClassicyBevelButton icon={icon} iconAlt="Zoom out" />
            </ClassicyButtonToolbarGroup>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton icon={icon} iconAlt="Settings" />
            </ClassicyButtonToolbarGroup>
        </ClassicyButtonToolbar>
}`,...C.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyButtonToolbar>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton icon={icon} iconAlt="New" />
                <ClassicyBevelButton icon={icon} iconAlt="Open" />
            </ClassicyButtonToolbarGroup>
            <ClassicyButtonToolbarGroup>
                <ClassicyBevelButton>Subscribe</ClassicyBevelButton>
                <ClassicyBevelButton>Unsubscribe</ClassicyBevelButton>
            </ClassicyButtonToolbarGroup>
        </ClassicyButtonToolbar>
}`,...g.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: function Render() {
    const [alignment, setAlignment] = useState<(typeof alignments)[number]>("Left");
    return <ClassicyButtonToolbar>
                <ClassicyButtonToolbarGroup>
                    <ClassicyBevelButton mode="toggle" icon={icon} iconAlt="Bold" />
                    <ClassicyBevelButton mode="toggle" icon={icon} iconAlt="Italic" />
                </ClassicyButtonToolbarGroup>
                <ClassicyButtonToolbarGroup>
                    {alignments.map(label => <ClassicyBevelButton key={label} mode="radio" icon={icon} iconAlt={label} on={alignment === label} onChangeFunc={() => setAlignment(label)} />)}
                </ClassicyButtonToolbarGroup>
            </ClassicyButtonToolbar>;
  }
}`,...x.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  }}>
            {(["large", "medium", "small"] as const).map(size => <ClassicyButtonToolbar key={size} size={size}>
                    <ClassicyButtonToolbarGroup>
                        <ClassicyBevelButton icon={icon} iconAlt="Back" />
                        <ClassicyBevelButton icon={icon} iconAlt="Forward" />
                    </ClassicyButtonToolbarGroup>
                    <ClassicyButtonToolbarGroup>
                        <ClassicyBevelButton>Subscribe</ClassicyBevelButton>
                    </ClassicyButtonToolbarGroup>
                </ClassicyButtonToolbar>)}
        </div>
}`,...h.parameters?.docs?.source}}};const q=["SingleGroup","MultipleGroups","MixedIconAndText","ToggleAndRadioGroups","Sizes"];export{g as MixedIconAndText,C as MultipleGroups,b as SingleGroup,h as Sizes,x as ToggleAndRadioGroups,q as __namedExportsOrder,_ as default};
