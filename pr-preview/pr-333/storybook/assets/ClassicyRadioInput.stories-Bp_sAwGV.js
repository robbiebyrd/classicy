import{aK as d}from"./iframe-VU4yhPdm.js";import"./preload-helper-shce2T3m.js";const{fn:l}=__STORYBOOK_MODULE_TEST__,c={title:"Controls/RadioInput",component:d,args:{name:"speed",label:"Mouse Speed",onClickFunc:l(),inputs:[{id:"slow",label:"Slow"},{id:"medium",label:"Medium",checked:!0},{id:"fast",label:"Fast"}]}},e={},s={args:{name:"speed-columns",align:"columns",inputs:[{id:"slow-columns",label:"Slow"},{id:"medium-columns",label:"Medium",checked:!0},{id:"fast-columns",label:"Fast"}]}},a={args:{name:"speed-rows",align:"rows",inputs:[{id:"slow-rows",label:"Slow"},{id:"medium-rows",label:"Medium",checked:!0},{id:"fast-rows",label:"Fast"}]}},n={args:{name:"speed-disabled",disabled:!0,inputs:[{id:"slow-disabled",label:"Slow"},{id:"medium-disabled",label:"Medium",checked:!0},{id:"fast-disabled",label:"Fast"}]}},o={args:{name:"speed-option",inputs:[{id:"slow-option",label:"Slow"},{id:"medium-option",label:"Medium",checked:!0},{id:"fast-option",label:"Fast (unavailable)",disabled:!0}]}},i={args:{name:"speed-none",inputs:[{id:"slow-none",label:"Slow"},{id:"medium-none",label:"Medium"},{id:"fast-none",label:"Fast"}]}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:"{}",...e.parameters?.docs?.source},description:{story:'The default layout, `align="rows"`: buttons side by side in one row under\nthe group title, with "Medium" pre-selected via `checked`.',...e.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    name: "speed-columns",
    align: "columns",
    inputs: [{
      id: "slow-columns",
      label: "Slow"
    }, {
      id: "medium-columns",
      label: "Medium",
      checked: true
    }, {
      id: "fast-columns",
      label: "Fast"
    }]
  }
}`,...s.parameters?.docs?.source},description:{story:'`align="columns"` stacks the buttons in one column. (Each story uses its own\n`name` and ids, as separate groups on one page must.)',...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    name: "speed-rows",
    align: "rows",
    inputs: [{
      id: "slow-rows",
      label: "Slow"
    }, {
      id: "medium-rows",
      label: "Medium",
      checked: true
    }, {
      id: "fast-rows",
      label: "Fast"
    }]
  }
}`,...a.parameters?.docs?.source},description:{story:'`align="rows"` passed explicitly: the same row as the default.',...a.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    name: "speed-disabled",
    disabled: true,
    inputs: [{
      id: "slow-disabled",
      label: "Slow"
    }, {
      id: "medium-disabled",
      label: "Medium",
      checked: true
    }, {
      id: "fast-disabled",
      label: "Fast"
    }]
  }
}`,...n.parameters?.docs?.source},description:{story:"A fully disabled group: the group-level `disabled` dims every button and blocks clicks.",...n.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    name: "speed-option",
    inputs: [{
      id: "slow-option",
      label: "Slow"
    }, {
      id: "medium-option",
      label: "Medium",
      checked: true
    }, {
      id: "fast-option",
      label: "Fast (unavailable)",
      disabled: true
    }]
  }
}`,...o.parameters?.docs?.source},description:{story:"A single unavailable choice in an otherwise active group.",...o.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    name: "speed-none",
    inputs: [{
      id: "slow-none",
      label: "Slow"
    }, {
      id: "medium-none",
      label: "Medium"
    }, {
      id: "fast-none",
      label: "Fast"
    }]
  }
}`,...i.parameters?.docs?.source},description:{story:"No entry is `checked`, so the first button starts on: a radio group always\nhas exactly one button on (HIGOS8 p.24).",...i.parameters?.docs?.description}}};const u=["Default","Columns","Rows","Disabled","DisabledOption","NonePreselected"];export{s as Columns,e as Default,n as Disabled,o as DisabledOption,i as NonePreselected,a as Rows,u as __namedExportsOrder,c as default};
