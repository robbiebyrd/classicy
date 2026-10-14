import{W as r}from"./iframe-BceEEWZs.js";import"./preload-helper-BWwelBuR.js";const{fn:t}=__STORYBOOK_MODULE_TEST__,i={title:"Controls/TimePicker",component:r,args:{onChangeFunc:t()}},e={args:{id:"time-default",labelTitle:"Time",prefillValue:new Date("2026-07-14T10:30:00")}},a={args:{id:"time-disabled",labelTitle:"Time",prefillValue:new Date("2026-07-14T10:30:00"),disabled:!0}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "time-default",
    labelTitle: "Time",
    prefillValue: new Date("2026-07-14T10:30:00")
  }
}`,...e.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "time-disabled",
    labelTitle: "Time",
    prefillValue: new Date("2026-07-14T10:30:00"),
    disabled: true
  }
}`,...a.parameters?.docs?.source}}};const n=["Default","Disabled"];export{e as Default,a as Disabled,n as __namedExportsOrder,i as default};
