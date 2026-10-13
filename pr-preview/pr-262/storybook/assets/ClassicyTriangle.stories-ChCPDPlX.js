import{$ as r,j as e}from"./iframe-CcIHUmKl.js";import"./preload-helper-DWV1EXqE.js";const{fn:a}=__STORYBOOK_MODULE_TEST__,c={title:"Controls/Triangle",component:r,args:{onToggle:a()}},i={args:{defaultOpen:!1}},s={render:()=>e.jsxs("div",{style:{display:"flex",gap:"1em"},children:[e.jsx(r,{direction:"up",interactive:!1}),e.jsx(r,{direction:"right",interactive:!1}),e.jsx(r,{direction:"down",interactive:!1}),e.jsx(r,{direction:"left",interactive:!1})]})};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    defaultOpen: false
  }
}`,...i.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    gap: "1em"
  }}>
            <ClassicyTriangle direction="up" interactive={false} />
            <ClassicyTriangle direction="right" interactive={false} />
            <ClassicyTriangle direction="down" interactive={false} />
            <ClassicyTriangle direction="left" interactive={false} />
        </div>
}`,...s.parameters?.docs?.source}}};const o=["Interactive","Directions"];export{s as Directions,i as Interactive,o as __namedExportsOrder,c as default};
