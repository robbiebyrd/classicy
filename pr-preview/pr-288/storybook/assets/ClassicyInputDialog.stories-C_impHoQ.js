import{N as n,j as i}from"./iframe-C8bYhRqH.js";import{d as l,S as d}from"./helpers-B-r_1-l0.js";import"./preload-helper-BF_4oo6e.js";const{fn:r}=__STORYBOOK_MODULE_TEST__,s="storybook.app",u={title:"Dialogs/InputDialog",component:n,parameters:l,args:{appId:s,onConfirm:r(),onCancel:r()},render:e=>i.jsx(d,{id:s,name:"Storybook",children:i.jsx(n,{...e})}),parameters:{docs:{description:{component:`Movable-modal text prompt (HIGOS8 Ch.3 "Movable Modal Dialog Boxes", p.59):
a title bar with no close box, a prompt, one edit field and a Cancel /
default-button pair. The field is focused with its text selected on open;
Return fires the default button and Escape or Command-period fires Cancel.
The dialog has no close box, so OK and Cancel are its only exits.`}}}},a={args:{id:"input-dialog-default",title:"Find",prompt:"Find what:"}},t={args:{id:"input-dialog-prefilled",title:"New Folder",prompt:"Name of new folder:",initialValue:"untitled folder",confirmLabel:"Create"}},o={args:{id:"input-dialog-validation",title:"Rename",prompt:"New name (31 characters max, no colons):",initialValue:"Report: Q3",confirmLabel:"Rename",validate:e=>e.trim().length>0&&e.length<=31&&!e.includes(":")}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-dialog-default",
    title: "Find",
    prompt: "Find what:"
  }
}`,...a.parameters?.docs?.source},description:{story:`A labelled prompt with an empty field. The default validator requires a
non-blank value, so OK stays dimmed until you type something.`,...a.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-dialog-prefilled",
    title: "New Folder",
    prompt: "Name of new folder:",
    initialValue: "untitled folder",
    confirmLabel: "Create"
  }
}`,...t.parameters?.docs?.source},description:{story:`Finder's New Folder prompt: the field opens holding "untitled folder", already
selected so typing replaces it.`,...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-dialog-validation",
    title: "Rename",
    prompt: "New name (31 characters max, no colons):",
    initialValue: "Report: Q3",
    confirmLabel: "Rename",
    validate: (name: string) => name.trim().length > 0 && name.length <= 31 && !name.includes(":")
  }
}`,...o.parameters?.docs?.source},description:{story:"A custom `validate`: Mac OS file names are at most 31 characters and may not\ncontain a colon. The field opens holding an invalid name, so the default\nbutton is dimmed and Return does nothing until the name is fixed.",...o.parameters?.docs?.description}}};const f=["Default","Prefilled","Validation"];export{a as Default,t as Prefilled,o as Validation,f as __namedExportsOrder,u as default};
