import{r as x,aq as F,j as n,ah as w,u as _,an as A}from"./iframe-0079SEi_.js";import"./preload-helper-PPVm8Dsz.js";const C=({id:o,options:s,selectionMode:p="single",selected:I,onChangeFunc:q,onActivateFunc:b,visibleRows:L,label:v,labelPosition:W="above",labelSize:T,disabled:t=!1})=>{const[j,B]=x.useState([]),c=I??j,r=x.useRef(-1),D=x.useMemo(()=>s.map(e=>({id:e.value,label:e.label})),[s]),{activeId:K,setActiveId:N,tabStopId:M,registerRef:O,selectRow:P,handleNavKey:R}=F(D),g=e=>{B(e),q?.(e)},f=(e,i)=>{const a=s[e];if(!(!a||a.disabled||t)){if(p==="multi"){if(i.shiftKey&&r.current>=0){const l=Math.min(r.current,e),y=Math.max(r.current,e);g(s.slice(l,y+1).filter(h=>!h.disabled).map(h=>h.value));return}if(i.metaKey||i.ctrlKey){r.current=e,g(c.includes(a.value)?c.filter(l=>l!==a.value):[...c,a.value]);return}}r.current=e,g([a.value])}},E=e=>{if(t)return;const i=R(e);if(i!==null){f(s.findIndex(a=>a.value===i),{shiftKey:e.shiftKey&&p==="multi",metaKey:!1,ctrlKey:!1});return}if(e.key==="Enter"||e.key===" "||e.key==="Spacebar"){const a=s.findIndex(y=>y.value===K);if(a<0)return;e.preventDefault();const l=s[a];if(e.key==="Enter"&&b){l.disabled||b(l.value);return}f(a,e)}},S=n.jsx("div",{id:o,role:"listbox","aria-multiselectable":p==="multi"||void 0,"aria-label":v,"aria-disabled":t||void 0,className:w("classicyListBox",t&&"classicyListBoxDisabled"),style:L?{"--classicy-listbox-visible-rows":L}:void 0,onKeyDown:E,children:s.map((e,i)=>{const a=c.includes(e.value);return n.jsxs("div",{role:"option","aria-selected":a,"aria-disabled":e.disabled||void 0,tabIndex:M===e.value&&!t?0:-1,ref:l=>O(e.value,l),className:w("classicyListBoxOption",{classicyListBoxOptionSelected:a,classicyListBoxOptionDisabled:e.disabled}),onClick:l=>{t||e.disabled||(P(e.value),f(i,l))},onDoubleClick:()=>{!t&&!e.disabled&&b?.(e.value)},onFocus:()=>N(e.value),children:[e.icon&&n.jsx("img",{className:"classicyListBoxOptionIcon",src:e.icon,alt:"","aria-hidden":!0}),n.jsx("span",{className:"classicyListBoxOptionLabel",children:e.label})]},e.value)})});return v?n.jsxs("div",{className:w(A(W)),children:[n.jsx(_,{label:v,labelFor:o,labelSize:T,disabled:t}),S]}):S};C.__docgenInfo={description:`The \`<select multiple>\` equivalent: a Platinum List Manager scrolling list
(inset white box, highlight selection). Single or multi selection; multi
follows the Mac conventions — plain click replaces, ⌘/Ctrl-click toggles,
Shift-click (or Shift-arrows) extends a range from the last plain
selection. Keyboard navigation is the shared \`useListNavigation\` roving
tabindex, and selection follows the keyboard as Platinum lists do.`,methods:[],displayName:"ClassicyListBox",props:{id:{required:!0,tsType:{name:"string"},description:""},options:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
	value: string;
	label: string;
	icon?: string;
	disabled?: boolean;
}`,signature:{properties:[{key:"value",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"icon",value:{name:"string",required:!1}},{key:"disabled",value:{name:"boolean",required:!1}}]}}],raw:"ClassicyListBoxOption[]"},description:""},selectionMode:{required:!1,tsType:{name:"union",raw:'"single" | "multi"',elements:[{name:"literal",value:'"single"'},{name:"literal",value:'"multi"'}]},description:"",defaultValue:{value:'"single"',computed:!1}},selected:{required:!1,tsType:{name:"Array",elements:[{name:"string"}],raw:"string[]"},description:"Controlled selection. Omit for uncontrolled use with `onChangeFunc`."},onChangeFunc:{required:!1,tsType:{name:"signature",type:"function",raw:"(values: string[]) => void",signature:{arguments:[{type:{name:"Array",elements:[{name:"string"}],raw:"string[]"},name:"values"}],return:{name:"void"}}},description:""},onActivateFunc:{required:!1,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:'Double-click or Enter on an option — the "open it" gesture.'},visibleRows:{required:!1,tsType:{name:"number"},description:"Fixed row height × this = the box's max height (scrolls past it)."},label:{required:!1,tsType:{name:"string"},description:""},labelPosition:{required:!1,tsType:{name:"ClassicyLabelPosition"},description:"",defaultValue:{value:'"above"',computed:!1}},labelSize:{required:!1,tsType:{name:"ClassicyControlLabelSize"},description:""},disabled:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};const G={title:"Controls/ListBox",component:C,decorators:[o=>n.jsx("div",{style:{width:240},children:n.jsx(o,{})})]},k=[{value:"chicago",label:"Chicago"},{value:"charcoal",label:"Charcoal"},{value:"geneva",label:"Geneva"},{value:"monaco",label:"Monaco"},{value:"new-york",label:"New York"},{value:"palatino",label:"Palatino"}],u={args:{id:"listbox-single",label:"Font",options:k}},d={args:{id:"listbox-multi",label:"Install fonts",selectionMode:"multi",options:k}},m={args:{id:"listbox-scroll",label:"Choose a printer",visibleRows:4,options:[{value:"lw",label:"LaserWriter 8500"},{value:"sw",label:"StyleWriter 1200"},{value:"iw",label:"ImageWriter II",disabled:!0},{value:"cl",label:"Color LaserWriter"},{value:"dw",label:"DeskWriter 600"},{value:"pb",label:"Personal LaserWriter"}]}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    id: "listbox-single",
    label: "Font",
    options: fonts
  }
}`,...u.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    id: "listbox-multi",
    label: "Install fonts",
    selectionMode: "multi",
    options: fonts
  }
}`,...d.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    id: "listbox-scroll",
    label: "Choose a printer",
    visibleRows: 4,
    options: [{
      value: "lw",
      label: "LaserWriter 8500"
    }, {
      value: "sw",
      label: "StyleWriter 1200"
    }, {
      value: "iw",
      label: "ImageWriter II",
      disabled: true
    }, {
      value: "cl",
      label: "Color LaserWriter"
    }, {
      value: "dw",
      label: "DeskWriter 600"
    }, {
      value: "pb",
      label: "Personal LaserWriter"
    }]
  }
}`,...m.parameters?.docs?.source}}};const Y=["Single","MultiSelect","ScrollingWithDisabled"];export{d as MultiSelect,m as ScrollingWithDisabled,u as Single,Y as __namedExportsOrder,G as default};
