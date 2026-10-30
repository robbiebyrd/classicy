import{n as l}from"./iframe-Hh8TrwlX.js";import"./preload-helper-shce2T3m.js";const{fn:n}=__STORYBOOK_MODULE_TEST__,p={title:"Controls/Checkbox",component:l,args:{onClickFunc:n()}},e={args:{id:"cb-checked",checked:!0,label:"Enable AppleTalk"}},a={args:{id:"cb-unchecked",checked:!1,label:"Show Balloons"}},r={args:{id:"cb-mixed",mixed:!0,label:"Partially Selected"}},s={args:{id:"cb-disabled",disabled:!0,checked:!0,label:"Locked"}},c={args:{id:"cb-default",checked:!0,isDefault:!0,label:"Use as default"}},t={args:{id:"cb-x-mark",checked:!0,mark:"x",label:"Enable AppleTalk"}},o={args:{id:"cb-label-left",checked:!0,labelPosition:"left",label:"Remember password"}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "cb-checked",
    checked: true,
    label: "Enable AppleTalk"
  }
}`,...e.parameters?.docs?.source},description:{story:"The on state, drawn with the standard checkmark.",...e.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "cb-unchecked",
    checked: false,
    label: "Show Balloons"
  }
}`,...a.parameters?.docs?.source},description:{story:"The off state. Click the box or its label to toggle it; `onClickFunc` receives the new value.",...a.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "cb-mixed",
    mixed: true,
    label: "Partially Selected"
  }
}`,...r.parameters?.docs?.source},description:{story:'The mixed state: a dash meaning "on for part of the selection". It shows\nregardless of `checked` until the caller clears `mixed`.',...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "cb-disabled",
    disabled: true,
    checked: true,
    label: "Locked"
  }
}`,...s.parameters?.docs?.source},description:{story:"A disabled checkbox keeps its value but dims, along with its label, and ignores clicks.",...s.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    id: "cb-default",
    checked: true,
    isDefault: true,
    label: "Use as default"
  }
}`,...c.parameters?.docs?.source},description:{story:"`isDefault` rings the box in the theme accent colour while it is on or\npressed — the same emphasis a default radio button gets.",...c.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "cb-x-mark",
    checked: true,
    mark: "x",
    label: "Enable AppleTalk"
  }
}`,...t.parameters?.docs?.source},description:{story:'`mark="x"` swaps the checkmark for an "x" — the HIG\'s localization opt-in\n(p.28) for locales where a checkmark is not culturally acceptable.',...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "cb-label-left",
    checked: true,
    labelPosition: "left",
    label: "Remember password"
  }
}`,...o.parameters?.docs?.source},description:{story:'`labelPosition="left"` puts the label before the box.',...o.parameters?.docs?.description}}};const m=["Checked","Unchecked","Mixed","Disabled","Default","XMark","LabelOnLeft"];export{e as Checked,c as Default,s as Disabled,o as LabelOnLeft,r as Mixed,a as Unchecked,t as XMark,m as __namedExportsOrder,p as default};
