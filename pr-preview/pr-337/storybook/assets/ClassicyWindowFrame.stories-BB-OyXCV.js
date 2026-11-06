import{aD as s,j as e,b as i}from"./iframe-CMgUvlJG.js";import"./preload-helper-_lQqnong.js";const a={title:"Desktop/WindowFrame",component:s},t={render:()=>e.jsxs(s,{title:"9/11 in Realtime",width:560,children:[e.jsx("h1",{children:"About 9/11 in Realtime"}),e.jsx("p",{children:"A multimedia experiment for teachers. Press the button below to power on."}),e.jsx(i,{onClickFunc:()=>{},children:"POWER ON"})]})},r={render:()=>e.jsx(s,{width:360,children:e.jsx("p",{children:"A frame with no title."})})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyWindowFrame title="9/11 in Realtime" width={560}>
            <h1>About 9/11 in Realtime</h1>
            <p>
                A multimedia experiment for teachers. Press the button below to power
                on.
            </p>
            <ClassicyButton onClickFunc={() => {}}>POWER ON</ClassicyButton>
        </ClassicyWindowFrame>
}`,...t.parameters?.docs?.source},description:{story:"The frame as a `preBootScreen` uses it: a titled, store-free window holding a\npower-on prompt. `width` caps the frame's width; narrower content stays\nnarrower.",...t.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyWindowFrame width={360}>
            <p>A frame with no title.</p>
        </ClassicyWindowFrame>
}`,...r.parameters?.docs?.source},description:{story:"Without a `title` the title bar is pinstripes only, with no title chip.",...r.parameters?.docs?.description}}};const c=["PowerOn","Untitled"];export{t as PowerOn,r as Untitled,c as __namedExportsOrder,a as default};
