import{a$ as l,j as e,a3 as m,T as h}from"./iframe-DH9JHIQq.js";import{a as b,C as g}from"./ClassicyAppearanceProbe-DV65qn8K.js";import"./preload-helper-shce2T3m.js";const f={title:"Controls/Tabs",component:l},a={args:{tabs:[{title:"General",children:e.jsx(m,{id:"tab-name",labelTitle:"Name"})},{title:"Sharing",children:e.jsx(h,{id:"tab-share",checked:!0,label:"File Sharing"})},{title:"Memory",children:e.jsx("p",{children:"Virtual memory is on."})}]}},p="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M1 4h5l2 2h7v7H1z' fill='%23d8b048' stroke='%23000'/%3E%3C/svg%3E",y="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='8' cy='8' r='4' fill='none' stroke='%23000' stroke-width='2'/%3E%3C/svg%3E",d=[{title:"General",children:e.jsx("p",{children:"General settings."})},{title:"Sharing",children:e.jsx("p",{children:"Sharing settings."})},{title:"Memory",children:e.jsx("p",{children:"Memory settings."})}],r={args:{size:"small",tabs:d}},t={args:{size:"large",tabs:d}},n={render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:24},children:[e.jsx(l,{size:"small",tabs:d}),e.jsx(l,{size:"medium",tabs:d}),e.jsx(l,{size:"large",tabs:d})]})},o={args:{size:"small",tabs:["Design","Prototype","Inspect","Layout","Typography","Effects","Export"].map(s=>({title:s,children:e.jsxs("p",{children:[s," panel."]})}))},decorators:[s=>e.jsx("div",{style:{width:320},children:e.jsx(s,{})})]},i={args:{tabs:[{title:"Files",icon:p,children:e.jsx("p",{children:"A tab with an icon next to its label."})},{title:"Options",icon:y,children:e.jsx(h,{id:"tab-opt",label:"Enable feature"})},{icon:p,children:e.jsx("p",{children:"An icon-only tab."})}]}},c={args:a.args,render:s=>e.jsx(g,{children:e.jsx(l,{...s})}),parameters:b()};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
}`,...a.parameters?.docs?.source},description:{story:"A standard (`medium`) tab control with three panes holding ordinary\ncontrols. Click a tab, or focus the strip and use the arrow keys, Home and\nEnd; text typed on the General tab survives switching away and back.",...a.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    size: "small",
    tabs: sizeTabs
  }
}`,...r.parameters?.docs?.source},description:{story:"The compact `small` strip, for windows with more tabs than room. Its label\nis the standard size scaled by the HIG's 10:12 ratio.",...r.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    size: "large",
    tabs: sizeTabs
  }
}`,...t.parameters?.docs?.source},description:{story:"The `large` size, a Classicy extension that scales the type up by half.",...t.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: 24
  }}>
            <ClassicyTabs size="small" tabs={sizeTabs} />
            <ClassicyTabs size="medium" tabs={sizeTabs} />
            <ClassicyTabs size="large" tabs={sizeTabs} />
        </div>
}`,...n.parameters?.docs?.source},description:{story:"All three sizes stacked so the HIG tab type scale is easy to compare: the\nstandard (`medium`) label is the system UI font, the compact (`small`) label\nis that size scaled by the HIG's 10:12 ratio, and `large` is the Classicy\nextension above it.",...n.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
}`,...o.parameters?.docs?.source},description:{story:"Narrow enough that the strip cannot fit every tab, so scroll arrows appear\nat both ends; each click advances by a whole tab. Arrows show at any size,\nnot only `small`, and keyboard traversal scrolls the selected tab into view.",...o.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
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
Icons are decorative, so an icon-only tab has no accessible name of its own.`,...i.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicyTabs>) => <ClassicyAppearanceProbe>
            <ClassicyTabs {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...c.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...c.parameters?.docs?.description}}};const C=["Default","Small","Large","SizeComparison","Overflowing","WithIcons","AppearanceHooks"];export{c as AppearanceHooks,a as Default,t as Large,o as Overflowing,n as SizeComparison,r as Small,i as WithIcons,C as __namedExportsOrder,f as default};
