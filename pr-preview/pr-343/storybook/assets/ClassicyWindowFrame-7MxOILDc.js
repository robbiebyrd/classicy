import{j as s,bm as i,ba as d}from"./iframe-BwHesUBz.js";const l=({title:n="",children:t,className:o,style:r,width:e})=>{const a=e!==void 0?{"--classicy-window-frame-width":typeof e=="number"?`${e}px`:e}:void 0;return s.jsxs("div",{className:d("classicyWindowFrame",o),style:{...a,...r},children:[s.jsx(i,{title:n,hideIcon:!0}),s.jsx("div",{className:"classicyWindowFrameBody",children:t})]})};l.__docgenInfo={description:`Presentational Mac OS 8 window frame: the window's title bar
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
\`\`\``,methods:[],displayName:"ClassicyWindowFrame",props:{title:{required:!1,tsType:{name:"string"},description:"The title, between the title bar's stripe bands. Omitted or empty, the title bar shows only pinstripes.",defaultValue:{value:'""',computed:!1}},children:{required:!0,tsType:{name:"ReactNode"},description:"Body content, rendered below the title bar."},className:{required:!1,tsType:{name:"string"},description:"Extra class names for the outer frame element."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style for the outer frame element; merged after the `width` custom property."},width:{required:!1,tsType:{name:"union",raw:"string | number",elements:[{name:"string"},{name:"number"}]},description:"Caps the frame's max-width (number \u2192 px); content narrower than this stays narrower."}}};export{l as C};
