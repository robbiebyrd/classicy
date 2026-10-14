import{K as t}from"./iframe-Bpp-4HAP.js";import"./preload-helper-PPVm8Dsz.js";const{fn:c}=__STORYBOOK_MODULE_TEST__,i=[{value:"geneva",label:"Geneva"},{value:"chicago",label:"Chicago"},{value:"monaco",label:"Monaco"},{value:"charcoal",label:"Charcoal"}],b={title:"Controls/PopUpMenu",component:t,args:{options:i,onChangeFunc:c()}},e={args:{id:"popup-default",selected:"geneva"}},a={args:{id:"popup-label",label:"Font:",labelPosition:"left",selected:"chicago"}},o={args:{id:"popup-mini",size:"mini",selected:"monaco"}},n={args:{id:"popup-placeholder",placeholder:"Select a font…"}},l={args:{id:"popup-disabled",selected:"charcoal",disabled:!0}},u=["January","February","March","April","May","June","July","August","September","October","November","December"],s={args:{id:"popup-aligned",label:"Month:",labelPosition:"left",selected:"september",options:u.map(p=>({value:p.toLowerCase(),label:p}))}},r={args:{id:"popup-grouped",label:"Sound:",selected:"sosumi",options:[{value:"none",label:"None"},{groupLabel:"Alert Sounds",options:[{value:"sosumi",label:"Sosumi"},{value:"quack",label:"Quack"},{value:"wild-eep",label:"Wild Eep"}]},{groupLabel:"System Sounds",options:[{value:"boot",label:"Boot Chime"},{value:"beep",label:"Simple Beep"}]}]}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-default",
    selected: "geneva"
  }
}`,...e.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-label",
    label: "Font:",
    labelPosition: "left",
    selected: "chicago"
  }
}`,...a.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-mini",
    size: "mini",
    selected: "monaco"
  }
}`,...o.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-placeholder",
    placeholder: "Select a font…"
  }
}`,...n.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-disabled",
    selected: "charcoal",
    disabled: true
  }
}`,...l.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
}`,...s.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
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
}`,...r.parameters?.docs?.source}}};const g=["Default","WithLabel","Mini","Placeholder","Disabled","AlignedLongList","Grouped"];export{s as AlignedLongList,e as Default,l as Disabled,r as Grouped,o as Mini,n as Placeholder,a as WithLabel,g as __namedExportsOrder,b as default};
