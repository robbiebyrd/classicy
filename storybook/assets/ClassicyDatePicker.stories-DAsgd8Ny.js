import{s as t}from"./iframe-C-4LXCLH.js";import"./preload-helper-PPVm8Dsz.js";const{fn:s}=__STORYBOOK_MODULE_TEST__,o={title:"Controls/DatePicker",component:t,args:{onChangeFunc:s()}},e={args:{id:"date-default",labelTitle:"Date"}},a={args:{id:"date-prefilled",labelTitle:"Date",prefillValue:new Date("1998-07-14T00:00:00")}},r={args:{id:"date-disabled",labelTitle:"Date",disabled:!0}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "date-default",
    labelTitle: "Date"
  }
}`,...e.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "date-prefilled",
    labelTitle: "Date",
    prefillValue: new Date("1998-07-14T00:00:00")
  }
}`,...a.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "date-disabled",
    labelTitle: "Date",
    disabled: true
  }
}`,...r.parameters?.docs?.source}}};const i=["Default","Prefilled","Disabled"];export{e as Default,r as Disabled,a as Prefilled,i as __namedExportsOrder,o as default};
