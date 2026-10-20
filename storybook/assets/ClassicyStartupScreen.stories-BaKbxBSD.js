import{t,v as r,w as a,j as c,m as s}from"./iframe-Dma6PRx5.js";import"./preload-helper-PPVm8Dsz.js";const l={title:"System/StartupScreen",component:t,parameters:{layout:"fullscreen"}},e={render:()=>(r(),c.jsx(t,{duration:3e4}))},n={render:()=>{r();const i=[{id:"ClockExt.app",name:"Clock",icon:s.system.extension},{id:"ColorsExt.app",name:"Colors",icon:s.system.colors.extension},{id:"MacExt.app",name:"Mac",icon:s.system.mac},{id:"ClassicExt.app",name:"Classic",icon:s.system.macClassic},{id:"WinkExt.app",name:"Wink",icon:s.system.macWink}];for(const d of i)a({type:"ClassicyAppLoad",app:d,extension:!0});return c.jsx(t,{duration:15e3})}},o={render:()=>(r(),a({type:"ClassicyBootParadeIconAdd",id:"storybook-colors",name:"Colors",icon:s.system.colors.extension}),a({type:"ClassicyBootParadeIconAdd",id:"storybook-mac",name:"Mac",icon:s.system.mac}),c.jsx(t,{duration:15e3,logo:s.system.macWink,wordmark:"My Product"}))};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  render: () => {
    resetStartupScreenSession();
    return <ClassicyStartupScreen duration={30000} />;
  }
}`,...e.parameters?.docs?.source},description:{story:"The stock splash with a 30-second `duration` so it stays up long enough to\ninspect. The story resets the once-per-session flag before rendering;\nwithout that, the splash would render nothing after its first showing.",...e.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:"The extension parade: five extension apps registered with `ClassicyAppLoad`\n(`extension: true`) appear one at a time along the bottom, spaced so the\nlast lands before the progress bar fills.",...n.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => {
    resetStartupScreenSession();
    dispatch({
      type: "ClassicyBootParadeIconAdd",
      id: "storybook-colors",
      name: "Colors",
      icon: ClassicyIcons.system.colors.extension
    });
    dispatch({
      type: "ClassicyBootParadeIconAdd",
      id: "storybook-mac",
      name: "Mac",
      icon: ClassicyIcons.system.mac
    });
    return <ClassicyStartupScreen duration={15000} logo={ClassicyIcons.system.macWink} wordmark="My Product" />;
  }
}`,...o.parameters?.docs?.source},description:{story:"Rebranded via `logo` and `wordmark` (on a desktop: `startupLogo` /\n`startupWordmark`), with parade icons injected by `ClassicyBootParadeIconAdd`\n— no extension app needed. Injected icons lead the parade.",...o.parameters?.docs?.description}}};const y=["Default","WithExtensions","CustomBranding"];export{o as CustomBranding,e as Default,n as WithExtensions,y as __namedExportsOrder,l as default};
