import{j as e,a9 as i,p as h,ae as x,ai as g}from"./iframe-CSEAVB6p.js";import"./preload-helper-UyWNs-m6.js";const u=({id:s,value:c,htmlFor:d,label:r,labelPosition:p="left",labelAlign:m="left",variant:v="plain",mono:f,disabled:o,children:y})=>{const n=e.jsx("output",{id:s,htmlFor:d?.join(" "),className:i("classicyOutput",v==="inset"?"classicyOutputInset":"classicyOutputPlain",f?"classicyOutputMono":"",o?"classicyOutputDisabled":""),children:c??y});return r?e.jsxs("div",{className:i(x(p),g(m)),children:[e.jsx(h,{label:r,labelFor:s,disabled:o}),n]}):n};u.__docgenInfo={description:"",methods:[],displayName:"ClassicyOutput",props:{labelPosition:{defaultValue:{value:'"left"',computed:!1},required:!1},labelAlign:{defaultValue:{value:'"left"',computed:!1},required:!1},variant:{defaultValue:{value:'"plain"',computed:!1},required:!1}}};const j={title:"Controls/Output",component:u},a={args:{id:"total",label:"Total",value:"42 items"}},t={args:{id:"result",label:"Result",variant:"inset",value:"1,024"},decorators:[s=>e.jsx("div",{style:{width:220},children:e.jsx(s,{})})]},l={args:{id:"checksum",label:"Checksum",variant:"inset",mono:!0,value:"0x3F2A9C"},decorators:[s=>e.jsx("div",{style:{width:260},children:e.jsx(s,{})})]};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
