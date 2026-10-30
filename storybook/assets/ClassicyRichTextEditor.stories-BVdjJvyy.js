import{aj as c,j as e,i as n,b as a}from"./iframe-DqcnTEZw.js";import"./preload-helper-PPVm8Dsz.js";const{fn:i}=__STORYBOOK_MODULE_TEST__,m={title:"Controls/RichTextEditor",component:c,args:{onChangeFunc:i()}},t={args:{content:["# Welcome to Classicy","","A **Markdown** editor styled for Mac OS 8.","","> Blockquotes, headings, and shortcuts all work."].join(`
`)}},l=()=>{const r=n.useRef(null),[s,d]=n.useState("");return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8},children:[e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx(a,{onClickFunc:()=>r.current?.setMarkdown(`## Replaced

New document text.`),children:"Replace Text"}),e.jsx(a,{onClickFunc:()=>d(r.current?.getMarkdown()??""),children:"Read Markdown"})]}),e.jsx(c,{editorRef:r,content:"Edit me, then click **Read Markdown**."}),s&&e.jsx("pre",{children:s})]})},o={render:()=>e.jsx(l,{})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    content: ["# Welcome to Classicy", "", "A **Markdown** editor styled for Mac OS 8.", "", "> Blockquotes, headings, and shortcuts all work."].join("\\n")
  }
}`,...t.parameters?.docs?.source},description:{story:"A Markdown document with a heading, bold text and a block quote. Use the\ntoolbar or type Markdown shortcuts (`# `, `> `, `**bold**`); each edit\nreports the new Markdown through `onChangeFunc` (see the Actions panel).",...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <ImperativeEditor />
}`,...o.parameters?.docs?.source},description:{story:"`content` is only read on mount, so a document that changes later is\nreplaced through `editorRef` (`setMarkdown`), and read back with\n`getMarkdown`.",...o.parameters?.docs?.description}}};const h=["Default","ImperativeAccess"];export{t as Default,o as ImperativeAccess,h as __namedExportsOrder,m as default};
