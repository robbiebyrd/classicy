import{v as n,j as r,r as m,c as h,f as d,w as f,x}from"./iframe-fXP-Sxnk.js";import{d as M}from"./helpers-cBRHEBhF.js";import"./preload-helper-PPVm8Dsz.js";const{fn:b}=__STORYBOOK_MODULE_TEST__,D={title:"Desktop/ControlStrip",component:n,parameters:{...M,classicy:{desktop:!0,controlStrip:!1}}},u=e=>{m.useEffect(()=>{for(const s of e)f(s);return()=>{for(const s of e)x(s.id)}},[e])},S={id:"story-file-sharing",label:"File Sharing",icon:d.system.controlStrip.fileSharing,order:1,menuItems:()=>{const[e,s]=m.useState(!1);return[{id:"file-sharing-status",title:e?"1 User Connected":"No Users Connected",disabled:!0,className:"classicyControlStripStatus"},{id:"spacer"},{id:"file-sharing-open",title:"Open File Sharing Control Panel",onClickFunc:b()},{id:"spacer"},{id:"file-sharing-toggle",title:e?"Turn File Sharing Off":"Turn File Sharing On",onClickFunc:()=>s(p=>!p)}]}},y={id:"story-cd",label:"CD",icon:d.system.controlStrip.cd,order:2,menuItems:[{id:"cd-status",title:"No Audio CD",disabled:!0,className:"classicyControlStripStatus"}]},t={},g=[S,y],a={render:e=>(u(g),r.jsx(n,{...e}))},I={id:"story-weather",appId:"StoryWeather.app",label:"Weather",icon:d.system.controlStrip.sleep,menuItems:[{id:"weather-status",title:"Clear, 72°",disabled:!0,className:"classicyControlStripStatus"}]},W=[I],l={render:e=>{u(W);const[s,p]=m.useState(!0);return r.jsxs(r.Fragment,{children:[s&&r.jsx(h,{id:"StoryWeather.app",name:"Weather",icon:d.system.extension,extension:!0}),r.jsxs("button",{type:"button",onClick:()=>p(C=>!C),children:[s?"Remove":"Install"," the Weather extension"]}),r.jsx(n,{...e})]})}},o={args:{disabledModules:["classicy-sound","classicy-screen-saver"]},render:e=>(u(g),r.jsx(n,{...e}))},j=Array.from({length:6},(e,s)=>({...s%2?y:S,id:`story-module-${s}`})),i={args:{defaultWidth:90},render:e=>(u(j),r.jsx(n,{...e}))},c={args:{defaultCollapsed:!0}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source},description:{story:`The built-in modules: Sound pops up Figure 2-16's volume slider; Screen
Saver (contributed by the desktop's Screen Saver extension) is a menu.`,...t.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: args => {
    useStoryModules(customModules);
    return <ClassicyControlStrip {...args} />;
  }
}`,...a.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
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
}`,...l.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    disabledModules: ["classicy-sound", "classicy-screen-saver"]
  },
  render: args => {
    useStoryModules(customModules);
    return <ClassicyControlStrip {...args} />;
  }
}`,...o.parameters?.docs?.source},description:{story:"Built-ins turned off by the host: only the registered modules show.",...o.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    defaultWidth: 90
  },
  render: args => {
    useStoryModules(manyModules);
    return <ClassicyControlStrip {...args} />;
  }
}`,...i.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    defaultCollapsed: true
  }
}`,...c.parameters?.docs?.source}}};const E=["Default","CustomModules","ExtensionModule","DisabledBuiltIns","Scrolling","Collapsed"];export{c as Collapsed,a as CustomModules,t as Default,o as DisabledBuiltIns,l as ExtensionModule,i as Scrolling,E as __namedExportsOrder,D as default};
