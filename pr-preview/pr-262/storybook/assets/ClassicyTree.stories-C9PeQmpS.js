import{X as o,Y as n,Z as s,_ as d}from"./iframe-D44mm1Vl.js";import"./preload-helper-DWV1EXqE.js";const p={title:"Controls/Tree",component:d},t=[{id:"system",label:"System Folder",leftIcon:s,defaultOpen:!0,children:[{id:"fonts",label:"Fonts",leftIcon:o,children:[{id:"charcoal",label:"Charcoal",button:{label:"Open",onClickFunc:()=>alert("Open Charcoal")}},{id:"geneva",label:"Geneva",button:{label:"Open",onClickFunc:()=>alert("Open Geneva")}}]},{id:"apple-menu",label:"Apple Menu Items",leftIcon:n,rightIcon:n,children:[{id:"calculator",label:"Calculator",rightIcon:n,button:{label:"Get Info",onClickFunc:()=>alert("Get Info: Calculator")}}]}]},{id:"readme",label:"Read Me",button:{label:"Open",isDefault:!0,onClickFunc:()=>alert("Open Read Me")}}],e={args:{nodes:t}},l={args:{nodes:t.map(r=>({...r,defaultOpen:!1}))}},a={args:{selectionMode:"multi",selectedIds:["kept"],nodes:[{id:"root",label:"Documents",defaultOpen:!0,children:[{id:"kept",label:"Kept file"},{id:"grayed",label:"Grayed file",disabled:!0},{id:"plain",label:"Plain file",buttons:[{label:"Edit"},{label:"Remove"}]}]}]}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    nodes
  }
}`,...e.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    nodes: nodes.map(n => ({
      ...n,
      defaultOpen: false
    }))
  }
}`,...l.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
}`,...a.parameters?.docs?.source}}};const u=["Default","StartCollapsed","SelectableWithDisabled"];export{e as Default,a as SelectableWithDisabled,l as StartCollapsed,u as __namedExportsOrder,p as default};
