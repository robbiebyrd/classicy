import{aw as n,j as a}from"./iframe-UiEcxJb_.js";import"./preload-helper-shce2T3m.js";const d={title:"Controls/Kbd",component:n},e={args:{shortcut:"Cmd+Shift+S"},decorators:[o=>a.jsxs("p",{style:{margin:0},children:["Save a copy with ",a.jsx(o,{}),"."]})]},r={args:{shortcut:"Ctrl+Opt+Cmd+P",variant:"keycaps"}},s={args:{variant:"keycaps",children:"Esc"}},t={render:()=>a.jsxs("div",{style:{display:"flex",justifyContent:"space-between",width:180},children:[a.jsx("span",{children:"Save As\u2026"}),a.jsx(n,{shortcut:"Cmd+Shift+S"})]})};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    shortcut: "Cmd+Shift+S"
  },
  decorators: [Story => <p style={{
    margin: 0
  }}>
                Save a copy with <Story />.
            </p>]
}`,...e.parameters?.docs?.source},description:{story:'The default `inline` variant inside running text: "Cmd+Shift+S" is\nnormalised to the glyph run \u21E7\u2318S.',...e.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    shortcut: "Ctrl+Opt+Cmd+P",
    variant: "keycaps"
  }
}`,...r.parameters?.docs?.source},description:{story:'`variant="keycaps"` draws one raised key cap per key, in canonical \u2303\u2325\u21E7\u2318 order.',...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "keycaps",
    children: "Esc"
  }
}`,...s.parameters?.docs?.source},description:{story:"A key with no chord passed as `children` (no `shortcut`), rendered verbatim.",...s.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    justifyContent: "space-between",
    width: 180
  }}>
            <span>Save As\u2026</span>
            <ClassicyKbd shortcut="Cmd+Shift+S" />
        </div>
}`,...t.parameters?.docs?.source},description:{story:"The menu-item form: the same component `ClassicyMenu` renders for\n`keyboardShortcut` entries, right-aligned beside the command name.",...t.parameters?.docs?.description}}};const p=["Inline","Keycaps","BareKey","InAMenuRow"];export{s as BareKey,t as InAMenuRow,e as Inline,r as Keycaps,p as __namedExportsOrder,d as default};
