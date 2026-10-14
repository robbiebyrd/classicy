import{j as e,ah as i,u as h,an as x,ar as g}from"./iframe-BxuGBD6g.js";import"./preload-helper-PPVm8Dsz.js";const u=({id:s,value:c,htmlFor:d,label:r,labelPosition:m="left",labelAlign:p="left",variant:v="plain",mono:f,disabled:n,children:y})=>{const o=e.jsx("output",{id:s,htmlFor:d?.join(" "),className:i("classicyOutput",v==="inset"?"classicyOutputInset":"classicyOutputPlain",f?"classicyOutputMono":"",n?"classicyOutputDisabled":""),children:c??y});return r?e.jsxs("div",{className:i(x(m),g(p)),children:[e.jsx(h,{label:r,labelFor:s,disabled:n}),o]}):o};u.__docgenInfo={description:"",methods:[],displayName:"ClassicyOutput",props:{labelPosition:{defaultValue:{value:'"left"',computed:!1},required:!1},labelAlign:{defaultValue:{value:'"left"',computed:!1},required:!1},variant:{defaultValue:{value:'"plain"',computed:!1},required:!1}}};const j={title:"Controls/Output",component:u},a={args:{id:"total",label:"Total",value:"42 items"}},t={args:{id:"result",label:"Result",variant:"inset",value:"1,024"},decorators:[s=>e.jsx("div",{style:{width:220},children:e.jsx(s,{})})]},l={args:{id:"checksum",label:"Checksum",variant:"inset",mono:!0,value:"0x3F2A9C"},decorators:[s=>e.jsx("div",{style:{width:260},children:e.jsx(s,{})})]};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "total",
    label: "Total",
    value: "42 items"
  }
}`,...a.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "result",
    label: "Result",
    variant: "inset",
    value: "1,024"
  },
  decorators: [Story => <div style={{
    width: 220
  }}>{<Story />}</div>]
}`,...t.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    id: "checksum",
    label: "Checksum",
    variant: "inset",
    mono: true,
    value: "0x3F2A9C"
  },
  decorators: [Story => <div style={{
    width: 260
  }}>{<Story />}</div>]
}`,...l.parameters?.docs?.source}}};const O=["Plain","InsetWell","MonoResult"];export{t as InsetWell,l as MonoResult,a as Plain,O as __namedExportsOrder,j as default};
