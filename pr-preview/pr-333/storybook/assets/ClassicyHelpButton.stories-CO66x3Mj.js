import{ao as o,j as e,J as i,a3 as l}from"./iframe-B4dmbrk9.js";import"./preload-helper-shce2T3m.js";const{fn:p}=__STORYBOOK_MODULE_TEST__,u={title:"Controls/HelpButton",component:o,args:{onClickFunc:p()}},s={},t={args:{disabled:!0}},r={render:n=>e.jsxs("div",{style:{display:"flex",alignItems:"flex-end",gap:12,width:320},children:[e.jsx(o,{...n}),e.jsx("span",{style:{marginLeft:"auto"}}),e.jsx(i,{children:"Cancel"}),e.jsx(i,{isDefault:!0,children:"OK"})]})},a={render:n=>e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",width:320},children:[e.jsx(l,{id:"help-story-name",labelTitle:"Name"}),e.jsx("span",{style:{marginLeft:"auto"}}),e.jsx(o,{...n})]})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:"{}",...s.parameters?.docs?.source},description:{story:'The 20 × 21 Help button with its standard glyph and the accessible name "Help".',...s.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true
  }
}`,...t.parameters?.docs?.source},description:{story:"A dimmed Help button, for when no help is available in the current context.",...t.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
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
}`,...r.parameters?.docs?.source},description:{story:"HIGOS8 Figure 3-36 — the preferred spot: lower left, aligned with the bottom\nof the push buttons. In a right-aligned row, `margin-right: auto` pushes it\nto the far left.",...r.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
}`,...a.parameters?.docs?.source},description:{story:`HIGOS8 Figure 3-37 — with no push buttons, or no room for it lower left,
the Help button goes in the upper right corner.`,...a.parameters?.docs?.description}}};const m=["Default","Disabled","LowerLeft","UpperRight"];export{s as Default,t as Disabled,r as LowerLeft,a as UpperRight,m as __namedExportsOrder,u as default};
