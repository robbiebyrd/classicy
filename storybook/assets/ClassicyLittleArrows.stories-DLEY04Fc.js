import{a1 as n,i as d,j as t}from"./iframe-DhcYsc0e.js";import"./preload-helper-PPVm8Dsz.js";const{fn:u}=__STORYBOOK_MODULE_TEST__,v={title:"Controls/LittleArrows",component:n,args:{onStep:u()}},e={},r={args:{disabled:!0}},s={render:a=>{const[i,l]=d.useState(5);return t.jsxs("div",{className:"classicyLittleArrowsGroup",children:[t.jsx("span",{style:{minWidth:24,textAlign:"right"},children:i}),t.jsx(n,{...a,upLabel:"Increase value",downLabel:"Decrease value",onStep:(o,c)=>{a.onStep(o,c),l(p=>Math.min(99,Math.max(0,p+o)))}})]})}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:"{}",...e.parameters?.docs?.source},description:{story:"The bare arrow pair. Press an arrow to fire `onStep` once, then repeatedly while held.",...e.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true
  }
}`,...r.parameters?.docs?.source},description:{story:"Both arrows natively disabled: they leave the tab order and `onStep` never fires.",...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState(5);
    return <div className="classicyLittleArrowsGroup">
                <span style={{
        minWidth: 24,
        textAlign: "right"
      }}>{value}</span>
                <ClassicyLittleArrows {...args} upLabel="Increase value" downLabel="Decrease value" onStep={(direction, heldMs) => {
        args.onStep(direction, heldMs);
        setValue(v => Math.min(99, Math.max(0, v + direction)));
      }} />
            </div>;
  }
}`,...s.parameters?.docs?.source},description:{story:"The HIG pairs little arrows with the content they change (p.35). Wrapping\nboth in `classicyLittleArrowsGroup` gives the standard spacing; click to step\nby one, or hold to repeat. The value (clamped to 0–99) lives in the caller.",...s.parameters?.docs?.description}}};const g=["Default","Disabled","WithValue"];export{e as Default,r as Disabled,s as WithValue,g as __namedExportsOrder,v as default};
