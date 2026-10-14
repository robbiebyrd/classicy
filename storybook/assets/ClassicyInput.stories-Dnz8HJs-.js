import{q as t}from"./iframe-NkWlaqLH.js";import"./preload-helper-PPVm8Dsz.js";const{fn:s}=__STORYBOOK_MODULE_TEST__,i={title:"Controls/Input",component:t,args:{onChangeFunc:s()}},e={args:{id:"input-default",labelTitle:"Computer Name"}},a={args:{id:"input-placeholder",labelTitle:"Search",placeholder:"Find items…"}},r={args:{id:"input-left",labelTitle:"Name:",labelPosition:"left",prefillValue:"Macintosh HD"}},l={args:{id:"input-disabled",labelTitle:"Serial Number",disabled:!0}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-default",
    labelTitle: "Computer Name"
  }
}`,...e.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-placeholder",
    labelTitle: "Search",
    placeholder: "Find items…"
  }
}`,...a.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-left",
    labelTitle: "Name:",
    labelPosition: "left",
    prefillValue: "Macintosh HD"
  }
}`,...r.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-disabled",
    labelTitle: "Serial Number",
    disabled: true
  }
}`,...l.parameters?.docs?.source}}};const c=["Default","Placeholder","LabelLeft","Disabled"];export{e as Default,l as Disabled,r as LabelLeft,a as Placeholder,c as __namedExportsOrder,i as default};
