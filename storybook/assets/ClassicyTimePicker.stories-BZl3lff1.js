import{aq as i}from"./iframe-Bm2OfEvH.js";import"./preload-helper-PPVm8Dsz.js";const{fn:r}=__STORYBOOK_MODULE_TEST__,o={title:"Controls/TimePicker",component:i,args:{onChangeFunc:r()}},e={args:{id:"time-default",labelTitle:"Time",prefillValue:new Date("2026-07-14T10:30:00")}},a={args:{id:"time-office-hours",labelTitle:"Meeting:",labelPosition:"left",prefillValue:new Date("2026-07-14T10:30:00"),minValue:new Date("2026-07-14T09:00:00"),maxValue:new Date("2026-07-14T17:00:00")}},t={args:{id:"time-disabled",labelTitle:"Time",prefillValue:new Date("2026-07-14T10:30:00"),disabled:!0}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "time-default",
    labelTitle: "Time",
    prefillValue: new Date("2026-07-14T10:30:00")
  }
}`,...e.parameters?.docs?.source},description:{story:`A 12-hour clock control seeded with 10:30:00 am. Click a field, then use
Up/Down or the little arrows to step it; the pop-up switches am/pm.`,...e.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "time-office-hours",
    labelTitle: "Meeting:",
    labelPosition: "left",
    prefillValue: new Date("2026-07-14T10:30:00"),
    minValue: new Date("2026-07-14T09:00:00"),
    maxValue: new Date("2026-07-14T17:00:00")
  }
}`,...a.parameters?.docs?.source},description:{story:"`minValue` / `maxValue` limit the time to office hours (9 am–5 pm on the same\nday as `prefillValue`); switching to pm at 10:30 snaps to 5:00:00 pm.",...a.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "time-disabled",
    labelTitle: "Time",
    prefillValue: new Date("2026-07-14T10:30:00"),
    disabled: true
  }
}`,...t.parameters?.docs?.source},description:{story:"A display-only (inactive) clock control: fields, arrows and the am/pm pop-up are disabled.",...t.parameters?.docs?.description}}};const n=["Default","OfficeHours","Disabled"];export{e as Default,t as Disabled,a as OfficeHours,n as __namedExportsOrder,o as default};
