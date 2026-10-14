import{i as a,r as t,j as o,f as s,k as i}from"./iframe-DZvXDGBt.js";import"./preload-helper-D87iZSeC.js";const l={title:"System/StartupScreen",component:a,parameters:{layout:"fullscreen"}},n={render:()=>(t(),o.jsx(a,{duration:3e4}))},e={render:()=>{t();const r=[{id:"ClockExt.app",name:"Clock",icon:s.system.extension},{id:"ColorsExt.app",name:"Colors",icon:s.system.colors.extension},{id:"MacExt.app",name:"Mac",icon:s.system.mac},{id:"ClassicExt.app",name:"Classic",icon:s.system.macClassic},{id:"WinkExt.app",name:"Wink",icon:s.system.macWink}];for(const c of r)i({type:"ClassicyAppLoad",app:c,extension:!0});return o.jsx(a,{duration:15e3})}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => {
    resetStartupScreenSession();
    return <ClassicyStartupScreen duration={30000} />;
  }
}`,...n.parameters?.docs?.source}}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  render: () => {
    resetStartupScreenSession();
    const seed = [{
      id: "ClockExt.app",
      name: "Clock",
      icon: ClassicyIcons.system.extension
    }, {
      id: "ColorsExt.app",
      name: "Colors",
      icon: ClassicyIcons.system.colors.extension
    }, {
      id: "MacExt.app",
      name: "Mac",
      icon: ClassicyIcons.system.mac
    }, {
      id: "ClassicExt.app",
      name: "Classic",
      icon: ClassicyIcons.system.macClassic
    }, {
      id: "WinkExt.app",
      name: "Wink",
      icon: ClassicyIcons.system.macWink
    }];
    for (const app of seed) {
      dispatch({
        type: "ClassicyAppLoad",
        app,
        extension: true
      });
    }
    return <ClassicyStartupScreen duration={15000} />;
  }
}`,...e.parameters?.docs?.source}}};const d=["Default","WithExtensions"];export{n as Default,e as WithExtensions,d as __namedExportsOrder,l as default};
