import{aq as T,j as m,h as v}from"./iframe-s_8J4wFG.js";import{a as f,C as w}from"./ClassicyAppearanceProbe-cMCmABWY.js";import"./preload-helper-DhQH6ajB.js";const{fn:k}=__STORYBOOK_MODULE_TEST__,y=e=>{const[S,g]=v.useState(e.value);return v.useEffect(()=>g(e.value),[e.value]),m.jsx(T,{...e,value:S,onChangeFunc:b=>{e.onChangeFunc?.(b),g(Number(b.target.value))}})},C={title:"Controls/Slider",component:T,args:{onChangeFunc:k(),onCommitFunc:k()},render:e=>m.jsx(y,{...e})},a={args:{id:"slider-default",labelTitle:"Volume",value:60}},r={args:{id:"slider-value",labelTitle:"Brightness:",labelPosition:"left",value:40,valueLabel:"40 %"}},t={args:{id:"slider-hl",labelTitle:"Bass",value:75,highlighted:!0}},i={args:{id:"slider-disabled",labelTitle:"Treble",value:30,disabled:!0}},n={args:{id:"slider-vertical",labelTitle:"Level",value:55,orientation:"vertical"}},s={args:{id:"slider-ticked-vertical",labelTitle:"Level",value:55,orientation:"vertical",indicatorDirection:"right",tickInterval:25,tickLabels:["Low",null,null,null,"High"],style:{height:160}}},o={args:{id:"slider-nondirectional",labelTitle:"Balance",value:50,indicatorDirection:"nondirectional",tickInterval:"center"}},l={args:{id:"slider-nondirectional-vertical",labelTitle:"Fade",value:50,orientation:"vertical",indicatorDirection:"nondirectional",tickInterval:"center",style:{height:160}}},c={args:{id:"slider-up",labelTitle:"Zoom",value:50,indicatorDirection:"up"}},d={args:{id:"slider-ghost",labelTitle:"Scrub",value:40,ghost:!0}},u={args:{id:"slider-labeled-ticks",labelTitle:"Speed",value:50,tickInterval:25,tickLabels:["Slow",null,null,null,"Fast"]}},p={args:{id:"slider-snap",labelTitle:"Key Repeat",value:40,tickInterval:20,snapToTicks:!0,tickLabels:["Off",null,null,null,null,"Fast"]}},h={args:a.args,render:e=>m.jsx(w,{children:m.jsx(y,{...e})}),parameters:f()};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
}`,...t.parameters?.docs?.source},description:{story:"`highlighted` draws the thumb in the theme accent color.",...t.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-disabled",
    labelTitle: "Treble",
    value: 30,
    disabled: true
  }
}`,...i.parameters?.docs?.source},description:{story:"A disabled slider: the thumb cannot move and the label is dimmed.",...i.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-vertical",
    labelTitle: "Level",
    value: 55,
    orientation: "vertical"
  }
}`,...n.parameters?.docs?.source},description:{story:'`orientation="vertical"` tracks bottom to top, with a left-pointing indicator by default.',...n.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
}`,...s.parameters?.docs?.source},description:{story:`A vertical slider with labeled tick marks: the ticks run beside the track,
the indicator pointing at them, each label beside its tick, and the track
fills the height the slider is given (\`style\`), less its label above and
its value readout below.`,...s.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-nondirectional",
    labelTitle: "Balance",
    value: 50,
    indicatorDirection: "nondirectional",
    tickInterval: "center"
  }
}`,...o.parameters?.docs?.source},description:{story:`A nondirectional (unpointed) knob with a single center tick \u2014 the HIG choice
when direction carries no meaning, as in a balance control.`,...o.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-nondirectional-vertical",
    labelTitle: "Fade",
    value: 50,
    orientation: "vertical",
    indicatorDirection: "nondirectional",
    tickInterval: "center",
    style: {
      height: 160
    }
  }
}`,...l.parameters?.docs?.source},description:{story:`The nondirectional knob on a vertical slider, turned to lie across its
track, with its center tick beside it.`,...l.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-up",
    labelTitle: "Zoom",
    value: 50,
    indicatorDirection: "up"
  }
}`,...c.parameters?.docs?.source},description:{story:"`indicatorDirection` overrides which way the thumb points.",...c.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-ghost",
    labelTitle: "Scrub",
    value: 40,
    ghost: true
  }
}`,...d.parameters?.docs?.source},description:{story:'`ghost`: drag the thumb to see the Mac OS 8 ghost indicator, a translucent\ncopy that follows the pointer. Under Platinum (`layout.slider.thumbDrag:\n"onRelease"`) the indicator stays put meanwhile and the value changes on\nrelease; under a package that drags live, both follow the pointer.',...d.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-labeled-ticks",
    labelTitle: "Speed",
    value: 50,
    tickInterval: 25,
    tickLabels: ["Slow", null, null, null, "Fast"]
  }
}`,...u.parameters?.docs?.source},description:{story:"Ticks every 25 units with labels at the ends to show the direction of increase.",...u.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    id: "slider-snap",
    labelTitle: "Key Repeat",
    value: 40,
    tickInterval: 20,
    snapToTicks: true,
    tickLabels: ["Off", null, null, null, null, "Fast"]
  }
}`,...p.parameters?.docs?.source},description:{story:"`snapToTicks` makes the tick interval the step, so the thumb only rests on a tick.",...p.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicySlider>) => <ClassicyAppearanceProbe>
            <LiveSlider {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...h.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...h.parameters?.docs?.description}}};const F=["Default","WithValueLabel","Highlighted","Disabled","Vertical","TickedVertical","NondirectionalKnob","NondirectionalVertical","UpwardIndicator","GhostIndicator","LabeledTicks","SnapToTicks","AppearanceHooks"];export{h as AppearanceHooks,a as Default,i as Disabled,d as GhostIndicator,t as Highlighted,u as LabeledTicks,o as NondirectionalKnob,l as NondirectionalVertical,p as SnapToTicks,s as TickedVertical,c as UpwardIndicator,n as Vertical,r as WithValueLabel,F as __namedExportsOrder,C as default};
