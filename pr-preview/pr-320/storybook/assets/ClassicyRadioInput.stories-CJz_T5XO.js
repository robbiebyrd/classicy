import{af as d}from"./iframe-Bz17YsvS.js";import"./preload-helper-qh6h5yAv.js";const{fn:i}=__STORYBOOK_MODULE_TEST__,l={title:"Controls/RadioInput",component:d,args:{name:"speed",label:"Mouse Speed",onClickFunc:i(),inputs:[{id:"slow",label:"Slow"},{id:"medium",label:"Medium",checked:!0},{id:"fast",label:"Fast"}]}},e={},s={args:{name:"speed-rows",align:"rows",inputs:[{id:"slow-rows",label:"Slow"},{id:"medium-rows",label:"Medium",checked:!0},{id:"fast-rows",label:"Fast"}]}},a={args:{name:"speed-disabled",disabled:!0,inputs:[{id:"slow-disabled",label:"Slow",disabled:!0},{id:"medium-disabled",label:"Medium",checked:!0,disabled:!0},{id:"fast-disabled",label:"Fast",disabled:!0}]}},n={args:{name:"speed-option",inputs:[{id:"slow-option",label:"Slow"},{id:"medium-option",label:"Medium",checked:!0},{id:"fast-option",label:"Fast (unavailable)",disabled:!0}]}},o={args:{name:"speed-none",inputs:[{id:"slow-none",label:"Slow"},{id:"medium-none",label:"Medium"},{id:"fast-none",label:"Fast"}]}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:"{}",...e.parameters?.docs?.source},description:{story:'The default `align="columns"` layout: buttons stacked in one column under the\ngroup title, with "Medium" pre-selected via `checked`.',...e.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
}`,...s.parameters?.docs?.source},description:{story:'`align="rows"` lays the buttons out side by side in a single row. (Each\nstory uses its own `name` and ids, as separate groups on one page must.)',...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    name: "speed-disabled",
    disabled: true,
    inputs: [{
      id: "slow-disabled",
      label: "Slow",
      disabled: true
    }, {
      id: "medium-disabled",
      label: "Medium",
      checked: true,
      disabled: true
    }, {
      id: "fast-disabled",
      label: "Fast",
      disabled: true
    }]
  }
}`,...a.parameters?.docs?.source},description:{story:"A fully disabled group. The group-level `disabled` only dims the title, so\neach entry in `inputs` is disabled too — that is what dims the buttons and\nblocks clicks.",...a.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:"A single unavailable choice in an otherwise active group.",...n.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
}`,...o.parameters?.docs?.source},description:{story:"No entry is `checked`, so the first button starts on: a radio group always\nhas exactly one button on (HIGOS8 p.24).",...o.parameters?.docs?.description}}};const u=["Columns","Rows","Disabled","DisabledOption","NonePreselected"];export{e as Columns,a as Disabled,n as DisabledOption,o as NonePreselected,s as Rows,u as __namedExportsOrder,l as default};
