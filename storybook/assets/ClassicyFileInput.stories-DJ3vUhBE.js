import{w as a,j as l,p as w,h as F,a9 as z,ae as D}from"./iframe-BbseER6W.js";import"./preload-helper-PPVm8Dsz.js";const I=a.forwardRef(function({id:g,accept:j,multiple:h=!1,maxFiles:r,maxFileSizeMb:o,disabled:c=!1,labelTitle:C,labelPosition:q="above",labelSize:S="medium",labelDisabled:_,onChangeFunc:u},N){const E=a.useRef(0),[n,T]=a.useState([]),[v,d]=a.useState(null),m=a.useRef(null),x=a.useCallback((e,s)=>{const t=e.length+s.length;if(r!==void 0&&t>r)return d(`Max ${r} files allowed.`),null;if(o!==void 0){const i=s.find(A=>A.size>o*1024*1024);if(i)return d(`"${i.name}" exceeds ${o} MB.`),null}const k=s.map(i=>({id:`${i.name}:${i.size}:${i.lastModified}:${++E.current}`,file:i}));return[...e,...k]},[r,o]),p=a.useCallback(e=>{d(null);const s=x(n,e);s!==null&&(T(s),u?.(s.map(t=>t.file)))},[n,x,u]);a.useImperativeHandle(N,()=>({addFiles:p}),[p]);const R=a.useCallback(e=>{const s=Array.from(e.target.files??[]);s.length>0&&p(s),m.current&&(m.current.value="")},[p]),$=a.useCallback(e=>{d(null);const s=n.filter(t=>t.id!==e);T(s),u?.(s.map(t=>t.file))},[n,u]);return l.jsxs("div",{className:z("classicyFileInputHolder",D(q)),children:[C&&l.jsx(w,{label:C,labelFor:g,labelSize:S,disabled:_??c}),l.jsxs("div",{className:"classicyFileInputBody",children:[l.jsx("input",{id:g,ref:m,type:"file",accept:j,multiple:h,disabled:c,className:"classicyFileInputNative",onChange:R}),l.jsx(F,{disabled:c,onClickFunc:()=>m.current?.click(),children:h?"Choose Files…":"Choose File…"}),v&&l.jsx("span",{role:"alert",className:"classicyFileInputError",children:v}),n.length>0&&l.jsx("ul",{className:"classicyFileInputList",children:n.map(e=>l.jsxs("li",{className:"classicyFileInputItem",children:[l.jsx("span",{children:e.file.name}),l.jsx(F,{buttonSize:"small",disabled:c,onClickFunc:()=>$(e.id),"aria-label":`Remove ${e.file.name}`,children:"✕"})]},e.id))})]})]})});I.__docgenInfo={description:"",methods:[],displayName:"ClassicyFileInput",props:{id:{required:!0,tsType:{name:"string"},description:""},accept:{required:!1,tsType:{name:"string"},description:""},multiple:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},maxFiles:{required:!1,tsType:{name:"number"},description:""},maxFileSizeMb:{required:!1,tsType:{name:"number"},description:""},disabled:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},labelTitle:{required:!1,tsType:{name:"string"},description:""},labelPosition:{required:!1,tsType:{name:"ClassicyLabelPosition"},description:"",defaultValue:{value:'"above"',computed:!1}},labelSize:{required:!1,tsType:{name:"ClassicyControlLabelSize"},description:"",defaultValue:{value:'"medium"',computed:!1}},labelDisabled:{required:!1,tsType:{name:"boolean"},description:""},onChangeFunc:{required:!1,tsType:{name:"signature",type:"function",raw:"(files: File[]) => void",signature:{arguments:[{type:{name:"Array",elements:[{name:"File"}],raw:"File[]"},name:"files"}],return:{name:"void"}}},description:""}}};const{fn:M}=__STORYBOOK_MODULE_TEST__,B={title:"Controls/FileInput",component:I,args:{onChangeFunc:M()}},f={args:{id:"file-default",labelTitle:"Attachment"}},b={args:{id:"file-multi",labelTitle:"Pictures",multiple:!0,accept:"image/*",maxFiles:5,maxFileSizeMb:10}},y={args:{id:"file-disabled",labelTitle:"Attachment",disabled:!0}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    id: "file-default",
    labelTitle: "Attachment"
  }
}`,...f.parameters?.docs?.source}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    id: "file-multi",
    labelTitle: "Pictures",
    multiple: true,
    accept: "image/*",
    maxFiles: 5,
    maxFileSizeMb: 10
  }
}`,...b.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    id: "file-disabled",
    labelTitle: "Attachment",
    disabled: true
  }
}`,...y.parameters?.docs?.source}}};const V=["Default","MultipleImages","Disabled"];export{f as Default,y as Disabled,b as MultipleImages,V as __namedExportsOrder,B as default};
