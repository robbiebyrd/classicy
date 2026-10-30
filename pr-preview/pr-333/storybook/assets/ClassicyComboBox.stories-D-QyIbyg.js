import{r as t,bf as me,bg as fe,bh as se,bi as he,j as i,a8 as be,b9 as U,ba as ye,b7 as ge,bb as ve}from"./iframe-VU4yhPdm.js";import"./preload-helper-shce2T3m.js";const xe="✓",ae=({id:r,options:f,prefillValue:S,placeholder:_,label:h,labelPosition:oe="above",labelSize:ie,filter:j="startsWith",freeText:z=!0,disabled:p=!1,onChangeFunc:R,onSelectFunc:A,className:re,style:le})=>{const[m,b]=t.useState(S??"");t.useEffect(()=>{b(S??"")},[S]);const[n,V]=t.useState(!1),[ce,d]=t.useState(-1),[G,q]=t.useState(!1),[c,K]=t.useState(null),[P,Y]=t.useState(null),T=t.useRef(null),B=t.useRef(null),E=t.useRef(null),O=t.useRef(S),I=t.useRef(void 0),J=t.useId(),Q=`${J}-list`,F=e=>`${J}-opt-${e}`,{track:X}=me(),Z=t.useMemo(()=>{if(G||j===!1||m==="")return f;const e=m.toLowerCase(),s=o=>j==="contains"?o.label.toLowerCase().includes(e):o.label.toLowerCase().startsWith(e),a=[];for(const o of f)if(fe(o)){const N=o.options.filter(s);N.length>0&&a.push({groupLabel:o.groupLabel,options:N})}else s(o)&&a.push(o);return a},[f,m,j,G]),{rows:ue,flatOptions:y}=t.useMemo(()=>se(Z),[Z]),W=t.useMemo(()=>se(f).flatOptions,[f]),u=Math.min(ce,y.length-1),D=t.useCallback(()=>{V(!1),d(-1),q(!1),K(null),Y(null)},[]),H=t.useCallback(e=>{p||(q(e),T.current&&K(T.current.getBoundingClientRect()),V(!0),B.current?.focus())},[p]),$=t.useCallback(e=>{b(e.label),O.current=e.label,I.current=e.value,D(),B.current?.focus(),X("selected",{type:"ClassicyComboBox",itemId:e.value,id:r,label:h}),R?.(e.label),A?.(e.value,e)},[D,X,r,h,R,A]),ee=t.useCallback(()=>{if(z)return;const e=W.find(s=>s.label.toLowerCase()===m.toLowerCase());e?(b(e.label),O.current=e.label,I.current=e.value):b(O.current??"")},[z,W,m]),l=t.useCallback(()=>{D(),ee()},[D,ee]);t.useEffect(()=>{if(!n)return;const e=s=>{const a=s.target;!T.current?.contains(a)&&!E.current?.contains(a)&&l()};return document.addEventListener("mousedown",e),()=>document.removeEventListener("mousedown",e)},[n,l]),t.useEffect(()=>{if(!n)return;const e=a=>{const o=a.target;o instanceof Node&&E.current?.contains(o)||l()},s=()=>l();return window.addEventListener("scroll",e,!0),window.addEventListener("resize",s),()=>{window.removeEventListener("scroll",e,!0),window.removeEventListener("resize",s)}},[n,l]),t.useLayoutEffect(()=>{if(!n||!c)return;const e=E.current;e&&Y(he(c,e.scrollHeight,window.innerHeight))},[n,c]),t.useLayoutEffect(()=>{if(!n||u<0)return;document.getElementById(F(u))?.scrollIntoView?.({block:"nearest"})});const pe=e=>{const s=e.target.value;b(s),q(!1),d(0),R?.(s),n||H(!1)},de=e=>{if(!p)switch(e.key){case"ArrowDown":e.preventDefault(),n?d(s=>Math.min(y.length-1,s+1)):(H(!1),d(0));break;case"ArrowUp":e.preventDefault(),n&&d(s=>Math.max(0,s-1));break;case"Enter":n&&u>=0&&y[u]?(e.preventDefault(),$(y[u])):n&&l();break;case"Escape":n&&(e.preventDefault(),l());break;case"Tab":n&&l();break}};return i.jsxs("div",{className:U("classicyComboBoxWrapper",ve(oe),re),style:le,children:[h&&i.jsx(be,{label:h,labelFor:r,labelSize:ie,disabled:p}),i.jsxs("div",{ref:T,className:U("classicyComboBox",ye({disabled:p})),children:[i.jsx("input",{ref:B,id:r,name:r,type:"text",role:"combobox","aria-autocomplete":"list","aria-expanded":n,"aria-controls":n?Q:void 0,"aria-activedescendant":n&&u>=0?F(u):void 0,className:"classicyInput classicyComboBoxInput",value:m,placeholder:_,disabled:p,onChange:pe,onKeyDown:de}),i.jsx("button",{type:"button",tabIndex:-1,"aria-label":"Show options",disabled:p,className:"classicyPopUpMenuIndicator classicyComboBoxIndicator",onMouseDown:e=>e.preventDefault(),onClick:()=>{if(n){l();return}H(!0);const e=W.findIndex(s=>s.value===I.current);d(e>=0?e:0)}})]}),n&&c&&ge.createPortal(i.jsxs("div",{ref:E,id:Q,role:"listbox","aria-label":h??_??r,className:U("classicyPopUpMenuList",P?.above&&"classicyPopUpMenuListAbove"),style:{position:"fixed",left:`${c.left}px`,minWidth:`${c.width}px`,zIndex:5e3,...P?.above?{bottom:`${window.innerHeight-c.top}px`}:{top:`${c.bottom}px`},...P&&{maxHeight:`${P.maxHeight}px`}},children:[y.length===0&&i.jsx("div",{role:"presentation",className:"classicyComboBoxNoMatches classicyPopUpMenuListItem",children:"No matches"}),ue.map((e,s)=>{if(e.kind==="header")return i.jsx("div",{role:"presentation",className:"classicyPopUpMenuGroupHeader",children:e.label},`${r}-group-${e.label}-${s}`);const{option:a,flatIndex:o,grouped:N}=e,te=a.value===I.current;return i.jsxs("div",{id:F(o),role:"option",tabIndex:-1,"aria-selected":te,className:U("classicyPopUpMenuListItem",N&&"classicyPopUpMenuListItemGrouped",o===u&&"classicyPopUpMenuListItemHighlight"),onMouseEnter:()=>d(o),onMouseDown:g=>g.preventDefault(),onClick:()=>$(a),onKeyDown:g=>{(g.key==="Enter"||g.key===" ")&&(g.preventDefault(),$(a))},children:[i.jsx("span",{className:"classicyPopUpMenuCheck","aria-hidden":!0,children:te?xe:""}),a.icon&&i.jsx("img",{className:"classicyPopUpMenuListItemIcon",src:a.icon,alt:""}),i.jsx("span",{className:"classicyPopUpMenuListItemLabel",children:a.label})]},r+a.value)})]}),document.getElementById("classicyDesktop")??document.body)]})};ae.__docgenInfo={description:`The \`<datalist>\`/combobox equivalent: the Platinum "combination box" — an
editable field with a pop-up arrow whose suggestion menu filters as you
type. Focus stays in the input (ARIA combobox pattern with
\`aria-activedescendant\`); the suggestion list reuses the PopUpMenu's menu
styling and placement so both drop-downs look and flip identically.

Typing opens the filtered list; the arrow button shows the full list
regardless of the text (it is a pointer affordance, not a tab stop). Down/Up
move the highlight, Enter commits it, Escape or Tab dismiss. Unlike the
pop-up menu, the list hangs below the field (or sits fully above it when
there is no room) instead of aligning a selection over it, and it is
dismissed by an outside click, an ancestor scroll or a window resize. Set
\`freeText={false}\` when the field must hold one of the option labels.

\`\`\`tsx
<ClassicyComboBox id="city" label="City:" options={cities}
    onSelectFunc={(value) => setCity(value)} />
\`\`\``,methods:[],displayName:"ClassicyComboBox",props:{id:{required:!0,tsType:{name:"string"},description:"Id (and `name`) of the text `<input>`; links the label to it."},options:{required:!0,tsType:{name:"Array",elements:[{name:"ClassicyPopUpMenuEntry"}],raw:"ClassicyPopUpMenuEntry[]"},description:"Flat options and/or `{ groupLabel, options }` groups, like ClassicyPopUpMenu."},prefillValue:{required:!1,tsType:{name:"string"},description:"Initial text. The field resets to it whenever it changes."},placeholder:{required:!1,tsType:{name:"string"},description:"Native placeholder text shown while the field is empty."},label:{required:!1,tsType:{name:"string"},description:"Visible label text; also the suggestion list's accessible name."},labelPosition:{required:!1,tsType:{name:"ClassicyLabelPosition"},description:'Where the label sits relative to the field. Defaults to `"above"`.',defaultValue:{value:'"above"',computed:!1}},labelSize:{required:!1,tsType:{name:"ClassicyControlLabelSize"},description:"Label text size."},filter:{required:!1,tsType:{name:"union",raw:'"startsWith" | "contains" | false',elements:[{name:"literal",value:'"startsWith"'},{name:"literal",value:'"contains"'},{name:"literal",value:"false"}]},description:'How typing narrows the suggestions. `false` never filters. Defaults to\n`"startsWith"`.',defaultValue:{value:'"startsWith"',computed:!1}},freeText:{required:!1,tsType:{name:"boolean"},description:"When false, dismissing the combo with text that matches no option\nreverts to the last committed selection — the field can only ever hold\nan option label. Defaults to `true`.",defaultValue:{value:"true",computed:!1}},disabled:{required:!1,tsType:{name:"boolean"},description:"Disables the field and its arrow (and dims the label). Defaults to `false`.",defaultValue:{value:"false",computed:!1}},onChangeFunc:{required:!1,tsType:{name:"signature",type:"function",raw:"(text: string) => void",signature:{arguments:[{type:{name:"string"},name:"text"}],return:{name:"void"}}},description:"Fired for every text change (typing or committing a suggestion)."},onSelectFunc:{required:!1,tsType:{name:"signature",type:"function",raw:"(value: string, option: ClassicyPopUpMenuOption) => void",signature:{arguments:[{type:{name:"string"},name:"value"},{type:{name:"ClassicyPopUpMenuOption"},name:"option"}],return:{name:"void"}}},description:"Fired when a suggestion is committed (click or Enter)."},className:{required:!1,tsType:{name:"string"},description:"Extra class names, merged onto the root element after the component's own."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the root element after the component's own."}}};const{fn:ne}=__STORYBOOK_MODULE_TEST__,ke={title:"Controls/ComboBox",component:ae,decorators:[r=>i.jsx("div",{style:{width:260},children:i.jsx(r,{})})],args:{onChangeFunc:ne(),onSelectFunc:ne()}},M=[{value:"cupertino",label:"Cupertino"},{value:"cambridge",label:"Cambridge"},{value:"chicago",label:"Chicago"},{value:"monaco",label:"Monaco"},{value:"new-york",label:"New York"}],v={args:{id:"combo-starts",label:"City:",placeholder:"Type to search…",options:M}},x={args:{id:"combo-contains",label:"City (contains):",filter:"contains",options:M}},w={args:{id:"combo-pick",label:"City (no free text):",freeText:!1,options:M}},C={args:{id:"combo-grouped",label:"Font:",options:[{groupLabel:"Serif",options:[{value:"new-york",label:"New York"},{value:"palatino",label:"Palatino"}]},{groupLabel:"Sans Serif",options:[{value:"chicago",label:"Chicago"},{value:"charcoal",label:"Charcoal"},{value:"geneva",label:"Geneva"}]}]}},k={args:{id:"combo-no-filter",label:"City:",filter:!1,prefillValue:"Cupertino",options:M}},L={args:{id:"combo-disabled",label:"City:",prefillValue:"Monaco",disabled:!0,options:M}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-starts",
    label: "City:",
    placeholder: "Type to search…",
    options: cities
  }
}`,...v.parameters?.docs?.source},description:{story:`The default filter: typing "c" narrows the list to the labels that start with
it. The arrow button always shows the full list.`,...v.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-contains",
    label: "City (contains):",
    filter: "contains",
    options: cities
  }
}`,...x.parameters?.docs?.source},description:{story:'`filter="contains"` matches anywhere in a label, so typing "york" finds New York.',...x.parameters?.docs?.description}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-pick",
    label: "City (no free text):",
    freeText: false,
    options: cities
  }
}`,...w.parameters?.docs?.source},description:{story:"`freeText={false}`: the field may only hold an option label. Text that\nmatches none snaps back to the last committed choice on dismiss.",...w.parameters?.docs?.description}}};C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-grouped",
    label: "Font:",
    options: [{
      groupLabel: "Serif",
      options: [{
        value: "new-york",
        label: "New York"
      }, {
        value: "palatino",
        label: "Palatino"
      }]
    }, {
      groupLabel: "Sans Serif",
      options: [{
        value: "chicago",
        label: "Chicago"
      }, {
        value: "charcoal",
        label: "Charcoal"
      }, {
        value: "geneva",
        label: "Geneva"
      }]
    }]
  }
}`,...C.parameters?.docs?.source},description:{story:"Grouped suggestions (`{ groupLabel, options }` entries): groups filter with\ntheir members and vanish, header included, when none match.",...C.parameters?.docs?.description}}};k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-no-filter",
    label: "City:",
    filter: false,
    prefillValue: "Cupertino",
    options: cities
  }
}`,...k.parameters?.docs?.source},description:{story:'`filter={false}` never narrows the list, so it works as a "recent values"\nmenu beside a free-form field. Prefilled text seeds the field.',...k.parameters?.docs?.description}}};L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-disabled",
    label: "City:",
    prefillValue: "Monaco",
    disabled: true,
    options: cities
  }
}`,...L.parameters?.docs?.source},description:{story:"A disabled combo box: neither the field nor the arrow responds.",...L.parameters?.docs?.description}}};const Le=["StartsWith","Contains","PickOnly","GroupedSuggestions","NoFilter","Disabled"];export{x as Contains,L as Disabled,C as GroupedSuggestions,k as NoFilter,w as PickOnly,v as StartsWith,Le as __namedExportsOrder,ke as default};
