import{a0 as c,i as p,j as l}from"./iframe-CDlBZayb.js";import"./preload-helper-PPVm8Dsz.js";const{fn:i}=__STORYBOOK_MODULE_TEST__,g={title:"Controls/ListBox",component:c,decorators:[a=>l.jsx("div",{style:{width:240},children:l.jsx(a,{})})],args:{onChangeFunc:i(),onActivateFunc:i()}},n=[{value:"chicago",label:"Chicago"},{value:"charcoal",label:"Charcoal"},{value:"geneva",label:"Geneva"},{value:"monaco",label:"Monaco"},{value:"new-york",label:"New York"},{value:"palatino",label:"Palatino"}],e={args:{id:"listbox-single",label:"Font",options:n}},s={args:{id:"listbox-multi",label:"Install fonts",selectionMode:"multi",options:n}},o={args:{id:"listbox-scroll",label:"Choose a printer",visibleRows:4,options:[{value:"lw",label:"LaserWriter 8500"},{value:"sw",label:"StyleWriter 1200"},{value:"iw",label:"ImageWriter II",disabled:!0},{value:"cl",label:"Color LaserWriter"},{value:"dw",label:"DeskWriter 600"},{value:"pb",label:"Personal LaserWriter"}]}},t={args:{id:"listbox-controlled",label:"Install fonts",selectionMode:"multi",options:n},render:a=>{const[d,u]=p.useState(["geneva","monaco"]);return l.jsx(c,{...a,selected:d,onChangeFunc:r=>{a.onChangeFunc?.(r),u(r)}})}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "listbox-single",
    label: "Font",
    options: fonts
  }
}`,...e.parameters?.docs?.source},description:{story:`Single selection (the default). Tab in, then use the arrows or type a name:
the selection follows the keyboard, and Enter or a double-click activates.`,...e.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "listbox-multi",
    label: "Install fonts",
    selectionMode: "multi",
    options: fonts
  }
}`,...s.parameters?.docs?.source},description:{story:"Multi selection: ⌘/Ctrl-click toggles, Shift-click (or Shift-arrows) extends a range.",...s.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
}`,...o.parameters?.docs?.source},description:{story:"`visibleRows` caps the height at four rows so the list scrolls; a disabled\noption is dimmed and cannot be selected.",...o.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "listbox-controlled",
    label: "Install fonts",
    selectionMode: "multi",
    options: fonts
  },
  render: args => {
    const [selected, setSelected] = useState(["geneva", "monaco"]);
    return <ClassicyListBox {...args} selected={selected} onChangeFunc={values => {
      args.onChangeFunc?.(values);
      setSelected(values);
    }} />;
  }
}`,...t.parameters?.docs?.source},description:{story:"Controlled use: the story owns `selected` and feeds `onChangeFunc` back into\nit, starting with two fonts already chosen.",...t.parameters?.docs?.description}}};const h=["Single","MultiSelect","ScrollingWithDisabled","Controlled"];export{t as Controlled,s as MultiSelect,o as ScrollingWithDisabled,e as Single,h as __namedExportsOrder,g as default};
