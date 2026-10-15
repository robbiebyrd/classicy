import{a0 as s}from"./iframe-BKbAcL7v.js";import"./preload-helper-PPVm8Dsz.js";const{fn:r}=__STORYBOOK_MODULE_TEST__,i={title:"Controls/Spinner",component:s,args:{onChangeFunc:r()}},e={args:{id:"spin-default",labelTitle:"Font Size",prefillValue:12,minValue:9,maxValue:72}},a={args:{id:"spin-disabled",labelTitle:"Copies",prefillValue:1,disabled:!0}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "spin-default",
    labelTitle: "Font Size",
    prefillValue: 12,
    minValue: 9,
    maxValue: 72
  }
}`,...e.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "spin-disabled",
    labelTitle: "Copies",
    prefillValue: 1,
    disabled: true
  }
}`,...a.parameters?.docs?.source}}};const t=["Default","Disabled"];export{e as Default,a as Disabled,t as __namedExportsOrder,i as default};
