import{ar as f,as as r,at as h,au as c,j as s,i as d}from"./iframe-BtwcORK5.js";import"./preload-helper-shce2T3m.js";const I={title:"Controls/Tree",component:c},p=[{id:"system",label:"System Folder",leftIcon:h,defaultOpen:!0,children:[{id:"fonts",label:"Fonts",leftIcon:f,children:[{id:"charcoal",label:"Charcoal",buttons:[{label:"Open",onClickFunc:()=>alert("Open Charcoal")}]},{id:"geneva",label:"Geneva",buttons:[{label:"Open",onClickFunc:()=>alert("Open Geneva")}]}]},{id:"apple-menu",label:"Apple Menu Items",leftIcon:r,rightIcon:r,children:[{id:"calculator",label:"Calculator",rightIcon:r,buttons:[{label:"Get Info",onClickFunc:()=>alert("Get Info: Calculator")}]}]}]},{id:"readme",label:"Read Me",buttons:[{label:"Open",isDefault:!0,onClickFunc:()=>alert("Open Read Me")}]}],e={args:{nodes:p}},t={args:{nodes:p.map(l=>({...l,defaultOpen:!1}))}},a={args:{selectionMode:"multi",selectedIds:["kept"],nodes:[{id:"root",label:"Documents",defaultOpen:!0,children:[{id:"kept",label:"Kept file"},{id:"grayed",label:"Grayed file",disabled:!0},{id:"plain",label:"Plain file",buttons:[{label:"Edit"},{label:"Remove"}]}]}]}},g=()=>{const[l,u]=d.useState([]),[o,b]=d.useState();return s.jsxs("div",{children:[s.jsx(c,{selectionMode:"single",selectedIds:l,onSelectNode:i=>u([i]),onActivateNode:(i,m)=>b(m.label),nodes:[{id:"projects",label:"Projects",defaultOpen:!0,branchSelectable:!0,children:[{id:"budget",label:"Budget"},{id:"schedule",label:"Schedule"},{id:"archive",label:"Archive",selectable:!1}]}]}),s.jsxs("p",{children:["Selected: ",l.join(", ")||"none",o?` — opened “${o}”`:""]})]})},n={render:()=>s.jsx(g,{})};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    nodes
  }
}`,...e.parameters?.docs?.source},description:{story:'A navigation tree (`selectionMode` `"none"`): click a branch or its\ntriangle to expand it, focus a row and use Up/Down, Home/End, ⌘→ / ⌘← or\ntype a label\'s first letters. Shows left and right icons and per-leaf\npush buttons; System Folder starts open via `defaultOpen`.',...e.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    nodes: nodes.map(n => ({
      ...n,
      defaultOpen: false
    }))
  }
}`,...t.parameters?.docs?.source},description:{story:"The same tree with every branch collapsed on mount.",...t.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    selectionMode: "multi",
    selectedIds: ["kept"],
    nodes: [{
      id: "root",
      label: "Documents",
      defaultOpen: true,
      children: [{
        id: "kept",
        label: "Kept file"
      }, {
        id: "grayed",
        label: "Grayed file",
        disabled: true
      }, {
        id: "plain",
        label: "Plain file",
        buttons: [{
          label: "Edit"
        }, {
          label: "Remove"
        }]
      }]
    }]
  }
}`,...a.parameters?.docs?.source},description:{story:'A selectable tree with a fixed `selectedIds`: "Kept file" is highlighted,\n"Grayed file" is `disabled` (dimmed and inert), and "Plain file" carries\ntwo leaf buttons. Because selection is fully controlled, clicks here\nchange nothing — see `InteractiveSelection` for the wiring.',...a.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <InteractiveTree />
}`,...n.parameters?.docs?.source},description:{story:'Controlled selection wired up: `onSelectNode` feeds `selectedIds`, and a\ndouble-click on a leaf fires `onActivateNode`. "Projects" is\n`branchSelectable`, so a single click selects it and a double-click\ntoggles it; "Archive" opts out with `selectable: false`.',...n.parameters?.docs?.description}}};const y=["Default","StartCollapsed","SelectableWithDisabled","InteractiveSelection"];export{e as Default,n as InteractiveSelection,a as SelectableWithDisabled,t as StartCollapsed,y as __namedExportsOrder,I as default};
