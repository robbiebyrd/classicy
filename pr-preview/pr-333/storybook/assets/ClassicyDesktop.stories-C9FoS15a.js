import{af as s,j as t}from"./iframe-CXdVCxxQ.js";import{d as a}from"./helpers-BpPEa_nL.js";import"./preload-helper-shce2T3m.js";const c={title:"Desktop/Desktop",component:s,parameters:a},o=()=>null,e={render:()=>t.jsx(o,{})},r={parameters:{classicy:{desktop:!0,controlStrip:!1}},render:()=>t.jsx(o,{})};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  render: () => <NoApps />
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
  render: () => <NoApps />
}`,...r.parameters?.docs?.source},description:{story:"`controlStrip={false}` hides the Control Strip, and with it the desktop's\nSound control. (Set here through the decorator's\n`parameters.classicy.controlStrip`.)",...r.parameters?.docs?.description}}};const d=["Default","WithoutControlStrip"];export{e as Default,r as WithoutControlStrip,d as __namedExportsOrder,c as default};
