import{G as n}from"./iframe-DHv83cFW.js";import"./preload-helper-PPVm8Dsz.js";const{fn:s}=__STORYBOOK_MODULE_TEST__,o={title:"Controls/Spinner",component:n,args:{onChangeFunc:s(),onEnterFunc:s()}},e={args:{id:"spin-default",labelTitle:"Font Size",prefillValue:12,minValue:9,maxValue:72}},a={args:{id:"spin-large",labelTitle:"Cache Size (K):",labelPosition:"left",prefillValue:512,minValue:32,maxValue:65536}},r={args:{id:"spin-disabled",labelTitle:"Copies",prefillValue:1,disabled:!0}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "spin-default",
    labelTitle: "Font Size",
    prefillValue: 12,
    minValue: 9,
    maxValue: 72
  }
}`,...e.parameters?.docs?.source},description:{story:`A number field with little arrows, clamped to 9–72. Click an arrow to step
by one, or hold it to auto-repeat.`,...e.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "spin-large",
    labelTitle: "Cache Size (K):",
    labelPosition: "left",
    prefillValue: 512,
    minValue: 32,
    maxValue: 65536
  }
}`,...a.parameters?.docs?.source},description:{story:`A wide range: hold an arrow and the step grows tenfold every three seconds
(1, 10, 100…), so large values are quick to reach. The field is sized to fit
the longer bound.`,...a.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "spin-disabled",
    labelTitle: "Copies",
    prefillValue: 1,
    disabled: true
  }
}`,...r.parameters?.docs?.source},description:{story:"A disabled spinner: neither the field nor the arrows respond.",...r.parameters?.docs?.description}}};const t=["Default","LargeRange","Disabled"];export{e as Default,r as Disabled,a as LargeRange,t as __namedExportsOrder,o as default};
