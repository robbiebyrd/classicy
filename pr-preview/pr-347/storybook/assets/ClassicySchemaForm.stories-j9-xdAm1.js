import{at as m,j as r,au as l,av as b,aw as d,ax as c,ay as f,d as g,D as y}from"./iframe-D1zPQr4o.js";import"./preload-helper-CiDKIbga.js";const u=(e,n,o)=>{const[s,...t]=n;if(t.length===0)return{...e,[s]:o};const i=e[s];return{...e,[s]:u(i!==null&&typeof i=="object"?i:{},t,o)}},h=l({speed:c().int().min(1).max(10).describe("Speed"),shape:f(["ball","square","star"]).describe("Shape"),sounds:d().describe("Play sounds"),trail:l({length:c().int().min(0).max(32).describe("Length"),fade:d().describe("Fade out")}),message:b().describe("Message")}),p={speed:4,shape:"ball",sounds:!0,trail:{length:8,fade:!1},message:"Hello, world"},S=()=>{const[e,n]=g.useState(p);return r.jsx("div",{style:{width:360},children:r.jsx(y,{label:"Options",layout:"form",children:r.jsx(m,{schema:h,values:e,idPrefix:"SchemaFormStory",onChange:(o,s)=>n(t=>u(t,o,s))})})})},j={title:"Controls/SchemaForm",component:m},a={parameters:{controls:{disable:!0}},args:{schema:h,values:p,idPrefix:"SchemaFormStory",onChange:()=>{}},render:()=>r.jsx(S,{})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  // The render owns the values (a working form); these args only satisfy
  // the component's required props, so editing them would do nothing.
  parameters: {
    controls: {
      disable: true
    }
  },
  args: {
    schema: optionsSchema,
    values: initialValues,
    idPrefix: "SchemaFormStory",
    onChange: () => {}
  },
  render: () => <SchemaFormStory />
}`,...a.parameters?.docs?.source},description:{story:`A form derived from a zod object: number \u2192 spinner, enum \u2192 pop-up menu,
boolean \u2192 checkbox, string \u2192 text field, and the nested \`trail\` object \u2192
a titled group ("Trail", the humanized key) on a full-width row, laying
out its own fields as a form. Labels are the fields' \`.describe()\` text.
The Screen Saver options and the Appearance Manager's Options tab are
built on it. The form has no root of its own: it renders the rows of the
\`ClassicyControlGroup layout="form"\` around it.`,...a.parameters?.docs?.description}}};const C=["Nested"];export{a as Nested,C as __namedExportsOrder,j as default};
