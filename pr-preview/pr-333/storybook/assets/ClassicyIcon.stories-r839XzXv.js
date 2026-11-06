import{i as c,a7 as t,j as e,k as u}from"./iframe-BZGz2pez.js";import{a as d,C as m}from"./ClassicyAppearanceProbe-Dt2nSL7H.js";import"./preload-helper-shce2T3m.js";const{fn:p}=__STORYBOOK_MODULE_TEST__,b={title:"Controls/Icon",component:t,decorators:[a=>e.jsx("div",{style:{position:"relative",width:320,height:200},children:e.jsx(a,{})})]},s={args:{appId:"storybook.app",name:"Macintosh HD",icon:c.system.macClassic,label:"Macintosh HD",initialPosition:[24,24],onClickFunc:p()}},n={args:{appId:"storybook.app",name:"Read Me",icon:c.system.macClassic,initialPosition:[24,24],snapTo:[64,64],onClickFunc:p()},render:function(g){const l=u.useRef(null);return e.jsx("div",{ref:l,style:{position:"absolute",inset:0},children:e.jsx(t,{...g,holder:l})})}},r={args:{appId:"storybook.app",name:"Desktop DB",icon:c.system.macClassic,initialPosition:[24,24],invisible:!0}},o={args:s.args,render:a=>e.jsx(m,{children:e.jsx(t,{...a})}),parameters:d()},i={args:{...s.args,name:"Read Me",label:"Read Me",filePath:"Macintosh HD:Read Me",onFileDrag:p(()=>!0)},render:a=>e.jsx(m,{children:e.jsx(t,{...a})}),parameters:d()};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:'With a `holder` the icon can be dragged around its container; `snapTo`\nrounds each drop onto a 64 px grid, as the file browser\'s "grid" arrangement\ndoes.',...n.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    appId: "storybook.app",
    name: "Desktop DB",
    icon: ClassicyIcons.system.macClassic as string,
    initialPosition: [24, 24],
    invisible: true
  }
}`,...r.parameters?.docs?.source},description:{story:"`invisible` fades the icon and caption, as the file browser does for an\nentry marked `_invisible` when invisible files are shown.",...r.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicyIcon>) => <ClassicyAppearanceProbe>
            <ClassicyIcon {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...o.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...o.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    name: "Read Me",
    label: "Read Me",
    filePath: "Macintosh HD:Read Me",
    onFileDrag: fn(() => true)
  },
  render: (args: ComponentProps<typeof ClassicyIcon>) => <ClassicyAppearanceProbe>
            <ClassicyIcon {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...i.parameters?.docs?.source},description:{story:'The same probe surface for a Finder outline drag (`onFileDrag`): past the\n4 px threshold a dotted outline follows the pointer and the Actions panel\nlogs one `dragStart { kind: "file" }`; releasing it, or pressing Escape,\nlogs exactly one `dragEnd { kind: "file", dropped, canceled }`. A plain\nclick logs no drag event. `onFileDrag` reports the drop as handled, so the\nicon stays put.',...i.parameters?.docs?.description}}};const k=["Default","DraggableWithSnap","Invisible","AppearanceHooks","AppearanceHooksFileDrag"];export{o as AppearanceHooks,i as AppearanceHooksFileDrag,s as Default,n as DraggableWithSnap,r as Invisible,k as __namedExportsOrder,b as default};
