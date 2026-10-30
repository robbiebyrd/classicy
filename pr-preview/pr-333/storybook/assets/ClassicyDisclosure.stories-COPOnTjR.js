import{aj as o,j as a}from"./iframe-DH9JHIQq.js";import{a as n,C as c}from"./ClassicyAppearanceProbe-DV65qn8K.js";import"./preload-helper-shce2T3m.js";const d={title:"Controls/Disclosure",component:o},e={args:{label:"Advanced Options",children:a.jsx("p",{children:"Hidden details revealed on disclosure."})}},r={args:{label:"Show details",labelPosition:"left",children:a.jsx("p",{children:"Details revealed on disclosure."})}},s={args:e.args,render:t=>a.jsx(c,{children:a.jsx(o,{...t})}),parameters:n()};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Advanced Options",
    children: <p>Hidden details revealed on disclosure.</p>
  }
}`,...e.parameters?.docs?.source},description:{story:`A labelled section, closed at first. Click the header (or focus it and press
Enter/Space, or ⌘→ / ⌘←) to reveal and hide the content.`,...e.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Show details",
    labelPosition: "left",
    children: <p>Details revealed on disclosure.</p>
  }
}`,...r.parameters?.docs?.source},description:{story:'`labelPosition="left"` puts the header text before the triangle.',...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicyDisclosure>) => <ClassicyAppearanceProbe>
            <ClassicyDisclosure {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...s.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...s.parameters?.docs?.description}}};const m=["Default","LabelOnLeft","AppearanceHooks"];export{s as AppearanceHooks,e as Default,r as LabelOnLeft,m as __namedExportsOrder,d as default};
