import{s as c,i,j as s,q as u,m as d}from"./iframe-u6CF_fLd.js";import"./preload-helper-shce2T3m.js";const{fn:m}=__STORYBOOK_MODULE_TEST__,v=e=>{const[p,l]=i.useState(e.value);return i.useEffect(()=>l(e.value),[e.value]),s.jsx(c,{...e,value:p,onChange:o=>{e.onChange(o),l(o)}})},g=({children:e})=>s.jsx("div",{style:{display:"inline-block",border:"1px solid var(--color-black)",background:"var(--color-system-03)",boxShadow:"inset 1px 1px 0 0 var(--color-white)"},children:e}),b={title:"Controls/PopUpSlider",component:c,args:{ariaLabel:"Volume",value:60,onChange:m()},render:e=>s.jsx(g,{children:s.jsx(v,{...e})})},r={},t={args:{ariaLabel:"Level",value:4,min:0,max:10,step:1}},a={args:{disabled:!0}},n={render:e=>{const[p,l]=i.useState(e.value);return s.jsx(u,{mode:"popup",popupArrow:"small",popupDirection:"vertical",popupAlign:"center","aria-label":"Volume",icon:p===0?d.system.controlStrip.soundOff:d.system.controlStrip.sound,popupContent:s.jsx(c,{...e,value:p,onChange:o=>{e.onChange(o),l(o)}})})}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:"{}",...r.parameters?.docs?.source},description:{story:`The bare slider in a stand-in pop-up frame. Drag the thumb or click the
track; once focused, Up/Down step by one, Page Up/Down by ten and Home/End
jump to the ends.`,...r.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    ariaLabel: "Level",
    value: 4,
    min: 0,
    max: 10,
    step: 1
  }
}`,...t.parameters?.docs?.source},description:{story:"A coarser 0–10 scale: `step` snaps dragging and the arrow keys to whole steps.",...t.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true
  }
}`,...a.parameters?.docs?.source},description:{story:"A disabled slider is dimmed, out of the tab order, and ignores the mouse.",...a.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [level, setLevel] = useState(args.value);
    return <ClassicyBevelButton mode="popup" popupArrow="small" popupDirection="vertical" popupAlign="center" aria-label="Volume" icon={level === 0 ? ClassicyIcons.system.controlStrip.soundOff : ClassicyIcons.system.controlStrip.sound} popupContent={<ClassicyPopUpSlider {...args} value={level} onChange={next => {
      args.onChange(next);
      setLevel(next);
    }} />} />;
  }
}`,...n.parameters?.docs?.source},description:{story:"HIGOS8 Figure 2-16: the slider as a pop-up bevel button's `popupContent` —\nhow the Control Strip's Sound module sets the system volume. Click the\nspeaker to open it; the speaker loses its waves at zero.",...n.parameters?.docs?.description}}};const y=["Standalone","CustomRange","Disabled","InBevelButton"];export{t as CustomRange,a as Disabled,n as InBevelButton,r as Standalone,y as __namedExportsOrder,b as default};
