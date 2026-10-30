import{i as a,j as e,I as $,b as v,aD as E,aE as B}from"./iframe-CsKcG08a.js";import"./preload-helper-PPVm8Dsz.js";const x=a.forwardRef(function({id:r,accept:m,multiple:p=!1,maxFiles:f,maxFileSizeMb:h,disabled:b=!1,labelTitle:I,labelPosition:N="above",labelSize:j="medium",labelDisabled:A,onChangeFunc:y},S){const R=a.useRef(0),[n,w]=a.useState([]),[D,g]=a.useState(null),F=a.useRef(null),k=a.useCallback((s,t)=>{const l=s.length+t.length;if(f!==void 0&&l>f)return g(`Max ${f} files allowed.`),null;if(h!==void 0){const i=t.find(_=>_.size>h*1024*1024);if(i)return g(`"${i.name}" exceeds ${h} MB.`),null}const z=t.map(i=>({id:`${i.name}:${i.size}:${i.lastModified}:${++R.current}`,file:i}));return[...s,...z]},[f,h]),C=a.useCallback(s=>{g(null);const t=k(n,s);t!==null&&(w(t),y?.(t.map(l=>l.file)))},[n,k,y]);a.useImperativeHandle(S,()=>({addFiles:C}),[C]);const q=a.useCallback(s=>{const t=Array.from(s.target.files??[]);t.length>0&&C(t),F.current&&(F.current.value="")},[C]),M=a.useCallback(s=>{g(null);const t=n.filter(l=>l.id!==s);w(t),y?.(t.map(l=>l.file))},[n,y]);return e.jsxs("div",{className:E("classicyFileInputHolder",B(N)),children:[I&&e.jsx($,{label:I,labelFor:r,labelSize:j,disabled:A??b}),e.jsxs("div",{className:"classicyFileInputBody",children:[e.jsx("input",{id:r,ref:F,type:"file",accept:m,multiple:p,disabled:b,className:"classicyFileInputNative",onChange:q}),e.jsx(v,{disabled:b,onClickFunc:()=>F.current?.click(),children:p?"Choose Files…":"Choose File…"}),D&&e.jsx("span",{role:"alert",className:"classicyFileInputError",children:D}),n.length>0&&e.jsx("ul",{className:"classicyFileInputList",children:n.map(s=>e.jsxs("li",{className:"classicyFileInputItem",children:[e.jsx("span",{children:s.file.name}),e.jsx(v,{buttonSize:"small",disabled:b,onClickFunc:()=>M(s.id),"aria-label":`Remove ${s.file.name}`,children:"✕"})]},s.id))})]})]})});x.__docgenInfo={description:'The `<input type="file">` equivalent: a Platinum "Choose File…" push button\nover a hidden native file input, followed by the list of chosen files, each\nwith a small remove (✕) button. It picks files from the host computer; to\npick from the Classicy file system use `ClassicyFileOpenDialog` /\n`ClassicyFileSaveDialog` instead.\n\nThe list is uncontrolled and accumulates: every choice is appended, and\n`onChangeFunc` receives the whole list. An addition that breaks `maxFiles`\nor `maxFileSizeMb` is refused as a whole and shown as an inline error\n(`role="alert"`). The ref exposes `{ addFiles(files) }` so a drop target\n(e.g. a `ClassicyImageWell`) can feed the same list.',methods:[],displayName:"ClassicyFileInput",props:{id:{required:!0,tsType:{name:"string"},description:'Id of the hidden native `<input type="file">`; links the label to it.'},accept:{required:!1,tsType:{name:"string"},description:'Native `accept` filter for the browser\'s file dialog (e.g. `"image/*"`).'},multiple:{required:!1,tsType:{name:"boolean"},description:'Allow choosing several files; the button reads "Choose Files…". Defaults to `false`.',defaultValue:{value:"false",computed:!1}},maxFiles:{required:!1,tsType:{name:"number"},description:"Maximum number of files in the list; an addition that would exceed it is refused with an error."},maxFileSizeMb:{required:!1,tsType:{name:"number"},description:"Maximum size of each file in MB; an oversized file is refused with an error."},disabled:{required:!1,tsType:{name:"boolean"},description:"Disables the Choose and Remove buttons (and dims the label). Defaults to `false`.",defaultValue:{value:"false",computed:!1}},labelTitle:{required:!1,tsType:{name:"string"},description:"Visible label text. Omit for no label."},labelPosition:{required:!1,tsType:{name:"ClassicyLabelPosition"},description:'Where the label sits relative to the control. Defaults to `"above"`.',defaultValue:{value:'"above"',computed:!1}},labelSize:{required:!1,tsType:{name:"ClassicyControlLabelSize"},description:'Label text size. Defaults to `"medium"`.',defaultValue:{value:'"medium"',computed:!1}},labelDisabled:{required:!1,tsType:{name:"boolean"},description:"Dims the label independently of the control. Defaults to `disabled`."},onChangeFunc:{required:!1,tsType:{name:"signature",type:"function",raw:"(files: File[]) => void",signature:{arguments:[{type:{name:"Array",elements:[{name:"File"}],raw:"File[]"},name:"files"}],return:{name:"void"}}},description:"Called with the complete current file list after every add or remove."}}};const{fn:O}=__STORYBOOK_MODULE_TEST__,H={title:"Controls/FileInput",component:x,args:{onChangeFunc:O()}},o={args:{id:"file-default",labelTitle:"Attachment"}},d={args:{id:"file-multi",labelTitle:"Pictures",multiple:!0,accept:"image/*",maxFiles:5,maxFileSizeMb:10}},c={args:{id:"file-handle",labelTitle:"Documents",multiple:!0,maxFiles:3},render:T=>{const r=a.useRef(null),m=a.useRef(0),p=()=>{m.current+=1,r.current?.addFiles([new File(["Hello"],`Note ${m.current}.txt`,{type:"text/plain"})])};return e.jsxs(e.Fragment,{children:[e.jsx(x,{...T,ref:r}),e.jsx(v,{onClickFunc:p,children:"Add a Note"})]})}},u={args:{id:"file-disabled",labelTitle:"Attachment",disabled:!0}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "file-default",
    labelTitle: "Attachment"
  }
}`,...o.parameters?.docs?.source},description:{story:`A single-file picker: "Choose File…" opens the browser's file dialog.`,...o.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    id: "file-multi",
    labelTitle: "Pictures",
    multiple: true,
    accept: "image/*",
    maxFiles: 5,
    maxFileSizeMb: 10
  }
}`,...d.parameters?.docs?.source},description:{story:`Several images, capped at five files of up to 10 MB each. An addition that
breaks either limit is refused and reported inline.`,...d.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    id: "file-handle",
    labelTitle: "Documents",
    multiple: true,
    maxFiles: 3
  },
  render: args => {
    const ref = useRef<ClassicyFileInputHandle>(null);
    const counter = useRef(0);
    const addNote = () => {
      counter.current += 1;
      ref.current?.addFiles([new File(["Hello"], \`Note \${counter.current}.txt\`, {
        type: "text/plain"
      })]);
    };
    return <>
                <ClassicyFileInput {...args} ref={ref} />
                <ClassicyButton onClickFunc={addNote}>Add a Note</ClassicyButton>
            </>;
  }
}`,...c.parameters?.docs?.source},description:{story:"Files added from code through the ref's `addFiles` — how a drop target feeds\nthe list. The same `maxFiles` check applies, so the fourth click is refused.",...c.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    id: "file-disabled",
    labelTitle: "Attachment",
    disabled: true
  }
}`,...u.parameters?.docs?.source},description:{story:"Disabled: the Choose button is inactive and the label is dimmed.",...u.parameters?.docs?.description}}};const V=["Default","MultipleImages","AddFilesFromCode","Disabled"];export{c as AddFilesFromCode,o as Default,u as Disabled,d as MultipleImages,V as __namedExportsOrder,H as default};
