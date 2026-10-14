import{p as s,j as e}from"./iframe-2GQmksk_.js";import"./preload-helper-BNEFU4pY.js";const{fn:t}=__STORYBOOK_MODULE_TEST__,r=[{id:"open",title:"Open",onClickFunc:t()},{id:"duplicate",title:"Duplicate",keyboardShortcut:"⌘D",onClickFunc:t()},{id:"spacer"},{id:"info",title:"Get Info",onClickFunc:t()},{id:"trash",title:"Move To Trash",onClickFunc:t()}],c={title:"Controls/ContextualMenu",component:s,decorators:[n=>e.jsx("div",{style:{position:"relative",height:260},children:e.jsx(n,{})})]},o={args:{name:"storybook_context",position:[16,16],menuItems:r,onClose:t()}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    name: "storybook_context",
    position: [16, 16],
    menuItems: MENU_ITEMS,
    onClose: fn()
  }
}`,...o.parameters?.docs?.source}}};const l=["Default"];export{o as Default,l as __namedExportsOrder,c as default};
