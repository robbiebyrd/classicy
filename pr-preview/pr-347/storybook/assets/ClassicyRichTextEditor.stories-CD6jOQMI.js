import{at as d,j as e,d as n,b as c}from"./iframe-BUsjYt92.js";import"./preload-helper-CiDKIbga.js";const{fn:p}=__STORYBOOK_MODULE_TEST__,u={title:"Controls/RichTextEditor",component:d,args:{onChangeFunc:p()}},t={args:{content:["# Welcome to Classicy","","A **Markdown** editor styled for Mac OS 8.","","> Blockquotes, headings, and shortcuts all work."].join(`
`)}},r={args:{content:["Caf&eacute; &amp; bar &copy; 1998","","Fish &notachar; chips"].join(`
`)}},l=()=>{const o=n.useRef(null),[s,i]=n.useState("");return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8},children:[e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx(c,{onClickFunc:()=>o.current?.setMarkdown(`## Replaced

New document text.`),children:"Replace Text"}),e.jsx(c,{onClickFunc:()=>i(o.current?.getMarkdown()??""),children:"Read Markdown"})]}),e.jsx(d,{editorRef:o,content:"Edit me, then click **Read Markdown**."}),s&&e.jsx("pre",{children:s})]})},a={render:()=>e.jsx(l,{})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    content: ["# Welcome to Classicy", "", "A **Markdown** editor styled for Mac OS 8.", "", "> Blockquotes, headings, and shortcuts all work."].join("\\n")
  }
}`,...t.parameters?.docs?.source},description:{story:"A Markdown document with a heading, bold text and a block quote. Use the\ntoolbar or type Markdown shortcuts (`# `, `> `, `**bold**`); each edit\nreports the new Markdown through `onChangeFunc` (see the Actions panel).",...t.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    content: ["Caf&eacute; &amp; bar &copy; 1998", "", "Fish &notachar; chips"].join("\\n")
  }
}`,...r.parameters?.docs?.source},description:{story:"Markdown's named character references decode to their characters: the\ndocument is written `Caf&eacute; &amp; bar &copy; 1998`. A reference that\nnames no character stays as written.",...r.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <ImperativeEditor />
}`,...a.parameters?.docs?.source},description:{story:"`content` is only read on mount, so a document that changes later is\nreplaced through `editorRef` (`setMarkdown`), and read back with\n`getMarkdown`.",...a.parameters?.docs?.description}}};const k=["Default","NamedCharacterReferences","ImperativeAccess"];export{t as Default,a as ImperativeAccess,r as NamedCharacterReferences,k as __namedExportsOrder,u as default};
