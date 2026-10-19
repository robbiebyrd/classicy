import{a2 as c,j as e,t as m,o as p}from"./iframe-DW8yvvQN.js";import"./preload-helper-PPVm8Dsz.js";const u={title:"Controls/Tabs",component:c},n={args:{tabs:[{title:"General",children:e.jsx(m,{id:"tab-name",labelTitle:"Name"})},{title:"Sharing",children:e.jsx(p,{id:"tab-share",checked:!0,label:"File Sharing"})},{title:"Memory",children:e.jsx("p",{children:"Virtual memory is on."})}]}},d="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M1 4h5l2 2h7v7H1z' fill='%23d8b048' stroke='%23000'/%3E%3C/svg%3E",h="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='8' cy='8' r='4' fill='none' stroke='%23000' stroke-width='2'/%3E%3C/svg%3E",s=[{title:"General",children:e.jsx("p",{children:"General settings."})},{title:"Sharing",children:e.jsx("p",{children:"Sharing settings."})},{title:"Memory",children:e.jsx("p",{children:"Memory settings."})}],r={args:{size:"small",tabs:s}},t={args:{size:"large",tabs:s}},i={render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:24},children:[e.jsx(c,{size:"small",tabs:s}),e.jsx(c,{size:"medium",tabs:s}),e.jsx(c,{size:"large",tabs:s})]})},l={args:{size:"small",tabs:["Design","Prototype","Inspect","Layout","Typography","Effects","Export"].map(a=>({title:a,children:e.jsxs("p",{children:[a," panel."]})}))},decorators:[a=>e.jsx("div",{style:{width:320},children:e.jsx(a,{})})]},o={args:{tabs:[{title:"Files",icon:d,children:e.jsx("p",{children:"A tab with an icon next to its label."})},{title:"Options",icon:h,children:e.jsx(p,{id:"tab-opt",label:"Enable feature"})},{icon:d,children:e.jsx("p",{children:"An icon-only tab."})}]}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    size: "small",
    tabs: sizeTabs
  }
}`,...r.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    size: "large",
    tabs: sizeTabs
  }
}`,...t.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: 24
  }}>
            <ClassicyTabs size="small" tabs={sizeTabs} />
            <ClassicyTabs size="medium" tabs={sizeTabs} />
            <ClassicyTabs size="large" tabs={sizeTabs} />
        </div>
}`,...i.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
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
}`,...l.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
}`,...o.parameters?.docs?.source}}};const x=["Default","Small","Large","SizeComparison","Overflowing","WithIcons"];export{n as Default,t as Large,l as Overflowing,i as SizeComparison,r as Small,o as WithIcons,x as __namedExportsOrder,u as default};
