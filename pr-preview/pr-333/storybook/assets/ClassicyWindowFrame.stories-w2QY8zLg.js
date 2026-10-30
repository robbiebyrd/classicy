import{j as e,bj as l,b5 as m,J as p}from"./iframe-CQ2j-hJA.js";import"./preload-helper-shce2T3m.js";const r=({title:o="",children:i,className:a,style:d,width:s})=>{const c=s!==void 0?{"--classicy-window-frame-width":typeof s=="number"?`${s}px`:s}:void 0;return e.jsxs("div",{className:m("classicyWindowFrame",a),style:{...c,...d},children:[e.jsx(l,{title:o,hideIcon:!0}),e.jsx("div",{className:"classicyWindowFrameBody",children:i})]})};r.__docgenInfo={description:`Presentational Mac OS 8 window frame: the window's title bar
(\`ClassicyWindowTitleBar\`, without control boxes or icon) over a body region. Intentionally decoupled from the window
manager \u2014 no appId, no store reads, no dispatches \u2014 so it renders anywhere,
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
\`\`\``,methods:[],displayName:"ClassicyWindowFrame",props:{title:{required:!1,tsType:{name:"string"},description:"The title, between the title bar's stripe bands. Omitted or empty, the title bar shows only pinstripes.",defaultValue:{value:'""',computed:!1}},children:{required:!0,tsType:{name:"ReactNode"},description:"Body content, rendered below the title bar."},className:{required:!1,tsType:{name:"string"},description:"Extra class names for the outer frame element."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style for the outer frame element; merged after the `width` custom property."},width:{required:!1,tsType:{name:"union",raw:"string | number",elements:[{name:"string"},{name:"number"}]},description:"Caps the frame's max-width (number \u2192 px); content narrower than this stays narrower."}}};const h={title:"Desktop/WindowFrame",component:r},t={render:()=>e.jsxs(r,{title:"9/11 in Realtime",width:560,children:[e.jsx("h1",{children:"About 9/11 in Realtime"}),e.jsx("p",{children:"A multimedia experiment for teachers. Press the button below to power on."}),e.jsx(p,{onClickFunc:()=>{},children:"POWER ON"})]})},n={render:()=>e.jsx(r,{width:360,children:e.jsx("p",{children:"A frame with no title."})})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyWindowFrame title="9/11 in Realtime" width={560}>
            <h1>About 9/11 in Realtime</h1>
            <p>
                A multimedia experiment for teachers. Press the button below to power
                on.
            </p>
            <ClassicyButton onClickFunc={() => {}}>POWER ON</ClassicyButton>
        </ClassicyWindowFrame>
}`,...t.parameters?.docs?.source},description:{story:"The frame as a `preBootScreen` uses it: a titled, store-free window holding a\npower-on prompt. `width` caps the frame's width; narrower content stays\nnarrower.",...t.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyWindowFrame width={360}>
            <p>A frame with no title.</p>
        </ClassicyWindowFrame>
}`,...n.parameters?.docs?.source},description:{story:"Without a `title` the title bar is pinstripes only, with no title chip.",...n.parameters?.docs?.description}}};const y=["PowerOn","Untitled"];export{t as PowerOn,n as Untitled,y as __namedExportsOrder,h as default};
