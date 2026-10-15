import{h as i,j as l}from"./iframe-CDTQRmVr.js";import"./preload-helper-PPVm8Dsz.js";const{fn:u}=__STORYBOOK_MODULE_TEST__,g={title:"Controls/Button",component:i,args:{children:"OK",onClickFunc:u()}},e={},r={args:{isDefault:!0,children:"Save"}},s={args:{disabled:!0,children:"Disabled"}},a={args:{depressed:!0,children:"Pressed"}},n={args:{buttonSize:"small",children:"Small"}},t={args:{buttonShape:"square",children:"▸"}},o={render:d=>l.jsxs("div",{style:{display:"flex"},children:[l.jsx(i,{...d,isDefault:!0,children:"OK"}),l.jsx(i,{...d,isDefault:!1,children:"Cancel"})]}),args:{children:"OK"}},c={args:{isDefault:!0,children:"Press Return"}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:"{}",...e.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    isDefault: true,
    children: "Save"
  }
}`,...r.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    children: "Disabled"
  }
}`,...s.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    depressed: true,
    children: "Pressed"
  }
}`,...a.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    buttonSize: "small",
    children: "Small"
  }
}`,...n.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    buttonShape: "square",
    children: "▸"
  }
}`,...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: args => <div style={{
    display: "flex"
  }}>
            <ClassicyButton {...args} isDefault={true}>
                OK
            </ClassicyButton>
            <ClassicyButton {...args} isDefault={false}>
                Cancel
            </ClassicyButton>
        </div>,
  args: {
    children: "OK"
  }
}`,...o.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    isDefault: true,
    children: "Press Return"
  }
}`,...c.parameters?.docs?.source}}};const S=["Default","DefaultAction","Disabled","Depressed","Small","Square","OkCancelRow","KeyboardActivation"];export{e as Default,r as DefaultAction,a as Depressed,s as Disabled,c as KeyboardActivation,o as OkCancelRow,n as Small,t as Square,S as __namedExportsOrder,g as default};
