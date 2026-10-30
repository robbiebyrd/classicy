import{T as d,j as l}from"./iframe-DaKszo_D.js";import{a as p,C as m}from"./ClassicyAppearanceProbe-CrIQrA0s.js";import"./preload-helper-shce2T3m.js";const{fn:u}=__STORYBOOK_MODULE_TEST__,g={title:"Controls/Checkbox",component:d,args:{onClickFunc:u()}},e={args:{id:"cb-checked",checked:!0,label:"Enable AppleTalk"}},a={args:{id:"cb-unchecked",checked:!1,label:"Show Balloons"}},r={args:{id:"cb-mixed",mixed:!0,label:"Partially Selected"}},s={args:{id:"cb-disabled",disabled:!0,checked:!0,label:"Locked"}},c={args:{id:"cb-default",checked:!0,isDefault:!0,label:"Use as default"}},o={args:{id:"cb-x-mark",checked:!0,mark:"x",label:"Enable AppleTalk"}},t={args:{id:"cb-label-left",checked:!0,labelPosition:"left",label:"Remember password"}},n={args:e.args,render:i=>l.jsx(m,{children:l.jsx(d,{...i})}),parameters:p()};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
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
}`,...c.parameters?.docs?.source},description:{story:"`isDefault` rings the box in the theme accent colour while it is on or\npressed \u2014 the same emphasis a default radio button gets.",...c.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "cb-x-mark",
    checked: true,
    mark: "x",
    label: "Enable AppleTalk"
  }
}`,...o.parameters?.docs?.source},description:{story:'`mark="x"` swaps the checkmark for an "x" \u2014 the HIG\'s localization opt-in\n(p.28) for locales where a checkmark is not culturally acceptable.',...o.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "cb-label-left",
    checked: true,
    labelPosition: "left",
    label: "Remember password"
  }
}`,...t.parameters?.docs?.source},description:{story:'`labelPosition="left"` puts the label before the box.',...t.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: Checked.args,
  render: (args: ComponentProps<typeof ClassicyCheckbox>) => <ClassicyAppearanceProbe>
            <ClassicyCheckbox {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...n.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...n.parameters?.docs?.description}}};const f=["Checked","Unchecked","Mixed","Disabled","Default","XMark","LabelOnLeft","AppearanceHooks"];export{n as AppearanceHooks,e as Checked,c as Default,s as Disabled,t as LabelOnLeft,r as Mixed,a as Unchecked,o as XMark,f as __namedExportsOrder,g as default};
