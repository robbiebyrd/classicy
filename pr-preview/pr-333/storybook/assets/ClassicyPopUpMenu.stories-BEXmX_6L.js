import{a5 as d,j as o}from"./iframe-CIezP3KD.js";import{a as u,C as m}from"./ClassicyAppearanceProbe-D6HKSZXt.js";import"./preload-helper-shce2T3m.js";const{fn:g}=__STORYBOOK_MODULE_TEST__,b=[{value:"geneva",label:"Geneva"},{value:"chicago",label:"Chicago"},{value:"monaco",label:"Monaco"},{value:"charcoal",label:"Charcoal"}],f={title:"Controls/PopUpMenu",component:d,args:{options:b,onChangeFunc:g()}},s={args:{id:"popup-default",selected:"geneva"}},a={args:{id:"popup-label",label:"Font:",labelPosition:"left",selected:"chicago"}},r={args:{id:"popup-mini",size:"mini",selected:"monaco"}},n={args:{id:"popup-placeholder",placeholder:"Select a font…"}},t={args:{id:"popup-disabled",selected:"charcoal",disabled:!0}},h=["January","February","March","April","May","June","July","August","September","October","November","December"],p={args:{id:"popup-aligned",label:"Month:",labelPosition:"left",selected:"september",options:h.map(e=>({value:e.toLowerCase(),label:e}))}},i={args:{id:"popup-grouped",label:"Sound:",selected:"sosumi",options:[{value:"none",label:"None"},{groupLabel:"Alert Sounds",options:[{value:"sosumi",label:"Sosumi"},{value:"quack",label:"Quack"},{value:"wild-eep",label:"Wild Eep"}]},{groupLabel:"System Sounds",options:[{value:"boot",label:"Boot Chime"},{value:"beep",label:"Simple Beep"}]}]}},l={args:{id:"popup-sizes"},render:e=>o.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8},children:[o.jsx(d,{...e,id:"popup-size-small",size:"small",selected:"geneva"}),o.jsx(d,{...e,id:"popup-size-medium",size:"medium",selected:"geneva"}),o.jsx(d,{...e,id:"popup-size-large",size:"large",selected:"geneva"})]})},c={args:s.args,render:e=>o.jsx(m,{children:o.jsx(d,{...e})}),parameters:u()};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-default",
    selected: "geneva"
  }
}`,...s.parameters?.docs?.source},description:{story:"A bare pop-up menu showing its current item; open it to see the checkmark.",...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-label",
    label: "Font:",
    labelPosition: "left",
    selected: "chicago"
  }
}`,...a.parameters?.docs?.source},description:{story:"A label to the left of the button — the usual dialog-row layout.",...a.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-mini",
    size: "mini",
    selected: "monaco"
  }
}`,...r.parameters?.docs?.source},description:{story:'The menu-only `"mini"` size, for dense palettes and toolbars.',...r.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-placeholder",
    placeholder: "Select a font…"
  }
}`,...n.parameters?.docs?.source},description:{story:"With no `selected` value the button shows the placeholder and nothing is\nchecked; the menu grows down (or flips up) instead of aligning on an item.",...n.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-disabled",
    selected: "charcoal",
    disabled: true
  }
}`,...t.parameters?.docs?.source},description:{story:"A disabled pop-up: the button is dimmed and does not open.",...t.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-aligned",
    label: "Month:",
    labelPosition: "left",
    selected: "september",
    options: MONTHS.map(month => ({
      value: month.toLowerCase(),
      label: month
    }))
  }
}`,...p.parameters?.docs?.source},description:{story:`Long enough to scroll: opening it puts the *selected* item right over the
button (Mac OS 8 aligned pop-up, HIGOS8 p.33) and scrolls the list so that
selection lands on the pointer, rather than always opening from the top.`,...p.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-grouped",
    label: "Sound:",
    selected: "sosumi",
    options: [{
      value: "none",
      label: "None"
    }, {
      groupLabel: "Alert Sounds",
      options: [{
        value: "sosumi",
        label: "Sosumi"
      }, {
        value: "quack",
        label: "Quack"
      }, {
        value: "wild-eep",
        label: "Wild Eep"
      }]
    }, {
      groupLabel: "System Sounds",
      options: [{
        value: "boot",
        label: "Boot Chime"
      }, {
        value: "beep",
        label: "Simple Beep"
      }]
    }]
  }
}`,...i.parameters?.docs?.source},description:{story:"The `<optgroup>` equivalent: `{ groupLabel, options }` entries render titled,\nnon-selectable groups, mixed freely with plain options.",...i.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    id: "popup-sizes"
  },
  render: args => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: 8
  }}>
            <ClassicyPopUpMenu {...args} id="popup-size-small" size="small" selected="geneva" />
            <ClassicyPopUpMenu {...args} id="popup-size-medium" size="medium" selected="geneva" />
            <ClassicyPopUpMenu {...args} id="popup-size-large" size="large" selected="geneva" />
        </div>
}`,...l.parameters?.docs?.source},description:{story:"The `small`, `medium` and `large` sizes stacked for comparison (`mini` has its own story).",...l.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicyPopUpMenu>) => <ClassicyAppearanceProbe>
            <ClassicyPopUpMenu {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...c.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...c.parameters?.docs?.description}}};const P=["Default","WithLabel","Mini","Placeholder","Disabled","AlignedLongList","Grouped","Sizes","AppearanceHooks"];export{p as AlignedLongList,c as AppearanceHooks,s as Default,t as Disabled,i as Grouped,r as Mini,n as Placeholder,l as Sizes,a as WithLabel,P as __namedExportsOrder,f as default};
