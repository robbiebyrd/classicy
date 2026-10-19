import{Q as n,j as r}from"./iframe-Bh9zwN-1.js";import"./preload-helper-PPVm8Dsz.js";const c={title:"Controls/ListBox",component:n,decorators:[o=>r.jsx("div",{style:{width:240},children:r.jsx(o,{})})]},s=[{value:"chicago",label:"Chicago"},{value:"charcoal",label:"Charcoal"},{value:"geneva",label:"Geneva"},{value:"monaco",label:"Monaco"},{value:"new-york",label:"New York"},{value:"palatino",label:"Palatino"}],e={args:{id:"listbox-single",label:"Font",options:s}},l={args:{id:"listbox-multi",label:"Install fonts",selectionMode:"multi",options:s}},a={args:{id:"listbox-scroll",label:"Choose a printer",visibleRows:4,options:[{value:"lw",label:"LaserWriter 8500"},{value:"sw",label:"StyleWriter 1200"},{value:"iw",label:"ImageWriter II",disabled:!0},{value:"cl",label:"Color LaserWriter"},{value:"dw",label:"DeskWriter 600"},{value:"pb",label:"Personal LaserWriter"}]}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "listbox-single",
    label: "Font",
    options: fonts
  }
}`,...e.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    id: "listbox-multi",
    label: "Install fonts",
    selectionMode: "multi",
    options: fonts
  }
}`,...l.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "listbox-scroll",
    label: "Choose a printer",
    visibleRows: 4,
    options: [{
      value: "lw",
      label: "LaserWriter 8500"
    }, {
      value: "sw",
      label: "StyleWriter 1200"
    }, {
      value: "iw",
      label: "ImageWriter II",
      disabled: true
    }, {
      value: "cl",
      label: "Color LaserWriter"
    }, {
      value: "dw",
      label: "DeskWriter 600"
    }, {
      value: "pb",
      label: "Personal LaserWriter"
    }]
  }
}`,...a.parameters?.docs?.source}}};const b=["Single","MultiSelect","ScrollingWithDisabled"];export{l as MultiSelect,a as ScrollingWithDisabled,e as Single,b as __namedExportsOrder,c as default};
