import{P as o,r as d,j as r}from"./iframe-C-KCwMsw.js";import"./preload-helper-PPVm8Dsz.js";const{fn:p}=__STORYBOOK_MODULE_TEST__,g={title:"Controls/LittleArrows",component:o,args:{onStep:p()}},e={},s={args:{disabled:!0}},a={render:t=>{const[l,c]=d.useState(5);return r.jsxs("div",{className:"classicyLittleArrowsGroup",children:[r.jsx("span",{style:{minWidth:24,textAlign:"right"},children:l}),r.jsx(o,{...t,upLabel:"Increase value",downLabel:"Decrease value",onStep:(n,i)=>{t.onStep(n,i),c(u=>Math.min(99,Math.max(0,u+n)))}})]})}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:"{}",...e.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true
  }
}`,...s.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
}`,...a.parameters?.docs?.source}}};const v=["Default","Disabled","WithValue"];export{e as Default,s as Disabled,a as WithValue,v as __namedExportsOrder,g as default};
