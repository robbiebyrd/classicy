import{aM as m,j as t,aN as l,aO as b,aP as d,aQ as c,aR as f,r as g,a2 as S}from"./iframe-BrZOt_F2.js";import"./preload-helper-shce2T3m.js";const h=(e,n,o)=>{const[s,...r]=n;if(r.length===0)return{...e,[s]:o};const i=e[s];return{...e,[s]:h(i!==null&&typeof i=="object"?i:{},r,o)}},u=l({speed:c().int().min(1).max(10).describe("Speed"),shape:f(["ball","square","star"]).describe("Shape"),sounds:d().describe("Play sounds"),trail:l({length:c().int().min(0).max(32).describe("Length"),fade:d().describe("Fade out")}),message:b().describe("Message")}),p={speed:4,shape:"ball",sounds:!0,trail:{length:8,fade:!1},message:"Hello, world"},y=()=>{const[e,n]=g.useState(p);return t.jsx("div",{style:{width:360},children:t.jsx(S,{label:"Options",layout:"form",children:t.jsx(m,{schema:u,values:e,idPrefix:"SchemaFormStory",onChange:(o,s)=>n(r=>h(r,o,s))})})})},j={title:"Controls/SchemaForm",component:m},a={parameters:{controls:{disable:!0}},args:{schema:u,values:p,idPrefix:"SchemaFormStory",onChange:()=>{}},render:()=>t.jsx(y,{})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
}`,...a.parameters?.docs?.source},description:{story:`A form derived from a zod object: number → spinner, enum → pop-up menu,
boolean → checkbox, string → text field, and the nested \`trail\` object →
a titled group ("Trail", the humanized key) on a full-width row, laying
out its own fields as a form. Labels are the fields' \`.describe()\` text.
The Screen Saver options and the Appearance Manager's Options tab are
built on it. The form has no root of its own: it renders the rows of the
\`ClassicyControlGroup layout="form"\` around it.`,...a.parameters?.docs?.description}}};const C=["Nested"];export{a as Nested,C as __namedExportsOrder,j as default};
