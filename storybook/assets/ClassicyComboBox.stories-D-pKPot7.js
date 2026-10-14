import{w as t,aa as le,ab as ce,ac as ee,ad as ue,j as i,p as pe,a9 as P,a6 as de,ae as me}from"./iframe-Bauyf3oK.js";import"./preload-helper-PPVm8Dsz.js";const fe="✓",te=({id:r,options:f,prefillValue:v,placeholder:W,label:b,labelPosition:se="above",labelSize:ae,filter:T="startsWith",freeText:A=!0,disabled:p=!1,onChangeFunc:N,onSelectFunc:F})=>{const[m,g]=t.useState(v??"");t.useEffect(()=>{g(v??"")},[v]);const[a,z]=t.useState(!1),[ne,d]=t.useState(-1),[G,D]=t.useState(!1),[c,K]=t.useState(null),[x,V]=t.useState(null),C=t.useRef(null),j=t.useRef(null),w=t.useRef(null),R=t.useRef(v),L=t.useRef(void 0),_=t.useId(),Y=`${_}-list`,B=e=>`${_}-opt-${e}`,{track:J}=le(),Q=t.useMemo(()=>{if(G||T===!1||m==="")return f;const e=m.toLowerCase(),s=o=>T==="contains"?o.label.toLowerCase().includes(e):o.label.toLowerCase().startsWith(e),n=[];for(const o of f)if(ce(o)){const M=o.options.filter(s);M.length>0&&n.push({groupLabel:o.groupLabel,options:M})}else s(o)&&n.push(o);return n},[f,m,T,G]),{rows:oe,flatOptions:y}=t.useMemo(()=>ee(Q),[Q]),q=t.useMemo(()=>ee(f).flatOptions,[f]),u=Math.min(ne,y.length-1),k=t.useCallback(()=>{z(!1),d(-1),D(!1),K(null),V(null)},[]),H=t.useCallback(e=>{p||(D(e),C.current&&K(C.current.getBoundingClientRect()),z(!0),j.current?.focus())},[p]),O=t.useCallback(e=>{g(e.label),R.current=e.label,L.current=e.value,k(),j.current?.focus(),J("selected",{type:"ClassicyComboBox",itemId:e.value,id:r,label:b}),N?.(e.label),F?.(e.value,e)},[k,J,r,b,N,F]),X=t.useCallback(()=>{if(A)return;const e=q.find(s=>s.label.toLowerCase()===m.toLowerCase());e?(g(e.label),R.current=e.label,L.current=e.value):g(R.current??"")},[A,q,m]),l=t.useCallback(()=>{k(),X()},[k,X]);t.useEffect(()=>{if(!a)return;const e=s=>{const n=s.target;!C.current?.contains(n)&&!w.current?.contains(n)&&l()};return document.addEventListener("mousedown",e),()=>document.removeEventListener("mousedown",e)},[a,l]),t.useEffect(()=>{if(!a)return;const e=n=>{const o=n.target;o instanceof Node&&w.current?.contains(o)||l()},s=()=>l();return window.addEventListener("scroll",e,!0),window.addEventListener("resize",s),()=>{window.removeEventListener("scroll",e,!0),window.removeEventListener("resize",s)}},[a,l]),t.useLayoutEffect(()=>{if(!a||!c)return;const e=w.current;e&&V(ue(c,e.scrollHeight,window.innerHeight))},[a,c]),t.useLayoutEffect(()=>{if(!a||u<0)return;document.getElementById(B(u))?.scrollIntoView?.({block:"nearest"})});const ie=e=>{const s=e.target.value;g(s),D(!1),d(0),N?.(s),a||H(!1)},re=e=>{if(!p)switch(e.key){case"ArrowDown":e.preventDefault(),a?d(s=>Math.min(y.length-1,s+1)):(H(!1),d(0));break;case"ArrowUp":e.preventDefault(),a&&d(s=>Math.max(0,s-1));break;case"Enter":a&&u>=0&&y[u]?(e.preventDefault(),O(y[u])):a&&l();break;case"Escape":a&&(e.preventDefault(),l());break;case"Tab":a&&l();break}};return i.jsxs("div",{className:P("classicyComboBoxWrapper",me(se)),children:[b&&i.jsx(pe,{label:b,labelFor:r,labelSize:ae,disabled:p}),i.jsxs("div",{ref:C,className:P("classicyComboBox",p&&"classicyComboBoxDisabled"),children:[i.jsx("input",{ref:j,id:r,name:r,type:"text",role:"combobox","aria-autocomplete":"list","aria-expanded":a,"aria-controls":a?Y:void 0,"aria-activedescendant":a&&u>=0?B(u):void 0,className:"classicyInput classicyComboBoxInput",value:m,placeholder:W,disabled:p,onChange:ie,onKeyDown:re}),i.jsx("button",{type:"button",tabIndex:-1,"aria-label":"Show options",disabled:p,className:"classicyPopUpMenuIndicator classicyComboBoxIndicator",onMouseDown:e=>e.preventDefault(),onClick:()=>{if(a){l();return}H(!0);const e=q.findIndex(s=>s.value===L.current);d(e>=0?e:0)}})]}),a&&c&&de.createPortal(i.jsxs("div",{ref:w,id:Y,role:"listbox","aria-label":b??W??r,className:P("classicyPopUpMenuList",x?.above&&"classicyPopUpMenuListAbove"),style:{position:"fixed",left:`${c.left}px`,minWidth:`${c.width}px`,zIndex:5e3,...x?.above?{bottom:`${window.innerHeight-c.top}px`}:{top:`${c.bottom}px`},...x&&{maxHeight:`${x.maxHeight}px`}},children:[y.length===0&&i.jsx("div",{role:"presentation",className:"classicyComboBoxNoMatches classicyPopUpMenuListItem",children:"No matches"}),oe.map((e,s)=>{if(e.kind==="header")return i.jsx("div",{role:"presentation",className:"classicyPopUpMenuGroupHeader",children:e.label},`${r}-group-${e.label}-${s}`);const{option:n,flatIndex:o,grouped:M}=e,Z=n.value===L.current;return i.jsxs("div",{id:B(o),role:"option",tabIndex:-1,"aria-selected":Z,className:P("classicyPopUpMenuListItem",M&&"classicyPopUpMenuListItemGrouped",o===u&&"classicyPopUpMenuListItemHighlight"),onMouseEnter:()=>d(o),onMouseDown:h=>h.preventDefault(),onClick:()=>O(n),onKeyDown:h=>{(h.key==="Enter"||h.key===" ")&&(h.preventDefault(),O(n))},children:[i.jsx("span",{className:"classicyPopUpMenuCheck","aria-hidden":!0,children:Z?fe:""}),n.icon&&i.jsx("img",{className:"classicyPopUpMenuListItemIcon",src:n.icon,alt:""}),i.jsx("span",{className:"classicyPopUpMenuListItemLabel",children:n.label})]},r+n.value)})]}),document.getElementById("classicyDesktop")??document.body)]})};te.__docgenInfo={description:`The \`<datalist>\`/combobox equivalent: the Platinum "combination box" — an
editable field with a pop-up arrow whose suggestion menu filters as you
type. Focus stays in the input (ARIA combobox pattern with
\`aria-activedescendant\`); the suggestion list reuses the PopUpMenu's menu
styling and placement so both drop-downs look and flip identically.`,methods:[],displayName:"ClassicyComboBox",props:{id:{required:!0,tsType:{name:"string"},description:""},options:{required:!0,tsType:{name:"Array",elements:[{name:"ClassicyPopUpMenuEntry"}],raw:"ClassicyPopUpMenuEntry[]"},description:"Flat options and/or `{ groupLabel, options }` groups, like ClassicyPopUpMenu."},prefillValue:{required:!1,tsType:{name:"string"},description:""},placeholder:{required:!1,tsType:{name:"string"},description:""},label:{required:!1,tsType:{name:"string"},description:""},labelPosition:{required:!1,tsType:{name:"ClassicyLabelPosition"},description:"",defaultValue:{value:'"above"',computed:!1}},labelSize:{required:!1,tsType:{name:"ClassicyControlLabelSize"},description:""},filter:{required:!1,tsType:{name:"union",raw:'"startsWith" | "contains" | false',elements:[{name:"literal",value:'"startsWith"'},{name:"literal",value:'"contains"'},{name:"literal",value:"false"}]},description:"How typing narrows the suggestions. `false` never filters.",defaultValue:{value:'"startsWith"',computed:!1}},freeText:{required:!1,tsType:{name:"boolean"},description:`When false, dismissing the combo with text that matches no option
reverts to the last committed selection — the field can only ever hold
an option label.`,defaultValue:{value:"true",computed:!1}},disabled:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},onChangeFunc:{required:!1,tsType:{name:"signature",type:"function",raw:"(text: string) => void",signature:{arguments:[{type:{name:"string"},name:"text"}],return:{name:"void"}}},description:"Fired for every text change (typing or committing a suggestion)."},onSelectFunc:{required:!1,tsType:{name:"signature",type:"function",raw:"(value: string, option: ClassicyPopUpMenuOption) => void",signature:{arguments:[{type:{name:"string"},name:"value"},{type:{name:"ClassicyPopUpMenuOption"},name:"option"}],return:{name:"void"}}},description:"Fired when a suggestion is committed (click or Enter)."}}};const ye={title:"Controls/ComboBox",component:te,decorators:[r=>i.jsx("div",{style:{width:260},children:i.jsx(r,{})})]},$=[{value:"cupertino",label:"Cupertino"},{value:"cambridge",label:"Cambridge"},{value:"chicago",label:"Chicago"},{value:"monaco",label:"Monaco"},{value:"new-york",label:"New York"}],E={args:{id:"combo-starts",label:"City:",placeholder:"Type to search…",options:$}},I={args:{id:"combo-contains",label:"City (contains):",filter:"contains",options:$}},S={args:{id:"combo-pick",label:"City (no free text):",freeText:!1,options:$}},U={args:{id:"combo-grouped",label:"Font:",options:[{groupLabel:"Serif",options:[{value:"new-york",label:"New York"},{value:"palatino",label:"Palatino"}]},{groupLabel:"Sans Serif",options:[{value:"chicago",label:"Chicago"},{value:"charcoal",label:"Charcoal"},{value:"geneva",label:"Geneva"}]}]}};E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-starts",
    label: "City:",
    placeholder: "Type to search…",
    options: cities
  }
}`,...E.parameters?.docs?.source}}};I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-contains",
    label: "City (contains):",
    filter: "contains",
    options: cities
  }
}`,...I.parameters?.docs?.source}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-pick",
    label: "City (no free text):",
    freeText: false,
    options: cities
  }
}`,...S.parameters?.docs?.source}}};U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
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
}`,...U.parameters?.docs?.source}}};const he=["StartsWith","Contains","PickOnly","GroupedSuggestions"];export{I as Contains,U as GroupedSuggestions,S as PickOnly,E as StartsWith,he as __namedExportsOrder,ye as default};
