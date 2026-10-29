import{af as o}from"./iframe-B6HMBbFC.js";import"./preload-helper-shce2T3m.js";const l={title:"Controls/ProgressBar",component:o,argTypes:{labelAlign:{control:"select",options:["left","center","right"]}}},e={args:{value:59}},r={args:{indeterminate:!0}},a={args:{value:33,label:"Copying files…"}},s={args:{value:33,label:"Copying files…",labelAlign:"center"}},t={args:{chasingArrows:!0,label:"Connecting…"}},n={args:{indeterminate:!0,autoSwitch:!0,value:45,label:"Downloading…"}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    value: 59
  }
}`,...e.parameters?.docs?.source},description:{story:"A determinate bar 59% of the way through a task of known length.",...e.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    indeterminate: true
  }
}`,...r.parameters?.docs?.source},description:{story:"The striped barber-pole bar, for work whose length is not yet known.",...r.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    value: 33,
    label: "Copying files…"
  }
}`,...a.parameters?.docs?.source},description:{story:"A status label above the bar, as in a Finder copy window.",...a.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    value: 33,
    label: "Copying files…",
    labelAlign: "center"
  }
}`,...s.parameters?.docs?.source},description:{story:'`labelAlign="center"` centres the label over the bar.',...s.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    chasingArrows: true,
    label: "Connecting…"
  }
}`,...t.parameters?.docs?.source},description:{story:"`chasingArrows` replaces the bar with the small spinning arrows used for background work.",...t.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    indeterminate: true,
    autoSwitch: true,
    value: 45,
    label: "Downloading…"
  }
}`,...n.parameters?.docs?.source},description:{story:"`autoSwitch`: the `indeterminate` flag stays set, but a known `value` flips it\nto a filling determinate bar — the HIG's switch once a task's scope is known.",...n.parameters?.docs?.description}}};const p=["Determinate","Indeterminate","WithLabel","CenteredLabel","ChasingArrows","AutoSwitchToDeterminate"];export{n as AutoSwitchToDeterminate,s as CenteredLabel,t as ChasingArrows,e as Determinate,r as Indeterminate,a as WithLabel,p as __namedExportsOrder,l as default};
