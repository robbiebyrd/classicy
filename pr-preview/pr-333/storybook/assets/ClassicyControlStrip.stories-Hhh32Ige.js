import{a9 as r,j as t,r as u,x as f,S as p,aa as b,ab as x,w as M}from"./iframe-BrZOt_F2.js";import{d as k}from"./helpers-Ch3fzxkW.js";import"./preload-helper-shce2T3m.js";const{fn:D}=__STORYBOOK_MODULE_TEST__,v={title:"Desktop/ControlStrip",component:r,parameters:{...k,classicy:{desktop:!0,controlStrip:!1}}},m=e=>{u.useEffect(()=>{for(const s of e)b(s);return()=>{for(const s of e)x(s.id)}},[e])},h={id:"story-file-sharing",label:"File Sharing",icon:p.system.controlStrip.fileSharing,order:1,menuItems:()=>{const[e,s]=u.useState(!1);return[{id:"file-sharing-status",title:e?"1 User Connected":"No Users Connected",disabled:!0,className:"classicyControlStripStatus"},{id:"spacer"},{id:"file-sharing-open",title:"Open File Sharing Control Panel",onClickFunc:D()},{id:"spacer"},{id:"file-sharing-toggle",title:e?"Turn File Sharing Off":"Turn File Sharing On",onClickFunc:()=>s(S=>!S)}]}},g={id:"story-cd",label:"CD",icon:p.system.controlStrip.cd,order:2,menuItems:[{id:"cd-status",title:"No Audio CD",disabled:!0,className:"classicyControlStripStatus"}]},o={},y=[h,g],i={render:e=>(m(y),t.jsx(r,{...e}))},I={id:"story-weather",appId:"StoryWeather.app",label:"Weather",icon:p.system.controlStrip.sleep,menuItems:[{id:"weather-status",title:"Clear, 72°",disabled:!0,className:"classicyControlStripStatus"}]},j=[I],l={render:e=>{m(j);const[s,S]=u.useState(!0);return t.jsxs(t.Fragment,{children:[s&&t.jsx(f,{id:"StoryWeather.app",name:"Weather",icon:p.system.extension,extension:!0}),t.jsxs("button",{type:"button",onClick:()=>S(C=>!C),children:[s?"Remove":"Install"," the Weather extension"]}),t.jsx(r,{...e})]})}},n={args:{disabledModules:["classicy-sound","classicy-screen-saver"]},render:e=>(m(y),t.jsx(r,{...e}))},w=Array.from({length:6},(e,s)=>({...s%2?g:h,id:`story-module-${s}`})),c={args:{defaultWidth:90},render:e=>(m(w),t.jsx(r,{...e}))},d={args:{defaultCollapsed:!0}},a={render:e=>{const s=M();return u.useEffect(()=>(s({type:"ClassicyDesktopControlStripSetPosition",edge:"right",bottom:160}),()=>s({type:"ClassicyDesktopControlStripSetPosition",edge:"left",bottom:0})),[s]),t.jsx(r,{...e})}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:"{}",...o.parameters?.docs?.source},description:{story:`The built-in modules: Sound pops up Figure 2-16's volume slider; Screen
Saver (contributed by the desktop's Screen Saver extension) is a menu.`,...o.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: args => {
    useStoryModules(customModules);
    return <ClassicyControlStrip {...args} />;
  }
}`,...i.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
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
}`,...l.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    disabledModules: ["classicy-sound", "classicy-screen-saver"]
  },
  render: args => {
    useStoryModules(customModules);
    return <ClassicyControlStrip {...args} />;
  }
}`,...n.parameters?.docs?.source},description:{story:"Built-ins turned off by the host: only the registered modules show.",...n.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    defaultWidth: 90
  },
  render: args => {
    useStoryModules(manyModules);
    return <ClassicyControlStrip {...args} />;
  }
}`,...c.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    defaultCollapsed: true
  }
}`,...d.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
}`,...a.parameters?.docs?.source},description:{story:`Control-drag the collapse box to move the strip: it follows the pointer up
and down and docks to the edge on the pointer's half of the desktop. Docked
right it is mirrored — the tab leads and points left. This story starts it
there, part-way up, and puts it back at the lower left when it closes.`,...a.parameters?.docs?.description}}};const F=["Default","CustomModules","ExtensionModule","DisabledBuiltIns","Scrolling","Collapsed","DockedRight"];export{d as Collapsed,i as CustomModules,o as Default,n as DisabledBuiltIns,a as DockedRight,l as ExtensionModule,c as Scrolling,F as __namedExportsOrder,v as default};
