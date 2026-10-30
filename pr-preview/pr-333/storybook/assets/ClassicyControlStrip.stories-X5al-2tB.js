import{a9 as t,j as r,r as u,x as b,S as m,aa as x,ab as k,w as M}from"./iframe-D-sVNdVl.js";import{a as D,C as A}from"./ClassicyAppearanceProbe-B3elPtGx.js";import{d as I}from"./helpers-EG5JHJeo.js";import"./preload-helper-shce2T3m.js";const{fn:P}=__STORYBOOK_MODULE_TEST__,O={title:"Desktop/ControlStrip",component:t,parameters:{...I,classicy:{desktop:!0,controlStrip:!1}}},g=e=>{u.useEffect(()=>{for(const s of e)x(s);return()=>{for(const s of e)k(s.id)}},[e])},y={id:"story-file-sharing",label:"File Sharing",icon:m.system.controlStrip.fileSharing,order:1,menuItems:()=>{const[e,s]=u.useState(!1);return[{id:"file-sharing-status",title:e?"1 User Connected":"No Users Connected",disabled:!0,className:"classicyControlStripStatus"},{id:"spacer"},{id:"file-sharing-open",title:"Open File Sharing Control Panel",onClickFunc:P()},{id:"spacer"},{id:"file-sharing-toggle",title:e?"Turn File Sharing Off":"Turn File Sharing On",onClickFunc:()=>s(h=>!h)}]}},S={id:"story-cd",label:"CD",icon:m.system.controlStrip.cd,order:2,menuItems:[{id:"cd-status",title:"No Audio CD",disabled:!0,className:"classicyControlStripStatus"}]},o={},C=[y,S],c={render:e=>(g(C),r.jsx(t,{...e}))},j={id:"story-weather",appId:"StoryWeather.app",label:"Weather",icon:m.system.controlStrip.sleep,menuItems:[{id:"weather-status",title:"Clear, 72\xB0",disabled:!0,className:"classicyControlStripStatus"}]},v=[j],l={render:e=>{g(v);const[s,h]=u.useState(!0);return r.jsxs(r.Fragment,{children:[s&&r.jsx(b,{id:"StoryWeather.app",name:"Weather",icon:m.system.extension,extension:!0}),r.jsxs("button",{type:"button",onClick:()=>h(f=>!f),children:[s?"Remove":"Install"," the Weather extension"]}),r.jsx(t,{...e})]})}},a={args:{disabledModules:["classicy-sound","classicy-screen-saver"]},render:e=>(g(C),r.jsx(t,{...e}))},w=Array.from({length:6},(e,s)=>({...s%2?S:y,id:`story-module-${s}`})),d={args:{defaultWidth:90},render:e=>(g(w),r.jsx(t,{...e}))},p={args:{defaultCollapsed:!0}},n={render:e=>{const s=M();return u.useEffect(()=>(s({type:"ClassicyDesktopControlStripSetPosition",edge:"right",bottom:160}),()=>s({type:"ClassicyDesktopControlStripSetPosition",edge:"left",bottom:0})),[s]),r.jsx(t,{...e})}},i={args:o.args,render:e=>r.jsx(A,{children:r.jsx(t,{...e})}),parameters:D("600px")};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:"{}",...o.parameters?.docs?.source},description:{story:`The built-in modules: Sound pops up Figure 2-16's volume slider; Screen
Saver (contributed by the desktop's Screen Saver extension) is a menu.`,...o.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: args => {
    useStoryModules(customModules);
    return <ClassicyControlStrip {...args} />;
  }
}`,...c.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: args => {
    useStoryModules(extensionModules);
    const [installed, setInstalled] = useState(true);
    return <>
                {installed && <ClassicyApp id="StoryWeather.app" name="Weather" icon={ClassicyIcons.system.extension} extension />}
                <button type="button" onClick={() => setInstalled(i => !i)}>
                    {installed ? "Remove" : "Install"} the Weather extension
                </button>
                <ClassicyControlStrip {...args} />
            </>;
  }
}`,...l.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    disabledModules: ["classicy-sound", "classicy-screen-saver"]
  },
  render: args => {
    useStoryModules(customModules);
    return <ClassicyControlStrip {...args} />;
  }
}`,...a.parameters?.docs?.source},description:{story:"Built-ins turned off by the host: only the registered modules show.",...a.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    defaultWidth: 90
  },
  render: args => {
    useStoryModules(manyModules);
    return <ClassicyControlStrip {...args} />;
  }
}`,...d.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    defaultCollapsed: true
  }
}`,...p.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: args => {
    const dispatch = useAppManagerDispatch();
    useEffect(() => {
      dispatch({
        type: "ClassicyDesktopControlStripSetPosition",
        edge: "right",
        bottom: 160
      });
      return () => dispatch({
        type: "ClassicyDesktopControlStripSetPosition",
        edge: "left",
        bottom: 0
      });
    }, [dispatch]);
    return <ClassicyControlStrip {...args} />;
  }
}`,...n.parameters?.docs?.source},description:{story:`Control-drag the collapse box to move the strip: it follows the pointer up
and down and docks to the edge on the pointer's half of the desktop. Docked
right it is mirrored \u2014 the tab leads and points left. This story starts it
there, part-way up, and puts it back at the lower left when it closes.`,...n.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicyControlStrip>) => <ClassicyAppearanceProbe>
            <ClassicyControlStrip {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters("600px")
}`,...i.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...i.parameters?.docs?.description}}};const T=["Default","CustomModules","ExtensionModule","DisabledBuiltIns","Scrolling","Collapsed","DockedRight","AppearanceHooks"];export{i as AppearanceHooks,p as Collapsed,c as CustomModules,o as Default,a as DisabledBuiltIns,n as DockedRight,l as ExtensionModule,d as Scrolling,T as __namedExportsOrder,O as default};
