import{b0 as o,j as i}from"./iframe-CXdVCxxQ.js";import"./preload-helper-shce2T3m.js";const{fn:l}=__STORYBOOK_MODULE_TEST__,c={title:"Controls/TextEditor",component:o,args:{onChangeFunc:l()}},t={args:{id:"te-default",prefillValue:"It was a dark and stormy night…"}},r={args:{id:"te-bordered",labelTitle:"Notes",border:!0,autoHeight:!0,prefillValue:"SimpleText uses this editor for plain text files."}},s={args:{id:"te-disabled",disabled:!0,prefillValue:"Read-only content."}},a={render:()=>i.jsx("div",{style:{display:"flex",flexDirection:"column",gap:16},children:["small","medium","large"].map(e=>i.jsx(o,{id:`te-size-${e}`,labelTitle:e,labelPosition:"left",fontSize:e,border:!0,autoHeight:!0,prefillValue:`The ${e} text size.`},e))})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "te-default",
    prefillValue: "It was a dark and stormy night…"
  }
}`,...t.parameters?.docs?.source},description:{story:`The frameless default, as used for a full-window document editor: the
field fills its parent and shows an inset focus ring when focused.`,...t.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "te-bordered",
    labelTitle: "Notes",
    border: true,
    autoHeight: true,
    prefillValue: "SimpleText uses this editor for plain text files."
  }
}`,...r.parameters?.docs?.source},description:{story:"The form-field look: `border` draws the HIG 2px recessed edit-text frame,\n`autoHeight` grows the field with its text, and `labelTitle` adds a\nlinked label above it.",...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "te-disabled",
    disabled: true,
    prefillValue: "Read-only content."
  }
}`,...s.parameters?.docs?.source},description:{story:"A disabled field: the text cannot be edited and the label (if any) dims.",...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: 16
  }}>
            {(["small", "medium", "large"] as const).map(size => <ClassicyTextEditor key={size} id={\`te-size-\${size}\`} labelTitle={size} labelPosition="left" fontSize={size} border autoHeight prefillValue={\`The \${size} text size.\`} />)}
        </div>
}`,...a.parameters?.docs?.source},description:{story:"The three `fontSize` steps, each relative to the theme's UI font size, with\nthe label placed to the left via `labelPosition`.",...a.parameters?.docs?.description}}};const p=["Default","Bordered","Disabled","FontSizes"];export{r as Bordered,t as Default,s as Disabled,a as FontSizes,p as __namedExportsOrder,c as default};
