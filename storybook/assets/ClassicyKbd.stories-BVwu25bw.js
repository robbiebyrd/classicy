import{O as n,j as e}from"./iframe-DyQDXwd4.js";import"./preload-helper-PPVm8Dsz.js";const p={title:"Controls/Kbd",component:n},s={args:{shortcut:"Cmd+Shift+S"},decorators:[o=>e.jsxs("p",{style:{margin:0},children:["Save a copy with ",e.jsx(o,{}),"."]})]},r={args:{shortcut:"Ctrl+Opt+Cmd+P",variant:"keycaps"}},a={args:{variant:"keycaps",children:"Esc"}},t={render:()=>e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",width:180},children:[e.jsx("span",{children:"Save As…"}),e.jsx(n,{shortcut:"Cmd+Shift+S"})]})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    shortcut: "Cmd+Shift+S"
  },
  decorators: [Story => <p style={{
    margin: 0
  }}>
                Save a copy with <Story />.
            </p>]
}`,...s.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    shortcut: "Ctrl+Opt+Cmd+P",
    variant: "keycaps"
  }
}`,...r.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "keycaps",
    children: "Esc"
  }
}`,...a.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    justifyContent: "space-between",
    width: 180
  }}>
            <span>Save As…</span>
            <ClassicyKbd shortcut="Cmd+Shift+S" />
        </div>
}`,...t.parameters?.docs?.source}}};const d=["Inline","Keycaps","BareKey","InAMenuRow"];export{a as BareKey,t as InAMenuRow,s as Inline,r as Keycaps,d as __namedExportsOrder,p as default};
