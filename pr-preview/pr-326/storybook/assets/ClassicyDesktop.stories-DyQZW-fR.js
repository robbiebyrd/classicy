import{d as t}from"./helpers-BTO7jirp.js";import{L as o}from"./iframe-DS2Y1ZNU.js";import"./preload-helper-D2v0tS7M.js";const p={title:"Desktop/Desktop",component:o,parameters:t},e={render:()=>null},r={parameters:{classicy:{desktop:!0,controlStrip:!1}},render:()=>null};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  render: () => null
}`,...e.parameters?.docs?.source},description:{story:`The bare desktop with no apps of your own: menu bar, wallpaper, Trash, the
Finder's disk icon and the Control Strip. Right-click the empty desktop for
its menu, or drag on it to rubber-band select icons. (The Storybook
decorator supplies the \`ClassicyDesktop\`, with the startup screen off.)`,...e.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  parameters: {
    classicy: {
      desktop: true,
      controlStrip: false
    }
  },
  render: () => null
}`,...r.parameters?.docs?.source},description:{story:"`controlStrip={false}` hides the Control Strip, and with it the desktop's\nSound control. (Set here through the decorator's\n`parameters.classicy.controlStrip`.)",...r.parameters?.docs?.description}}};const i=["Default","WithoutControlStrip"];export{e as Default,r as WithoutControlStrip,i as __namedExportsOrder,p as default};
