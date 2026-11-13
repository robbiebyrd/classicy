import{v as a,j as i}from"./iframe-DaKqwfOR.js";import"./preload-helper-CxPGPiBr.js";const{fn:e}=__STORYBOOK_MODULE_TEST__,r=[{id:"open",title:"Open",onClickFunc:e()},{id:"duplicate",title:"Duplicate",keyboardShortcut:"\u2318D",onClickFunc:e()},{id:"spacer"},{id:"info",title:"Get Info",onClickFunc:e()},{id:"trash",title:"Move To Trash",onClickFunc:e()}],u={title:"Controls/ContextualMenu",component:a,decorators:[s=>i.jsx("div",{style:{position:"relative",height:260},children:i.jsx(s,{})})]},o={args:{name:"storybook_context",position:[16,16],menuItems:r,onClose:e()}},n={args:{name:"storybook_context_submenu",position:[16,16],menuItems:[{id:"open",title:"Open",onClickFunc:e()},{id:"label",title:"Label",menuChildren:[{id:"label-none",title:"None",checked:!0,onClickFunc:e()},{id:"label-hot",title:"Hot",checked:!1,onClickFunc:e()},{id:"label-cool",title:"Cool",checked:!1,onClickFunc:e()}]}],onClose:e()}},t={decorators:[s=>i.jsx(s,{})],args:{name:"storybook_context_bottom",position:[300,740],menuItems:r,onClose:e()}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    name: "storybook_context",
    position: [16, 16],
    menuItems: MENU_ITEMS,
    onClose: fn()
  }
}`,...o.parameters?.docs?.source},description:{story:"The bare menu at a fixed position, already open: it shows `menuItems` as\ngiven (no Help item is added at this level). Choosing an item or clicking\noutside calls `onClose`; the story keeps it mounted.",...o.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:`A submenu inside a contextual menu. The HIG keeps contextual submenus to one
level; click "Label" to open it.`,...n.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  decorators: [Story => <Story />],
  args: {
    name: "storybook_context_bottom",
    position: [300, 740],
    menuItems: MENU_ITEMS,
    onClose: fn()
  }
}`,...t.parameters?.docs?.source},description:{story:`Opened near the bottom of the screen (a right-click low on the desktop):
the menu flips up above the point, and its scroll cap follows it there, so
all of its items show, with no scroll indicators.`,...t.parameters?.docs?.description}}};const d=["Default","WithSubmenu","NearBottom"];export{o as Default,t as NearBottom,n as WithSubmenu,d as __namedExportsOrder,u as default};
