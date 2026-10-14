import{r as I,j as m,ah as b}from"./iframe-C-KCwMsw.js";import"./preload-helper-PPVm8Dsz.js";const g=({src:a,alt:n="",enabled:r=!0,selected:i=!1,onDrop:p,label:u,children:f})=>{const c=r&&typeof p=="function",[v,d]=I.useState(!1),D=e=>{c&&(e.preventDefault(),e.dataTransfer.dropEffect="copy",d(!0))},h=()=>{c&&d(!1)},y=e=>{c&&(e.preventDefault(),d(!1),p?.(e.dataTransfer.files,e))};return m.jsx("div",{className:b("classicyImageWell",{classicyImageWellDisabled:!r,classicyImageWellSelected:i,classicyImageWellDragOver:v}),"data-state":r?i?"selected":"enabled":"disabled",role:a?"group":"img","aria-label":u||n||void 0,"aria-disabled":!r||void 0,onDragOver:D,onDragLeave:h,onDrop:y,children:a?m.jsx("img",{className:"classicyImageWellImage",src:a,alt:n,draggable:!1}):f})};g.__docgenInfo={description:"",methods:[],displayName:"ClassicyImageWell",props:{alt:{defaultValue:{value:'""',computed:!1},required:!1},enabled:{defaultValue:{value:"true",computed:!1},required:!1},selected:{defaultValue:{value:"false",computed:!1},required:!1}}};const x="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23cccccc'/%3E%3Ccircle cx='24' cy='24' r='14' fill='%234a90d9'/%3E%3C/svg%3E",W={title:"Controls/ImageWell",component:g,args:{src:x,alt:"Sample picture"}},s={},l={args:{selected:!0}},t={args:{enabled:!1}},o={args:{src:void 0,children:"Drop an image here",onDrop:a=>console.log("dropped",a)}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:"{}",...s.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    selected: true
  }
}`,...l.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    enabled: false
  }
}`,...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    src: undefined,
    children: "Drop an image here",
    onDrop: files => console.log("dropped", files)
  }
}`,...o.parameters?.docs?.source}}};const C=["Enabled","Selected","Disabled","DropTarget"];export{t as Disabled,o as DropTarget,s as Enabled,l as Selected,C as __namedExportsOrder,W as default};
