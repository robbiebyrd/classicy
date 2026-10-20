import{C as o}from"./ClassicyPlacard-Cy4SF_Oq.js";import"./iframe-BkBspRvG.js";import"./preload-helper-PPVm8Dsz.js";const{fn:n}=__STORYBOOK_MODULE_TEST__,d={title:"Controls/Placard",component:o,args:{children:"24 items",onSelect:n()}},e={},t={args:{disabled:!0,children:"0 items"}},s={args:{children:"100%",menuItems:[{id:"50",title:"50%"},{id:"100",title:"100%"},{id:"200",title:"200%"},{id:"fit",title:"Fit to Window"}]}},r={args:{children:"Click me",onClick:n()}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:"{}",...e.parameters?.docs?.source},description:{story:'An information placard: static status text with no `onClick` or\n`menuItems`, so it renders as a plain panel rather than a button. To see\none in its usual spot, see the Desktop/Window "With Placard" story.',...e.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    children: "0 items"
  }
}`,...t.parameters?.docs?.source},description:{story:"The disabled state: dimmed text that ignores clicks.",...t.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
}`,...s.parameters?.docs?.source},description:{story:"A pop-up placard, the magnification control of a Mac OS 8 document\nwindow: `menuItems` adds a down-arrow and a menu; the chosen item's id is\nreported through `onSelect`, and an outside click closes the menu.",...s.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Click me",
    onClick: fn()
  }
}`,...r.parameters?.docs?.source},description:{story:"A placard with `onClick` is a button: it shows the pressed state while\nheld and plays the button click sounds.",...r.parameters?.docs?.description}}};const l=["Info","Disabled","WithPopUpMenu","Clickable"];export{r as Clickable,t as Disabled,e as Info,s as WithPopUpMenu,l as __namedExportsOrder,d as default};
