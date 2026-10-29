import{i as f,j as h,aD as I}from"./iframe-C53qs6X7.js";import"./preload-helper-HbwIlf1V.js";const D=({src:e,alt:a="",enabled:r=!0,selected:t=!1,onDrop:d,label:p,children:g})=>{const m=r&&typeof d=="function",[y,u]=f.useState(!1),b=s=>{m&&(s.preventDefault(),s.dataTransfer.dropEffect="copy",u(!0))},w=()=>{m&&u(!1)},S=s=>{m&&(s.preventDefault(),u(!1),d?.(s.dataTransfer.files,s))};return h.jsx("div",{className:I("classicyImageWell",{classicyImageWellDisabled:!r,classicyImageWellSelected:t,classicyImageWellDragOver:y}),"data-state":r?t?"selected":"enabled":"disabled",role:e?"group":"img","aria-label":p||a||void 0,"aria-disabled":!r||void 0,onDragOver:b,onDragLeave:w,onDrop:S,children:e?h.jsx("img",{className:"classicyImageWellImage",src:e,alt:a,draggable:!1}):g})};D.__docgenInfo={description:'The Platinum image well (HIGOS8 Ch.2 "Image Wells", p.47): a 2 px recessed\nframe with a white fill that displays an image — the droppable-image-slot\nequivalent of `<img>` (keep a raw `<img>` for plain static pictures). Show\n`src`, or any custom `children` (a placeholder, an icon) when there is none.\n\nPassing `onDrop` turns the well into a drag-and-drop target: it highlights\nwhile files are dragged over it and hands them over as a `FileList`. It is\nnot a button — it takes no clicks or keyboard focus — and it does not load\nthe dropped file itself; read it and pass the result back as `src`.',methods:[],displayName:"ClassicyImageWell",props:{alt:{defaultValue:{value:'""',computed:!1},required:!1},enabled:{defaultValue:{value:"true",computed:!1},required:!1},selected:{defaultValue:{value:"false",computed:!1},required:!1}}};const{fn:v}=__STORYBOOK_MODULE_TEST__,O="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23cccccc'/%3E%3Ccircle cx='24' cy='24' r='14' fill='%234a90d9'/%3E%3C/svg%3E",R={title:"Controls/ImageWell",component:D,args:{src:O,alt:"Sample picture"}},o={},n={args:{selected:!0}},i={args:{enabled:!1}},l={args:{src:void 0,children:"Drop an image here",onDrop:v()}},c={args:{label:"Picture",onDrop:v()},render:e=>{const[a,r]=f.useState(void 0);return f.useEffect(()=>()=>{a&&URL.revokeObjectURL(a)},[a]),h.jsx(D,{...e,src:a??e.src,onDrop:(t,d)=>{e.onDrop?.(t,d);const p=Array.from(t).find(g=>g.type.startsWith("image/"));p&&r(URL.createObjectURL(p))}})}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:"{}",...o.parameters?.docs?.source},description:{story:"An enabled well displaying an image in its recessed frame.",...o.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    selected: true
  }
}`,...n.parameters?.docs?.source},description:{story:"`selected` draws the accent frame around the well.",...n.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    enabled: false
  }
}`,...i.parameters?.docs?.source},description:{story:"`enabled={false}` dims the well; it also stops accepting drops.",...i.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    src: undefined,
    children: "Drop an image here",
    onDrop: fn()
  }
}`,...l.parameters?.docs?.source},description:{story:"An empty drop target: with `onDrop` set, dragging files over the well\nhighlights it, and the dropped `FileList` is logged in the Actions panel.",...l.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Picture",
    onDrop: fn()
  },
  render: args => {
    const [url, setUrl] = useState<string | undefined>(undefined);
    useEffect(() => () => {
      if (url) URL.revokeObjectURL(url);
    }, [url]);
    return <ClassicyImageWell {...args} src={url ?? args.src} onDrop={(files, e) => {
      args.onDrop?.(files, e);
      const image = Array.from(files).find(f => f.type.startsWith("image/"));
      if (image) setUrl(URL.createObjectURL(image));
    }} />;
  }
}`,...c.parameters?.docs?.source},description:{story:"The well does not load what is dropped on it: this story turns the first\ndropped image into an object URL and feeds it back as `src`.",...c.parameters?.docs?.description}}};const U=["Enabled","Selected","Disabled","DropTarget","DropToReplace"];export{i as Disabled,l as DropTarget,c as DropToReplace,o as Enabled,n as Selected,U as __namedExportsOrder,R as default};
