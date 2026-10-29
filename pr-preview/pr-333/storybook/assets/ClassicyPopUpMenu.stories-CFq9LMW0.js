import{F as d,j as p}from"./iframe-Y0RyUsmn.js";import"./preload-helper-shce2T3m.js";const{fn:c}=__STORYBOOK_MODULE_TEST__,u=[{value:"geneva",label:"Geneva"},{value:"chicago",label:"Chicago"},{value:"monaco",label:"Monaco"},{value:"charcoal",label:"Charcoal"}],h={title:"Controls/PopUpMenu",component:d,args:{options:u,onChangeFunc:c()}},o={args:{id:"popup-default",selected:"geneva"}},s={args:{id:"popup-label",label:"Font:",labelPosition:"left",selected:"chicago"}},a={args:{id:"popup-mini",size:"mini",selected:"monaco"}},n={args:{id:"popup-placeholder",placeholder:"Select a font…"}},r={args:{id:"popup-disabled",selected:"charcoal",disabled:!0}},m=["January","February","March","April","May","June","July","August","September","October","November","December"],t={args:{id:"popup-aligned",label:"Month:",labelPosition:"left",selected:"september",options:m.map(e=>({value:e.toLowerCase(),label:e}))}},l={args:{id:"popup-grouped",label:"Sound:",selected:"sosumi",options:[{value:"none",label:"None"},{groupLabel:"Alert Sounds",options:[{value:"sosumi",label:"Sosumi"},{value:"quack",label:"Quack"},{value:"wild-eep",label:"Wild Eep"}]},{groupLabel:"System Sounds",options:[{value:"boot",label:"Boot Chime"},{value:"beep",label:"Simple Beep"}]}]}},i={args:{id:"popup-sizes"},render:e=>p.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8},children:[p.jsx(d,{...e,id:"popup-size-small",size:"small",selected:"geneva"}),p.jsx(d,{...e,id:"popup-size-medium",size:"medium",selected:"geneva"}),p.jsx(d,{...e,id:"popup-size-large",size:"large",selected:"geneva"})]})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-default",
    selected: "geneva"
  }
}`,...o.parameters?.docs?.source},description:{story:"A bare pop-up menu showing its current item; open it to see the checkmark.",...o.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-label",
    label: "Font:",
    labelPosition: "left",
    selected: "chicago"
  }
}`,...s.parameters?.docs?.source},description:{story:"A label to the left of the button — the usual dialog-row layout.",...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-mini",
    size: "mini",
    selected: "monaco"
  }
}`,...a.parameters?.docs?.source},description:{story:'The menu-only `"mini"` size, for dense palettes and toolbars.',...a.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-placeholder",
    placeholder: "Select a font…"
  }
}`,...n.parameters?.docs?.source},description:{story:"With no `selected` value the button shows the placeholder and nothing is\nchecked; the menu grows down (or flips up) instead of aligning on an item.",...n.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-disabled",
    selected: "charcoal",
    disabled: true
  }
}`,...r.parameters?.docs?.source},description:{story:"A disabled pop-up: the button is dimmed and does not open.",...r.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-aligned",
    label: "Month:",
    labelPosition: "left",
    selected: "september",
    options: MONTHS.map(month => ({
      value: month.toLowerCase(),
      label: month
    }))
  }
}`,...t.parameters?.docs?.source},description:{story:`Long enough to scroll: opening it puts the *selected* item right over the
button (Mac OS 8 aligned pop-up, HIGOS8 p.33) and scrolls the list so that
selection lands on the pointer, rather than always opening from the top.`,...t.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-grouped",
    label: "Sound:",
    selected: "sosumi",
    options: [{
      value: "none",
      label: "None"
    }, {
      groupLabel: "Alert Sounds",
      options: [{
        value: "sosumi",
        label: "Sosumi"
      }, {
        value: "quack",
        label: "Quack"
      }, {
        value: "wild-eep",
        label: "Wild Eep"
      }]
    }, {
      groupLabel: "System Sounds",
      options: [{
        value: "boot",
        label: "Boot Chime"
      }, {
        value: "beep",
        label: "Simple Beep"
      }]
    }]
  }
}`,...l.parameters?.docs?.source},description:{story:"The `<optgroup>` equivalent: `{ groupLabel, options }` entries render titled,\nnon-selectable groups, mixed freely with plain options.",...l.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-sizes"
  },
  render: args => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: 8
  }}>
            <ClassicyPopUpMenu {...args} id="popup-size-small" size="small" selected="geneva" />
            <ClassicyPopUpMenu {...args} id="popup-size-medium" size="medium" selected="geneva" />
            <ClassicyPopUpMenu {...args} id="popup-size-large" size="large" selected="geneva" />
        </div>
}`,...i.parameters?.docs?.source},description:{story:"The `small`, `medium` and `large` sizes stacked for comparison (`mini` has its own story).",...i.parameters?.docs?.description}}};const v=["Default","WithLabel","Mini","Placeholder","Disabled","AlignedLongList","Grouped","Sizes"];export{t as AlignedLongList,o as Default,r as Disabled,l as Grouped,a as Mini,n as Placeholder,i as Sizes,s as WithLabel,v as __namedExportsOrder,h as default};
