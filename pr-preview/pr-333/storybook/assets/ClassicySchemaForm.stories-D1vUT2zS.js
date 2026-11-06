import{al as c,j as t,am as l,an as b,ao as d,ap as m,aq as f,k as g,z as S}from"./iframe-Dclj7l65.js";import"./preload-helper-shce2T3m.js";const u=(e,n,a)=>{const[s,...r]=n;if(r.length===0)return{...e,[s]:a};const i=e[s];return{...e,[s]:u(i!==null&&typeof i=="object"?i:{},r,a)}},h=l({speed:m().int().min(1).max(10).describe("Speed"),shape:f(["ball","square","star"]).describe("Shape"),sounds:d().describe("Play sounds"),trail:l({length:m().int().min(0).max(32).describe("Length"),fade:d().describe("Fade out")}),message:b().describe("Message")}),p={speed:4,shape:"ball",sounds:!0,trail:{length:8,fade:!1},message:"Hello, world"},y=()=>{const[e,n]=g.useState(p);return t.jsx("div",{style:{width:360},children:t.jsx(S,{label:"Options",layout:"form",children:t.jsx(c,{schema:h,values:e,idPrefix:"SchemaFormStory",onChange:(a,s)=>n(r=>u(r,a,s))})})})},j={title:"Controls/SchemaForm",component:c},o={parameters:{controls:{disable:!0}},args:{schema:h,values:p,idPrefix:"SchemaFormStory",onChange:()=>{}},render:()=>t.jsx(y,{})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
}`,...o.parameters?.docs?.source},description:{story:`A form derived from a zod object: number \u2192 spinner, enum \u2192 pop-up menu,
boolean \u2192 checkbox, string \u2192 text field, and the nested \`trail\` object \u2192
a titled group ("Trail", the humanized key) on a full-width row, laying
out its own fields as a form. Labels are the fields' \`.describe()\` text.
The Screen Saver options and the Appearance Manager's Options tab are
built on it. The form has no root of its own: it renders the rows of the
\`ClassicyControlGroup layout="form"\` around it.`,...o.parameters?.docs?.description}}};const C=["Nested"];export{o as Nested,C as __namedExportsOrder,j as default};
