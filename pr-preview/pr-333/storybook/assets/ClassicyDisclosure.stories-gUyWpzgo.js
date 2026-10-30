import{aj as n,j as r}from"./iframe-BDwtUERU.js";import{a as i,C as c}from"./ClassicyAppearanceProbe-kdbeg91C.js";import{b as l}from"./helpers-BvXrqtYk.js";import{m as d}from"./mirrored-BjrYT6_B.js";import"./preload-helper-shce2T3m.js";const b={title:"Controls/Disclosure",component:n},e={args:{label:"Advanced Options",children:r.jsx("p",{children:"Hidden details revealed on disclosure."})}},s={args:{label:"Show details",labelPosition:"left",children:r.jsx("p",{children:"Details revealed on disclosure."})}},a={args:e.args,render:t=>r.jsx(c,{children:r.jsx(n,{...t})}),parameters:i()},o={...e,parameters:d,render:t=>r.jsx(l,{title:"Disclosure",size:[360,180],children:r.jsx(n,{...t})})};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
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
}`,...s.parameters?.docs?.source},description:{story:'`labelPosition="left"` puts the header text before the triangle.',...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicyDisclosure>) => <ClassicyAppearanceProbe>
            <ClassicyDisclosure {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...a.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...a.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  ...Default,
  parameters: mirroredParameters,
  render: args => <StoryWindow title="Disclosure" size={[360, 180]}>
            <ClassicyDisclosure {...args} />
        </StoryWindow>
}`,...o.parameters?.docs?.source},description:{story:"`Default`, in a window, under the Storybook-only `mirrored` Appearance\nPackage: the label before the triangle by CSS `order` alone, with no\n`labelPosition` prop.",...o.parameters?.docs?.description}}};const f=["Default","LabelOnLeft","AppearanceHooks","Mirrored"];export{a as AppearanceHooks,e as Default,s as LabelOnLeft,o as Mirrored,f as __namedExportsOrder,b as default};
