import{b2 as h,b3 as l,b4 as g,b5 as c,j as t,r as p}from"./iframe-DOt7NI2g.js";import{a as y,C as S}from"./ClassicyAppearanceProbe-gzM2aWS9.js";import"./preload-helper-shce2T3m.js";const O={title:"Controls/Tree",component:c},u=[{id:"system",label:"System Folder",leftIcon:g,defaultOpen:!0,children:[{id:"fonts",label:"Fonts",leftIcon:h,children:[{id:"charcoal",label:"Charcoal",buttons:[{label:"Open",onClickFunc:()=>alert("Open Charcoal")}]},{id:"geneva",label:"Geneva",buttons:[{label:"Open",onClickFunc:()=>alert("Open Geneva")}]}]},{id:"apple-menu",label:"Apple Menu Items",leftIcon:l,rightIcon:l,children:[{id:"calculator",label:"Calculator",rightIcon:l,buttons:[{label:"Get Info",onClickFunc:()=>alert("Get Info: Calculator")}]}]}]},{id:"readme",label:"Read Me",buttons:[{label:"Open",isDefault:!0,onClickFunc:()=>alert("Open Read Me")}]}],a={args:{nodes:u}},s={args:{nodes:u.map(e=>({...e,defaultOpen:!1}))}},r={args:{selectionMode:"multi",selectedIds:["kept"],nodes:[{id:"root",label:"Documents",defaultOpen:!0,children:[{id:"kept",label:"Kept file"},{id:"grayed",label:"Grayed file",disabled:!0},{id:"plain",label:"Plain file",buttons:[{label:"Edit"},{label:"Remove"}]}]}]}},v=()=>{const[e,b]=p.useState([]),[i,m]=p.useState();return t.jsxs("div",{children:[t.jsx(c,{selectionMode:"single",selectedIds:e,onSelectNode:d=>b([d]),onActivateNode:(d,f)=>m(f.label),nodes:[{id:"projects",label:"Projects",defaultOpen:!0,branchSelectable:!0,children:[{id:"budget",label:"Budget"},{id:"schedule",label:"Schedule"},{id:"archive",label:"Archive",selectable:!1}]}]}),t.jsxs("p",{children:["Selected: ",e.join(", ")||"none",i?` — opened “${i}”`:""]})]})},n={render:()=>t.jsx(v,{})},o={args:a.args,render:e=>t.jsx(S,{children:t.jsx(c,{...e})}),parameters:y()};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    nodes
  }
}`,...a.parameters?.docs?.source},description:{story:'A navigation tree (`selectionMode` `"none"`): click a branch or its\ntriangle to expand it, focus a row and use Up/Down, Home/End, ⌘→ / ⌘← or\ntype a label\'s first letters. Shows left and right icons and per-leaf\npush buttons; System Folder starts open via `defaultOpen`.',...a.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    nodes: nodes.map(n => ({
      ...n,
      defaultOpen: false
    }))
  }
}`,...s.parameters?.docs?.source},description:{story:"The same tree with every branch collapsed on mount.",...s.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
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
}`,...r.parameters?.docs?.source},description:{story:'A selectable tree with a fixed `selectedIds`: "Kept file" is highlighted,\n"Grayed file" is `disabled` (dimmed and inert), and "Plain file" carries\ntwo leaf buttons. Because selection is fully controlled, clicks here\nchange nothing — see `InteractiveSelection` for the wiring.',...r.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <InteractiveTree />
}`,...n.parameters?.docs?.source},description:{story:'Controlled selection wired up: `onSelectNode` feeds `selectedIds`, and a\ndouble-click on a leaf fires `onActivateNode`. "Projects" is\n`branchSelectable`, so a single click selects it and a double-click\ntoggles it; "Archive" opts out with `selectable: false`.',...n.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicyTree>) => <ClassicyAppearanceProbe>
            <ClassicyTree {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...o.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...o.parameters?.docs?.description}}};const A=["Default","StartCollapsed","SelectableWithDisabled","InteractiveSelection","AppearanceHooks"];export{o as AppearanceHooks,a as Default,n as InteractiveSelection,r as SelectableWithDisabled,s as StartCollapsed,A as __namedExportsOrder,O as default};
