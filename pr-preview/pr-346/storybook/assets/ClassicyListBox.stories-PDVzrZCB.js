import{aa as c,j as l,h as m}from"./iframe-C5PysMpf.js";import{a as h,C as g}from"./ClassicyAppearanceProbe-D9nVLrQm.js";import"./preload-helper-DhQH6ajB.js";const{fn:p}=__STORYBOOK_MODULE_TEST__,w={title:"Controls/ListBox",component:c,decorators:[e=>l.jsx("div",{style:{width:240},children:l.jsx(e,{})})],args:{onChangeFunc:p(),onActivateFunc:p()}},i=[{value:"chicago",label:"Chicago"},{value:"charcoal",label:"Charcoal"},{value:"geneva",label:"Geneva"},{value:"monaco",label:"Monaco"},{value:"new-york",label:"New York"},{value:"palatino",label:"Palatino"}],s={args:{id:"listbox-single",label:"Font",options:i}},o={args:{id:"listbox-multi",label:"Install fonts",selectionMode:"multi",options:i}},a={args:{id:"listbox-checkboxes",label:"Components",selectionMode:"multi",checkboxes:!0,options:i}},r={args:{id:"listbox-scroll",label:"Choose a printer",visibleRows:4,options:[{value:"lw",label:"LaserWriter 8500"},{value:"sw",label:"StyleWriter 1200"},{value:"iw",label:"ImageWriter II",disabled:!0},{value:"cl",label:"Color LaserWriter"},{value:"dw",label:"DeskWriter 600"},{value:"pb",label:"Personal LaserWriter"}]}},n={args:{id:"listbox-controlled",label:"Install fonts",selectionMode:"multi",options:i},render:e=>{const[u,b]=m.useState(["geneva","monaco"]);return l.jsx(c,{...e,selected:u,onChangeFunc:d=>{e.onChangeFunc?.(d),b(d)}})}},t={args:s.args,render:e=>l.jsx(g,{children:l.jsx(c,{...e})}),parameters:h()};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "listbox-single",
    label: "Font",
    options: fonts
  }
}`,...s.parameters?.docs?.source},description:{story:`Single selection (the default). Tab in, then use the arrows or type a name:
the selection follows the keyboard, and Enter or a double-click activates.`,...s.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "listbox-multi",
    label: "Install fonts",
    selectionMode: "multi",
    options: fonts
  }
}`,...o.parameters?.docs?.source},description:{story:"Multi selection: \u2318/Ctrl-click toggles, Shift-click (or Shift-arrows) extends a range.",...o.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "listbox-checkboxes",
    label: "Components",
    selectionMode: "multi",
    checkboxes: true,
    options: fonts
  }
}`,...a.parameters?.docs?.source},description:{story:`\`checkboxes\` on a multi list: a check box before each row, a click or Space
toggling that row alone and the arrows moving without choosing (WIG Ch.7
"Extended and Multiple Selection List Boxes", pp.122-123, Figure 7.15).
The base sheet hides the box, so under Platinum and System 7 the chosen
rows highlight as in any multi list; Windows 98 draws the flat check box
and leaves the chosen rows plain.`,...a.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
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
}`,...r.parameters?.docs?.source},description:{story:"`visibleRows` caps the height at four rows so the list scrolls; a disabled\noption is dimmed and cannot be selected.",...r.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:"Controlled use: the story owns `selected` and feeds `onChangeFunc` back into\nit, starting with two fonts already chosen.",...n.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: Single.args,
  render: (args: ComponentProps<typeof ClassicyListBox>) => <ClassicyAppearanceProbe>
            <ClassicyListBox {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...t.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...t.parameters?.docs?.description}}};const S=["Single","MultiSelect","Checkboxes","ScrollingWithDisabled","Controlled","AppearanceHooks"];export{t as AppearanceHooks,a as Checkboxes,n as Controlled,o as MultiSelect,r as ScrollingWithDisabled,s as Single,S as __namedExportsOrder,w as default};
