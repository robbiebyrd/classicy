import{am as c,j as e,D as h,n as p}from"./iframe-CHCkZXuL.js";import"./preload-helper-BNDLSCix.js";const g={title:"Controls/Tabs",component:c},s={args:{tabs:[{title:"General",children:e.jsx(h,{id:"tab-name",labelTitle:"Name"})},{title:"Sharing",children:e.jsx(p,{id:"tab-share",checked:!0,label:"File Sharing"})},{title:"Memory",children:e.jsx("p",{children:"Virtual memory is on."})}]}},d="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M1 4h5l2 2h7v7H1z' fill='%23d8b048' stroke='%23000'/%3E%3C/svg%3E",m="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='8' cy='8' r='4' fill='none' stroke='%23000' stroke-width='2'/%3E%3C/svg%3E",o=[{title:"General",children:e.jsx("p",{children:"General settings."})},{title:"Sharing",children:e.jsx("p",{children:"Sharing settings."})},{title:"Memory",children:e.jsx("p",{children:"Memory settings."})}],a={args:{size:"small",tabs:o}},t={args:{size:"large",tabs:o}},r={render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:24},children:[e.jsx(c,{size:"small",tabs:o}),e.jsx(c,{size:"medium",tabs:o}),e.jsx(c,{size:"large",tabs:o})]})},n={args:{size:"small",tabs:["Design","Prototype","Inspect","Layout","Typography","Effects","Export"].map(l=>({title:l,children:e.jsxs("p",{children:[l," panel."]})}))},decorators:[l=>e.jsx("div",{style:{width:320},children:e.jsx(l,{})})]},i={args:{tabs:[{title:"Files",icon:d,children:e.jsx("p",{children:"A tab with an icon next to its label."})},{title:"Options",icon:m,children:e.jsx(p,{id:"tab-opt",label:"Enable feature"})},{icon:d,children:e.jsx("p",{children:"An icon-only tab."})}]}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
}`,...s.parameters?.docs?.source},description:{story:"A standard (`medium`) tab control with three panes holding ordinary\ncontrols. Click a tab, or focus the strip and use the arrow keys, Home and\nEnd; text typed on the General tab survives switching away and back.",...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    size: "small",
    tabs: sizeTabs
  }
}`,...a.parameters?.docs?.source},description:{story:"The compact `small` strip, for windows with more tabs than room. Its label\nis the standard size scaled by the HIG's 10:12 ratio.",...a.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    size: "large",
    tabs: sizeTabs
  }
}`,...t.parameters?.docs?.source},description:{story:"The `large` size, a Classicy extension that scales the type up by half.",...t.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: 24
  }}>
            <ClassicyTabs size="small" tabs={sizeTabs} />
            <ClassicyTabs size="medium" tabs={sizeTabs} />
            <ClassicyTabs size="large" tabs={sizeTabs} />
        </div>
}`,...r.parameters?.docs?.source},description:{story:"All three sizes stacked so the HIG tab type scale is easy to compare: the\nstandard (`medium`) label is the system UI font, the compact (`small`) label\nis that size scaled by the HIG's 10:12 ratio, and `large` is the Classicy\nextension above it.",...r.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:"Narrow enough that the strip cannot fit every tab, so scroll arrows appear\nat both ends; each click advances by a whole tab. Arrows show at any size,\nnot only `small`, and keyboard traversal scrolls the selected tab into view.",...n.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
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
}`,...i.parameters?.docs?.source},description:{story:`Tabs can carry an icon beside the title, or an icon alone (the third tab).
Icons are decorative, so an icon-only tab has no accessible name of its own.`,...i.parameters?.docs?.description}}};const u=["Default","Small","Large","SizeComparison","Overflowing","WithIcons"];export{s as Default,t as Large,n as Overflowing,r as SizeComparison,a as Small,i as WithIcons,u as __namedExportsOrder,g as default};
