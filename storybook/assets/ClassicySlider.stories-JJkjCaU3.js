import{R as d}from"./iframe-vZaki-5d.js";import"./preload-helper-PPVm8Dsz.js";const{fn:c}=__STORYBOOK_MODULE_TEST__,m={title:"Controls/Slider",component:d,args:{onChangeFunc:c(),onCommitFunc:c()}},e={args:{id:"slider-default",labelTitle:"Volume",value:60}},a={args:{id:"slider-value",labelTitle:"Brightness:",labelPosition:"left",value:40,valueLabel:"40 %"}},r={args:{id:"slider-hl",labelTitle:"Bass",value:75,highlighted:!0}},l={args:{id:"slider-disabled",labelTitle:"Treble",value:30,disabled:!0}},s={args:{id:"slider-vertical",labelTitle:"Level",value:55,orientation:"vertical"}},i={args:{id:"slider-nondirectional",labelTitle:"Balance",value:50,indicatorDirection:"nondirectional",tickInterval:"center"}},t={args:{id:"slider-up",labelTitle:"Zoom",value:50,indicatorDirection:"up"}},n={args:{id:"slider-ghost",labelTitle:"Scrub",value:40,ghost:!0}},o={args:{id:"slider-labeled-ticks",labelTitle:"Speed",value:50,tickInterval:25,tickLabels:["Slow",null,null,null,"Fast"]}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-default",
    labelTitle: "Volume",
    value: 60
  }
}`,...e.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-value",
    labelTitle: "Brightness:",
    labelPosition: "left",
    value: 40,
    valueLabel: "40 %"
  }
}`,...a.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-hl",
    labelTitle: "Bass",
    value: 75,
    highlighted: true
  }
}`,...r.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-disabled",
    labelTitle: "Treble",
    value: 30,
    disabled: true
  }
}`,...l.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-vertical",
    labelTitle: "Level",
    value: 55,
    orientation: "vertical"
  }
}`,...s.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-nondirectional",
    labelTitle: "Balance",
    value: 50,
    indicatorDirection: "nondirectional",
    tickInterval: "center"
  }
}`,...i.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-up",
    labelTitle: "Zoom",
    value: 50,
    indicatorDirection: "up"
  }
}`,...t.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-ghost",
    labelTitle: "Scrub",
    value: 40,
    ghost: true
  }
}`,...n.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-labeled-ticks",
    labelTitle: "Speed",
    value: 50,
    tickInterval: 25,
    tickLabels: ["Slow", null, null, null, "Fast"]
  }
}`,...o.parameters?.docs?.source}}};const g=["Default","WithValueLabel","Highlighted","Disabled","Vertical","NondirectionalKnob","UpwardIndicator","GhostIndicator","LabeledTicks"];export{e as Default,l as Disabled,n as GhostIndicator,r as Highlighted,o as LabeledTicks,i as NondirectionalKnob,t as UpwardIndicator,s as Vertical,a as WithValueLabel,g as __namedExportsOrder,m as default};
