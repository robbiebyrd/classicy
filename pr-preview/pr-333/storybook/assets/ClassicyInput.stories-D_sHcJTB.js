import{a3 as l,j as i}from"./iframe-Ucd56N8t.js";import{a as d,C as c}from"./ClassicyAppearanceProbe-Cyvt-SHj.js";import"./preload-helper-shce2T3m.js";const{fn:n}=__STORYBOOK_MODULE_TEST__,f={title:"Controls/Input",component:l,args:{onChangeFunc:n(),onEnterFunc:n()}},e={args:{id:"input-default",labelTitle:"Computer Name"}},a={args:{id:"input-placeholder",labelTitle:"Search",placeholder:"Find items\u2026"}},s={args:{id:"input-left",labelTitle:"Name:",labelPosition:"left",prefillValue:"Macintosh HD"}},r={args:{id:"input-password",labelTitle:"Password:",labelPosition:"left",type:"password",prefillValue:"sosumi"}},t={args:{id:"input-disabled",labelTitle:"Serial Number",disabled:!0}},o={args:e.args,render:p=>i.jsx(c,{children:i.jsx(l,{...p})}),parameters:d()};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-default",
    labelTitle: "Computer Name"
  }
}`,...e.parameters?.docs?.source},description:{story:"An empty edit text field with its label above \u2014 the default layout.",...e.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-placeholder",
    labelTitle: "Search",
    placeholder: "Find items\u2026"
  }
}`,...a.parameters?.docs?.source},description:{story:"Placeholder text shows in the empty field and disappears once the user types.",...a.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-left",
    labelTitle: "Name:",
    labelPosition: "left",
    prefillValue: "Macintosh HD"
  }
}`,...s.parameters?.docs?.source},description:{story:"A label to the left of a prefilled field, the usual dialog-row layout. The\nfield stays editable: `prefillValue` only seeds (and later resets) the text.",...s.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-password",
    labelTitle: "Password:",
    labelPosition: "left",
    type: "password",
    prefillValue: "sosumi"
  }
}`,...r.parameters?.docs?.source},description:{story:"`type` passes through to the native `<input>`, so a password field masks its text.",...r.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "input-disabled",
    labelTitle: "Serial Number",
    disabled: true
  }
}`,...t.parameters?.docs?.source},description:{story:"A disabled field: not editable, with field and label dimmed.",...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicyInput>) => <ClassicyAppearanceProbe>
            <ClassicyInput {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...o.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...o.parameters?.docs?.description}}};const h=["Default","Placeholder","LabelLeft","Password","Disabled","AppearanceHooks"];export{o as AppearanceHooks,e as Default,t as Disabled,s as LabelLeft,r as Password,a as Placeholder,h as __namedExportsOrder,f as default};
