import{ar as k,j as m,h as b}from"./iframe-CWe0op1t.js";import{a as S,C as f}from"./ClassicyAppearanceProbe-BIWSymkt.js";import"./preload-helper-CxPGPiBr.js";const{fn:v}=__STORYBOOK_MODULE_TEST__,T=e=>{const[y,h]=b.useState(e.value);return b.useEffect(()=>h(e.value),[e.value]),m.jsx(k,{...e,value:y,onChangeFunc:g=>{e.onChangeFunc?.(g),h(Number(g.target.value))}})},D={title:"Controls/Slider",component:k,args:{onChangeFunc:v(),onCommitFunc:v()},render:e=>m.jsx(T,{...e})},r={args:{id:"slider-default",labelTitle:"Volume",value:60}},a={args:{id:"slider-value",labelTitle:"Brightness:",labelPosition:"left",value:40,valueLabel:"40 %"}},t={args:{id:"slider-hl",labelTitle:"Bass",value:75,highlighted:!0}},s={args:{id:"slider-disabled",labelTitle:"Treble",value:30,disabled:!0}},i={args:{id:"slider-vertical",labelTitle:"Level",value:55,orientation:"vertical"}},n={args:{id:"slider-ticked-vertical",labelTitle:"Level",value:55,orientation:"vertical",indicatorDirection:"right",tickInterval:25,tickLabels:["Low",null,null,null,"High"],style:{height:160}}},l={args:{id:"slider-nondirectional",labelTitle:"Balance",value:50,indicatorDirection:"nondirectional",tickInterval:"center"}},o={args:{id:"slider-up",labelTitle:"Zoom",value:50,indicatorDirection:"up"}},c={args:{id:"slider-ghost",labelTitle:"Scrub",value:40,ghost:!0}},d={args:{id:"slider-labeled-ticks",labelTitle:"Speed",value:50,tickInterval:25,tickLabels:["Slow",null,null,null,"Fast"]}},p={args:{id:"slider-snap",labelTitle:"Key Repeat",value:40,tickInterval:20,snapToTicks:!0,tickLabels:["Off",null,null,null,null,"Fast"]}},u={args:r.args,render:e=>m.jsx(f,{children:m.jsx(T,{...e})}),parameters:S()};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
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
}`,...a.parameters?.docs?.source},description:{story:"`valueLabel` replaces the numeric readout with custom text; the label sits to the left.",...a.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-hl",
    labelTitle: "Bass",
    value: 75,
    highlighted: true
  }
}`,...t.parameters?.docs?.source},description:{story:"`highlighted` draws the thumb in the theme accent color.",...t.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
    id: "slider-ticked-vertical",
    labelTitle: "Level",
    value: 55,
    orientation: "vertical",
    indicatorDirection: "right",
    tickInterval: 25,
    tickLabels: ["Low", null, null, null, "High"],
    style: {
      height: 160
    }
  }
}`,...n.parameters?.docs?.source},description:{story:`A vertical slider with labeled tick marks: the ticks run beside the track,
the indicator pointing at them, each label beside its tick, and the track
fills the height the slider is given (\`style\`), less its label above and
its value readout below.`,...n.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-nondirectional",
    labelTitle: "Balance",
    value: 50,
    indicatorDirection: "nondirectional",
    tickInterval: "center"
  }
}`,...l.parameters?.docs?.source},description:{story:`A nondirectional (unpointed) knob with a single center tick \u2014 the HIG choice
when direction carries no meaning, as in a balance control.`,...l.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-up",
    labelTitle: "Zoom",
    value: 50,
    indicatorDirection: "up"
  }
}`,...o.parameters?.docs?.source},description:{story:"`indicatorDirection` overrides which way the thumb points.",...o.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-ghost",
    labelTitle: "Scrub",
    value: 40,
    ghost: true
  }
}`,...c.parameters?.docs?.source},description:{story:"`ghost`: drag the thumb to see a translucent copy trail the pointer (the Mac OS 8 ghost indicator).",...c.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-labeled-ticks",
    labelTitle: "Speed",
    value: 50,
    tickInterval: 25,
    tickLabels: ["Slow", null, null, null, "Fast"]
  }
}`,...d.parameters?.docs?.source},description:{story:"Ticks every 25 units with labels at the ends to show the direction of increase.",...d.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-snap",
    labelTitle: "Key Repeat",
    value: 40,
    tickInterval: 20,
    snapToTicks: true,
    tickLabels: ["Off", null, null, null, null, "Fast"]
  }
}`,...p.parameters?.docs?.source},description:{story:"`snapToTicks` makes the tick interval the step, so the thumb only rests on a tick.",...p.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicySlider>) => <ClassicyAppearanceProbe>
            <LiveSlider {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...u.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...u.parameters?.docs?.description}}};const I=["Default","WithValueLabel","Highlighted","Disabled","Vertical","TickedVertical","NondirectionalKnob","UpwardIndicator","GhostIndicator","LabeledTicks","SnapToTicks","AppearanceHooks"];export{u as AppearanceHooks,r as Default,s as Disabled,c as GhostIndicator,t as Highlighted,d as LabeledTicks,l as NondirectionalKnob,p as SnapToTicks,n as TickedVertical,o as UpwardIndicator,i as Vertical,a as WithValueLabel,I as __namedExportsOrder,D as default};
