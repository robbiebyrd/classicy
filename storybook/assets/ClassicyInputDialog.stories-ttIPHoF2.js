import{_ as r,j as i}from"./iframe-DqSz8Erh.js";import{a as l,d as p,S as c}from"./helpers-NCXin0Z2.js";import"./preload-helper-PPVm8Dsz.js";const{fn:s}=__STORYBOOK_MODULE_TEST__,d="storybook.app",f={title:"Dialogs/InputDialog",component:r,parameters:p,args:{appId:d,onConfirm:s(),onCancel:s()},render:e=>i.jsx(c,{id:d,name:"Storybook",children:i.jsx(r,{...e})})},a={args:{id:"input-dialog-default",title:"Find",prompt:"Find what:"}},n={args:{id:"input-dialog-prefilled",title:"New Folder",prompt:"Name of new folder:",initialValue:"untitled folder",confirmLabel:"Create"}},t={args:{id:"input-dialog-validation",title:"Rename",prompt:"New name (31 characters max, no colons):",initialValue:"Report: Q3",confirmLabel:"Rename",validate:e=>e.trim().length>0&&e.length<=31&&!e.includes(":")}},o={args:{id:"input-dialog-password",title:"Connect to Server",prompt:"Password for “Macintosh HD”:",inputType:"password",icon:l,cancelLabel:"Don’t Connect",confirmLabel:"Connect"}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-dialog-default",
    title: "Find",
    prompt: "Find what:"
  }
}`,...a.parameters?.docs?.source},description:{story:`A labelled prompt with an empty field. The default validator requires a
non-blank value, so OK stays dimmed until you type something.`,...a.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-dialog-prefilled",
    title: "New Folder",
    prompt: "Name of new folder:",
    initialValue: "untitled folder",
    confirmLabel: "Create"
  }
}`,...n.parameters?.docs?.source},description:{story:`Finder's New Folder prompt: the field opens holding "untitled folder", already
selected so typing replaces it.`,...n.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-dialog-validation",
    title: "Rename",
    prompt: "New name (31 characters max, no colons):",
    initialValue: "Report: Q3",
    confirmLabel: "Rename",
    validate: (name: string) => name.trim().length > 0 && name.length <= 31 && !name.includes(":")
  }
}`,...t.parameters?.docs?.source},description:{story:"A custom `validate`: Mac OS file names are at most 31 characters and may not\ncontain a colon. The field opens holding an invalid name, so the default\nbutton is dimmed and Return does nothing until the name is fixed.",...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-dialog-password",
    title: "Connect to Server",
    prompt: "Password for “Macintosh HD”:",
    inputType: "password",
    icon: SB_ICON,
    cancelLabel: "Don’t Connect",
    confirmLabel: "Connect"
  }
}`,...o.parameters?.docs?.source},description:{story:'A password prompt: `inputType: "password"` passes through to the native\n`<input>`, masking the text, and `icon` adds a leading icon beside the\nprompt. `cancelLabel` and `confirmLabel` rename both buttons.',...o.parameters?.docs?.description}}};const h=["Default","Prefilled","Validation","PasswordWithIcon"];export{a as Default,o as PasswordWithIcon,n as Prefilled,t as Validation,h as __namedExportsOrder,f as default};
