import{r as t,b8 as V,j as e,a8 as W,J as I,b5 as q,ao as G,b6 as J}from"./iframe-Ucd56N8t.js";import{a as K,C as U}from"./ClassicyAppearanceProbe-Cyvt-SHj.js";import"./preload-helper-shce2T3m.js";const k=t.forwardRef(function({id:o,accept:h,multiple:y=!1,maxFiles:b,maxFileSizeMb:g,disabled:C=!1,labelTitle:A,labelPosition:P="above",labelSize:M="medium",labelDisabled:z,onChangeFunc:F,className:_,style:w},$){const H=t.useRef(0),[i,N]=t.useState([]),[D,v]=t.useState(null),x=t.useRef(null),S=t.useRef(null),c=V("FileInput",{},S),j=c.emit,R=t.useCallback((s,a)=>{const l=s.length+a.length;if(b!==void 0&&l>b)return v(`Max ${b} files allowed.`),null;if(g!==void 0){const r=a.find(L=>L.size>g*1024*1024);if(r)return v(`"${r.name}" exceeds ${g} MB.`),null}const O=a.map(r=>({id:`${r.name}:${r.size}:${r.lastModified}:${++H.current}`,file:r}));return[...s,...O]},[b,g]),T=t.useCallback(s=>{v(null);const a=R(i,s);a!==null&&(N(a),s.length>0&&j("change",{fileName:s[0].name}),F?.(a.map(l=>l.file)))},[i,R,F,j]);t.useImperativeHandle($,()=>({addFiles:T}),[T]);const B=t.useCallback(s=>{const a=Array.from(s.target.files??[]);a.length>0&&T(a),x.current&&(x.current.value="")},[T]),E=t.useCallback(s=>{v(null);const a=i.filter(l=>l.id!==s);N(a),F?.(a.map(l=>l.file))},[i,F]);return e.jsxs("div",{...c.attrs,ref:S,className:q("classicyFileInputHolder",c.className,J(P),_),style:c.style?{...c.style,...w}:w,children:[A&&e.jsx(W,{label:A,labelFor:o,labelSize:M,disabled:z??C}),e.jsxs("div",{className:"classicyFileInputBody",children:[e.jsx("input",{id:o,ref:x,type:"file",accept:h,multiple:y,disabled:C,className:"classicyFileInputNative",onChange:B}),e.jsx(I,{disabled:C,onClickFunc:()=>x.current?.click(),children:y?"Choose Files\u2026":"Choose File\u2026"}),D&&e.jsx("span",{role:"alert",className:q("classicyFileInputMessage",G({error:!0})),children:D}),i.length>0&&e.jsx("ul",{className:"classicyFileInputList",children:i.map(s=>e.jsxs("li",{className:"classicyFileInputItem",children:[e.jsx("span",{children:s.file.name}),e.jsx(I,{buttonSize:"small",disabled:C,onClickFunc:()=>E(s.id),"aria-label":`Remove ${s.file.name}`,children:e.jsx("span",{className:"classicyFileInputRemoveGlyph","aria-hidden":!0})})]},s.id))})]})]})});k.__docgenInfo={description:'The `<input type="file">` equivalent: a Platinum "Choose File\u2026" push button\nover a hidden native file input, followed by the list of chosen files, each\nwith a small remove (\u2715) button. It picks files from the host computer; to\npick from the Classicy file system use `ClassicyFileOpenDialog` /\n`ClassicyFileSaveDialog` instead.\n\nThe list is uncontrolled and accumulates: every choice is appended, and\n`onChangeFunc` receives the whole list. An addition that breaks `maxFiles`\nor `maxFileSizeMb` is refused as a whole and shown as an inline error\n(`role="alert"`). The ref exposes `{ addFiles(files) }` so a drop target\n(e.g. a `ClassicyImageWell`) can feed the same list.',methods:[],displayName:"ClassicyFileInput",props:{id:{required:!0,tsType:{name:"string"},description:'Id of the hidden native `<input type="file">`; links the label to it.'},accept:{required:!1,tsType:{name:"string"},description:'Native `accept` filter for the browser\'s file dialog (e.g. `"image/*"`).'},multiple:{required:!1,tsType:{name:"boolean"},description:'Allow choosing several files; the button reads "Choose Files\u2026". Defaults to `false`.',defaultValue:{value:"false",computed:!1}},maxFiles:{required:!1,tsType:{name:"number"},description:"Maximum number of files in the list; an addition that would exceed it is refused with an error."},maxFileSizeMb:{required:!1,tsType:{name:"number"},description:"Maximum size of each file in MB; an oversized file is refused with an error."},disabled:{required:!1,tsType:{name:"boolean"},description:"Disables the Choose and Remove buttons (and dims the label). Defaults to `false`.",defaultValue:{value:"false",computed:!1}},labelTitle:{required:!1,tsType:{name:"string"},description:"Visible label text. Omit for no label."},labelPosition:{required:!1,tsType:{name:"ClassicyLabelPosition"},description:'Where the label sits relative to the control. Defaults to `"above"`.',defaultValue:{value:'"above"',computed:!1}},labelSize:{required:!1,tsType:{name:"ClassicyControlLabelSize"},description:'Label text size. Defaults to `"medium"`.',defaultValue:{value:'"medium"',computed:!1}},labelDisabled:{required:!1,tsType:{name:"boolean"},description:"Dims the label independently of the control. Defaults to `disabled`."},onChangeFunc:{required:!1,tsType:{name:"signature",type:"function",raw:"(files: File[]) => void",signature:{arguments:[{type:{name:"Array",elements:[{name:"File"}],raw:"File[]"},name:"files"}],return:{name:"void"}}},description:"Called with the complete current file list after every add or remove."},className:{required:!1,tsType:{name:"string"},description:"Extra class names, merged onto the root element after the component's own."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the root element after the component's own."}}};const{fn:Y}=__STORYBOOK_MODULE_TEST__,ee={title:"Controls/FileInput",component:k,args:{onChangeFunc:Y()}},n={args:{id:"file-default",labelTitle:"Attachment"}},d={args:{id:"file-multi",labelTitle:"Pictures",multiple:!0,accept:"image/*",maxFiles:5,maxFileSizeMb:10}},u={args:{id:"file-handle",labelTitle:"Documents",multiple:!0,maxFiles:3},render:f=>{const o=t.useRef(null),h=t.useRef(0),y=()=>{h.current+=1,o.current?.addFiles([new File(["Hello"],`Note ${h.current}.txt`,{type:"text/plain"})])};return e.jsxs(e.Fragment,{children:[e.jsx(k,{...f,ref:o}),e.jsx(I,{onClickFunc:y,children:"Add a Note"})]})}},p={args:{id:"file-disabled",labelTitle:"Attachment",disabled:!0}},m={args:n.args,render:f=>e.jsx(U,{children:e.jsx(k,{...f})}),parameters:K()};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    id: "file-default",
    labelTitle: "Attachment"
  }
}`,...n.parameters?.docs?.source},description:{story:`A single-file picker: "Choose File\u2026" opens the browser's file dialog.`,...n.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    id: "file-multi",
    labelTitle: "Pictures",
    multiple: true,
    accept: "image/*",
    maxFiles: 5,
    maxFileSizeMb: 10
  }
}`,...d.parameters?.docs?.source},description:{story:`Several images, capped at five files of up to 10 MB each. An addition that
breaks either limit is refused and reported inline.`,...d.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
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
}`,...u.parameters?.docs?.source},description:{story:"Files added from code through the ref's `addFiles` \u2014 how a drop target feeds\nthe list. The same `maxFiles` check applies, so the fourth click is refused.",...u.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    id: "file-disabled",
    labelTitle: "Attachment",
    disabled: true
  }
}`,...p.parameters?.docs?.source},description:{story:"Disabled: the Choose button is inactive and the label is dimmed.",...p.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicyFileInput>) => <ClassicyAppearanceProbe>
            <ClassicyFileInput {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...m.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...m.parameters?.docs?.description}}};const se=["Default","MultipleImages","AddFilesFromCode","Disabled","AppearanceHooks"];export{u as AddFilesFromCode,m as AppearanceHooks,n as Default,p as Disabled,d as MultipleImages,se as __namedExportsOrder,ee as default};
