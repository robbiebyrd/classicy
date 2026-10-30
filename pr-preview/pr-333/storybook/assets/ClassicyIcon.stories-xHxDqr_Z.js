import{S as i,au as t,j as s,r as d}from"./iframe-DOt7NI2g.js";import{a as m,C as u}from"./ClassicyAppearanceProbe-gzM2aWS9.js";import"./preload-helper-shce2T3m.js";const{fn:p}=__STORYBOOK_MODULE_TEST__,b={title:"Controls/Icon",component:t,decorators:[r=>s.jsx("div",{style:{position:"relative",width:320,height:200},children:s.jsx(r,{})})]},e={args:{appId:"storybook.app",name:"Macintosh HD",icon:i.system.macClassic,label:"Macintosh HD",initialPosition:[24,24],onClickFunc:p()}},n={args:{appId:"storybook.app",name:"Read Me",icon:i.system.macClassic,initialPosition:[24,24],snapTo:[64,64],onClickFunc:p()},render:function(l){const c=d.useRef(null);return s.jsx("div",{ref:c,style:{position:"absolute",inset:0},children:s.jsx(t,{...l,holder:c})})}},a={args:{appId:"storybook.app",name:"Desktop DB",icon:i.system.macClassic,initialPosition:[24,24],invisible:!0}},o={args:e.args,render:r=>s.jsx(u,{children:s.jsx(t,{...r})}),parameters:m()};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    appId: "storybook.app",
    name: "Macintosh HD",
    icon: ClassicyIcons.system.macClassic as string,
    label: "Macintosh HD",
    initialPosition: [24, 24],
    onClickFunc: fn()
  }
}`,...e.parameters?.docs?.source},description:{story:"A captioned icon at a fixed position. Click to select it; double-click (or\npress Enter while focused) to fire `onClickFunc`.",...e.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:'With a `holder` the icon can be dragged around its container; `snapTo`\nrounds each drop onto a 64 px grid, as the file browser\'s "grid" arrangement\ndoes.',...n.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    appId: "storybook.app",
    name: "Desktop DB",
    icon: ClassicyIcons.system.macClassic as string,
    initialPosition: [24, 24],
    invisible: true
  }
}`,...a.parameters?.docs?.source},description:{story:"`invisible` fades the icon and caption, as the file browser does for an\nentry marked `_invisible` when invisible files are shown.",...a.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicyIcon>) => <ClassicyAppearanceProbe>
            <ClassicyIcon {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...o.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...o.parameters?.docs?.description}}};const C=["Default","DraggableWithSnap","Invisible","AppearanceHooks"];export{o as AppearanceHooks,e as Default,n as DraggableWithSnap,a as Invisible,C as __namedExportsOrder,b as default};
