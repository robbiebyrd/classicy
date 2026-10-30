import{aj as a,j as r}from"./iframe-BouaQASj.js";import"./preload-helper-shce2T3m.js";const l={title:"Controls/Disclosure",component:a},e={args:{label:"Advanced Options",children:r.jsx("p",{children:"Hidden details revealed on disclosure."})}},s={args:{label:"Show details",labelPosition:"left",children:r.jsx("p",{children:"Details revealed on disclosure."})}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Advanced Options",
    children: <p>Hidden details revealed on disclosure.</p>
  }
}`,...e.parameters?.docs?.source},description:{story:`A labelled section, closed at first. Click the header (or focus it and press
Enter/Space, or ⌘→ / ⌘←) to reveal and hide the content.`,...e.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Show details",
    labelPosition: "left",
    children: <p>Details revealed on disclosure.</p>
  }
}`,...s.parameters?.docs?.source},description:{story:'`labelPosition="left"` puts the header text before the triangle.',...s.parameters?.docs?.description}}};const n=["Default","LabelOnLeft"];export{e as Default,s as LabelOnLeft,n as __namedExportsOrder,l as default};
