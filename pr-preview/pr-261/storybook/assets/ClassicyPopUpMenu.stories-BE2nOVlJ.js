import{K as r}from"./iframe-CEH5bMmH.js";import"./preload-helper-UyWNs-m6.js";const{fn:p}=__STORYBOOK_MODULE_TEST__,c=[{value:"geneva",label:"Geneva"},{value:"chicago",label:"Chicago"},{value:"monaco",label:"Monaco"},{value:"charcoal",label:"Charcoal"}],i={title:"Controls/PopUpMenu",component:r,args:{options:c,onChangeFunc:p()}},e={args:{id:"popup-default",selected:"geneva"}},a={args:{id:"popup-label",label:"Font:",labelPosition:"left",selected:"chicago"}},o={args:{id:"popup-mini",size:"mini",selected:"monaco"}},l={args:{id:"popup-placeholder",placeholder:"Select a font…"}},s={args:{id:"popup-disabled",selected:"charcoal",disabled:!0}},n={args:{id:"popup-grouped",label:"Sound:",selected:"sosumi",options:[{value:"none",label:"None"},{groupLabel:"Alert Sounds",options:[{value:"sosumi",label:"Sosumi"},{value:"quack",label:"Quack"},{value:"wild-eep",label:"Wild Eep"}]},{groupLabel:"System Sounds",options:[{value:"boot",label:"Boot Chime"},{value:"beep",label:"Simple Beep"}]}]}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
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
}`,...o.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-placeholder",
    placeholder: "Select a font…"
  }
}`,...l.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-disabled",
    selected: "charcoal",
    disabled: true
  }
}`,...s.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source}}};const d=["Default","WithLabel","Mini","Placeholder","Disabled","Grouped"];export{e as Default,s as Disabled,n as Grouped,o as Mini,l as Placeholder,a as WithLabel,d as __namedExportsOrder,i as default};
