import{U as d,j as e,o as p,l as o}from"./iframe-B-j7NZzm.js";import"./preload-helper-PPVm8Dsz.js";const b={title:"Controls/Tabs",component:d},t={args:{tabs:[{title:"General",children:e.jsx(p,{id:"tab-name",labelTitle:"Name"})},{title:"Sharing",children:e.jsx(o,{id:"tab-share",checked:!0,label:"File Sharing"})},{title:"Memory",children:e.jsx("p",{children:"Virtual memory is on."})}]}},l="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M1 4h5l2 2h7v7H1z' fill='%23d8b048' stroke='%23000'/%3E%3C/svg%3E",h="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='8' cy='8' r='4' fill='none' stroke='%23000' stroke-width='2'/%3E%3C/svg%3E",c=[{title:"General",children:e.jsx("p",{children:"General settings."})},{title:"Sharing",children:e.jsx("p",{children:"Sharing settings."})},{title:"Memory",children:e.jsx("p",{children:"Memory settings."})}],n={args:{size:"small",tabs:c}},a={args:{size:"large",tabs:c}},r={args:{size:"small",tabs:["Design","Prototype","Inspect","Layout","Typography","Effects","Export"].map(s=>({title:s,children:e.jsxs("p",{children:[s," panel."]})}))},decorators:[s=>e.jsx("div",{style:{width:320},children:e.jsx(s,{})})]},i={args:{tabs:[{title:"Files",icon:l,children:e.jsx("p",{children:"A tab with an icon next to its label."})},{title:"Options",icon:h,children:e.jsx(o,{id:"tab-opt",label:"Enable feature"})},{icon:l,children:e.jsx("p",{children:"An icon-only tab."})}]}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: [{
      title: "General",
      children: <ClassicyInput id="tab-name" labelTitle="Name" />
    }, {
      title: "Sharing",
      children: <ClassicyCheckbox id="tab-share" checked={true} label="File Sharing" />
    }, {
      title: "Memory",
      children: <p>Virtual memory is on.</p>
    }]
  }
}`,...t.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    size: "small",
    tabs: sizeTabs
  }
}`,...n.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    size: "large",
    tabs: sizeTabs
  }
}`,...a.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    size: "small",
    tabs: ["Design", "Prototype", "Inspect", "Layout", "Typography", "Effects", "Export"].map(title => ({
      title,
      children: <p>{title} panel.</p>
    }))
  },
  decorators: [Story => <div style={{
    width: 320
  }}>
                <Story />
            </div>]
}`,...r.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: [{
      title: "Files",
      icon: folderIcon,
      children: <p>A tab with an icon next to its label.</p>
    }, {
      title: "Options",
      icon: gearIcon,
      children: <ClassicyCheckbox id="tab-opt" label="Enable feature" />
    }, {
      // Icon-only tab (no title).
      icon: folderIcon,
      children: <p>An icon-only tab.</p>
    }]
  }
}`,...i.parameters?.docs?.source}}};const u=["Default","Small","Large","Overflowing","WithIcons"];export{t as Default,a as Large,r as Overflowing,n as Small,i as WithIcons,u as __namedExportsOrder,b as default};
