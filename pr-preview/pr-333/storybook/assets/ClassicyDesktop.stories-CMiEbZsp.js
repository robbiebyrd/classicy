import{ae as i,j as e,r as p,y as d,x as c}from"./iframe-DtAF_g9_.js";import{d as l,S as m,a as u}from"./helpers-DEsjiCtw.js";import{m as h}from"./mirrored-DSw7Y2Es.js";import"./preload-helper-shce2T3m.js";const{fn:s}=__STORYBOOK_MODULE_TEST__,f={title:"Desktop/Desktop",component:i,parameters:l},n=()=>null,r={render:()=>e.jsx(n,{})},o={parameters:{classicy:{desktop:!0,controlStrip:!1}},render:()=>e.jsx(n,{})},k=()=>{const a=p.useMemo(()=>[{id:"storybook.app_file",title:"File",menuChildren:[{id:"storybook.app_new",title:"New",onClickFunc:s()},{id:"storybook.app_open",title:"Open\u2026",onClickFunc:s()}]}],[]);return e.jsxs(e.Fragment,{children:[e.jsx(m,{id:"storybook.app",name:"Storybook",children:e.jsx(d,{id:"mirrored",appId:"storybook.app",title:"Menus in the Window",appMenu:a,initialSize:[380,200],initialPosition:[240,80],children:e.jsx("p",{style:{padding:"1em"},children:"This window's File menu is in its own menu bar, under the title bar; there is no menu bar across the screen."})})}),e.jsx(c,{id:"storybook-notes.app",name:"Notes",icon:u})]})},t={parameters:h,render:()=>e.jsx(k,{})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <NoApps />
}`,...r.parameters?.docs?.source},description:{story:`The bare desktop with no apps of your own: menu bar, wallpaper, Trash, the
Finder's disk icon and the Control Strip. Right-click the empty desktop for
its menu, or drag on it to rubber-band select icons. (The Storybook
decorator supplies the \`ClassicyDesktop\`, with the startup screen off.)`,...r.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  parameters: {
    classicy: {
      desktop: true,
      controlStrip: false
    }
  },
  render: () => <NoApps />
}`,...o.parameters?.docs?.source},description:{story:"`controlStrip={false}` hides the Control Strip, and with it the desktop's\nSound control. (Set here through the decorator's\n`parameters.classicy.controlStrip`.)",...o.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  parameters: mirroredParameters,
  render: () => <MirroredDesktop />
}`,...t.parameters?.docs?.source},description:{story:'The desktop under the Storybook-only `mirrored` Appearance Package, whose\n`layout` moves the menus into each window (`menuBar.placement: "window"`)\nand lays desktop icons out from the top left (`desktop.iconGridOrigin`).\nThe screen bar is not drawn (it still dispatches keyboard equivalents); a\nwindow with an `appMenu` shows it in a bar under its title. The Apple,\nHelp and App Switcher menus, the clock and menu bar extensions have no\nplace in this arrangement.',...t.parameters?.docs?.description}}};const x=["Default","WithoutControlStrip","Mirrored"];export{r as Default,t as Mirrored,o as WithoutControlStrip,x as __namedExportsOrder,f as default};
