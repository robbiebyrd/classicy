import{j as e,aD as d,b as l}from"./iframe-DRvUV-1o.js";import"./preload-helper-PPVm8Dsz.js";const r=({title:i="",children:o,className:a,width:t})=>{const c=t!==void 0?{"--classicy-window-frame-width":typeof t=="number"?`${t}px`:t}:void 0;return e.jsxs("div",{className:d("classicyWindowFrame",a),style:c,children:[e.jsx("div",{className:"classicyWindowFrameTitleBar",children:i!==""&&e.jsx("span",{className:"classicyWindowFrameTitleText",children:i})}),e.jsx("div",{className:"classicyWindowFrameBody",children:o})]})};r.__docgenInfo={description:`Presentational Mac OS 8 window frame: title bar (pinstripes + centered
title chip) over a body region. Intentionally decoupled from the window
manager — no appId, no store reads, no dispatches — so it renders anywhere,
including the pre-boot overlay before any app exists.

Use it for window-looking chrome outside a running desktop, such as a
\`ClassicyDesktop\` \`preBootScreen\`. It has no close, zoom or collapse box and
cannot be moved, resized or focused; inside an app, use \`ClassicyWindow\`.

\`\`\`tsx
<ClassicyDesktop
  preBootScreen={(powerOn) => (
    <ClassicyWindowFrame title="Welcome" width={480}>
      <ClassicyButton onClickFunc={powerOn}>Power On</ClassicyButton>
    </ClassicyWindowFrame>
  )}
/>
\`\`\``,methods:[],displayName:"ClassicyWindowFrame",props:{title:{required:!1,tsType:{name:"string"},description:"Text in the centred title chip. Omitted or empty, the title bar shows only pinstripes.",defaultValue:{value:'""',computed:!1}},children:{required:!0,tsType:{name:"ReactNode"},description:"Body content, rendered below the title bar."},className:{required:!1,tsType:{name:"string"},description:"Extra class names for the outer frame element."},width:{required:!1,tsType:{name:"union",raw:"string | number",elements:[{name:"string"},{name:"number"}]},description:"Caps the frame's max-width (number → px); content narrower than this stays narrower."}}};const w={title:"Desktop/WindowFrame",component:r},n={render:()=>e.jsxs(r,{title:"9/11 in Realtime",width:560,children:[e.jsx("h1",{children:"About 9/11 in Realtime"}),e.jsx("p",{children:"A multimedia experiment for teachers. Press the button below to power on."}),e.jsx(l,{onClickFunc:()=>{},children:"POWER ON"})]})},s={render:()=>e.jsx(r,{width:360,children:e.jsx("p",{children:"A frame with no title."})})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyWindowFrame title="9/11 in Realtime" width={560}>
            <h1>About 9/11 in Realtime</h1>
            <p>
                A multimedia experiment for teachers. Press the button below to power
                on.
            </p>
            <ClassicyButton onClickFunc={() => {}}>POWER ON</ClassicyButton>
        </ClassicyWindowFrame>
}`,...n.parameters?.docs?.source},description:{story:"The frame as a `preBootScreen` uses it: a titled, store-free window holding a\npower-on prompt. `width` caps the frame's width; narrower content stays\nnarrower.",...n.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyWindowFrame width={360}>
            <p>A frame with no title.</p>
        </ClassicyWindowFrame>
}`,...s.parameters?.docs?.source},description:{story:"Without a `title` the title bar is pinstripes only, with no title chip.",...s.parameters?.docs?.description}}};const h=["PowerOn","Untitled"];export{n as PowerOn,s as Untitled,h as __namedExportsOrder,w as default};
