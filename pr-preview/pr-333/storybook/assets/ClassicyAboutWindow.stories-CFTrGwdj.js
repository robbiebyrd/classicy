import{e as r,j as e}from"./iframe-DuYgw6wZ.js";import{d as t,S as a,a as p}from"./helpers-B0bHL2md.js";import"./preload-helper-shce2T3m.js";const{fn:s}=__STORYBOOK_MODULE_TEST__,d={title:"Desktop/AboutWindow",component:r,parameters:t},o={render:()=>e.jsx(a,{id:"storybook.app",name:"Storybook",children:e.jsx(r,{appId:"storybook.app",appName:"Storybook",appIcon:p,hideFunc:s()})})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAboutWindow appId="storybook.app" appName="Storybook" appIcon={SB_ICON} hideFunc={fn()} />
        </StoryApp>
}`,...o.parameters?.docs?.source},description:{story:"The About box for an open app. Press Return or Escape, or click OK, to call\n`hideFunc` (logged in the Actions panel); the story never unmounts it.",...o.parameters?.docs?.description}}};const m=["Default"];export{o as Default,m as __namedExportsOrder,d as default};
