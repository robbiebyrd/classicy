import{aY as v,j as u,r as g}from"./iframe-BVrgAG4n.js";import{a as S,C as y}from"./ClassicyAppearanceProbe-vq_yGkDk.js";import"./preload-helper-shce2T3m.js";const{fn:b}=__STORYBOOK_MODULE_TEST__,T=e=>{const[k,m]=g.useState(e.value);return g.useEffect(()=>m(e.value),[e.value]),u.jsx(v,{...e,value:k,onChangeFunc:h=>{e.onChangeFunc?.(h),m(Number(h.target.value))}})},C={title:"Controls/Slider",component:v,args:{onChangeFunc:b(),onCommitFunc:b()},render:e=>u.jsx(T,{...e})},r={args:{id:"slider-default",labelTitle:"Volume",value:60}},a={args:{id:"slider-value",labelTitle:"Brightness:",labelPosition:"left",value:40,valueLabel:"40 %"}},s={args:{id:"slider-hl",labelTitle:"Bass",value:75,highlighted:!0}},t={args:{id:"slider-disabled",labelTitle:"Treble",value:30,disabled:!0}},n={args:{id:"slider-vertical",labelTitle:"Level",value:55,orientation:"vertical"}},i={args:{id:"slider-nondirectional",labelTitle:"Balance",value:50,indicatorDirection:"nondirectional",tickInterval:"center"}},o={args:{id:"slider-up",labelTitle:"Zoom",value:50,indicatorDirection:"up"}},l={args:{id:"slider-ghost",labelTitle:"Scrub",value:40,ghost:!0}},c={args:{id:"slider-labeled-ticks",labelTitle:"Speed",value:50,tickInterval:25,tickLabels:["Slow",null,null,null,"Fast"]}},d={args:{id:"slider-snap",labelTitle:"Key Repeat",value:40,tickInterval:20,snapToTicks:!0,tickLabels:["Off",null,null,null,null,"Fast"]}},p={args:r.args,render:e=>u.jsx(y,{children:u.jsx(T,{...e})}),parameters:S()};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-default",
    labelTitle: "Volume",
    value: 60
  }
}`,...r.parameters?.docs?.source},description:{story:"A horizontal slider with a downward-pointing indicator and a value readout.\n`onChangeFunc` fires while dragging; `onCommitFunc` once on release.",...r.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-value",
    labelTitle: "Brightness:",
    labelPosition: "left",
    value: 40,
    valueLabel: "40 %"
  }
}`,...a.parameters?.docs?.source},description:{story:"`valueLabel` replaces the numeric readout with custom text; the label sits to the left.",...a.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-hl",
    labelTitle: "Bass",
    value: 75,
    highlighted: true
  }
}`,...s.parameters?.docs?.source},description:{story:"`highlighted` draws the thumb in the theme accent colour.",...s.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-disabled",
    labelTitle: "Treble",
    value: 30,
    disabled: true
  }
}`,...t.parameters?.docs?.source},description:{story:"A disabled slider: the thumb cannot move and the label is dimmed.",...t.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-vertical",
    labelTitle: "Level",
    value: 55,
    orientation: "vertical"
  }
}`,...n.parameters?.docs?.source},description:{story:'`orientation="vertical"` tracks bottom to top, with a left-pointing indicator by default.',...n.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-nondirectional",
    labelTitle: "Balance",
    value: 50,
    indicatorDirection: "nondirectional",
    tickInterval: "center"
  }
}`,...i.parameters?.docs?.source},description:{story:`A nondirectional (unpointed) knob with a single centre tick — the HIG choice
when direction carries no meaning, as in a balance control.`,...i.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-up",
    labelTitle: "Zoom",
    value: 50,
    indicatorDirection: "up"
  }
}`,...o.parameters?.docs?.source},description:{story:"`indicatorDirection` overrides which way the thumb points.",...o.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-ghost",
    labelTitle: "Scrub",
    value: 40,
    ghost: true
  }
}`,...l.parameters?.docs?.source},description:{story:"`ghost`: drag the thumb to see a translucent copy trail the pointer (the Mac OS 8 ghost indicator).",...l.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
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
}`,...d.parameters?.docs?.source},description:{story:"`snapToTicks` makes the tick interval the step, so the thumb only rests on a tick.",...d.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicySlider>) => <ClassicyAppearanceProbe>
            <LiveSlider {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...p.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...p.parameters?.docs?.description}}};const D=["Default","WithValueLabel","Highlighted","Disabled","Vertical","NondirectionalKnob","UpwardIndicator","GhostIndicator","LabeledTicks","SnapToTicks","AppearanceHooks"];export{p as AppearanceHooks,r as Default,t as Disabled,l as GhostIndicator,s as Highlighted,c as LabeledTicks,i as NondirectionalKnob,d as SnapToTicks,o as UpwardIndicator,n as Vertical,a as WithValueLabel,D as __namedExportsOrder,C as default};
