import{z as s,j as t}from"./iframe-CbcHXgTu.js";import"./preload-helper-PPVm8Dsz.js";const{fn:e}=__STORYBOOK_MODULE_TEST__,l=[{id:"open",title:"Open",onClickFunc:e()},{id:"duplicate",title:"Duplicate",keyboardShortcut:"⌘D",onClickFunc:e()},{id:"spacer"},{id:"info",title:"Get Info",onClickFunc:e()},{id:"trash",title:"Move To Trash",onClickFunc:e()}],r={title:"Controls/ContextualMenu",component:s,decorators:[i=>t.jsx("div",{style:{position:"relative",height:260},children:t.jsx(i,{})})]},n={args:{name:"storybook_context",position:[16,16],menuItems:l,onClose:e()}},o={args:{name:"storybook_context_submenu",position:[16,16],menuItems:[{id:"open",title:"Open",onClickFunc:e()},{id:"label",title:"Label",menuChildren:[{id:"label-none",title:"None",checked:!0,onClickFunc:e()},{id:"label-hot",title:"Hot",checked:!1,onClickFunc:e()},{id:"label-cool",title:"Cool",checked:!1,onClickFunc:e()}]}],onClose:e()}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    name: "storybook_context",
    position: [16, 16],
    menuItems: MENU_ITEMS,
    onClose: fn()
  }
}`,...n.parameters?.docs?.source},description:{story:"The bare menu at a fixed position, already open: it shows `menuItems` as\ngiven (no Help item is added at this level). Choosing an item or clicking\noutside calls `onClose`; the story keeps it mounted.",...n.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    name: "storybook_context_submenu",
    position: [16, 16],
    menuItems: [{
      id: "open",
      title: "Open",
      onClickFunc: fn()
    }, {
      id: "label",
      title: "Label",
      menuChildren: [{
        id: "label-none",
        title: "None",
        checked: true,
        onClickFunc: fn()
      }, {
        id: "label-hot",
        title: "Hot",
        checked: false,
        onClickFunc: fn()
      }, {
        id: "label-cool",
        title: "Cool",
        checked: false,
        onClickFunc: fn()
      }]
    }],
    onClose: fn()
  }
}`,...o.parameters?.docs?.source},description:{story:`A submenu inside a contextual menu. The HIG keeps contextual submenus to one
level; click "Label" to open it.`,...o.parameters?.docs?.description}}};const u=["Default","WithSubmenu"];export{n as Default,o as WithSubmenu,u as __namedExportsOrder,r as default};
