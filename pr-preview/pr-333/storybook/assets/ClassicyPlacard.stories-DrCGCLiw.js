import{j as o}from"./iframe-CuYhMLiZ.js";import{a as d,C as p}from"./ClassicyAppearanceProbe-DbgDtU3U.js";import{C as n}from"./ClassicyPlacard-CC-aR66h.js";import"./preload-helper-shce2T3m.js";const{fn:i}=__STORYBOOK_MODULE_TEST__,g={title:"Controls/Placard",component:n,args:{children:"24 items",onSelect:i()}},r={},s={args:{disabled:!0,children:"0 items"}},e={args:{children:"100%",menuItems:[{id:"50",title:"50%"},{id:"100",title:"100%"},{id:"200",title:"200%"},{id:"fit",title:"Fit to Window"}]}},a={args:{children:"Click me",onClick:i()}},t={args:e.args,render:c=>o.jsx(p,{children:o.jsx(n,{...c})}),parameters:d()};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:"{}",...r.parameters?.docs?.source},description:{story:'An information placard: static status text with no `onClick` or\n`menuItems`, so it renders as a plain panel rather than a button. To see\none in its usual spot, see the Desktop/Window "With Placard" story.',...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    children: "0 items"
  }
}`,...s.parameters?.docs?.source},description:{story:"The disabled state: dimmed text that ignores clicks.",...s.parameters?.docs?.description}}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    children: "100%",
    menuItems: [{
      id: "50",
      title: "50%"
    }, {
      id: "100",
      title: "100%"
    }, {
      id: "200",
      title: "200%"
    }, {
      id: "fit",
      title: "Fit to Window"
    }]
  }
}`,...e.parameters?.docs?.source},description:{story:"A pop-up placard, the magnification control of a Mac OS 8 document\nwindow: `menuItems` adds a down-arrow and a menu; the chosen item's id is\nreported through `onSelect`, and an outside click closes the menu.",...e.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Click me",
    onClick: fn()
  }
}`,...a.parameters?.docs?.source},description:{story:"A placard with `onClick` is a button: it shows the pressed state while\nheld and plays the button click sounds.",...a.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: WithPopUpMenu.args,
  render: (args: ComponentProps<typeof ClassicyPlacard>) => <ClassicyAppearanceProbe>
            <ClassicyPlacard {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...t.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.\n\nUses the pop-up placard (`WithPopUpMenu`): the static `Info` placard\nemits nothing but `mount`.",...t.parameters?.docs?.description}}};const k=["Info","Disabled","WithPopUpMenu","Clickable","AppearanceHooks"];export{t as AppearanceHooks,a as Clickable,s as Disabled,r as Info,e as WithPopUpMenu,k as __namedExportsOrder,g as default};
