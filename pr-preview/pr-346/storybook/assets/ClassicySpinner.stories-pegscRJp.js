import{F as o}from"./iframe-BxRT98ll.js";import"./preload-helper-DhQH6ajB.js";const{fn:n}=__STORYBOOK_MODULE_TEST__,t={title:"Controls/Spinner",component:o,args:{onChangeFunc:n(),onEnterFunc:n()}},e={args:{id:"spin-default",labelTitle:"Font Size",prefillValue:12,minValue:9,maxValue:72}},a={args:{id:"spin-large",labelTitle:"Cache Size (K):",labelPosition:"left",prefillValue:512,minValue:32,maxValue:65536}},r={args:{id:"spin-wrap",labelTitle:"Hour",labelPosition:"left",prefillValue:12,minValue:1,maxValue:12,wrap:!0}},s={args:{id:"spin-disabled",labelTitle:"Copies",prefillValue:1,disabled:!0}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "spin-default",
    labelTitle: "Font Size",
    prefillValue: 12,
    minValue: 9,
    maxValue: 72
  }
}`,...e.parameters?.docs?.source},description:{story:`A number field with little arrows, clamped to 9\u201372. Click an arrow to step
by one, or hold it to auto-repeat; with the field focused, Up and Down
Arrow step by one too.`,...e.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "spin-large",
    labelTitle: "Cache Size (K):",
    labelPosition: "left",
    prefillValue: 512,
    minValue: 32,
    maxValue: 65536
  }
}`,...a.parameters?.docs?.source},description:{story:`A wide range: hold an arrow and the step grows tenfold every three seconds
(1, 10, 100\u2026), so large values are quick to reach. The field is sized to fit
the longer bound.`,...a.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "spin-wrap",
    labelTitle: "Hour",
    labelPosition: "left",
    prefillValue: 12,
    minValue: 1,
    maxValue: 12,
    wrap: true
  }
}`,...r.parameters?.docs?.source},description:{story:`\`wrap\`: past 12 the hour comes round to 1, and below 1 to 12, by the arrows
or the Up and Down keys, as Windows' spin boxes typically do (WIG Ch.7
"Spin Boxes", p.128). A typed value is still clamped.`,...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "spin-disabled",
    labelTitle: "Copies",
    prefillValue: 1,
    disabled: true
  }
}`,...s.parameters?.docs?.source},description:{story:"A disabled spinner: neither the field nor the arrows respond.",...s.parameters?.docs?.description}}};const p=["Default","LargeRange","Wrap","Disabled"];export{e as Default,s as Disabled,a as LargeRange,r as Wrap,p as __namedExportsOrder,t as default};
