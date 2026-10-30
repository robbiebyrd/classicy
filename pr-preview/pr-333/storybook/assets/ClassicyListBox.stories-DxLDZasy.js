import{ax as l,j as t,r as m}from"./iframe-C23rsnc9.js";import{a as b,C as g}from"./ClassicyAppearanceProbe-BMb3obih.js";import"./preload-helper-shce2T3m.js";const{fn:d}=__STORYBOOK_MODULE_TEST__,x={title:"Controls/ListBox",component:l,decorators:[e=>t.jsx("div",{style:{width:240},children:t.jsx(e,{})})],args:{onChangeFunc:d(),onActivateFunc:d()}},i=[{value:"chicago",label:"Chicago"},{value:"charcoal",label:"Charcoal"},{value:"geneva",label:"Geneva"},{value:"monaco",label:"Monaco"},{value:"new-york",label:"New York"},{value:"palatino",label:"Palatino"}],s={args:{id:"listbox-single",label:"Font",options:i}},a={args:{id:"listbox-multi",label:"Install fonts",selectionMode:"multi",options:i}},o={args:{id:"listbox-scroll",label:"Choose a printer",visibleRows:4,options:[{value:"lw",label:"LaserWriter 8500"},{value:"sw",label:"StyleWriter 1200"},{value:"iw",label:"ImageWriter II",disabled:!0},{value:"cl",label:"Color LaserWriter"},{value:"dw",label:"DeskWriter 600"},{value:"pb",label:"Personal LaserWriter"}]}},r={args:{id:"listbox-controlled",label:"Install fonts",selectionMode:"multi",options:i},render:e=>{const[p,u]=m.useState(["geneva","monaco"]);return t.jsx(l,{...e,selected:p,onChangeFunc:c=>{e.onChangeFunc?.(c),u(c)}})}},n={args:s.args,render:e=>t.jsx(g,{children:t.jsx(l,{...e})}),parameters:b()};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "listbox-single",
    label: "Font",
    options: fonts
  }
}`,...s.parameters?.docs?.source},description:{story:`Single selection (the default). Tab in, then use the arrows or type a name:
the selection follows the keyboard, and Enter or a double-click activates.`,...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "listbox-multi",
    label: "Install fonts",
    selectionMode: "multi",
    options: fonts
  }
}`,...a.parameters?.docs?.source},description:{story:"Multi selection: ⌘/Ctrl-click toggles, Shift-click (or Shift-arrows) extends a range.",...a.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
}`,...o.parameters?.docs?.source},description:{story:"`visibleRows` caps the height at four rows so the list scrolls; a disabled\noption is dimmed and cannot be selected.",...o.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
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
}`,...r.parameters?.docs?.source},description:{story:"Controlled use: the story owns `selected` and feeds `onChangeFunc` back into\nit, starting with two fonts already chosen.",...r.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: Single.args,
  render: (args: ComponentProps<typeof ClassicyListBox>) => <ClassicyAppearanceProbe>
            <ClassicyListBox {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...n.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...n.parameters?.docs?.description}}};const S=["Single","MultiSelect","ScrollingWithDisabled","Controlled","AppearanceHooks"];export{n as AppearanceHooks,r as Controlled,a as MultiSelect,o as ScrollingWithDisabled,s as Single,S as __namedExportsOrder,x as default};
