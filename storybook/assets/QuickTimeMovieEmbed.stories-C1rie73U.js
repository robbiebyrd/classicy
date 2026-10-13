import{M as s,Q as t,j as r}from"./iframe-CSMzLs_W.js";import"./preload-helper-PPVm8Dsz.js";const c={title:"Controls/QuickTime",component:t,decorators:[a=>r.jsx("div",{style:{width:480},children:r.jsx(a,{})})]},o={args:{appId:"storybook.app",name:"Sample Movie",url:s,type:"video",controlsDocked:!0}},e={args:{appId:"storybook.app",name:"Sample Movie",url:s,type:"video",controlsDocked:!1}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    appId: "storybook.app",
    name: "Sample Movie",
    url: sampleMovie,
    type: "video",
    controlsDocked: true
  }
}`,...o.parameters?.docs?.source}}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    appId: "storybook.app",
    name: "Sample Movie",
    url: sampleMovie,
    type: "video",
    controlsDocked: false
  }
}`,...e.parameters?.docs?.source}}};const l=["DockedControls","OverlayControls"];export{o as DockedControls,e as OverlayControls,l as __namedExportsOrder,c as default};
