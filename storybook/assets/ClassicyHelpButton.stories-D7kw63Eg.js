import{L as l,j as e,h as o,t as i}from"./iframe-C-KCwMsw.js";import"./preload-helper-PPVm8Dsz.js";const{fn:c}=__STORYBOOK_MODULE_TEST__,u={title:"Controls/HelpButton",component:l,args:{onClickFunc:c()}},s={},a={args:{disabled:!0}},t={render:n=>e.jsxs("div",{style:{display:"flex",alignItems:"flex-end",gap:12,width:320},children:[e.jsx(l,{...n}),e.jsx("span",{style:{marginLeft:"auto"}}),e.jsx(o,{children:"Cancel"}),e.jsx(o,{isDefault:!0,children:"OK"})]})},r={render:n=>e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",width:320},children:[e.jsx(i,{id:"help-story-name",labelTitle:"Name"}),e.jsx("span",{style:{marginLeft:"auto"}}),e.jsx(l,{...n})]})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:"{}",...s.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true
  }
}`,...a.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: args => <div style={{
    display: "flex",
    alignItems: "flex-end",
    gap: 12,
    width: 320
  }}>
            <ClassicyHelpButton {...args} />
            <span style={{
      marginLeft: "auto"
    }} />
            <ClassicyButton>Cancel</ClassicyButton>
            <ClassicyButton isDefault>OK</ClassicyButton>
        </div>
}`,...t.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: args => <div style={{
    display: "flex",
    alignItems: "flex-start",
    width: 320
  }}>
            <ClassicyInput id="help-story-name" labelTitle="Name" />
            <span style={{
      marginLeft: "auto"
    }} />
            <ClassicyHelpButton {...args} />
        </div>
}`,...r.parameters?.docs?.source}}};const m=["Default","Disabled","LowerLeft","UpperRight"];export{s as Default,a as Disabled,t as LowerLeft,r as UpperRight,m as __namedExportsOrder,u as default};
