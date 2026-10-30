import{M as n,j as e,i,b as d}from"./iframe-CR3HpChd.js";import"./preload-helper-PPVm8Dsz.js";const m={title:"System/CrashScreen",component:n,parameters:{layout:"fullscreen"}},t=()=>{throw new Error("Storybook demo crash — this error is intentional.")},r={render:()=>e.jsx(n,{children:e.jsx(t,{})})},s={render:()=>e.jsx(n,{children:e.jsx("p",{children:"Everything is fine. The crash screen only appears on an error."})})},h=()=>{const[o,c]=i.useState(!1);return e.jsxs(e.Fragment,{children:[o&&e.jsx(t,{}),e.jsx(d,{onClickFunc:()=>c(!0),children:"Crash the System"})]})},a={render:()=>e.jsx(n,{children:e.jsx(h,{})})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyCrashScreen>
            <Bomb />
        </ClassicyCrashScreen>
}`,...r.parameters?.docs?.source},description:{story:`A child that throws on render, so the boundary shows the Sad Mac at once.
Clicking it or pressing any key reloads the iframe.

In dev mode React logs the caught error to the console and Vite may flash
an overlay — dismiss it; the built static Storybook shows only the Sad Mac.`,...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyCrashScreen>
            <p>Everything is fine. The crash screen only appears on an error.</p>
        </ClassicyCrashScreen>
}`,...s.parameters?.docs?.source},description:{story:`Nothing throws, so the boundary is invisible: its children render as-is and
key presses do not reload the page.`,...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyCrashScreen>
            <CrashButton />
        </ClassicyCrashScreen>
}`,...a.parameters?.docs?.source},description:{story:`A crash triggered after mount: the button sets state that renders a
throwing child, and the boundary swaps the tree for the Sad Mac. (Throwing
directly inside the click handler would not be caught — error boundaries
only catch render and lifecycle errors.)`,...a.parameters?.docs?.description}}};const y=["Crashed","Healthy","CrashOnDemand"];export{a as CrashOnDemand,r as Crashed,s as Healthy,y as __namedExportsOrder,m as default};
