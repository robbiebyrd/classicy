import{o as s,j as e}from"./iframe-BhW-QkVJ.js";import"./preload-helper-ebRTegvm.js";const{fn:o}=__STORYBOOK_MODULE_TEST__,r=[{id:"open",title:"Open",onClickFunc:o()},{id:"duplicate",title:"Duplicate",keyboardShortcut:"⌘D",onClickFunc:o()},{id:"spacer"},{id:"info",title:"Get Info",onClickFunc:o()},{id:"trash",title:"Move To Trash",onClickFunc:o()}],c={title:"Controls/ContextualMenu",component:s,decorators:[n=>e.jsx("div",{style:{position:"relative",height:260},children:e.jsx(n,{})})]},t={args:{name:"storybook_context",position:[16,16],menuItems:r,onClose:o()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    name: "storybook_context",
    position: [16, 16],
    menuItems: MENU_ITEMS,
    onClose: fn()
  }
}`,...t.parameters?.docs?.source}}};const l=["Default"];export{t as Default,l as __namedExportsOrder,c as default};
