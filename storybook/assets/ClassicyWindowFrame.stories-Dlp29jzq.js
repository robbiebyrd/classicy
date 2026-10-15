import{j as e,aj as c,h as d}from"./iframe-B-WGBfYx.js";import"./preload-helper-PPVm8Dsz.js";const r=({title:a="",children:t,className:i,width:s})=>{const o=s!==void 0?{"--classicy-window-frame-width":typeof s=="number"?`${s}px`:s}:void 0;return e.jsxs("div",{className:c("classicyWindowFrame",i),style:o,children:[e.jsx("div",{className:"classicyWindowFrameTitleBar",children:a!==""&&e.jsx("span",{className:"classicyWindowFrameTitleText",children:a})}),e.jsx("div",{className:"classicyWindowFrameBody",children:t})]})};r.__docgenInfo={description:`Presentational Mac OS 8 window frame: title bar (pinstripes + centered
title chip) over a body region. Intentionally decoupled from the window
manager — no appId, no store reads, no dispatches — so it renders anywhere,
including the pre-boot overlay before any app exists.`,methods:[],displayName:"ClassicyWindowFrame",props:{title:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:'""',computed:!1}},children:{required:!0,tsType:{name:"ReactNode"},description:""},className:{required:!1,tsType:{name:"string"},description:""},width:{required:!1,tsType:{name:"union",raw:"string | number",elements:[{name:"string"},{name:"number"}]},description:"Caps the frame's max-width (number → px); content narrower than this stays narrower."}}};const p={title:"SystemResources/WindowFrame",component:r},n={render:()=>e.jsxs(r,{title:"9/11 in Realtime",width:560,children:[e.jsx("h1",{children:"About 9/11 in Realtime"}),e.jsx("p",{children:"A multimedia experiment for teachers. Press the button below to power on."}),e.jsx(d,{onClickFunc:()=>{},children:"POWER ON"})]})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyWindowFrame title="9/11 in Realtime" width={560}>
            <h1>About 9/11 in Realtime</h1>
            <p>
                A multimedia experiment for teachers. Press the button below to power
                on.
            </p>
            <ClassicyButton onClickFunc={() => {}}>POWER ON</ClassicyButton>
        </ClassicyWindowFrame>
}`,...n.parameters?.docs?.source}}};const u=["PowerOn"];export{n as PowerOn,u as __namedExportsOrder,p as default};
