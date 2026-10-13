import{g as r,j as o,h as s}from"./iframe-BDL_7nna.js";import"./preload-helper-BCLz-3mA.js";const l={title:"Controls/BalloonHelp",component:r},e={args:{title:"Do Nothing",content:"Hover for 600ms to see this Mac OS 8-style help balloon.",position:"top-left",children:o.jsx(s,{isDefault:!0,children:"Hover Me"})},decorators:[n=>o.jsx("div",{style:{paddingTop:"8em",paddingLeft:"2em"},children:o.jsx(n,{})})]},t={args:{content:"Balloons can point in six directions.",position:"bottom-center",delay:200,children:o.jsx(s,{children:"Quick Balloon"})},decorators:[n=>o.jsx("div",{style:{padding:"2em 6em 10em"},children:o.jsx(n,{})})]};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Do Nothing",
    content: "Hover for 600ms to see this Mac OS 8-style help balloon.",
    position: "top-left",
    children: <ClassicyButton isDefault={true}>Hover Me</ClassicyButton>
  },
  decorators: [Story => <div style={{
    paddingTop: "8em",
    paddingLeft: "2em"
  }}>
                <Story />
            </div>]
}`,...e.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    content: "Balloons can point in six directions.",
    position: "bottom-center",
    delay: 200,
    children: <ClassicyButton>Quick Balloon</ClassicyButton>
  },
  decorators: [Story => <div style={{
    padding: "2em 6em 10em"
  }}>
                <Story />
            </div>]
}`,...t.parameters?.docs?.source}}};const c=["Default","BottomCenter"];export{t as BottomCenter,e as Default,c as __namedExportsOrder,l as default};
