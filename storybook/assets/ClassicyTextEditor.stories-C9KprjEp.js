import{a3 as a}from"./iframe-BKbAcL7v.js";import"./preload-helper-PPVm8Dsz.js";const{fn:s}=__STORYBOOK_MODULE_TEST__,l={title:"Controls/TextEditor",component:a,args:{onChangeFunc:s()}},e={args:{id:"te-default",prefillValue:"It was a dark and stormy night…"}},r={args:{id:"te-bordered",labelTitle:"Notes",border:!0,autoHeight:!0,prefillValue:"SimpleText uses this editor for plain text files."}},t={args:{id:"te-disabled",disabled:!0,prefillValue:"Read-only content."}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "te-default",
    prefillValue: "It was a dark and stormy night…"
  }
}`,...e.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "te-bordered",
    labelTitle: "Notes",
    border: true,
    autoHeight: true,
    prefillValue: "SimpleText uses this editor for plain text files."
  }
}`,...r.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "te-disabled",
    disabled: true,
    prefillValue: "Read-only content."
  }
}`,...t.parameters?.docs?.source}}};const n=["Default","Bordered","Disabled"];export{r as Bordered,e as Default,t as Disabled,n as __namedExportsOrder,l as default};
