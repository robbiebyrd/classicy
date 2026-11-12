import{h as d,j as f}from"./iframe-BDOzhcT_.js";import{C as l}from"./ClassicyImageWell-CzxKG5Nw.js";import"./preload-helper-CxPGPiBr.js";const{fn:p}=__STORYBOOK_MODULE_TEST__,h="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23cccccc'/%3E%3Ccircle cx='24' cy='24' r='14' fill='%234a90d9'/%3E%3C/svg%3E",w={title:"Controls/ImageWell",component:l,args:{src:h,alt:"Sample picture"}},e={},r={args:{selected:!0}},s={args:{enabled:!1}},t={args:{src:void 0,children:"Drop an image here",onDrop:p()}},a={args:{label:"Picture",onDrop:p()},render:n=>{const[o,m]=d.useState(void 0);return d.useEffect(()=>()=>{o&&URL.revokeObjectURL(o)},[o]),f.jsx(l,{...n,src:o??n.src,onDrop:(c,g)=>{n.onDrop?.(c,g);const i=Array.from(c).find(u=>u.type.startsWith("image/"));i&&m(URL.createObjectURL(i))}})}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:"{}",...e.parameters?.docs?.source},description:{story:"An enabled well displaying an image in its recessed frame.",...e.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    selected: true
  }
}`,...r.parameters?.docs?.source},description:{story:"`selected` draws the accent frame around the well.",...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    enabled: false
  }
}`,...s.parameters?.docs?.source},description:{story:"`enabled={false}` dims the well; it also stops accepting drops.",...s.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    src: undefined,
    children: "Drop an image here",
    onDrop: fn()
  }
}`,...t.parameters?.docs?.source},description:{story:"An empty drop target: with `onDrop` set, dragging files over the well\nhighlights it, and the dropped `FileList` is logged in the Actions panel.",...t.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
}`,...a.parameters?.docs?.source},description:{story:"The well does not load what is dropped on it: this story turns the first\ndropped image into an object URL and feeds it back as `src`.",...a.parameters?.docs?.description}}};const E=["Enabled","Selected","Disabled","DropTarget","DropToReplace"];export{s as Disabled,t as DropTarget,a as DropToReplace,e as Enabled,r as Selected,E as __namedExportsOrder,w as default};
