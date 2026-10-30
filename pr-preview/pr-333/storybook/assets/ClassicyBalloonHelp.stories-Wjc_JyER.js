import{U as l,j as e,J as r,r as d,V as c}from"./iframe-CD_V_p1y.js";import"./preload-helper-shce2T3m.js";const u={title:"Controls/BalloonHelp",component:l},t={args:{title:"Do Nothing",content:"Hover for 600ms to see this Mac OS 8-style help balloon.",position:"top-left",children:e.jsx(r,{isDefault:!0,children:"Hover Me"})},decorators:[o=>e.jsx("div",{style:{paddingTop:"8em",paddingLeft:"2em"},children:e.jsx(o,{})})]},n={args:{content:"Balloons can point in six directions.",position:"bottom-center",delay:200,children:e.jsx(r,{children:"Quick Balloon"})},decorators:[o=>e.jsx("div",{style:{padding:"2em 6em 10em"},children:e.jsx(o,{})})]},p=()=>{const o=d.useRef(null),{handlers:a,balloon:i}=c(o,{title:"Pinned Badge",content:"This element is absolutely positioned; the hook adds no wrapper.",position:"top-right",delay:300});return e.jsx("div",{style:{position:"relative",width:320,height:160},children:e.jsxs("div",{ref:o,...a,style:{position:"absolute",right:16,bottom:16,padding:"4px 8px",border:"1px solid var(--color-black)",background:"var(--color-white)"},children:["Hover me",i]})})},s={render:()=>e.jsx(p,{})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Do Nothing",
    content: "Hover for 600ms to see this Mac OS 8-style help balloon.",
    position: "top-left",
    children: <ClassicyButton isDefault={true}>Hover Me</ClassicyButton>
  },
  decorators: [Story => <div style={{
    paddingTop: "8em",
    paddingLeft: "2em"
  }}>
                <Story />
            </div>]
}`,...t.parameters?.docs?.source},description:{story:"A titled balloon at the default `top-left` position and 600 ms delay: rest\nthe pointer on the button until it appears, move away to dismiss it.",...t.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    content: "Balloons can point in six directions.",
    position: "bottom-center",
    delay: 200,
    children: <ClassicyButton>Quick Balloon</ClassicyButton>
  },
  decorators: [Story => <div style={{
    padding: "2em 6em 10em"
  }}>
                <Story />
            </div>]
}`,...n.parameters?.docs?.source},description:{story:"An untitled balloon pointing up from below (`bottom-center`) with a short\n200 ms `delay`. Balloons can open in six positions, and flip on either\naxis when the preferred one has no room on screen.",...n.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <HookTarget />
}`,...s.parameters?.docs?.source},description:{story:"`useClassicyBalloonHelp(ref, config)` attaches the same behaviour to an\nelement you already own \u2014 here an absolutely positioned badge that the\ncomponent's inline-block wrapper would disturb. Spread `handlers` onto the\nelement and render `balloon` inside it.",...s.parameters?.docs?.description}}};const y=["Default","BottomCenter","WithHook"];export{n as BottomCenter,t as Default,s as WithHook,y as __namedExportsOrder,u as default};
