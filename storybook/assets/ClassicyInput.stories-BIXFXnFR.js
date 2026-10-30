import{D as o}from"./iframe-B6FIFMgv.js";import"./preload-helper-PPVm8Dsz.js";const{fn:l}=__STORYBOOK_MODULE_TEST__,d={title:"Controls/Input",component:o,args:{onChangeFunc:l(),onEnterFunc:l()}},e={args:{id:"input-default",labelTitle:"Computer Name"}},a={args:{id:"input-placeholder",labelTitle:"Search",placeholder:"Find items…"}},s={args:{id:"input-left",labelTitle:"Name:",labelPosition:"left",prefillValue:"Macintosh HD"}},t={args:{id:"input-password",labelTitle:"Password:",labelPosition:"left",type:"password",prefillValue:"sosumi"}},r={args:{id:"input-disabled",labelTitle:"Serial Number",disabled:!0}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-default",
    labelTitle: "Computer Name"
  }
}`,...e.parameters?.docs?.source},description:{story:"An empty edit text field with its label above — the default layout.",...e.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-placeholder",
    labelTitle: "Search",
    placeholder: "Find items…"
  }
}`,...a.parameters?.docs?.source},description:{story:"Placeholder text shows in the empty field and disappears once the user types.",...a.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-left",
    labelTitle: "Name:",
    labelPosition: "left",
    prefillValue: "Macintosh HD"
  }
}`,...s.parameters?.docs?.source},description:{story:"A label to the left of a prefilled field, the usual dialog-row layout. The\nfield stays editable: `prefillValue` only seeds (and later resets) the text.",...s.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-password",
    labelTitle: "Password:",
    labelPosition: "left",
    type: "password",
    prefillValue: "sosumi"
  }
}`,...t.parameters?.docs?.source},description:{story:"`type` passes through to the native `<input>`, so a password field masks its text.",...t.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-disabled",
    labelTitle: "Serial Number",
    disabled: true
  }
}`,...r.parameters?.docs?.source},description:{story:"A disabled field: not editable, with field and label dimmed.",...r.parameters?.docs?.description}}};const p=["Default","Placeholder","LabelLeft","Password","Disabled"];export{e as Default,r as Disabled,s as LabelLeft,t as Password,a as Placeholder,p as __namedExportsOrder,d as default};
