import{i as f,j as h,aD as L,aE as I}from"./iframe-DDlA6lS-.js";import"./preload-helper-shce2T3m.js";const D=({src:e,alt:r="",enabled:s=!0,selected:c=!1,onDrop:d,label:p,children:g,className:y,style:b})=>{const m=s&&typeof d=="function",[w,u]=f.useState(!1),S=a=>{m&&(a.preventDefault(),a.dataTransfer.dropEffect="copy",u(!0))},E=()=>{m&&u(!1)},O=a=>{m&&(a.preventDefault(),u(!1),d?.(a.dataTransfer.files,a))};return h.jsx("div",{className:L("classicyImageWell",I({disabled:!s,selected:c}),{classicyImageWellDragOver:w},y),style:b,role:e?"group":"img","aria-label":p||r||void 0,"aria-disabled":!s||void 0,onDragOver:S,onDragLeave:E,onDrop:O,children:e?h.jsx("img",{className:"classicyImageWellImage",src:e,alt:r,draggable:!1}):g})};D.__docgenInfo={description:'The Platinum image well (HIGOS8 Ch.2 "Image Wells", p.47): a 2 px recessed\nframe with a white fill that displays an image — the droppable-image-slot\nequivalent of `<img>` (keep a raw `<img>` for plain static pictures). Show\n`src`, or any custom `children` (a placeholder, an icon) when there is none.\n\nPassing `onDrop` turns the well into a drag-and-drop target: it highlights\nwhile files are dragged over it and hands them over as a `FileList`. It is\nnot a button — it takes no clicks or keyboard focus — and it does not load\nthe dropped file itself; read it and pass the result back as `src`.',methods:[],displayName:"ClassicyImageWell",props:{alt:{defaultValue:{value:'""',computed:!1},required:!1},enabled:{defaultValue:{value:"true",computed:!1},required:!1},selected:{defaultValue:{value:"false",computed:!1},required:!1}}};const{fn:v}=__STORYBOOK_MODULE_TEST__,R="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23cccccc'/%3E%3Ccircle cx='24' cy='24' r='14' fill='%234a90d9'/%3E%3C/svg%3E",T={title:"Controls/ImageWell",component:D,args:{src:R,alt:"Sample picture"}},t={},o={args:{selected:!0}},n={args:{enabled:!1}},i={args:{src:void 0,children:"Drop an image here",onDrop:v()}},l={args:{label:"Picture",onDrop:v()},render:e=>{const[r,s]=f.useState(void 0);return f.useEffect(()=>()=>{r&&URL.revokeObjectURL(r)},[r]),h.jsx(D,{...e,src:r??e.src,onDrop:(c,d)=>{e.onDrop?.(c,d);const p=Array.from(c).find(g=>g.type.startsWith("image/"));p&&s(URL.createObjectURL(p))}})}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source},description:{story:"An enabled well displaying an image in its recessed frame.",...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    selected: true
  }
}`,...o.parameters?.docs?.source},description:{story:"`selected` draws the accent frame around the well.",...o.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    enabled: false
  }
}`,...n.parameters?.docs?.source},description:{story:"`enabled={false}` dims the well; it also stops accepting drops.",...n.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    src: undefined,
    children: "Drop an image here",
    onDrop: fn()
  }
}`,...i.parameters?.docs?.source},description:{story:"An empty drop target: with `onDrop` set, dragging files over the well\nhighlights it, and the dropped `FileList` is logged in the Actions panel.",...i.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
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
}`,...l.parameters?.docs?.source},description:{story:"The well does not load what is dropped on it: this story turns the first\ndropped image into an object URL and feeds it back as `src`.",...l.parameters?.docs?.description}}};const j=["Enabled","Selected","Disabled","DropTarget","DropToReplace"];export{n as Disabled,i as DropTarget,l as DropToReplace,t as Enabled,o as Selected,j as __namedExportsOrder,T as default};
