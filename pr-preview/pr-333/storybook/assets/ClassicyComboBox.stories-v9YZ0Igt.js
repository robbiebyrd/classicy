import{r as t,bh as ge,bi as V,bl as ve,bm as Ce,bn as le,bo as xe,j as o,a8 as we,be as B,bc as ke,bf as Pe}from"./iframe-CIezP3KD.js";import{a as Le,C as Se}from"./ClassicyAppearanceProbe-D6HKSZXt.js";import"./preload-helper-shce2T3m.js";const Me="✓",G=({id:i,options:b,prefillValue:E,placeholder:K,label:y,labelPosition:pe="above",labelSize:ue,filter:R="startsWith",freeText:Y=!0,disabled:u=!1,onChangeFunc:O,onSelectFunc:J,className:de,style:me})=>{const[m,g]=t.useState(E??"");t.useEffect(()=>{g(E??"")},[E]);const[s,Q]=t.useState(!1),[fe,d]=t.useState(-1),[X,q]=t.useState(!1),[c,Z]=t.useState(null),[I,ee]=t.useState(null),v=t.useRef(null),H=t.useRef(null),D=t.useRef(null),F=t.useRef(E),N=t.useRef(void 0),te=t.useId(),se=`${te}-list`,W=e=>`${te}-opt-${e}`,U=ge("ComboBox",{disabled:u},v),f=U.emit,ae=t.useRef(s);t.useEffect(()=>{ae.current!==s&&(ae.current=s,s||f("close",V()))},[s,f]);const{track:ne}=ve(),oe=t.useMemo(()=>{if(X||R===!1||m==="")return b;const e=m.toLowerCase(),a=r=>R==="contains"?r.label.toLowerCase().includes(e):r.label.toLowerCase().startsWith(e),n=[];for(const r of b)if(Ce(r)){const j=r.options.filter(a);j.length>0&&n.push({groupLabel:r.groupLabel,options:j})}else a(r)&&n.push(r);return n},[b,m,R,X]),{rows:he,flatOptions:C}=t.useMemo(()=>le(oe),[oe]),$=t.useMemo(()=>le(b).flatOptions,[b]),p=Math.min(fe,C.length-1),A=t.useCallback(()=>{Q(!1),d(-1),q(!1),Z(null),ee(null)},[]),_=t.useCallback(e=>{u||(q(e),v.current&&Z(v.current.getBoundingClientRect()),Q(!0),f("open",V()),H.current?.focus())},[u,f]),z=t.useCallback(e=>{g(e.label),F.current=e.label,N.current=e.value,A(),f("change",V({value:e.value})),H.current?.focus(),ne("selected",{type:"ClassicyComboBox",itemId:e.value,id:i,label:y}),O?.(e.label),J?.(e.value,e)},[A,f,ne,i,y,O,J]),re=t.useCallback(()=>{if(Y)return;const e=$.find(a=>a.label.toLowerCase()===m.toLowerCase());e?(g(e.label),F.current=e.label,N.current=e.value):g(F.current??"")},[Y,$,m]),l=t.useCallback(()=>{A(),re()},[A,re]);t.useEffect(()=>{if(!s)return;const e=a=>{const n=a.target;!v.current?.contains(n)&&!D.current?.contains(n)&&l()};return document.addEventListener("mousedown",e),()=>document.removeEventListener("mousedown",e)},[s,l]),t.useEffect(()=>{if(!s)return;const e=n=>{const r=n.target;r instanceof Node&&D.current?.contains(r)||l()},a=()=>l();return window.addEventListener("scroll",e,!0),window.addEventListener("resize",a),()=>{window.removeEventListener("scroll",e,!0),window.removeEventListener("resize",a)}},[s,l]),t.useLayoutEffect(()=>{if(!s||!c)return;const e=D.current;e&&ee(xe(c,e.scrollHeight,window.innerHeight))},[s,c]),t.useLayoutEffect(()=>{if(!s||p<0)return;document.getElementById(W(p))?.scrollIntoView?.({block:"nearest"})});const be=e=>{const a=e.target.value;g(a),q(!1),d(0),O?.(a),s||_(!1)},ye=e=>{if(!u)switch(e.key){case"ArrowDown":e.preventDefault(),s?d(a=>Math.min(C.length-1,a+1)):(_(!1),d(0));break;case"ArrowUp":e.preventDefault(),s&&d(a=>Math.max(0,a-1));break;case"Enter":s&&p>=0&&C[p]?(e.preventDefault(),z(C[p])):s&&l();break;case"Escape":s&&(e.preventDefault(),l());break;case"Tab":s&&l();break}};return o.jsxs("div",{className:B("classicyComboBoxWrapper",Pe(pe),de),style:me,children:[y&&o.jsx(we,{label:y,labelFor:i,labelSize:ue,disabled:u}),o.jsxs("div",{...U.attrs,ref:v,className:B("classicyComboBox",U.className),style:U.style,children:[o.jsx("input",{ref:H,id:i,name:i,type:"text",role:"combobox","aria-autocomplete":"list","aria-expanded":s,"aria-controls":s?se:void 0,"aria-activedescendant":s&&p>=0?W(p):void 0,className:"classicyInput classicyComboBoxInput",value:m,placeholder:K,disabled:u,onChange:be,onKeyDown:ye}),o.jsx("button",{type:"button",tabIndex:-1,"aria-label":"Show options",disabled:u,className:"classicyPopUpMenuIndicator classicyComboBoxIndicator",onMouseDown:e=>e.preventDefault(),onClick:()=>{if(s){l();return}_(!0);const e=$.findIndex(a=>a.value===N.current);d(e>=0?e:0)}})]}),s&&c&&ke.createPortal(o.jsxs("div",{ref:D,id:se,role:"listbox","aria-label":y??K??i,className:B("classicyPopUpMenuList",I?.above&&"classicyPopUpMenuListAbove"),style:{position:"fixed",left:`${c.left}px`,minWidth:`${c.width}px`,zIndex:5e3,...I?.above?{bottom:`${window.innerHeight-c.top}px`}:{top:`${c.bottom}px`},...I&&{maxHeight:`${I.maxHeight}px`}},children:[C.length===0&&o.jsx("div",{role:"presentation",className:"classicyComboBoxNoMatches classicyPopUpMenuListItem",children:"No matches"}),he.map((e,a)=>{if(e.kind==="header")return o.jsx("div",{role:"presentation",className:"classicyPopUpMenuGroupHeader",children:e.label},`${i}-group-${e.label}-${a}`);const{option:n,flatIndex:r,grouped:j}=e,ie=n.value===N.current;return o.jsxs("div",{id:W(r),role:"option",tabIndex:-1,"aria-selected":ie,className:B("classicyPopUpMenuListItem",j&&"classicyPopUpMenuListItemGrouped",r===p&&"classicyPopUpMenuListItemHighlight"),onMouseEnter:()=>d(r),onMouseDown:x=>x.preventDefault(),onClick:()=>z(n),onKeyDown:x=>{(x.key==="Enter"||x.key===" ")&&(x.preventDefault(),z(n))},children:[o.jsx("span",{className:"classicyPopUpMenuCheck","aria-hidden":!0,children:ie?Me:""}),n.icon&&o.jsx("img",{className:"classicyPopUpMenuListItemIcon",src:n.icon,alt:""}),o.jsx("span",{className:"classicyPopUpMenuListItemLabel",children:n.label})]},i+n.value)})]}),document.getElementById("classicyDesktop")??document.body)]})};G.__docgenInfo={description:`The \`<datalist>\`/combobox equivalent: the Platinum "combination box" — an
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
\`\`\``,methods:[],displayName:"ClassicyComboBox",props:{id:{required:!0,tsType:{name:"string"},description:"Id (and `name`) of the text `<input>`; links the label to it."},options:{required:!0,tsType:{name:"Array",elements:[{name:"ClassicyPopUpMenuEntry"}],raw:"ClassicyPopUpMenuEntry[]"},description:"Flat options and/or `{ groupLabel, options }` groups, like ClassicyPopUpMenu."},prefillValue:{required:!1,tsType:{name:"string"},description:"Initial text. The field resets to it whenever it changes."},placeholder:{required:!1,tsType:{name:"string"},description:"Native placeholder text shown while the field is empty."},label:{required:!1,tsType:{name:"string"},description:"Visible label text; also the suggestion list's accessible name."},labelPosition:{required:!1,tsType:{name:"ClassicyLabelPosition"},description:'Where the label sits relative to the field. Defaults to `"above"`.',defaultValue:{value:'"above"',computed:!1}},labelSize:{required:!1,tsType:{name:"ClassicyControlLabelSize"},description:"Label text size."},filter:{required:!1,tsType:{name:"union",raw:'"startsWith" | "contains" | false',elements:[{name:"literal",value:'"startsWith"'},{name:"literal",value:'"contains"'},{name:"literal",value:"false"}]},description:'How typing narrows the suggestions. `false` never filters. Defaults to\n`"startsWith"`.',defaultValue:{value:'"startsWith"',computed:!1}},freeText:{required:!1,tsType:{name:"boolean"},description:"When false, dismissing the combo with text that matches no option\nreverts to the last committed selection — the field can only ever hold\nan option label. Defaults to `true`.",defaultValue:{value:"true",computed:!1}},disabled:{required:!1,tsType:{name:"boolean"},description:"Disables the field and its arrow (and dims the label). Defaults to `false`.",defaultValue:{value:"false",computed:!1}},onChangeFunc:{required:!1,tsType:{name:"signature",type:"function",raw:"(text: string) => void",signature:{arguments:[{type:{name:"string"},name:"text"}],return:{name:"void"}}},description:"Fired for every text change (typing or committing a suggestion)."},onSelectFunc:{required:!1,tsType:{name:"signature",type:"function",raw:"(value: string, option: ClassicyPopUpMenuOption) => void",signature:{arguments:[{type:{name:"string"},name:"value"},{type:{name:"ClassicyPopUpMenuOption"},name:"option"}],return:{name:"void"}}},description:"Fired when a suggestion is committed (click or Enter)."},className:{required:!1,tsType:{name:"string"},description:"Extra class names, merged onto the root element after the component's own."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the root element after the component's own."}}};const{fn:ce}=__STORYBOOK_MODULE_TEST__,De={title:"Controls/ComboBox",component:G,decorators:[i=>o.jsx("div",{style:{width:260},children:o.jsx(i,{})})],args:{onChangeFunc:ce(),onSelectFunc:ce()}},T=[{value:"cupertino",label:"Cupertino"},{value:"cambridge",label:"Cambridge"},{value:"chicago",label:"Chicago"},{value:"monaco",label:"Monaco"},{value:"new-york",label:"New York"}],h={args:{id:"combo-starts",label:"City:",placeholder:"Type to search…",options:T}},w={args:{id:"combo-contains",label:"City (contains):",filter:"contains",options:T}},k={args:{id:"combo-pick",label:"City (no free text):",freeText:!1,options:T}},P={args:{id:"combo-grouped",label:"Font:",options:[{groupLabel:"Serif",options:[{value:"new-york",label:"New York"},{value:"palatino",label:"Palatino"}]},{groupLabel:"Sans Serif",options:[{value:"chicago",label:"Chicago"},{value:"charcoal",label:"Charcoal"},{value:"geneva",label:"Geneva"}]}]}},L={args:{id:"combo-no-filter",label:"City:",filter:!1,prefillValue:"Cupertino",options:T}},S={args:{id:"combo-disabled",label:"City:",prefillValue:"Monaco",disabled:!0,options:T}},M={args:h.args,render:i=>o.jsx(Se,{children:o.jsx(G,{...i})}),parameters:Le()};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-starts",
    label: "City:",
    placeholder: "Type to search…",
    options: cities
  }
}`,...h.parameters?.docs?.source},description:{story:`The default filter: typing "c" narrows the list to the labels that start with
it. The arrow button always shows the full list.`,...h.parameters?.docs?.description}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-contains",
    label: "City (contains):",
    filter: "contains",
    options: cities
  }
}`,...w.parameters?.docs?.source},description:{story:'`filter="contains"` matches anywhere in a label, so typing "york" finds New York.',...w.parameters?.docs?.description}}};k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-pick",
    label: "City (no free text):",
    freeText: false,
    options: cities
  }
}`,...k.parameters?.docs?.source},description:{story:"`freeText={false}`: the field may only hold an option label. Text that\nmatches none snaps back to the last committed choice on dismiss.",...k.parameters?.docs?.description}}};P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
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
}`,...P.parameters?.docs?.source},description:{story:"Grouped suggestions (`{ groupLabel, options }` entries): groups filter with\ntheir members and vanish, header included, when none match.",...P.parameters?.docs?.description}}};L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-no-filter",
    label: "City:",
    filter: false,
    prefillValue: "Cupertino",
    options: cities
  }
}`,...L.parameters?.docs?.source},description:{story:'`filter={false}` never narrows the list, so it works as a "recent values"\nmenu beside a free-form field. Prefilled text seeds the field.',...L.parameters?.docs?.description}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-disabled",
    label: "City:",
    prefillValue: "Monaco",
    disabled: true,
    options: cities
  }
}`,...S.parameters?.docs?.source},description:{story:"A disabled combo box: neither the field nor the arrow responds.",...S.parameters?.docs?.description}}};M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  args: StartsWith.args,
  render: (args: ComponentProps<typeof ClassicyComboBox>) => <ClassicyAppearanceProbe>
            <ClassicyComboBox {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...M.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...M.parameters?.docs?.description}}};const Ne=["StartsWith","Contains","PickOnly","GroupedSuggestions","NoFilter","Disabled","AppearanceHooks"];export{M as AppearanceHooks,w as Contains,S as Disabled,P as GroupedSuggestions,L as NoFilter,k as PickOnly,h as StartsWith,Ne as __namedExportsOrder,De as default};
