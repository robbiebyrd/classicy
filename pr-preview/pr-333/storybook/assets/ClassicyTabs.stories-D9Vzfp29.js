import{aS as r,j as e,a3 as b,T as h}from"./iframe-YPUcfPDx.js";import{a as y,C as g}from"./ClassicyAppearanceProbe-DKOyLVWj.js";import{b as u}from"./helpers-FZ5-Vj4h.js";import{m as x}from"./mirrored-CQ_yVZLr.js";import"./preload-helper-shce2T3m.js";const k={title:"Controls/Tabs",component:r},a={args:{tabs:[{title:"General",children:e.jsx(b,{id:"tab-name",labelTitle:"Name"})},{title:"Sharing",children:e.jsx(h,{id:"tab-share",checked:!0,label:"File Sharing"})},{title:"Memory",children:e.jsx("p",{children:"Virtual memory is on."})}]}},m="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M1 4h5l2 2h7v7H1z' fill='%23d8b048' stroke='%23000'/%3E%3C/svg%3E",w="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='8' cy='8' r='4' fill='none' stroke='%23000' stroke-width='2'/%3E%3C/svg%3E",p=[{title:"General",children:e.jsx("p",{children:"General settings."})},{title:"Sharing",children:e.jsx("p",{children:"Sharing settings."})},{title:"Memory",children:e.jsx("p",{children:"Memory settings."})}],t={args:{size:"small",tabs:p}},n={args:{size:"large",tabs:p}},o={render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:24},children:[e.jsx(r,{size:"small",tabs:p}),e.jsx(r,{size:"medium",tabs:p}),e.jsx(r,{size:"large",tabs:p})]})},i={args:{size:"small",tabs:["Design","Prototype","Inspect","Layout","Typography","Effects","Export"].map(s=>({title:s,children:e.jsxs("p",{children:[s," panel."]})}))},decorators:[s=>e.jsx("div",{style:{width:320},children:e.jsx(s,{})})]},c={args:{tabs:[{title:"Files",icon:m,children:e.jsx("p",{children:"A tab with an icon next to its label."})},{title:"Options",icon:w,children:e.jsx(h,{id:"tab-opt",label:"Enable feature"})},{icon:m,children:e.jsx("p",{children:"An icon-only tab."})}]}},l={args:a.args,render:s=>e.jsx(g,{children:e.jsx(r,{...s})}),parameters:y()},d={...a,parameters:x,render:s=>e.jsx(u,{title:"Tabs",size:[420,220],children:e.jsx(r,{...s})})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
}`,...a.parameters?.docs?.source},description:{story:"A standard (`medium`) tab control with three panes holding ordinary\ncontrols. Click a tab, or focus the strip and use the arrow keys, Home and\nEnd; text typed on the General tab survives switching away and back.",...a.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    size: "small",
    tabs: sizeTabs
  }
}`,...t.parameters?.docs?.source},description:{story:"The compact `small` strip, for windows with more tabs than room. Its label\nis the standard size scaled by the HIG's 10:12 ratio.",...t.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    size: "large",
    tabs: sizeTabs
  }
}`,...n.parameters?.docs?.source},description:{story:"The `large` size, a Classicy extension that scales the type up by half.",...n.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: 24
  }}>
            <ClassicyTabs size="small" tabs={sizeTabs} />
            <ClassicyTabs size="medium" tabs={sizeTabs} />
            <ClassicyTabs size="large" tabs={sizeTabs} />
        </div>
}`,...o.parameters?.docs?.source},description:{story:"All three sizes stacked so the HIG tab type scale is easy to compare: the\nstandard (`medium`) label is the system UI font, the compact (`small`) label\nis that size scaled by the HIG's 10:12 ratio, and `large` is the Classicy\nextension above it.",...o.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
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
}`,...i.parameters?.docs?.source},description:{story:"Narrow enough that the strip cannot fit every tab, so scroll arrows appear\nat both ends; each click advances by a whole tab. Arrows show at any size,\nnot only `small`, and keyboard traversal scrolls the selected tab into view.",...i.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
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
}`,...c.parameters?.docs?.source},description:{story:`Tabs can carry an icon beside the title, or an icon alone (the third tab).
Icons are decorative, so an icon-only tab has no accessible name of its own.`,...c.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicyTabs>) => <ClassicyAppearanceProbe>
            <ClassicyTabs {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...l.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...l.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  ...Default,
  parameters: mirroredParameters,
  render: args => <StoryWindow title="Tabs" size={[420, 220]}>
            <ClassicyTabs {...args} />
        </StoryWindow>
}`,...d.parameters?.docs?.source},description:{story:'`Default`, in a window, under the Storybook-only `mirrored` Appearance\nPackage: the tab strip under its panel by CSS `order` alone, with each\ntab\'s outline turned over so its wide edge meets the panel (the label is\nturned back upright).\nWithout a package, `stripPosition="bottom"` moves the strip the same way.',...d.parameters?.docs?.description}}};const T=["Default","Small","Large","SizeComparison","Overflowing","WithIcons","AppearanceHooks","Mirrored"];export{l as AppearanceHooks,a as Default,n as Large,d as Mirrored,i as Overflowing,o as SizeComparison,t as Small,c as WithIcons,T as __namedExportsOrder,k as default};
