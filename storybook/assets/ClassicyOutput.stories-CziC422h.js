import{j as e}from"./iframe-D8iAhpLs.js";import{C as n}from"./ClassicyOutput-B2sjaevB.js";import"./preload-helper-PPVm8Dsz.js";const m={title:"Controls/Output",component:n},s={args:{id:"total",label:"Total",value:"42 items"}},r={args:{id:"result",label:"Result",variant:"inset",value:"1,024"},decorators:[t=>e.jsx("div",{style:{width:220},children:e.jsx(t,{})})]},a={args:{id:"checksum",label:"Checksum",variant:"inset",mono:!0,value:"0x3F2A9C"},decorators:[t=>e.jsx("div",{style:{width:260},children:e.jsx(t,{})})]},i={args:{id:"estimate",label:"Estimated time",value:"About 2 minutes",disabled:!0}},o={args:{id:"sum",label:"Sum",variant:"inset",htmlFor:["sum-a","sum-b"],children:e.jsxs(e.Fragment,{children:[e.jsx("b",{children:"12"})," + ",e.jsx("b",{children:"30"})," = ",e.jsx("b",{children:"42"})]})},decorators:[t=>e.jsx("div",{style:{width:220},children:e.jsx(t,{})})]};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "total",
    label: "Total",
    value: "42 items"
  }
}`,...s.parameters?.docs?.source},description:{story:'Plain static text with its label to the left — a "Total: 42 items" row.',...s.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "result",
    label: "Result",
    variant: "inset",
    value: "1,024"
  },
  decorators: [Story => <div style={{
    width: 220
  }}>{<Story />}</div>]
}`,...r.parameters?.docs?.source},description:{story:'`variant="inset"`: the white beveled result well, like a calculator display.',...r.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "checksum",
    label: "Checksum",
    variant: "inset",
    mono: true,
    value: "0x3F2A9C"
  },
  decorators: [Story => <div style={{
    width: 260
  }}>{<Story />}</div>]
}`,...a.parameters?.docs?.source},description:{story:"`mono` sets the result in the monospaced font, for numeric or tabular values.",...a.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    id: "estimate",
    label: "Estimated time",
    value: "About 2 minutes",
    disabled: true
  }
}`,...i.parameters?.docs?.source},description:{story:"`disabled` dims the field and its label — the HIG's inactive static text.",...i.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "sum",
    label: "Sum",
    variant: "inset",
    htmlFor: ["sum-a", "sum-b"],
    children: <>
                <b>12</b> + <b>30</b> = <b>42</b>
            </>
  },
  decorators: [Story => <div style={{
    width: 220
  }}>{<Story />}</div>]
}`,...o.parameters?.docs?.source},description:{story:"The result passed as `children`, with `htmlFor` naming the inputs that\nproduced it (rendered as the `<output>`'s `for` attribute).",...o.parameters?.docs?.description}}};const u=["Plain","InsetWell","MonoResult","Disabled","FromChildren"];export{i as Disabled,o as FromChildren,r as InsetWell,a as MonoResult,s as Plain,u as __namedExportsOrder,m as default};
