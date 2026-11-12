import{j as l}from"./iframe-BwHesUBz.js";import{a as m,C as u}from"./ClassicyAppearanceProbe-IwMi2qbF.js";import{C as d}from"./ClassicyComboBox-CwJEPetT.js";import"./preload-helper-CxPGPiBr.js";const{fn:p}=__STORYBOOK_MODULE_TEST__,y={title:"Controls/ComboBox",component:d,decorators:[c=>l.jsx("div",{style:{width:260},children:l.jsx(c,{})})],args:{onChangeFunc:p(),onSelectFunc:p()}},i=[{value:"cupertino",label:"Cupertino"},{value:"cambridge",label:"Cambridge"},{value:"chicago",label:"Chicago"},{value:"monaco",label:"Monaco"},{value:"new-york",label:"New York"}],e={args:{id:"combo-starts",label:"City:",placeholder:"Type to search\u2026",options:i}},o={args:{id:"combo-contains",label:"City (contains):",filter:"contains",options:i}},a={args:{id:"combo-pick",label:"City (no free text):",freeText:!1,options:i}},r={args:{id:"combo-grouped",label:"Font:",options:[{groupLabel:"Serif",options:[{value:"new-york",label:"New York"},{value:"palatino",label:"Palatino"}]},{groupLabel:"Sans Serif",options:[{value:"chicago",label:"Chicago"},{value:"charcoal",label:"Charcoal"},{value:"geneva",label:"Geneva"}]}]}},s={args:{id:"combo-no-filter",label:"City:",filter:!1,prefillValue:"Cupertino",options:i}},n={args:{id:"combo-disabled",label:"City:",prefillValue:"Monaco",disabled:!0,options:i}},t={args:e.args,render:c=>l.jsx(u,{children:l.jsx(d,{...c})}),parameters:m()};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-starts",
    label: "City:",
    placeholder: "Type to search\u2026",
    options: cities
  }
}`,...e.parameters?.docs?.source},description:{story:`The default filter: typing "c" narrows the list to the labels that start with
it. The arrow button always shows the full list.`,...e.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-contains",
    label: "City (contains):",
    filter: "contains",
    options: cities
  }
}`,...o.parameters?.docs?.source},description:{story:'`filter="contains"` matches anywhere in a label, so typing "york" finds New York.',...o.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-pick",
    label: "City (no free text):",
    freeText: false,
    options: cities
  }
}`,...a.parameters?.docs?.source},description:{story:"`freeText={false}`: the field may only hold an option label. Text that\nmatches none snaps back to the last committed choice on dismiss.",...a.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-grouped",
    label: "Font:",
    options: [{
      groupLabel: "Serif",
      options: [{
        value: "new-york",
        label: "New York"
      }, {
        value: "palatino",
        label: "Palatino"
      }]
    }, {
      groupLabel: "Sans Serif",
      options: [{
        value: "chicago",
        label: "Chicago"
      }, {
        value: "charcoal",
        label: "Charcoal"
      }, {
        value: "geneva",
        label: "Geneva"
      }]
    }]
  }
}`,...r.parameters?.docs?.source},description:{story:"Grouped suggestions (`{ groupLabel, options }` entries): groups filter with\ntheir members and vanish, header included, when none match.",...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-no-filter",
    label: "City:",
    filter: false,
    prefillValue: "Cupertino",
    options: cities
  }
}`,...s.parameters?.docs?.source},description:{story:'`filter={false}` never narrows the list, so it works as a "recent values"\nmenu beside a free-form field. Prefilled text seeds the field.',...s.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    id: "combo-disabled",
    label: "City:",
    prefillValue: "Monaco",
    disabled: true,
    options: cities
  }
}`,...n.parameters?.docs?.source},description:{story:"A disabled combo box: neither the field nor the arrow responds.",...n.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: StartsWith.args,
  render: (args: ComponentProps<typeof ClassicyComboBox>) => <ClassicyAppearanceProbe>
            <ClassicyComboBox {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...t.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...t.parameters?.docs?.description}}};const C=["StartsWith","Contains","PickOnly","GroupedSuggestions","NoFilter","Disabled","AppearanceHooks"];export{t as AppearanceHooks,o as Contains,n as Disabled,r as GroupedSuggestions,s as NoFilter,a as PickOnly,e as StartsWith,C as __namedExportsOrder,y as default};
