import{a9 as r,j as e}from"./iframe-BiZlo4rF.js";import"./preload-helper-PPVm8Dsz.js";const{fn:s}=__STORYBOOK_MODULE_TEST__,c={title:"Controls/Triangle",component:r,args:{onToggle:s()}},a={args:{defaultOpen:!1}},i={render:()=>e.jsxs("div",{style:{display:"flex",gap:"1em"},children:[e.jsx(r,{direction:"up",interactive:!1}),e.jsx(r,{direction:"right",interactive:!1}),e.jsx(r,{direction:"down",interactive:!1}),e.jsx(r,{direction:"left",interactive:!1})]})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    defaultOpen: false
  }
}`,...a.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    gap: "1em"
  }}>
            <ClassicyTriangle direction="up" interactive={false} />
            <ClassicyTriangle direction="right" interactive={false} />
            <ClassicyTriangle direction="down" interactive={false} />
            <ClassicyTriangle direction="left" interactive={false} />
        </div>
}`,...i.parameters?.docs?.source}}};const o=["Interactive","Directions"];export{i as Directions,a as Interactive,o as __namedExportsOrder,c as default};
