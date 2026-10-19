import{o as s}from"./iframe-Bh9zwN-1.js";import"./preload-helper-PPVm8Dsz.js";const{fn:d}=__STORYBOOK_MODULE_TEST__,l={title:"Controls/Checkbox",component:s,args:{onClickFunc:d()}},e={args:{id:"cb-checked",checked:!0,label:"Enable AppleTalk"}},a={args:{id:"cb-unchecked",checked:!1,label:"Show Balloons"}},c={args:{id:"cb-mixed",mixed:!0,label:"Partially Selected"}},r={args:{id:"cb-disabled",disabled:!0,checked:!0,label:"Locked"}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "cb-checked",
    checked: true,
    label: "Enable AppleTalk"
  }
}`,...e.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "cb-unchecked",
    checked: false,
    label: "Show Balloons"
  }
}`,...a.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    id: "cb-mixed",
    mixed: true,
    label: "Partially Selected"
  }
}`,...c.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "cb-disabled",
    disabled: true,
    checked: true,
    label: "Locked"
  }
}`,...r.parameters?.docs?.source}}};const t=["Checked","Unchecked","Mixed","Disabled"];export{e as Checked,r as Disabled,c as Mixed,a as Unchecked,t as __namedExportsOrder,l as default};
