import{r as t,b8 as ge,b9 as V,bb as ve,bc as xe,bd as le,be as Ce,j as n,a8 as we,b5 as w,b3 as ke,ao as Pe,b6 as Le}from"./iframe-D7RXkgoN.js";import{a as Se,C as Me}from"./ClassicyAppearanceProbe-ePoNme3B.js";import"./preload-helper-shce2T3m.js";const G=({id:i,options:b,prefillValue:I,placeholder:Y,label:y,labelPosition:pe="above",labelSize:ue,filter:R="startsWith",freeText:K=!0,disabled:u=!1,onChangeFunc:O,onSelectFunc:J,className:de,style:me})=>{const[m,g]=t.useState(I??"");t.useEffect(()=>{g(I??"")},[I]);const[s,Q]=t.useState(!1),[fe,d]=t.useState(-1),[X,q]=t.useState(!1),[c,Z]=t.useState(null),[D,ee]=t.useState(null),v=t.useRef(null),H=t.useRef(null),N=t.useRef(null),F=t.useRef(I),U=t.useRef(void 0),te=t.useId(),se=`${te}-list`,W=e=>`${te}-opt-${e}`,j=ge("ComboBox",{disabled:u},v),f=j.emit,ae=t.useRef(s);t.useEffect(()=>{ae.current!==s&&(ae.current=s,s||f("close",V()))},[s,f]);const{track:oe}=ve(),ne=t.useMemo(()=>{if(X||R===!1||m==="")return b;const e=m.toLowerCase(),a=r=>R==="contains"?r.label.toLowerCase().includes(e):r.label.toLowerCase().startsWith(e),o=[];for(const r of b)if(xe(r)){const B=r.options.filter(a);B.length>0&&o.push({groupLabel:r.groupLabel,options:B})}else a(r)&&o.push(r);return o},[b,m,R,X]),{rows:he,flatOptions:x}=t.useMemo(()=>le(ne),[ne]),$=t.useMemo(()=>le(b).flatOptions,[b]),p=Math.min(fe,x.length-1),A=t.useCallback(()=>{Q(!1),d(-1),q(!1),Z(null),ee(null)},[]),_=t.useCallback(e=>{u||(q(e),v.current&&Z(v.current.getBoundingClientRect()),Q(!0),f("open",V()),H.current?.focus())},[u,f]),z=t.useCallback(e=>{g(e.label),F.current=e.label,U.current=e.value,A(),f("change",V({value:e.value})),H.current?.focus(),oe("selected",{type:"ClassicyComboBox",itemId:e.value,id:i,label:y}),O?.(e.label),J?.(e.value,e)},[A,f,oe,i,y,O,J]),re=t.useCallback(()=>{if(K)return;const e=$.find(a=>a.label.toLowerCase()===m.toLowerCase());e?(g(e.label),F.current=e.label,U.current=e.value):g(F.current??"")},[K,$,m]),l=t.useCallback(()=>{A(),re()},[A,re]);t.useEffect(()=>{if(!s)return;const e=a=>{const o=a.target;!v.current?.contains(o)&&!N.current?.contains(o)&&l()};return document.addEventListener("mousedown",e),()=>document.removeEventListener("mousedown",e)},[s,l]),t.useEffect(()=>{if(!s)return;const e=o=>{const r=o.target;r instanceof Node&&N.current?.contains(r)||l()},a=()=>l();return window.addEventListener("scroll",e,!0),window.addEventListener("resize",a),()=>{window.removeEventListener("scroll",e,!0),window.removeEventListener("resize",a)}},[s,l]),t.useLayoutEffect(()=>{if(!s||!c)return;const e=N.current;e&&ee(Ce(c,e.scrollHeight,window.innerHeight))},[s,c]),t.useLayoutEffect(()=>{if(!s||p<0)return;document.getElementById(W(p))?.scrollIntoView?.({block:"nearest"})});const be=e=>{const a=e.target.value;g(a),q(!1),d(0),O?.(a),s||_(!1)},ye=e=>{if(!u)switch(e.key){case"ArrowDown":e.preventDefault(),s?d(a=>Math.min(x.length-1,a+1)):(_(!1),d(0));break;case"ArrowUp":e.preventDefault(),s&&d(a=>Math.max(0,a-1));break;case"Enter":s&&p>=0&&x[p]?(e.preventDefault(),z(x[p])):s&&l();break;case"Escape":s&&(e.preventDefault(),l());break;case"Tab":s&&l();break}};return n.jsxs("div",{className:w("classicyComboBoxWrapper",Le(pe),de),style:me,children:[y&&n.jsx(we,{label:y,labelFor:i,labelSize:ue,disabled:u}),n.jsxs("div",{...j.attrs,ref:v,className:w("classicyComboBox",j.className),style:j.style,children:[n.jsx("input",{ref:H,id:i,name:i,type:"text",role:"combobox","aria-autocomplete":"list","aria-expanded":s,"aria-controls":s?se:void 0,"aria-activedescendant":s&&p>=0?W(p):void 0,className:"classicyInput classicyComboBoxInput",value:m,placeholder:Y,disabled:u,onChange:be,onKeyDown:ye}),n.jsx("button",{type:"button",tabIndex:-1,"aria-label":"Show options",disabled:u,className:"classicyPopUpMenuIndicator classicyComboBoxIndicator",onMouseDown:e=>e.preventDefault(),onClick:()=>{if(s){l();return}_(!0);const e=$.findIndex(a=>a.value===U.current);d(e>=0?e:0)}})]}),s&&c&&ke.createPortal(n.jsxs("div",{ref:N,id:se,role:"listbox","aria-label":y??Y??i,className:w("classicyPopUpMenuList",D?.above&&"classicyPopUpMenuListAbove"),style:{position:"fixed",left:`${c.left}px`,minWidth:`${c.width}px`,zIndex:5e3,...D?.above?{bottom:`${window.innerHeight-c.top}px`}:{top:`${c.bottom}px`},...D&&{maxHeight:`${D.maxHeight}px`}},children:[x.length===0&&n.jsx("div",{role:"presentation",className:"classicyComboBoxNoMatches classicyPopUpMenuListItem",children:"No matches"}),he.map((e,a)=>{if(e.kind==="header")return n.jsx("div",{role:"presentation",className:"classicyPopUpMenuGroupHeader",children:e.label},`${i}-group-${e.label}-${a}`);const{option:o,flatIndex:r,grouped:B}=e,ie=o.value===U.current;return n.jsxs("div",{id:W(r),role:"option",tabIndex:-1,"aria-selected":ie,className:w("classicyPopUpMenuListItem",B&&"classicyPopUpMenuListItemGrouped",r===p&&"classicyPopUpMenuListItemHighlight"),onMouseEnter:()=>d(r),onMouseDown:C=>C.preventDefault(),onClick:()=>z(o),onKeyDown:C=>{(C.key==="Enter"||C.key===" ")&&(C.preventDefault(),z(o))},children:[n.jsx("span",{className:w("classicyPopUpMenuCheck",Pe({checked:ie})),"aria-hidden":!0}),o.icon&&n.jsx("img",{className:"classicyPopUpMenuListItemIcon",src:o.icon,alt:""}),n.jsx("span",{className:"classicyPopUpMenuListItemLabel",children:o.label})]},i+o.value)})]}),document.getElementById("classicyDesktop")??document.body)]})};G.__docgenInfo={description:`The \`<datalist>\`/combobox equivalent: the Platinum "combination box" \u2014 an
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
\`\`\``,methods:[],displayName:"ClassicyComboBox",props:{id:{required:!0,tsType:{name:"string"},description:"Id (and `name`) of the text `<input>`; links the label to it."},options:{required:!0,tsType:{name:"Array",elements:[{name:"ClassicyPopUpMenuEntry"}],raw:"ClassicyPopUpMenuEntry[]"},description:"Flat options and/or `{ groupLabel, options }` groups, like ClassicyPopUpMenu."},prefillValue:{required:!1,tsType:{name:"string"},description:"Initial text. The field resets to it whenever it changes."},placeholder:{required:!1,tsType:{name:"string"},description:"Native placeholder text shown while the field is empty."},label:{required:!1,tsType:{name:"string"},description:"Visible label text; also the suggestion list's accessible name."},labelPosition:{required:!1,tsType:{name:"ClassicyLabelPosition"},description:'Where the label sits relative to the field. Defaults to `"above"`.',defaultValue:{value:'"above"',computed:!1}},labelSize:{required:!1,tsType:{name:"ClassicyControlLabelSize"},description:"Label text size."},filter:{required:!1,tsType:{name:"union",raw:'"startsWith" | "contains" | false',elements:[{name:"literal",value:'"startsWith"'},{name:"literal",value:'"contains"'},{name:"literal",value:"false"}]},description:'How typing narrows the suggestions. `false` never filters. Defaults to\n`"startsWith"`.',defaultValue:{value:'"startsWith"',computed:!1}},freeText:{required:!1,tsType:{name:"boolean"},description:"When false, dismissing the combo with text that matches no option\nreverts to the last committed selection \u2014 the field can only ever hold\nan option label. Defaults to `true`.",defaultValue:{value:"true",computed:!1}},disabled:{required:!1,tsType:{name:"boolean"},description:"Disables the field and its arrow (and dims the label). Defaults to `false`.",defaultValue:{value:"false",computed:!1}},onChangeFunc:{required:!1,tsType:{name:"signature",type:"function",raw:"(text: string) => void",signature:{arguments:[{type:{name:"string"},name:"text"}],return:{name:"void"}}},description:"Fired for every text change (typing or committing a suggestion)."},onSelectFunc:{required:!1,tsType:{name:"signature",type:"function",raw:"(value: string, option: ClassicyPopUpMenuOption) => void",signature:{arguments:[{type:{name:"string"},name:"value"},{type:{name:"ClassicyPopUpMenuOption"},name:"option"}],return:{name:"void"}}},description:"Fired when a suggestion is committed (click or Enter)."},className:{required:!1,tsType:{name:"string"},description:"Extra class names, merged onto the root element after the component's own."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the root element after the component's own."}}};const{fn:ce}=__STORYBOOK_MODULE_TEST__,De={title:"Controls/ComboBox",component:G,decorators:[i=>n.jsx("div",{style:{width:260},children:n.jsx(i,{})})],args:{onChangeFunc:ce(),onSelectFunc:ce()}},E=[{value:"cupertino",label:"Cupertino"},{value:"cambridge",label:"Cambridge"},{value:"chicago",label:"Chicago"},{value:"monaco",label:"Monaco"},{value:"new-york",label:"New York"}],h={args:{id:"combo-starts",label:"City:",placeholder:"Type to search\u2026",options:E}},k={args:{id:"combo-contains",label:"City (contains):",filter:"contains",options:E}},P={args:{id:"combo-pick",label:"City (no free text):",freeText:!1,options:E}},L={args:{id:"combo-grouped",label:"Font:",options:[{groupLabel:"Serif",options:[{value:"new-york",label:"New York"},{value:"palatino",label:"Palatino"}]},{groupLabel:"Sans Serif",options:[{value:"chicago",label:"Chicago"},{value:"charcoal",label:"Charcoal"},{value:"geneva",label:"Geneva"}]}]}},S={args:{id:"combo-no-filter",label:"City:",filter:!1,prefillValue:"Cupertino",options:E}},M={args:{id:"combo-disabled",label:"City:",prefillValue:"Monaco",disabled:!0,options:E}},T={args:h.args,render:i=>n.jsx(Me,{children:n.jsx(G,{...i})}),parameters:Se()};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-starts",
    label: "City:",
    placeholder: "Type to search\u2026",
    options: cities
  }
}`,...h.parameters?.docs?.source},description:{story:`The default filter: typing "c" narrows the list to the labels that start with
it. The arrow button always shows the full list.`,...h.parameters?.docs?.description}}};k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-contains",
    label: "City (contains):",
    filter: "contains",
    options: cities
  }
}`,...k.parameters?.docs?.source},description:{story:'`filter="contains"` matches anywhere in a label, so typing "york" finds New York.',...k.parameters?.docs?.description}}};P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-pick",
    label: "City (no free text):",
    freeText: false,
    options: cities
  }
}`,...P.parameters?.docs?.source},description:{story:"`freeText={false}`: the field may only hold an option label. Text that\nmatches none snaps back to the last committed choice on dismiss.",...P.parameters?.docs?.description}}};L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
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
}`,...L.parameters?.docs?.source},description:{story:"Grouped suggestions (`{ groupLabel, options }` entries): groups filter with\ntheir members and vanish, header included, when none match.",...L.parameters?.docs?.description}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-no-filter",
    label: "City:",
    filter: false,
    prefillValue: "Cupertino",
    options: cities
  }
}`,...S.parameters?.docs?.source},description:{story:'`filter={false}` never narrows the list, so it works as a "recent values"\nmenu beside a free-form field. Prefilled text seeds the field.',...S.parameters?.docs?.description}}};M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-disabled",
    label: "City:",
    prefillValue: "Monaco",
    disabled: true,
    options: cities
  }
}`,...M.parameters?.docs?.source},description:{story:"A disabled combo box: neither the field nor the arrow responds.",...M.parameters?.docs?.description}}};T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: StartsWith.args,
  render: (args: ComponentProps<typeof ClassicyComboBox>) => <ClassicyAppearanceProbe>
            <ClassicyComboBox {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...T.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...T.parameters?.docs?.description}}};const Ne=["StartsWith","Contains","PickOnly","GroupedSuggestions","NoFilter","Disabled","AppearanceHooks"];export{T as AppearanceHooks,k as Contains,M as Disabled,L as GroupedSuggestions,S as NoFilter,P as PickOnly,h as StartsWith,Ne as __namedExportsOrder,De as default};
