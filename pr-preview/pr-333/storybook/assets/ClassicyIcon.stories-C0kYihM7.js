import{m as i,Z as t,i as p,j as o}from"./iframe-DRzDiICs.js";import"./preload-helper-shce2T3m.js";const{fn:c}=__STORYBOOK_MODULE_TEST__,u={title:"Controls/Icon",component:t,decorators:[a=>o.jsx("div",{style:{position:"relative",width:320,height:200},children:o.jsx(a,{})})]},s={args:{appId:"storybook.app",name:"Macintosh HD",icon:i.system.macClassic,label:"Macintosh HD",initialPosition:[24,24],onClickFunc:c()}},n={args:{appId:"storybook.app",name:"Read Me",icon:i.system.macClassic,initialPosition:[24,24],snapTo:[64,64],onClickFunc:c()},render:function(l){const r=p.useRef(null);return o.jsx("div",{ref:r,style:{position:"absolute",inset:0},children:o.jsx(t,{...l,holder:r})})}},e={args:{appId:"storybook.app",name:"Desktop DB",icon:i.system.macClassic,initialPosition:[24,24],invisible:!0}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    appId: "storybook.app",
    name: "Macintosh HD",
    icon: ClassicyIcons.system.macClassic as string,
    label: "Macintosh HD",
    initialPosition: [24, 24],
    onClickFunc: fn()
  }
}`,...s.parameters?.docs?.source},description:{story:"A captioned icon at a fixed position. Click to select it; double-click (or\npress Enter while focused) to fire `onClickFunc`.",...s.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    appId: "storybook.app",
    name: "Read Me",
    icon: ClassicyIcons.system.macClassic as string,
    initialPosition: [24, 24],
    snapTo: [64, 64],
    onClickFunc: fn()
  },
  render: function Render(args) {
    const holder = useRef<HTMLDivElement>(null);
    return <div ref={holder} style={{
      position: "absolute",
      inset: 0
    }}>
                <ClassicyIcon {...args} holder={holder} />
            </div>;
  }
}`,...n.parameters?.docs?.source},description:{story:'With a `holder` the icon can be dragged around its container; `snapTo`\nrounds each drop onto a 64 px grid, as the file browser\'s "grid" arrangement\ndoes.',...n.parameters?.docs?.description}}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    appId: "storybook.app",
    name: "Desktop DB",
    icon: ClassicyIcons.system.macClassic as string,
    initialPosition: [24, 24],
    invisible: true
  }
}`,...e.parameters?.docs?.source},description:{story:"`invisible` fades the icon and caption, as the file browser does for an\nentry marked `_invisible` when invisible files are shown.",...e.parameters?.docs?.description}}};const h=["Default","DraggableWithSnap","Invisible"];export{s as Default,n as DraggableWithSnap,e as Invisible,h as __namedExportsOrder,u as default};
