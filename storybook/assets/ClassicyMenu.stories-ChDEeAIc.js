import{a2 as r,j as o,a3 as c}from"./iframe-B6FIFMgv.js";import"./preload-helper-PPVm8Dsz.js";const{fn:e}=__STORYBOOK_MODULE_TEST__,d={title:"Desktop/Menu",component:r,decorators:[s=>o.jsx(c,{children:o.jsx("div",{style:{position:"relative",height:240},children:o.jsx(s,{})})})]},n={args:{name:"storybook_menu",menuItems:[{id:"new",title:"New",keyboardShortcut:"⌘N",onClickFunc:e()},{id:"open",title:"Open…",keyboardShortcut:"⌘O",onClickFunc:e()},{id:"close",title:"Close",disabled:!0},{id:"export",title:"Export",menuChildren:[{id:"pdf",title:"As PDF…",onClickFunc:e()},{id:"text",title:"As Plain Text…",onClickFunc:e()}]}]}},t={args:{name:"storybook_menu_glyphs",menuItems:[{id:"save",title:"Save",keyboardShortcut:"Cmd+S",onClickFunc:e()},{id:"save-as",title:"Save As…",keyboardShortcut:"Cmd+Shift+S",onClickFunc:e()},{id:"duplicate",title:"Duplicate",keyboardShortcut:"Command-Option-D",onClickFunc:e()},{id:"settings",title:"Settings",keyboardShortcut:"Ctrl+Option+Shift+Cmd+K",onClickFunc:e()},{id:"help-key",title:"Help",keyboardShortcut:"F1",onClickFunc:e()}]}},i={args:{name:"storybook_menu_checks",menuItems:[{id:"plain",title:"Plain Text",checked:!0,onClickFunc:e()},{id:"bold",title:"Bold",checked:"mixed",onClickFunc:e()},{id:"italic",title:"Italic",checked:!1,onClickFunc:e()},{id:"spacer"},{id:"styles",title:"Show Styles…",balloon:{content:"Opens the style sheet."},onClickFunc:e()}]}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:"A basic menu: enabled items with keyboard equivalents, a disabled item, and\na submenu (click Export to open it). Choosing an item flashes it, closes the\nmenu and calls its `onClickFunc`.",...n.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
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
}`,...t.parameters?.docs?.source},description:{story:`Free-form modifier spellings (Cmd, Option, Ctrl, Shift, or entities) are
parsed and rendered as Platinum modifier glyphs (⌃ ⌥ ⇧ ⌘) in canonical order.
A standalone menu only displays them; the chords fire app-wide for menus
published to the menu bar (a window's \`appMenu\`).`,...t.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    name: "storybook_menu_checks",
    menuItems: [{
      id: "plain",
      title: "Plain Text",
      checked: true,
      onClickFunc: fn()
    }, {
      id: "bold",
      title: "Bold",
      checked: "mixed",
      onClickFunc: fn()
    }, {
      id: "italic",
      title: "Italic",
      checked: false,
      onClickFunc: fn()
    }, {
      id: "spacer"
    }, {
      id: "styles",
      title: "Show Styles…",
      balloon: {
        content: "Opens the style sheet."
      },
      onClickFunc: fn()
    }]
  }
}`,...i.parameters?.docs?.source},description:{story:'Checkable items and dividers. `checked: true` draws a checkmark, `"mixed"`\nthe HIG dash for an attribute that applies to only part of the selection,\nand `false` reserves the gutter so the column stays aligned. `{ id:\n"spacer" }` is a divider, and the last item carries `balloon` help.',...i.parameters?.docs?.description}}};const u=["Default","ModifierGlyphShortcuts","CheckmarksAndDividers"];export{i as CheckmarksAndDividers,n as Default,t as ModifierGlyphShortcuts,u as __namedExportsOrder,d as default};
