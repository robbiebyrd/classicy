import{O as r,j as o,P as c}from"./iframe-CEfyM0k-.js";import"./preload-helper-PPVm8Dsz.js";const{fn:n}=__STORYBOOK_MODULE_TEST__,a={title:"Desktop/Menu",component:r,decorators:[i=>o.jsx(c,{children:o.jsx("div",{style:{position:"relative",height:240},children:o.jsx(i,{})})})]},t={args:{name:"storybook_menu",menuItems:[{id:"new",title:"New",keyboardShortcut:"⌘N",onClickFunc:n()},{id:"open",title:"Open…",keyboardShortcut:"⌘O",onClickFunc:n()},{id:"close",title:"Close",disabled:!0},{id:"export",title:"Export",menuChildren:[{id:"pdf",title:"As PDF…",onClickFunc:n()},{id:"text",title:"As Plain Text…",onClickFunc:n()}]}]}},e={args:{name:"storybook_menu_glyphs",menuItems:[{id:"save",title:"Save",keyboardShortcut:"Cmd+S",onClickFunc:n()},{id:"save-as",title:"Save As…",keyboardShortcut:"Cmd+Shift+S",onClickFunc:n()},{id:"duplicate",title:"Duplicate",keyboardShortcut:"Command-Option-D",onClickFunc:n()},{id:"settings",title:"Settings",keyboardShortcut:"Ctrl+Option+Shift+Cmd+K",onClickFunc:n()},{id:"help-key",title:"Help",keyboardShortcut:"F1",onClickFunc:n()}]}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    name: "storybook_menu",
    menuItems: [{
      id: "new",
      title: "New",
      keyboardShortcut: "⌘N",
      onClickFunc: fn()
    }, {
      id: "open",
      title: "Open…",
      keyboardShortcut: "⌘O",
      onClickFunc: fn()
    }, {
      id: "close",
      title: "Close",
      disabled: true
    }, {
      id: "export",
      title: "Export",
      menuChildren: [{
        id: "pdf",
        title: "As PDF…",
        onClickFunc: fn()
      }, {
        id: "text",
        title: "As Plain Text…",
        onClickFunc: fn()
      }]
    }]
  }
}`,...t.parameters?.docs?.source}}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    name: "storybook_menu_glyphs",
    menuItems: [{
      id: "save",
      title: "Save",
      keyboardShortcut: "Cmd+S",
      onClickFunc: fn()
    }, {
      id: "save-as",
      title: "Save As…",
      keyboardShortcut: "Cmd+Shift+S",
      onClickFunc: fn()
    }, {
      id: "duplicate",
      title: "Duplicate",
      keyboardShortcut: "Command-Option-D",
      onClickFunc: fn()
    }, {
      id: "settings",
      title: "Settings",
      keyboardShortcut: "Ctrl+Option+Shift+Cmd+K",
      onClickFunc: fn()
    }, {
      id: "help-key",
      title: "Help",
      keyboardShortcut: "F1",
      onClickFunc: fn()
    }]
  }
}`,...e.parameters?.docs?.source}}};const d=["Default","ModifierGlyphShortcuts"];export{t as Default,e as ModifierGlyphShortcuts,d as __namedExportsOrder,a as default};
