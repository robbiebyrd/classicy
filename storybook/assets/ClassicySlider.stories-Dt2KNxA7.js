import{al as b,j as g,i as m}from"./iframe-WYk6qwlt.js";import"./preload-helper-PPVm8Dsz.js";const{fn:h}=__STORYBOOK_MODULE_TEST__,T=e=>{const[v,u]=m.useState(e.value);return m.useEffect(()=>u(e.value),[e.value]),g.jsx(b,{...e,value:v,onChangeFunc:p=>{e.onChangeFunc?.(p),u(Number(p.target.value))}})},f={title:"Controls/Slider",component:b,args:{onChangeFunc:h(),onCommitFunc:h()},render:e=>g.jsx(T,{...e})},a={args:{id:"slider-default",labelTitle:"Volume",value:60}},r={args:{id:"slider-value",labelTitle:"Brightness:",labelPosition:"left",value:40,valueLabel:"40 %"}},t={args:{id:"slider-hl",labelTitle:"Bass",value:75,highlighted:!0}},s={args:{id:"slider-disabled",labelTitle:"Treble",value:30,disabled:!0}},i={args:{id:"slider-vertical",labelTitle:"Level",value:55,orientation:"vertical"}},n={args:{id:"slider-nondirectional",labelTitle:"Balance",value:50,indicatorDirection:"nondirectional",tickInterval:"center"}},l={args:{id:"slider-up",labelTitle:"Zoom",value:50,indicatorDirection:"up"}},o={args:{id:"slider-ghost",labelTitle:"Scrub",value:40,ghost:!0}},c={args:{id:"slider-labeled-ticks",labelTitle:"Speed",value:50,tickInterval:25,tickLabels:["Slow",null,null,null,"Fast"]}},d={args:{id:"slider-snap",labelTitle:"Key Repeat",value:40,tickInterval:20,snapToTicks:!0,tickLabels:["Off",null,null,null,null,"Fast"]}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-default",
    labelTitle: "Volume",
    value: 60
  }
}`,...a.parameters?.docs?.source},description:{story:"A horizontal slider with a downward-pointing indicator and a value readout.\n`onChangeFunc` fires while dragging; `onCommitFunc` once on release.",...a.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-value",
    labelTitle: "Brightness:",
    labelPosition: "left",
    value: 40,
    valueLabel: "40 %"
  }
}`,...r.parameters?.docs?.source},description:{story:"`valueLabel` replaces the numeric readout with custom text; the label sits to the left.",...r.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-hl",
    labelTitle: "Bass",
    value: 75,
    highlighted: true
  }
}`,...t.parameters?.docs?.source},description:{story:"`highlighted` draws the thumb in the theme accent colour.",...t.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-disabled",
    labelTitle: "Treble",
    value: 30,
    disabled: true
  }
}`,...s.parameters?.docs?.source},description:{story:"A disabled slider: the thumb cannot move and the label is dimmed.",...s.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-vertical",
    labelTitle: "Level",
    value: 55,
    orientation: "vertical"
  }
}`,...i.parameters?.docs?.source},description:{story:'`orientation="vertical"` tracks bottom to top, with a left-pointing indicator by default.',...i.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-nondirectional",
    labelTitle: "Balance",
    value: 50,
    indicatorDirection: "nondirectional",
    tickInterval: "center"
  }
}`,...n.parameters?.docs?.source},description:{story:`A nondirectional (unpointed) knob with a single centre tick — the HIG choice
when direction carries no meaning, as in a balance control.`,...n.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-up",
    labelTitle: "Zoom",
    value: 50,
    indicatorDirection: "up"
  }
}`,...l.parameters?.docs?.source},description:{story:"`indicatorDirection` overrides which way the thumb points.",...l.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-ghost",
    labelTitle: "Scrub",
    value: 40,
    ghost: true
  }
}`,...o.parameters?.docs?.source},description:{story:"`ghost`: drag the thumb to see a translucent copy trail the pointer (the Mac OS 8 ghost indicator).",...o.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-labeled-ticks",
    labelTitle: "Speed",
    value: 50,
    tickInterval: 25,
    tickLabels: ["Slow", null, null, null, "Fast"]
  }
}`,...c.parameters?.docs?.source},description:{story:"Ticks every 25 units with labels at the ends to show the direction of increase.",...c.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-snap",
    labelTitle: "Key Repeat",
    value: 40,
    tickInterval: 20,
    snapToTicks: true,
    tickLabels: ["Off", null, null, null, null, "Fast"]
  }
}`,...d.parameters?.docs?.source},description:{story:"`snapToTicks` makes the tick interval the step, so the thumb only rests on a tick.",...d.parameters?.docs?.description}}};const y=["Default","WithValueLabel","Highlighted","Disabled","Vertical","NondirectionalKnob","UpwardIndicator","GhostIndicator","LabeledTicks","SnapToTicks"];export{a as Default,s as Disabled,o as GhostIndicator,t as Highlighted,c as LabeledTicks,n as NondirectionalKnob,d as SnapToTicks,l as UpwardIndicator,i as Vertical,r as WithValueLabel,y as __namedExportsOrder,f as default};
