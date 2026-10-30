import{az as a,j as i,aA as c}from"./iframe-mml89byg.js";import{a as l,C as d}from"./ClassicyAppearanceProbe-DxKylCdo.js";import"./preload-helper-shce2T3m.js";const{fn:e}=__STORYBOOK_MODULE_TEST__,h={title:"Desktop/Menu",component:a,decorators:[r=>i.jsx(c,{children:i.jsx("div",{style:{position:"relative",height:240},children:i.jsx(r,{})})})]},n={args:{name:"storybook_menu",menuItems:[{id:"new",title:"New",keyboardShortcut:"\u2318N",onClickFunc:e()},{id:"open",title:"Open\u2026",keyboardShortcut:"\u2318O",onClickFunc:e()},{id:"close",title:"Close",disabled:!0},{id:"export",title:"Export",menuChildren:[{id:"pdf",title:"As PDF\u2026",onClickFunc:e()},{id:"text",title:"As Plain Text\u2026",onClickFunc:e()}]}]}},t={args:{name:"storybook_menu_glyphs",menuItems:[{id:"save",title:"Save",keyboardShortcut:"Cmd+S",onClickFunc:e()},{id:"save-as",title:"Save As\u2026",keyboardShortcut:"Cmd+Shift+S",onClickFunc:e()},{id:"duplicate",title:"Duplicate",keyboardShortcut:"Command-Option-D",onClickFunc:e()},{id:"settings",title:"Settings",keyboardShortcut:"Ctrl+Option+Shift+Cmd+K",onClickFunc:e()},{id:"help-key",title:"Help",keyboardShortcut:"F1",onClickFunc:e()}]}},o={args:{name:"storybook_menu_checks",menuItems:[{id:"plain",title:"Plain Text",checked:!0,onClickFunc:e()},{id:"bold",title:"Bold",checked:"mixed",onClickFunc:e()},{id:"italic",title:"Italic",checked:!1,onClickFunc:e()},{id:"spacer"},{id:"styles",title:"Show Styles\u2026",balloon:{content:"Opens the style sheet."},onClickFunc:e()}]}},s={args:n.args,render:r=>i.jsx(d,{children:i.jsx(a,{...r})}),parameters:l()};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    name: "storybook_menu",
    menuItems: [{
      id: "new",
      title: "New",
      keyboardShortcut: "\u2318N",
      onClickFunc: fn()
    }, {
      id: "open",
      title: "Open\u2026",
      keyboardShortcut: "\u2318O",
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
        title: "As PDF\u2026",
        onClickFunc: fn()
      }, {
        id: "text",
        title: "As Plain Text\u2026",
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
      title: "Save As\u2026",
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
parsed and rendered as Platinum modifier glyphs (\u2303 \u2325 \u21E7 \u2318) in canonical order.
A standalone menu only displays them; the chords fire app-wide for menus
published to the menu bar (a window's \`appMenu\`).`,...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
      title: "Show Styles\u2026",
      balloon: {
        content: "Opens the style sheet."
      },
      onClickFunc: fn()
    }]
  }
}`,...o.parameters?.docs?.source},description:{story:'Checkable items and dividers. `checked: true` draws a checkmark, `"mixed"`\nthe HIG dash for an attribute that applies to only part of the selection,\nand `false` reserves the gutter so the column stays aligned. `{ id:\n"spacer" }` is a divider, and the last item carries `balloon` help.',...o.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicyMenu>) => <ClassicyAppearanceProbe>
            <ClassicyMenu {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...s.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...s.parameters?.docs?.description}}};const k=["Default","ModifierGlyphShortcuts","CheckmarksAndDividers","AppearanceHooks"];export{s as AppearanceHooks,o as CheckmarksAndDividers,n as Default,t as ModifierGlyphShortcuts,k as __namedExportsOrder,h as default};
